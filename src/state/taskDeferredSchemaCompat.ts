import { Task, TaskStatus } from "../types/buildtrack";

export const DEFERRED_TASK_CREATE_SCHEMA_FIELDS = [
  "primary_assignee_id",
  "delegated_user_ids",
  "container_id",
  "sub_container_id",
  "tags",
  "location_on_site",
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

export function stripDeferredTaskRuntimeFields<T extends Record<string, unknown>>(
  payload: T,
) {
  const compatibilityPayload = { ...payload };

  DEFERRED_TASK_RUNTIME_FIELDS.forEach((fieldName) => {
    delete compatibilityPayload[fieldName];
  });

  return compatibilityPayload;
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
