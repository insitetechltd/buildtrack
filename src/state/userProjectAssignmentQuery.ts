/**
 * NEW schema (DEV≡PROD): UPA rows use `created_at` only (no `assigned_at`).
 */

export type AssignmentListFilter =
  | { userId: string; projectId?: never }
  | { projectId: string; userId?: never };

type AssignmentQueryClient = {
  from: (table: string) => any;
};

/** @deprecated NEW-only — assigned_at never present; kept for call-site compatibility. */
export function isMissingAssignedAtColumnError(
  _error: { code?: string; message?: string } | null | undefined,
): boolean {
  return false;
}

export function assignmentTimestamp(row: {
  assigned_at?: string | null;
  created_at?: string | null;
}): string {
  return row.created_at || row.assigned_at || "";
}

/** Active assignments for a user or project, newest first. */
export async function selectActiveUserProjectAssignments(
  client: AssignmentQueryClient,
  filter: AssignmentListFilter,
): Promise<{ data: any[] | null; error: any }> {
  let query = client
    .from("user_project_assignments")
    .select("*")
    .eq("is_active", true);
  if ("userId" in filter && filter.userId) {
    query = query.eq("user_id", filter.userId);
  }
  if ("projectId" in filter && filter.projectId) {
    query = query.eq("project_id", filter.projectId);
  }
  return query.order("created_at", { ascending: false });
}
