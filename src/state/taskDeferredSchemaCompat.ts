import { Task, TaskStatus } from "../types/buildtrack";

export const DEFERRED_TASK_CREATE_SCHEMA_FIELDS = [
  "primary_assignee_id",
  "delegated_user_ids",
  "container_id",
  "sub_container_id",
  "tags",
  "location_on_site",
] as const;

/**
 * Columns present on evolved DEV tenants but absent on greenfield PROD.
 * Safe to omit from INSERT/UPDATE when PostgREST reports them missing.
 * Assignees must then be written via `task_assignments` (PROD) instead of `assigned_to`.
 */
export const OPTIONAL_EVOLVED_TASK_COLUMNS = [
  ...DEFERRED_TASK_CREATE_SCHEMA_FIELDS,
  "current_status",
  "assigned_to",
  "attachments",
  "accepted",
  "accepted_by",
  "accepted_at",
  "starred_by_users",
  "ready_for_review",
  "review_accepted",
  "has_unread_changes",
  "last_edited_at",
  "location",
  "decline_reason",
  "original_assigned_by",
] as const;

export const DEFERRED_TASK_RUNTIME_FIELDS = [
  "primaryAssigneeId",
  "delegatedUserIds",
  "containerId",
  "subContainerId",
  "tags",
  "locationOnSite",
] as const;

export function buildSupabaseTaskInsertPayload(
  taskData: Omit<Task, "id" | "createdAt" | "updates" | "status" | "completionPercentage">,
  initialStatus: TaskStatus,
  isCreatorAssigned: boolean,
) {
  return {
    project_id: taskData.projectId,
    title: taskData.title,
    description: taskData.description,
    task_reference: taskData.taskReference || null,
    billing_status: taskData.billingStatus || "non_billable",
    priority: taskData.priority,
    category: taskData.category,
    due_date: taskData.dueDate,
    status: initialStatus,
    current_status: initialStatus,
    completion_percentage: 0,
    assigned_to: taskData.assignedTo,
    primary_assignee_id: taskData.primaryAssigneeId || null,
    delegated_user_ids: taskData.delegatedUserIds || null,
    assigned_by: taskData.assignedBy,
    original_assigned_by: taskData.originalAssignedBy || taskData.assignedBy || null,
    container_id: taskData.containerId || null,
    sub_container_id: taskData.subContainerId || null,
    tags: taskData.tags || [],
    location_on_site: taskData.locationOnSite || null,
    attachments: taskData.attachments || [],
    accepted: isCreatorAssigned ? true : false,
    accepted_by: isCreatorAssigned ? taskData.assignedBy : null,
    accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
  };
}

export function stripDeferredTaskSchemaFields<T extends Record<string, unknown>>(
  payload: T,
) {
  const compatibilityPayload = { ...payload };

  DEFERRED_TASK_CREATE_SCHEMA_FIELDS.forEach((fieldName) => {
    delete compatibilityPayload[fieldName];
  });

  return compatibilityPayload;
}

export function stripOptionalEvolvedTaskColumns<T extends Record<string, unknown>>(
  payload: T,
) {
  const compatibilityPayload = { ...payload };
  OPTIONAL_EVOLVED_TASK_COLUMNS.forEach((fieldName) => {
    delete compatibilityPayload[fieldName];
  });
  return compatibilityPayload;
}

export function stripTaskColumn<T extends Record<string, unknown>>(
  payload: T,
  column: string,
) {
  const compatibilityPayload = { ...payload };
  delete compatibilityPayload[column];
  return compatibilityPayload;
}

export function stripDeferredTaskRuntimeFields<T extends Record<string, unknown>>(
  payload: T,
) {
  const compatibilityPayload = { ...payload };

  DEFERRED_TASK_RUNTIME_FIELDS.forEach((fieldName) => {
    delete compatibilityPayload[fieldName];
  });

  return compatibilityPayload;
}

export function isMissingTaskColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const errorCode =
    "code" in error ? String((error as { code?: unknown }).code || "") : "";
  return errorCode === "PGRST204" || errorCode === "42703";
}

/** Parse PostgREST / Postgres missing-column messages into a column name. */
export function getMissingTaskColumnFromError(error: unknown): string | null {
  if (!isMissingTaskColumnError(error)) {
    return null;
  }
  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  const errorDetails =
    error && typeof error === "object" && "details" in error
      ? String((error as { details?: unknown }).details || "")
      : "";
  const errorText = `${errorMessage} ${errorDetails}`;

  const quoted = errorText.match(/'([^']+)' column/i);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const dotted = errorText.match(/column\s+tasks\.([a-z0-9_]+)/i);
  if (dotted?.[1]) {
    return dotted[1];
  }
  return null;
}

export function getDeferredTaskSchemaField(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const errorCode =
    "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const isColumnNotExistsCode = errorCode === "PGRST204" || errorCode === "42703";
  if (!isColumnNotExistsCode) {
    return null;
  }

  const errorMessage =
    "message" in error
      ? String((error as { message?: unknown }).message || "")
      : "";
  const errorDetails =
    "details" in error ? String((error as { details?: unknown }).details || "") : "";
  const errorText = `${errorMessage} ${errorDetails} ${errorCode}`;

  return (
    DEFERRED_TASK_CREATE_SCHEMA_FIELDS.find((fieldName) =>
      errorText.includes(fieldName),
    ) || null
  );
}

export function isOptionalEvolvedTaskColumn(column: string): boolean {
  return (OPTIONAL_EVOLVED_TASK_COLUMNS as readonly string[]).includes(column);
}
