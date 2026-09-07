/**
 * S-UX-01K2 — who may edit primary/delegates, and who may be selected.
 *
 * Phase A assumptions (documented in ROADMAP):
 * - Edit authority = task creator (assignedBy), matching TASK_EDITING_PERMISSIONS.md
 * - Assignees lock after pre-acceptance statuses (same rule as Create `assigneesLocked`)
 * - Eligible assignees = active project members only
 *
 * Phase B assumptions (documented in ROADMAP — no product who→whom table exists):
 * - Actor privilege defaults from SystemPermission / legacy DB role strings
 * - `canSelectAssignee`: actor may select candidate iff rank(actor) >= rank(candidate)
 *   (peers + subordinates only; never up-rank)
 * - Unknown / missing candidate roles default to member (lowest assignable band)
 * - RLS / DB enforcement deferred
 */

export type TaskStatusLike = string | null | undefined;
export type AssigneeRoleLike = string | null | undefined;

/**
 * Privilege ranks for who→whom. Higher may assign equal-or-lower.
 * Aligns SystemPermission (admin/manager/member) with DB CHECK candidates
 * from M-SUPABASE-03a (worker/member/foreman/supervisor/company_admin/admin).
 */
export const ASSIGNEE_PRIVILEGE_RANK: Readonly<Record<string, number>> = {
  admin: 40,
  company_admin: 40,
  manager: 30,
  supervisor: 30,
  foreman: 20,
  member: 10,
  worker: 10,
};

export const DEFAULT_ASSIGNEE_PRIVILEGE_RANK = 10;

/** Statuses where primary/delegate membership may still change. */
export function areAssigneesLockedForStatus(status?: TaskStatusLike): boolean {
  return Boolean(
    status &&
      status !== "new" &&
      status !== "not_started" &&
      status !== "rejected" &&
      status !== "declined" &&
      status !== "reported",
  );
}

/**
 * Whether the actor may change primary assignee and/or delegates.
 * Create flow: always allowed for the signed-in creator (caller is composing a new task).
 * Triage flow: PM/admin promoting a report may choose assignees (defaults to reporter).
 */
export function canEditTaskDelegation(args: {
  actorUserId?: string | null;
  taskAssignedBy?: string | null;
  taskStatus?: TaskStatusLike;
  isCreateFlow?: boolean;
  /** Create-task-from-report — unlock assignees for the triaging PM. */
  isTriageFlow?: boolean;
}): boolean {
  const actorId = args.actorUserId == null ? "" : String(args.actorUserId).trim();
  if (!actorId) {
    return false;
  }

  if (args.isCreateFlow || args.isTriageFlow) {
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

/** Normalize role strings for rank lookup (worker→member already mirrored in ranks). */
export function normalizeAssigneeRoleKey(role?: AssigneeRoleLike): string {
  if (role == null) {
    return "";
  }
  return String(role).trim().toLowerCase();
}

export function getAssigneePrivilegeRank(role?: AssigneeRoleLike): number {
  const key = normalizeAssigneeRoleKey(role);
  if (!key) {
    return DEFAULT_ASSIGNEE_PRIVILEGE_RANK;
  }
  return ASSIGNEE_PRIVILEGE_RANK[key] ?? DEFAULT_ASSIGNEE_PRIVILEGE_RANK;
}

/**
 * Resolve the role string used for who→whom from a user-like object.
 * Prefers systemPermission, then legacy role.
 */
export function resolveAssigneeRoleFromUser(user?: {
  systemPermission?: string | null;
  role?: string | null;
} | null): string | undefined {
  if (!user) {
    return undefined;
  }
  const systemPermission =
    user.systemPermission == null ? "" : String(user.systemPermission).trim();
  if (systemPermission) {
    return systemPermission;
  }
  const role = user.role == null ? "" : String(user.role).trim();
  return role || undefined;
}

/**
 * Role→role who→whom gate: actor may select candidate when actor privilege ≥ candidate.
 * Missing actor role → deny (cannot evaluate privilege).
 * Missing/unknown candidate role → treated as member (lowest band).
 */
export function canSelectAssignee(args: {
  actorRole?: AssigneeRoleLike;
  candidateRole?: AssigneeRoleLike;
}): boolean {
  const actorKey = normalizeAssigneeRoleKey(args.actorRole);
  if (!actorKey) {
    return false;
  }
  return (
    getAssigneePrivilegeRank(args.actorRole) >=
    getAssigneePrivilegeRank(args.candidateRole)
  );
}

/** Candidate must be in the assignable project-member (or current-assignee) pool. */
export function canSelectUserAsAssignee(args: {
  candidateUserId?: string | null;
  assignableUserIds: ReadonlySet<string> | readonly string[];
  actorRole?: AssigneeRoleLike;
  candidateRole?: AssigneeRoleLike;
  /** Always allow selecting yourself when you are on the job. */
  actorUserId?: string | null;
}): boolean {
  const candidateId =
    args.candidateUserId == null ? "" : String(args.candidateUserId).trim();
  if (!candidateId) {
    return false;
  }

  const pool = args.assignableUserIds;
  const inPool = Array.isArray(pool)
    ? pool.some((id: string) => String(id) === candidateId)
    : (pool as ReadonlySet<string>).has(candidateId);
  if (!inPool) {
    return false;
  }

  const actorId =
    args.actorUserId == null ? "" : String(args.actorUserId).trim();
  if (actorId && actorId === candidateId) {
    return true;
  }

  const actorKey = normalizeAssigneeRoleKey(args.actorRole);
  if (!actorKey) {
    // Phase A pool-only path when caller has not supplied actor role.
    return true;
  }

  return canSelectAssignee({
    actorRole: args.actorRole,
    candidateRole: args.candidateRole,
  });
}

export function filterSelectableAssigneeIds(
  candidateIds: readonly string[],
  assignableUserIds: ReadonlySet<string> | readonly string[],
  options?: {
    actorRole?: AssigneeRoleLike;
    actorUserId?: string | null;
    roleByUserId?: ReadonlyMap<string, AssigneeRoleLike> | Record<string, AssigneeRoleLike>;
  },
): string[] {
  const roleByUserId = options?.roleByUserId;
  const lookupRole = (id: string): AssigneeRoleLike => {
    if (!roleByUserId) {
      return undefined;
    }
    if (typeof (roleByUserId as Map<string, AssigneeRoleLike>).get === "function") {
      return (roleByUserId as Map<string, AssigneeRoleLike>).get(id);
    }
    return (roleByUserId as Record<string, AssigneeRoleLike>)[id];
  };
  return candidateIds.filter((id) =>
    canSelectUserAsAssignee({
      candidateUserId: id,
      assignableUserIds,
      actorRole: options?.actorRole,
      actorUserId: options?.actorUserId,
      candidateRole: lookupRole(id),
    }),
  );
}

/** Filter user objects for Create picker display (pool + who→whom). */
export function filterSelectableAssigneeUsers<T extends { id: string }>(
  candidates: readonly T[],
  args: {
    actorRole?: AssigneeRoleLike;
    actorUserId?: string | null;
    resolveRole: (user: T) => AssigneeRoleLike;
  },
): T[] {
  const assignableIds = candidates.map((user) => user.id);
  return candidates.filter((user) =>
    canSelectUserAsAssignee({
      candidateUserId: user.id,
      assignableUserIds: assignableIds,
      actorRole: args.actorRole,
      actorUserId: args.actorUserId,
      candidateRole: args.resolveRole(user),
    }),
  );
}
