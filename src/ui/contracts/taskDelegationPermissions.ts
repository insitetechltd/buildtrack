/**
 * S-UX-01K2 — who may edit primary/delegates, and who may be selected.
 *
 * Phase A assumptions (documented in ROADMAP):
 * - Edit authority = task creator (assignedBy), matching TASK_EDITING_PERMISSIONS.md
 * - Assignees lock after pre-acceptance statuses (same rule as Create `assigneesLocked`)
 * - Eligible assignees = active project members only; no role→role matrix yet
 *   (matrix docs define SystemPermission / ProjectRole concepts but no who→whom rules)
 */

export type TaskStatusLike = string | null | undefined;

/** Statuses where primary/delegate membership may still change. */
export function areAssigneesLockedForStatus(status?: TaskStatusLike): boolean {
  return Boolean(
    status &&
      status !== "new" &&
      status !== "not_started" &&
      status !== "rejected" &&
      status !== "declined",
  );
}

/**
 * Whether the actor may change primary assignee and/or delegates.
 * Create flow: always allowed for the signed-in creator (caller is composing a new task).
 */
export function canEditTaskDelegation(args: {
  actorUserId?: string | null;
  taskAssignedBy?: string | null;
  taskStatus?: TaskStatusLike;
  isCreateFlow?: boolean;
}): boolean {
  const actorId = args.actorUserId == null ? "" : String(args.actorUserId).trim();
  if (!actorId) {
    return false;
  }

  if (args.isCreateFlow) {
    return true;
  }

  const assignedBy =
    args.taskAssignedBy == null ? "" : String(args.taskAssignedBy).trim();
  if (!assignedBy || assignedBy !== actorId) {
    return false;
  }

  if (areAssigneesLockedForStatus(args.taskStatus)) {
    return false;
  }

  return true;
}

/** Candidate must be in the assignable project-member (or current-assignee) pool. */
export function canSelectUserAsAssignee(args: {
  candidateUserId?: string | null;
  assignableUserIds: ReadonlySet<string> | readonly string[];
}): boolean {
  const candidateId =
    args.candidateUserId == null ? "" : String(args.candidateUserId).trim();
  if (!candidateId) {
    return false;
  }

  const pool = args.assignableUserIds;
  if (Array.isArray(pool)) {
    return pool.some((id: string) => String(id) === candidateId);
  }

  return pool.has(candidateId);
}

export function filterSelectableAssigneeIds(
  candidateIds: readonly string[],
  assignableUserIds: ReadonlySet<string> | readonly string[],
): string[] {
  return candidateIds.filter((id) =>
    canSelectUserAsAssignee({ candidateUserId: id, assignableUserIds }),
  );
}
