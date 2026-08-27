import type { Task } from "@/types/buildtrack";
import {
  formatLocalizedActivityHeadline,
  formatPhotosCapturedLabel,
  localizeStoredActivityDescription,
} from "@/ui/contracts/localizeActivityText";
import { getTranslations } from "@/utils/useTranslation";

export const RECENT_ACTIVITY_WINDOW_MS = 1000 * 60 * 60 * 24 * 5;

export interface ActivityFeedPhotoBatch {
  id: string;
  projectId: string;
  savedAt: number;
  photoUrls: string[];
  captions: string[];
}

export interface ActivityFeedRow {
  id: string;
  taskId: string;
  title: string;
  subtitle: string;
  timestampLabel: string;
  statusLabel: string;
  sortTimestamp: string;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Activity-row lead line: clearer than a bare status token like "New". */
export function formatActivityHeadline(status: string): string {
  return formatLocalizedActivityHeadline(status);
}

function formatTimestampLabel(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function taskHasCreatePhotos(
  attachments: Task["attachments"] | undefined,
): boolean {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return false;
  }
  return attachments.some((entry) => {
    if (typeof entry === "string") {
      return entry.trim().length > 0;
    }
    if (entry && typeof entry === "object") {
      const candidate = entry as {
        uri?: string;
        annotatedUri?: string;
        public_url?: string;
        publicUrl?: string;
        storage_path?: string;
        storagePath?: string;
      };
      return Boolean(
        candidate.uri ||
          candidate.annotatedUri ||
          candidate.public_url ||
          candidate.publicUrl ||
          candidate.storage_path ||
          candidate.storagePath,
      );
    }
    return false;
  });
}

function buildCreationFeedRow(
  task: Pick<Task, "id" | "status" | "title" | "createdAt">,
): ActivityFeedRow {
  return {
    id: `activity-task:${task.id}`,
    taskId: task.id,
    title: formatActivityHeadline("new"),
    subtitle: task.title,
    timestampLabel: formatTimestampLabel(task.createdAt),
    statusLabel: formatStatusLabel(task.status),
    sortTimestamp: task.createdAt,
  };
}

function buildTaskActivityRows(
  task: Pick<Task, "id" | "status" | "title" | "createdAt" | "updates" | "attachments">,
): ActivityFeedRow[] {
  const updates = Array.isArray(task.updates) ? task.updates : [];
  const rows: ActivityFeedRow[] = [];
  const t = getTranslations();

  // Creation activities are not mapped into `updates` (only progress/status).
  // Emit a create row when there are no updates yet, or when create-time photos
  // exist so Recent Activity can show those attachments.
  if (updates.length === 0 || taskHasCreatePhotos(task.attachments)) {
    rows.push(
      updates.length === 0
        ? {
            id: `activity-task:${task.id}`,
            taskId: task.id,
            title: formatActivityHeadline(task.status),
            subtitle: task.title,
            timestampLabel: t.activity.taskActivity,
            statusLabel: formatStatusLabel(task.status),
            sortTimestamp: task.createdAt,
          }
        : buildCreationFeedRow(task),
    );
  }

  rows.push(
    ...updates.map((update) => {
      const description = update.description?.trim() ?? "";
      const changeLine =
        description.length > 0
          ? localizeStoredActivityDescription(description, t)
          : formatActivityHeadline(update.status);

      return {
        id: update.id,
        taskId: task.id,
        title: changeLine,
        subtitle: task.title,
        timestampLabel: formatTimestampLabel(update.timestamp),
        statusLabel: formatStatusLabel(update.status),
        sortTimestamp: update.timestamp,
      };
    }),
  );

  return rows;
}

function buildPhotoBatchRows(batch: ActivityFeedPhotoBatch): ActivityFeedRow {
  const firstCaption = batch.captions.find((caption) => caption?.trim()) ?? "";
  const t = getTranslations();

  return {
    id: `unattached-batch-${batch.id}`,
    taskId: `project:${batch.projectId}`,
    title: formatPhotosCapturedLabel(batch.photoUrls.length, t),
    subtitle: firstCaption,
    timestampLabel: formatTimestampLabel(new Date(batch.savedAt).toISOString()),
    statusLabel: t.activity.savedToProject,
    sortTimestamp: new Date(batch.savedAt).toISOString(),
  };
}

export function buildActivityFeedRows(params: {
  projectId: string;
  tasks: Array<
    Pick<
      Task,
      "id" | "projectId" | "status" | "title" | "createdAt" | "updates" | "attachments"
    >
  >;
  photoBatches?: ActivityFeedPhotoBatch[];
  now?: number;
}): ActivityFeedRow[] {
  const { projectId, tasks, photoBatches = [], now = Date.now() } = params;
  const recentActivityThreshold = now - RECENT_ACTIVITY_WINDOW_MS;

  const taskRows = tasks
    .filter((task) => task.projectId === projectId)
    .flatMap((task) => buildTaskActivityRows(task))
    .filter((row) => {
      const timestamp = new Date(row.sortTimestamp).getTime();
      return Number.isFinite(timestamp) && timestamp >= recentActivityThreshold;
    });

  const batchRows = photoBatches
    .filter((batch) => batch.projectId === projectId)
    .map(buildPhotoBatchRows)
    .filter((row) => {
      const timestamp = new Date(row.sortTimestamp).getTime();
      return Number.isFinite(timestamp) && timestamp >= recentActivityThreshold;
    });

  return [...batchRows, ...taskRows].sort(
    (left, right) =>
      new Date(right.sortTimestamp).getTime() - new Date(left.sortTimestamp).getTime(),
  );
}

export function countUnreadActivityFeedRows(
  rows: Array<Pick<ActivityFeedRow, "sortTimestamp">>,
  lastSeenAtMs: number | null | undefined,
): number {
  if (rows.length === 0) {
    return 0;
  }

  if (lastSeenAtMs == null || !Number.isFinite(lastSeenAtMs)) {
    return rows.length;
  }

  return rows.reduce((count, row) => {
    const rowTimestamp = new Date(row.sortTimestamp).getTime();
    if (!Number.isFinite(rowTimestamp)) {
      return count;
    }
    return rowTimestamp > lastSeenAtMs ? count + 1 : count;
  }, 0);
}

export function resolveActivityFeedSeenAtMs(
  rows: Array<Pick<ActivityFeedRow, "sortTimestamp">>,
  fallbackMs: number = Date.now(),
): number {
  const rowTimestamps = rows
    .map((row) => new Date(row.sortTimestamp).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  if (rowTimestamps.length === 0) {
    return fallbackMs;
  }

  return Math.max(fallbackMs, ...rowTimestamps);
}

export function formatActivityTabBadgeCount(
  unreadCount: number,
): number | string | undefined {
  if (unreadCount <= 0) {
    return undefined;
  }
  if (unreadCount > 99) {
    return "99+";
  }
  return unreadCount;
}
