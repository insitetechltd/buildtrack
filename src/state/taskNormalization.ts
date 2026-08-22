import {
  ActivityType,
  Task,
  TaskActivity,
  TaskUpdate,
} from "../types/buildtrack";

export function createActivityFromLegacyUpdate(
  taskId: string,
  update: TaskUpdate,
): TaskActivity {
  return {
    id: update.id,
    taskId,
    userId: update.userId,
    activityType: "progress_update" as ActivityType,
    timestamp: update.timestamp,
    data: {
      description: update.description,
      photos: update.photos || [],
      completionPercentage: update.completionPercentage,
      status: update.status,
    },
    description: update.description,
    completionPercentage: update.completionPercentage,
    status: update.status,
    createdAt: update.timestamp,
  };
}

export function normalizeTaskActivityCompatibility(task: Task): Task {
  const normalizedAssignedTo = Array.isArray(task.assignedTo)
    ? task.assignedTo.map((assigneeId) => String(assigneeId))
    : [];
  const normalizedDelegatedUserIds = Array.isArray(task.delegatedUserIds)
    ? task.delegatedUserIds.map((userId) => String(userId))
    : undefined;
  const updates = Array.isArray(task.updates) ? task.updates : [];
  const activities = Array.isArray(task.activities) ? task.activities : [];
  const normalizedTask = {
    ...task,
    assignedTo: normalizedAssignedTo,
    assignedBy: task.assignedBy ? String(task.assignedBy) : "",
    primaryAssigneeId: task.primaryAssigneeId
      ? String(task.primaryAssigneeId)
      : normalizedAssignedTo[0],
    delegatedUserIds:
      normalizedDelegatedUserIds !== undefined
        ? normalizedDelegatedUserIds
        : normalizedAssignedTo.slice(1),
    containerId: task.containerId ? String(task.containerId) : undefined,
    subContainerId: task.subContainerId ? String(task.subContainerId) : undefined,
    tags: Array.isArray(task.tags) ? task.tags.map((tag) => String(tag)) : [],
    updates,
  };

  if (activities.length > 0) {
    return {
      ...normalizedTask,
      activities,
    };
  }

  return {
    ...normalizedTask,
    activities: updates.map((update) => createActivityFromLegacyUpdate(task.id, update)),
  };
}

export function normalizePersistedTasks(tasks: Task[] | undefined): Task[] {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.map(normalizeTaskActivityCompatibility);
}

export function normalizeProjectLocationLabel(label: string | undefined | null) {
  if (!label) {
    return "";
  }

  return label.replace(/\s+/g, " ").trim();
}

export function isMissingProjectContainersRelation(
  error: { code?: string; message?: string } | null | undefined,
) {
  if (!error) {
    return false;
  }
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("project_containers") &&
      (message.includes("does not exist") ||
        message.includes("could not find") ||
        message.includes("schema cache")))
  );
}
