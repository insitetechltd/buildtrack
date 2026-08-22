import type { TaskStatus } from "@/types/buildtrack";
import {
  normalizeCreateAssigneeIds,
  type TaskCreateValidationErrorCode,
  taskCreateValidationMessage,
} from "./taskCreateValidation";

export type TaskUpdateSnapshot = {
  title?: string;
  projectId?: string;
  assignedBy?: string;
  assignedTo?: string[] | undefined;
  status?: TaskStatus;
};

const TERMINAL_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "approved",
  "completed",
  "done",
  "cancelled",
]);

const STRUCTURAL_UPDATE_KEYS = [
  "title",
  "projectId",
  "assignedBy",
  "assignedTo",
  "status",
] as const satisfies ReadonlyArray<keyof TaskUpdateSnapshot>;

export type TaskUpdateValidationErrorCode =
  | TaskCreateValidationErrorCode
  | "SELF_ASSIGNED_MUST_BE_IN_PROGRESS";

const UPDATE_ERROR_MESSAGES: Record<
  Exclude<TaskUpdateValidationErrorCode, TaskCreateValidationErrorCode>,
  string
> = {
  SELF_ASSIGNED_MUST_BE_IN_PROGRESS:
    "Self-assigned tasks must be in progress, not waiting for acceptance",
};

export function isTerminalTaskStatus(status: TaskStatus | undefined): boolean {
  return status != null && TERMINAL_STATUSES.has(status);
}

export function taskRequiresAssignees(status: TaskStatus | undefined): boolean {
  return !isTerminalTaskStatus(status);
}

export function projectTaskUpdate(
  current: TaskUpdateSnapshot,
  updates: Partial<TaskUpdateSnapshot>,
): Required<
  Pick<
    TaskUpdateSnapshot,
    "title" | "projectId" | "assignedBy" | "assignedTo" | "status"
  >
> {
  return {
    title: updates.title !== undefined ? updates.title : current.title ?? "",
    projectId:
      updates.projectId !== undefined ? updates.projectId : current.projectId ?? "",
    assignedBy:
      updates.assignedBy !== undefined ? updates.assignedBy : current.assignedBy ?? "",
    assignedTo:
      updates.assignedTo !== undefined ? updates.assignedTo : current.assignedTo,
    status:
      updates.status !== undefined
        ? updates.status
        : (current.status ?? "new"),
  };
}

function touchesStructuralFields(
  updates: Partial<TaskUpdateSnapshot>,
): boolean {
  return STRUCTURAL_UPDATE_KEYS.some((key) => key in updates);
}

/** Validate merged task state after applying structural updates. */
export function validateTaskUpdateProjection(
  projected: Required<
    Pick<
      TaskUpdateSnapshot,
      "title" | "projectId" | "assignedBy" | "assignedTo" | "status"
    >
  >,
): TaskUpdateValidationErrorCode[] {
  const errors: TaskUpdateValidationErrorCode[] = [];
  const title =
    typeof projected.title === "string" ? projected.title.trim() : "";
  const projectId =
    typeof projected.projectId === "string" ? projected.projectId.trim() : "";
  const assignedBy =
    typeof projected.assignedBy === "string" ? projected.assignedBy.trim() : "";
  const assignees = normalizeCreateAssigneeIds(projected.assignedTo);
  const status = projected.status;

  if (!title) {
    errors.push("NO_TITLE");
  }
  if (!projectId) {
    errors.push("NO_PROJECT");
  }
  if (!assignedBy) {
    errors.push("NO_ORIGINATOR");
  }

  if (taskRequiresAssignees(status) && assignees.length === 0) {
    errors.push("NO_ASSIGNEES");
  }

  if (
    status === "new" &&
    assignedBy &&
    assignees.some((id) => id === assignedBy)
  ) {
    errors.push("SELF_ASSIGNED_MUST_BE_IN_PROGRESS");
  }

  return errors;
}

export function taskUpdateValidationMessage(
  code: TaskUpdateValidationErrorCode,
): string {
  if (code === "SELF_ASSIGNED_MUST_BE_IN_PROGRESS") {
    return UPDATE_ERROR_MESSAGES[code];
  }
  return taskCreateValidationMessage(code);
}

export function formatTaskUpdateValidationError(
  codes: TaskUpdateValidationErrorCode[],
): string {
  if (codes.length === 0) {
    return "Invalid task update";
  }
  return taskUpdateValidationMessage(codes[0]!);
}

/** Throws when a structural update would produce an illegal workflow state. */
export function assertValidTaskUpdate(
  current: TaskUpdateSnapshot,
  updates: Partial<TaskUpdateSnapshot>,
): void {
  if (!touchesStructuralFields(updates)) {
    return;
  }

  const projected = projectTaskUpdate(current, updates);
  const codes = validateTaskUpdateProjection(projected);
  if (codes.length > 0) {
    throw new Error(formatTaskUpdateValidationError(codes));
  }
}
