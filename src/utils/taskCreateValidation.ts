import type { TaskStatus } from "@/types/buildtrack";
import { taskEffectiveStatus } from "../state/taskQueryPredicates";

export type TaskCreateValidationInput = {
  title?: string;
  projectId?: string;
  assignedBy?: string;
  assignedTo?: string[] | undefined;
  intentMode?: "report_issue" | "my_task" | "full_task";
  status?: TaskStatus;
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
  const isReportIntent =
    input.intentMode === "report_issue" || input.status === "reported";

  if (!title) {
    errors.push("NO_TITLE");
  }
  if (!projectId) {
    errors.push("NO_PROJECT");
  }
  if (!assignedBy) {
    errors.push("NO_ORIGINATOR");
  }
  if (!isReportIntent && assignees.length === 0) {
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

export function isCreatorAmongAssignees(
  assignedBy: string | null | undefined,
  assignedTo: string[] | undefined,
): boolean {
  const originator = typeof assignedBy === "string" ? assignedBy.trim() : "";
  if (!originator) {
    return false;
  }
  return normalizeCreateAssigneeIds(assignedTo).some((id) => id === originator);
}

export function isPreAcceptanceTaskStatus(status: string): boolean {
  return (
    status === "new" ||
    status === "not_started" ||
    status === "assigned" ||
    status === "received"
  );
}

/** Assignee still needs to accept — not self-assigned, and not already accepted. */
export function isTaskAwaitingAssigneeAcceptance(input: {
  viewerUserId: string;
  status: string;
  assignedBy?: string | null;
  assignedTo?: string[] | undefined;
  acceptedBy?: string | null;
}): boolean {
  const viewer = String(input.viewerUserId ?? "").trim();
  if (!viewer) {
    return false;
  }
  const assignees = normalizeCreateAssigneeIds(input.assignedTo);
  if (!assignees.some((id) => id === viewer)) {
    return false;
  }
  if (!isPreAcceptanceTaskStatus(input.status)) {
    return false;
  }
  if (isCreatorAmongAssignees(input.assignedBy, assignees)) {
    return false;
  }
  if (input.acceptedBy) {
    return false;
  }
  return true;
}

/**
 * App mapping for task rows. HQ TASK_EFFECTIVE_STATUS still prefers `status`.
 * Historic writes only set `current_status`, so `status` stays the default `new`.
 * Treat self-assigned and already-accepted rows as in_progress so Accept does not return.
 */
export function resolveClientTaskStatus(row: {
  status?: string | null;
  current_status?: string | null;
  assigned_by?: string | null;
  assigned_to?: unknown;
  primary_assignee_id?: string | null;
  accepted_by?: string | null;
  accepted?: boolean | null;
}): TaskStatus {
  const effective = taskEffectiveStatus(row) as TaskStatus;
  if (
    effective === "reported" ||
    effective === "resolved" ||
    effective === "dismissed"
  ) {
    return effective;
  }
  if (!isPreAcceptanceTaskStatus(effective)) {
    return effective;
  }
  if (row.accepted_by || row.accepted === true) {
    return "in_progress";
  }
  const assignees = normalizeCreateAssigneeIds(
    Array.isArray(row.assigned_to)
      ? row.assigned_to.map((id) => String(id))
      : undefined,
  );
  const primary = row.primary_assignee_id ? String(row.primary_assignee_id) : "";
  if (primary && !assignees.includes(primary)) {
    assignees.push(primary);
  }
  if (isCreatorAmongAssignees(row.assigned_by, assignees)) {
    return "in_progress";
  }
  return effective;
}

/** Self-assigned create → in_progress; reported issue → reported; delegated → new. */
export function resolveInitialTaskCreateStatus(
  assignedBy: string,
  assignedTo: string[] | undefined,
  intentMode?: string,
): TaskStatus {
  if (intentMode === "report_issue") {
    return "reported";
  }
  return isCreatorAmongAssignees(assignedBy, assignedTo) ? "in_progress" : "new";
}
