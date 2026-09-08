import type { ActivityType, Task } from "@/types/buildtrack";
import {
  formatLocalizedActivityHeadline,
  formatPhotosCapturedLabel,
  localizeStoredActivityDescription,
} from "@/ui/contracts/localizeActivityText";
import { getTranslations } from "@/utils/useTranslation";

export const RECENT_ACTIVITY_WINDOW_MS = 1000 * 60 * 60 * 24 * 5;
/** Hard cap for Dashboard Recent Activity groups (most recent first). */
export const RECENT_ACTIVITY_MAX_ITEMS = 20;
/** Collapsed priors under the latest action before +N expand. */
export const ACTIVITY_FEED_COLLAPSED_PRIORS = 2;

/** Dot colors — Recipe B lock (red / green / yellow / blue). */
export type ActivityFeedDotTone = "negative" | "positive" | "caution" | "info";

export const ACTIVITY_FEED_DOT_COLORS: Record<ActivityFeedDotTone, string> = {
  negative: "#DC2626",
  positive: "#16A34A",
  caution: "#CA8A04",
  info: "#0A728F",
};

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
  /** Change / action line. */
  title: string;
  /** Task name. */
  subtitle: string;
  timestampLabel: string;
  statusLabel: string;
  sortTimestamp: string;
  dotTone: ActivityFeedDotTone;
  activityType?: ActivityType | string;
  actorUserId?: string;
}

