import { buildResourceKey, type QueryMeta } from "../api/supabase";
import {
  Priority,
  Task,
  TaskReadStatus,
  TaskStatus,
} from "../types/buildtrack";

export interface TaskPreview {
  id: string;
  projectId: string;
  parentTaskId?: string;
  rootTaskId?: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  completionPercentage: number;
  dueDate?: string;
  assignedTo: string[];
  assignedBy: string;
  leadingAttachmentUri?: string;
  previewHash: string;
  entityVersion: number;
}

export interface TaskDerivedState {
  tasksById: Record<string, Task>;
  taskPreviewById: Record<string, TaskPreview>;
  taskIdsByProject: Record<string, string[]>;
  topLevelTaskIdsByProject: Record<string, string[]>;
  childTaskIdsByParent: Record<string, string[]>;
  taskIdsByUser: Record<string, string[]>;
  taskIdsAssignedByUser: Record<string, string[]>;
  queryTaskIds: Record<string, string[]>;
}

function pushUnique(target: Record<string, string[]>, key: string, value: string) {
  if (!key) {
    return;
  }

  if (!target[key]) {
    target[key] = [];
  }

  if (!target[key].includes(value)) {
    target[key].push(value);
  }
}

function createTaskPreview(task: Task): TaskPreview {
  const leadingAttachment =
    Array.isArray(task.attachments) && task.attachments.length > 0
      ? task.attachments[0]
      : undefined;

  const leadingAttachmentUri =
    typeof leadingAttachment === "string"
      ? leadingAttachment
      : leadingAttachment && typeof leadingAttachment === "object"
        ? ((leadingAttachment as any).annotatedUri || (leadingAttachment as any).uri)
        : undefined;

  const updatedAt = (task as any).updatedAt || task.createdAt || "";

  return {
    id: task.id,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId || undefined,
    rootTaskId: task.rootTaskId || undefined,
    title: task.title,
    status: task.status,
    priority: task.priority,
    completionPercentage: task.completionPercentage,
    dueDate: task.dueDate,
    assignedTo: task.assignedTo || [],
    assignedBy: task.assignedBy,
    leadingAttachmentUri,
    previewHash: [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.completionPercentage,
      task.dueDate || "",
      leadingAttachmentUri || "",
      updatedAt,
    ].join("|"),
    entityVersion: updatedAt ? new Date(updatedAt).getTime() : 0,
  };
}

function deriveTaskIdsForQuery(
  resourceKey: string,
  allTaskIds: string[],
  tasksById: Record<string, Task>,
  taskIdsByProject: Record<string, string[]>,
  taskIdsByUser: Record<string, string[]>,
  taskIdsAssignedByUser: Record<string, string[]>,
): string[] {
  const parts = resourceKey.split(":");

  if (resourceKey === buildResourceKey("tasks", "all")) {
    return allTaskIds;
  }

  if (parts[0] === "tasks" && parts[1] === "project" && parts[2]) {
    return taskIdsByProject[parts[2]] || [];
  }

  if (parts[0] === "tasks" && parts[1] === "user" && parts[2]) {
    return taskIdsByUser[parts[2]] || [];
  }

  if (parts[0] === "tasks" && parts[1] === "assignedBy" && parts[2]) {
    return taskIdsAssignedByUser[parts[2]] || [];
  }

  if (
    (parts[0] === "task" || (parts[0] === "tasks" && parts[1] === "id")) &&
    parts[parts.length - 1]
  ) {
    const taskId = parts[parts.length - 1];
    return tasksById[taskId] ? [taskId] : [];
  }

  return [];
}

export function buildTaskDerivedState(
  tasks: Task[],
  _taskReadStatuses: TaskReadStatus[],
  taskQueryMeta: Record<string, QueryMeta> = {},
): TaskDerivedState {
  const tasksById: Record<string, Task> = {};
  const taskPreviewById: Record<string, TaskPreview> = {};
  const taskIdsByProject: Record<string, string[]> = {};
  const topLevelTaskIdsByProject: Record<string, string[]> = {};
  const childTaskIdsByParent: Record<string, string[]> = {};
  const taskIdsByUser: Record<string, string[]> = {};
  const taskIdsAssignedByUser: Record<string, string[]> = {};
  const queryTaskIds: Record<string, string[]> = {};
  const allTaskIds: string[] = [];

  tasks.forEach((task) => {
    tasksById[task.id] = task;
    taskPreviewById[task.id] = createTaskPreview(task);
    allTaskIds.push(task.id);
    pushUnique(taskIdsByProject, task.projectId, task.id);
    pushUnique(taskIdsAssignedByUser, task.assignedBy, task.id);

    if (task.parentTaskId) {
      pushUnique(childTaskIdsByParent, task.parentTaskId, task.id);
    } else {
      pushUnique(topLevelTaskIdsByProject, task.projectId, task.id);
    }

    (task.assignedTo || []).forEach((userId) => {
      pushUnique(taskIdsByUser, String(userId), task.id);
    });
  });

  Object.keys(taskQueryMeta).forEach((resourceKey) => {
    queryTaskIds[resourceKey] = deriveTaskIdsForQuery(
      resourceKey,
      allTaskIds,
      tasksById,
      taskIdsByProject,
      taskIdsByUser,
      taskIdsAssignedByUser,
    );
  });

  return {
    tasksById,
    taskPreviewById,
    taskIdsByProject,
    topLevelTaskIdsByProject,
    childTaskIdsByParent,
    taskIdsByUser,
    taskIdsAssignedByUser,
    queryTaskIds,
  };
}
