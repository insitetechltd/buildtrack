/**
 * PROD greenfield UPA rows use `created_at` (no `assigned_at`).
 * Older DEV tenants still have `assigned_at`. Order must dual-path.
 */

export type AssignmentListFilter =
  | { userId: string; projectId?: never }
  | { projectId: string; userId?: never };

type AssignmentQueryClient = {
  from: (table: string) => any;
};

export function isMissingAssignedAtColumnError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  if (!message.includes("assigned_at")) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export function assignmentTimestamp(row: {
  assigned_at?: string | null;
  created_at?: string | null;
}): string {
  return row.assigned_at || row.created_at || "";
}

/** Active assignments for a user or project, newest first. */
export async function selectActiveUserProjectAssignments(
  client: AssignmentQueryClient,
  filter: AssignmentListFilter,
): Promise<{ data: any[] | null; error: any }> {
  const build = () => {
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
    return query;
  };

  const preferred = await build().order("assigned_at", { ascending: false });
  if (!preferred.error) {
    return preferred;
  }
  if (!isMissingAssignedAtColumnError(preferred.error)) {
    return preferred;
  }
  return build().order("created_at", { ascending: false });
}