export interface ActivityFeedGroup {
  id: string;
  taskId: string;
  taskTitle: string;
  /** Newest first. */
  events: ActivityFeedRow[];
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

/**
 * Structured kind → dot tone (Q9–Q12 lock). Prefer activityType; fall back to status.
 */
export function resolveActivityFeedDotTone(params: {
  activityType?: ActivityType | string | null;
  status?: string | null;
}): ActivityFeedDotTone {
  const type = (params.activityType || "").toLowerCase();
  const status = (params.status || "").toLowerCase();

  if (
    type === "review_rejection" ||
    type === "issue_dismissed" ||
    type === "cancellation"
  ) {
    return "negative";
  }
  if (type === "review_acceptance" || type === "issue_resolved") {
    return "positive";
  }
  if (
    type === "issue_reported" ||
    type === "triaged_to_task" ||
    type === "creation" ||
    type === "assignment" ||
    type === "delegation_added" ||
    type === "delegation_removed"
  ) {
    return "info";
  }
  if (
    type === "progress_update" ||
    type === "photo_batch_attached" ||
    type === "review_submission" ||
    type === "assigner_comment" ||
    type === "draft_completed"
  ) {
    return "caution";
  }

  if (
    status === "rejected" ||
    status === "declined" ||
    status === "cancelled" ||
    status === "dismissed"
  ) {
    return "negative";
  }
  if (
    status === "accepted" ||
    status === "approved" ||
    status === "resolved" ||
    status === "completed"
  ) {
    return "positive";
  }
  if (status === "submitted_for_review" || status === "in_progress") {
    return "caution";
  }
  if (
    status === "reported" ||
    status === "new" ||
    status === "not_started" ||
    status === "archived"
  ) {
    return "info";
  }

  return "caution";
}

/** Tie-break when timestamps match: reject > submit > progress > create/other. */
function eventTieBreakRank(row: ActivityFeedRow): number {
  if (row.dotTone === "negative") {
    return 0;
  }
  if (
    row.activityType === "review_submission" ||
    row.statusLabel.toLowerCase().includes("submitted")
  ) {
    return 1;
  }
  if (row.dotTone === "caution") {
    return 2;
  }
  return 3;
}

function compareFeedEventsNewestFirst(left: ActivityFeedRow, right: ActivityFeedRow): number {
  const delta =
    new Date(right.sortTimestamp).getTime() - new Date(left.sortTimestamp).getTime();
  if (delta !== 0) {
    return delta;
  }
  return eventTieBreakRank(left) - eventTieBreakRank(right);
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
  task: Pick<Task, "id" | "status" | "title" | "createdAt" | "assignedBy">,
): ActivityFeedRow {
  return {
    id: `activity-task:${task.id}`,
    taskId: task.id,
    title: formatActivityHeadline("new"),
    subtitle: task.title,
    timestampLabel: formatTimestampLabel(task.createdAt),
    statusLabel: formatStatusLabel(task.status),
    sortTimestamp: task.createdAt,
    dotTone: resolveActivityFeedDotTone({
      activityType: "creation",
      status: "new",
    }),
    activityType: "creation",
    actorUserId: task.assignedBy ? String(task.assignedBy) : undefined,
  };
}

function buildTaskActivityRows(
  task: Pick<
    Task,
    "id" | "status" | "title" | "createdAt" | "updates" | "attachments" | "assignedBy"
  >,
): ActivityFeedRow[] {
  const updates = Array.isArray(task.updates) ? task.updates : [];
  const rows: ActivityFeedRow[] = [];
  const t = getTranslations();

  if (updates.length === 0 || taskHasCreatePhotos(task.attachments)) {
    rows.push(
      updates.length === 0
        ? {
            id: `activity-task:${task.id}`,
            taskId: task.id,
            title: formatActivityHeadline(task.status),
            subtitle: task.title,
            timestampLabel: formatTimestampLabel(task.createdAt),
            statusLabel: formatStatusLabel(task.status),
            sortTimestamp: task.createdAt,
            dotTone: resolveActivityFeedDotTone({
              activityType: "creation",
              status: task.status,
            }),
            activityType: "creation",
            actorUserId: task.assignedBy ? String(task.assignedBy) : undefined,
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
      const activityType = update.activityType;

      return {
        id: update.id,
        taskId: task.id,
        title: changeLine,
        subtitle: task.title,
        timestampLabel: formatTimestampLabel(update.timestamp),
        statusLabel: formatStatusLabel(update.status),
        sortTimestamp: update.timestamp,
        dotTone: resolveActivityFeedDotTone({
          activityType,
          status: update.status,
        }),
        activityType,
        actorUserId: update.userId ? String(update.userId) : undefined,
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
    dotTone: "caution",
    activityType: "photo_batch_attached",
  };
}

export function buildActivityFeedRows(params: {
  projectId: string;
  tasks: Array<
    Pick<
      Task,
      | "id"
      | "projectId"
      | "status"
      | "title"
      | "createdAt"
      | "updates"
      | "attachments"
      | "assignedBy"
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

  return [...batchRows, ...taskRows].sort(compareFeedEventsNewestFirst);
}

/** Group flat events by taskId — one card per task (Recipe B). */
export function groupActivityFeedRows(
  rows: ActivityFeedRow[],
  maxGroups: number = RECENT_ACTIVITY_MAX_ITEMS,
): ActivityFeedGroup[] {
  const byTaskId = new Map<string, ActivityFeedRow[]>();

  for (const row of rows) {
    const existing = byTaskId.get(row.taskId);
    if (existing) {
      existing.push(row);
    } else {
      byTaskId.set(row.taskId, [row]);
    }
  }

  const groups: ActivityFeedGroup[] = Array.from(byTaskId.entries()).map(
    ([taskId, events]) => {
      const sorted = [...events].sort(compareFeedEventsNewestFirst);
      const latest = sorted[0];
      return {
        id: taskId.startsWith("project:")
          ? latest?.id ?? taskId
          : `activity-group:${taskId}`,
        taskId,
        taskTitle: latest?.subtitle || "",
        events: sorted,
        sortTimestamp: latest?.sortTimestamp || "",
      };
    },
  );

  return groups
    .sort(
      (left, right) =>
        new Date(right.sortTimestamp).getTime() -
        new Date(left.sortTimestamp).getTime(),
    )
    .slice(0, maxGroups);
}

export function buildActivityFeedGroups(params: {
  projectId: string;
  tasks: Array<
    Pick<
      Task,
      | "id"
      | "projectId"
      | "status"
      | "title"
      | "createdAt"
      | "updates"
      | "attachments"
      | "assignedBy"
    >
  >;
  photoBatches?: ActivityFeedPhotoBatch[];
  now?: number;
}): ActivityFeedGroup[] {
  return groupActivityFeedRows(buildActivityFeedRows(params));
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
