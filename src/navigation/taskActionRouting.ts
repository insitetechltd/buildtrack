import type {
  CreateTaskParams,
  UpdateProgressParams,
} from "./navigationTypes";

/** Map TaskDetail / shortcut actionType onto standalone screens (S-UX-01Q C3). */
export type TaskDetailActionType = NonNullable<CreateTaskParams["actionType"]>;

export function resolveStandaloneTaskAction(params: {
  editTaskId?: string;
  actionType?: TaskDetailActionType;
  updateTargetSubTaskId?: string;
  sourceScreen?: CreateTaskParams["sourceScreen"];
}):
  | { kind: "updateProgress"; params: UpdateProgressParams }
  | { kind: "addComment"; params: { taskId: string; subTaskId?: string } }
  | { kind: "reassign"; params: { taskId: string; subTaskId?: string } }
  | { kind: "createTask"; params: CreateTaskParams }
  | null {
  const { editTaskId, actionType, updateTargetSubTaskId, sourceScreen } = params;
  if (!editTaskId || !actionType || actionType === "edit") {
    return {
      kind: "createTask",
      params: {
        editTaskId,
        actionType,
        updateTargetSubTaskId,
        sourceScreen,
      },
    };
  }

  if (actionType === "update" || actionType === "photos") {
    return {
      kind: "updateProgress",
      params: {
        taskId: editTaskId,
        subTaskId: updateTargetSubTaskId,
        sourceScreen,
        sourceTaskId: editTaskId,
        sourceSubTaskId: updateTargetSubTaskId,
      },
    };
  }

  if (actionType === "comment") {
    return {
      kind: "addComment",
      params: { taskId: editTaskId, subTaskId: updateTargetSubTaskId },
    };
  }

  if (actionType === "reassign") {
    return {
      kind: "reassign",
      params: { taskId: editTaskId, subTaskId: updateTargetSubTaskId },
    };
  }

  return null;
}
