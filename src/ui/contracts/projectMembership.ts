import {
  getProjectRole,
  getUserSystemPermission,
  isLeadProjectManager,
  type ProjectRole,
  type User,
  type UserProjectAssignment,
} from "@/types/buildtrack";

/**
 * Storage shims until a dedicated grant column exists.
 * Multi-company later adds `liaison` — never host PA for partner people by default.
 * @see documentation/multi-company-project-membership.md
 * @see docs/superpowers/plans/2026-08-24-m-authz-rc-implement.md
 */
export const MEMBER_GRANT_CATEGORY: ProjectRole = "worker";
export const PROJECT_ADMIN_GRANT_CATEGORY: ProjectRole = "lead_project_manager";

/** @deprecated Trade labels are not ACL — do not collect in Place-on-a-job. Kept for legacy display. */
export const PROJECT_ROLES: ProjectRole[] = [
  "lead_project_manager",
  "contractor",
  "subcontractor",
  "inspector",
  "architect",
  "engineer",
  "worker",
  "foreman",
];

export function getProjectRoleLabel(role: ProjectRole): string {
  if (role === PROJECT_ADMIN_GRANT_CATEGORY) {
    return "Project Admin";
  }
  if (role === MEMBER_GRANT_CATEGORY) {
    return "Member";
  }
  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/** Roster row label — never surface legacy trade titles as ACL. */
export function getProjectMembershipLabel(
  assignment: UserProjectAssignment | null | undefined,
): string {
  return isProjectAdminAssignment(assignment) ? "Project Admin" : "Member";
}

/** True when viewer holds Project Admin grant on this job (not company CA alone). */
export function canManageProjectRoster(
  viewer: User | null | undefined,
  projectId: string,
  assignments: UserProjectAssignment[],
): boolean {
  if (!viewer?.id || !projectId) {
    return false;
  }
  const own = assignments.find(
    (assignment) =>
      assignment.projectId === projectId &&
      assignment.userId === viewer.id &&
      assignment.isActive,
  );
  return isProjectAdminAssignment(own);
}

/** Same-company, active roster — never a global people directory (AUTHZ-02 Path A reuses this scope). */
export function companyUsersEligibleForProjectAdd(
  users: User[],
  companyId: string | undefined,
  excludeUserIds: string[],
): User[] {
  if (!companyId) {
    return [];
  }

  const excluded = new Set(excludeUserIds);
  return users.filter(
    (candidate) =>
      candidate.companyId === companyId &&
      !excluded.has(candidate.id) &&
      candidate.isPending !== true,
  );
}

/**
 * Host CA or PM only. Workers cannot be PA (anti-disguise).
 * Partner / guest users must not receive host PA (multi-company law).
 */
export function isEligibleProjectAdminCandidate(user: User): boolean {
  const permission = getUserSystemPermission(user);
  return permission === "manager" || permission === "admin";
}

/** @deprecated Use isEligibleProjectAdminCandidate */
export const isEligibleLeadPmCandidate = isEligibleProjectAdminCandidate;

export function isProjectAdminAssignment(
  assignment: UserProjectAssignment | null | undefined,
): boolean {
  return isLeadProjectManager(assignment);
}

export function activeProjectAdminAssignments(
  assignments: UserProjectAssignment[],
  projectId: string,
): UserProjectAssignment[] {
  return assignments.filter(
    (assignment) =>
      assignment.projectId === projectId &&
      assignment.isActive &&
      isProjectAdminAssignment(assignment),
  );
}

/** @deprecated Use activeProjectAdminAssignments */
export const activeLeadAssignments = activeProjectAdminAssignments;

export type ProjectMembershipWriter = {
  assignUserToProject: (
    userId: string,
    projectId: string,
    category: ProjectRole,
    assignedBy: string,
  ) => Promise<void>;
  updateUserProjectCategory: (
    userId: string,
    projectId: string,
    category: ProjectRole,
  ) => Promise<void>;
};

/**
 * Place on a job as member (default) or crown as Project Admin.
 * PA uniqueness: demote previous PA to member; keep them on the job.
 */
export async function upsertProjectMembership(
  writer: ProjectMembershipWriter,
  args: {
    userId: string;
    projectId: string;
    /** @deprecated Prefer asProjectAdmin. Trade roles are ignored — coerced to member or PA shim. */
    role?: ProjectRole;
    asProjectAdmin?: boolean;
    assignedBy: string;
    assignments: UserProjectAssignment[];
    /** Optional guard — reject crowning non-CA/PM when provided. */
    candidateUser?: User;
  },
): Promise<"inserted" | "updated"> {
  const { userId, projectId, assignedBy, assignments, candidateUser } = args;
  const asProjectAdmin =
    args.asProjectAdmin === true || args.role === PROJECT_ADMIN_GRANT_CATEGORY;

  if (asProjectAdmin && candidateUser && !isEligibleProjectAdminCandidate(candidateUser)) {
    throw new Error("Project Admin can only be a company admin or PM on this job");
  }

  const role: ProjectRole = asProjectAdmin
    ? PROJECT_ADMIN_GRANT_CATEGORY
    : MEMBER_GRANT_CATEGORY;

  const projectAssignments = assignments.filter(
    (assignment) => assignment.projectId === projectId && assignment.isActive,
  );

  const existing = projectAssignments.find((assignment) => assignment.userId === userId);
  let result: "inserted" | "updated";

  if (existing) {
    const currentRole = getProjectRole(existing);
    if (currentRole !== role) {
      await writer.updateUserProjectCategory(userId, projectId, role);
    }
    result = "updated";
  } else {
    await writer.assignUserToProject(userId, projectId, role, assignedBy);
    result = "inserted";
  }

  if (asProjectAdmin) {
    const otherAdmins = activeProjectAdminAssignments(projectAssignments, projectId).filter(
      (assignment) => assignment.userId !== userId,
    );
    for (const prior of otherAdmins) {
      await writer.updateUserProjectCategory(
        prior.userId,
        projectId,
        MEMBER_GRANT_CATEGORY,
      );
    }
  }

  return result;
}
