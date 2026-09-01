/**
 * HQ Edge-local copies of owner-task-query-contract.md named predicates.
 * Do not import Taskr modules from Deno — duplicate lives in
 * src/state/taskQueryPredicates.ts.
 */

export type TaskQueryRow = {
  deleted_at?: string | null;
  archived_at?: string | null;
  cancelled_at?: string | null;
  assigned_to?: unknown;
  primary_assignee_id?: string | null;
  assigned_by?: string | null;
  delegated_user_ids?: unknown;
  status?: string | null;
  current_status?: string | null;
  title?: string | null;
};

export type TaskRelationRole = "assigner" | "assignee" | "delegate";

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id)).filter(Boolean);
}

/** Contract §4.1 TASK_LISTABLE */
export function isTaskListable(row: TaskQueryRow): boolean {
  return row.deleted_at == null && row.archived_at == null && row.cancelled_at == null;
}

/** Contract §4.2a TASK_ASSIGNED_TO_USER */
export function isTaskAssignedToUser(row: TaskQueryRow, userId: string): boolean {
  if (!userId) return false;
  if (idList(row.assigned_to).includes(userId)) return true;
  return String(row.primary_assignee_id ?? "") === userId;
}

/** Contract §4.2b relationRoles for TASK_RELATED_TO_USER */
export function taskRelationRoles(row: TaskQueryRow, userId: string): TaskRelationRole[] {
  const roles: TaskRelationRole[] = [];
  if (!userId) return roles;
  if (String(row.assigned_by ?? "") === userId) roles.push("assigner");
  if (isTaskAssignedToUser(row, userId)) roles.push("assignee");
  if (idList(row.delegated_user_ids).includes(userId)) roles.push("delegate");
  return roles;
}

/** Contract §4.2b TASK_RELATED_TO_USER */
export function isTaskRelatedToUser(row: TaskQueryRow, userId: string): boolean {
  return taskRelationRoles(row, userId).length > 0;
}

/** Contract §4.4 TASK_EFFECTIVE_STATUS — nullish coalescing, not || */
export function taskEffectiveStatus(row: {
  status?: string | null;
  current_status?: string | null;
}): string {
  return row.status ?? row.current_status ?? "new";
}

/** Contract §4.5 TASK_SEARCH_TITLE input hygiene */
export function sanitizeTaskSearchTitle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/[%*_]/g, "").slice(0, 80);
}

/** Contract §4.5 title-only match (JS stand-in for ILIKE) */
export function matchesTaskSearchTitle(
  title: string | null | undefined,
  query: string,
): boolean {
  const q = sanitizeTaskSearchTitle(query).toLowerCase();
  if (!q) return true;
  return (title ?? "").toLowerCase().includes(q);
}

/** PostgREST `or()` body for TASK_EFFECTIVE_STATUS filter (HQ Edge only). */
export function postgrestEffectiveStatusFilter(status: string): string {
  return `status.eq.${status},and(status.is.null,current_status.eq.${status})`;
}
