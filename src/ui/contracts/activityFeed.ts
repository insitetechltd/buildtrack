import type { Task } from "@/types/buildtrack";

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
  switch (status.trim().toLowerCase()) {
    case "new":
    case "not_started":
    case "assigned":
    case "received":
      return "New Task";
    case "accepted":
      return "Task Accepted";
    case "in_progress":
      return "Task In Progress";
    case "submitted_for_review":
    case "pending_review":
      return "Submitted for Review";
    case "rejected":
    case "declined":
      return "Task Rejected";
    case "approved":
    case "completed":
    case "done":
      return "Task Completed";
    case "cancelled":
      return "Task Cancelled";
    default: {
      const label = formatStatusLabel(status);
      return label.toLowerCase().includes("task") ? label : `${label} Task`;
    }
  }
}

function formatTimestampLabel(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildTaskActivityRows(
  task: Pick<Task, "id" | "status" | "title" | "createdAt" | "updates">,
): ActivityFeedRow[] {
  const updates = Array.isArray(task.updates) ? task.updates : [];

  if (updates.length === 0) {
    return [
      {
        id: `activity-task:${task.id}`,
        taskId: task.id,
        title: formatActivityHeadline(task.status),
        subtitle: task.title,
        timestampLabel: "Task activity",
        statusLabel: formatStatusLabel(task.status),
        sortTimestamp: task.createdAt,
      },
    ];
  }

  return updates.map((update) => {
    const description = update.description?.trim() ?? "";
    const changeLine =
      description.length > 0 ? description : formatActivityHeadline(update.status);

    return {
      id: update.id,
      taskId: task.id,
      title: changeLine,
      subtitle: task.title,
      timestampLabel: formatTimestampLabel(update.timestamp),
      statusLabel: formatStatusLabel(update.status),
      sortTimestamp: update.timestamp,
    };
  });
}

function buildPhotoBatchRows(batch: ActivityFeedPhotoBatch): ActivityFeedRow {
  const firstCaption = batch.captions.find((caption) => caption?.trim()) ?? "";

  return {
    id: `unattached-batch-${batch.id}`,
    taskId: `project:${batch.projectId}`,
    title: `${batch.photoUrls.length} photos captured`,
    subtitle: firstCaption,
    timestampLabel: formatTimestampLabel(new Date(batch.savedAt).toISOString()),
    statusLabel: "Saved to project",
    sortTimestamp: new Date(batch.savedAt).toISOString(),
  };
}

export function buildActivityFeedRows(params: {
  projectId: string;
  tasks: Array<
    Pick<Task, "id" | "projectId" | "status" | "title" | "createdAt" | "updates">
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
