import type { TaskStatus } from "@/types/buildtrack";

export type TaskCreateValidationInput = {
  title?: string;
  projectId?: string;
  assignedBy?: string;
  assignedTo?: string[] | undefined;
};

export type TaskCreateValidationErrorCode =
  | "NO_TITLE"
  | "NO_PROJECT"
  | "NO_ORIGINATOR"
  | "NO_ASSIGNEES";

const ERROR_MESSAGES: Record<TaskCreateValidationErrorCode, string> = {
  NO_TITLE: "Title is required",
  NO_PROJECT: "Project is required",
  NO_ORIGINATOR: "Task originator is required",
  NO_ASSIGNEES: "Please select at least one person to assign this task",
};

export function normalizeCreateAssigneeIds(
  assignedTo: string[] | undefined,
): string[] {
  return (assignedTo ?? [])
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0);
}

/** Validate required fields for task create (intended status machine at source). */
export function validateTaskCreateInput(
  input: TaskCreateValidationInput,
): TaskCreateValidationErrorCode[] {
  const errors: TaskCreateValidationErrorCode[] = [];
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const projectId =
    typeof input.projectId === "string" ? input.projectId.trim() : "";
  const assignedBy =
    typeof input.assignedBy === "string" ? input.assignedBy.trim() : "";
  const assignees = normalizeCreateAssigneeIds(input.assignedTo);

  if (!title) {
    errors.push("NO_TITLE");
  }
  if (!projectId) {
    errors.push("NO_PROJECT");
  }
  if (!assignedBy) {
    errors.push("NO_ORIGINATOR");
  }
  if (assignees.length === 0) {
    errors.push("NO_ASSIGNEES");
  }

  return errors;
}

export function taskCreateValidationMessage(
  code: TaskCreateValidationErrorCode,
): string {
  return ERROR_MESSAGES[code];
}

export function formatTaskCreateValidationError(
  codes: TaskCreateValidationErrorCode[],
): string {
  if (codes.length === 0) {
    return "Invalid task create payload";
  }
  return taskCreateValidationMessage(codes[0]!);
}

/** Throws when create payload violates intended machine prerequisites. */
export function assertValidTaskCreateInput(
  input: TaskCreateValidationInput,
): void {
  const codes = validateTaskCreateInput(input);
  if (codes.length > 0) {
    throw new Error(formatTaskCreateValidationError(codes));
  }
}

/** Self-assigned create → in_progress; delegated → new. Requires valid assignees. */
export function resolveInitialTaskCreateStatus(
  assignedBy: string,
  assignedTo: string[] | undefined,
): TaskStatus {
  const assignees = normalizeCreateAssigneeIds(assignedTo);
  const originator = assignedBy.trim();
  const isCreatorAssigned =
    originator.length > 0 && assignees.some((id) => id === originator);
  return isCreatorAssigned ? "in_progress" : "new";
}
