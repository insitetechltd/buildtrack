import {
  companyUsersEligibleForProjectAdd,
  getProjectRoleLabel,
  isEligibleProjectAdminCandidate,
  MEMBER_GRANT_CATEGORY,
  PROJECT_ADMIN_GRANT_CATEGORY,
  upsertProjectMembership,
  type ProjectMembershipWriter,
} from "@/ui/contracts/projectMembership";
import type { User, UserProjectAssignment } from "@/types/buildtrack";

export type CreateProjectTeamMemberDraft = {
  userId: string;
  asProjectAdmin: boolean;
};

export type CreateProjectRosterCandidate = {
  userId: string;
  name: string;
  subtitle: string;
  canBeProjectAdmin: boolean;
};

/** Build same-company roster rows for Create Project (ACL labels only). */
export function buildCreateProjectRosterCandidates(
  users: User[],
  companyId: string | undefined,
): CreateProjectRosterCandidate[] {
  return companyUsersEligibleForProjectAdd(users, companyId, []).map((user) => {
    const canBeProjectAdmin = isEligibleProjectAdminCandidate(user);
    return {
      userId: user.id,
      name: user.name || user.email || "User",
      subtitle: canBeProjectAdmin
        ? `${getProjectRoleLabel(PROJECT_ADMIN_GRANT_CATEGORY)} eligible`
        : getProjectRoleLabel(MEMBER_GRANT_CATEGORY),
      canBeProjectAdmin,
    };
  });
}

/**
 * Drop unknowns / dual-PA / illegal PA crowns before write.
 * At most one Project Admin survives (first wins).
 */
export function normalizeCreateProjectTeamMembers(
  drafts: CreateProjectTeamMemberDraft[],
  usersById: Record<string, User>,
): CreateProjectTeamMemberDraft[] {
  const seen = new Set<string>();
  const normalized: CreateProjectTeamMemberDraft[] = [];
  let projectAdminTaken = false;

  for (const draft of drafts) {
    const userId = String(draft.userId || "").trim();
    if (!userId || seen.has(userId)) {
      continue;
    }
    const user = usersById[userId];
    if (!user) {
      continue;
    }

    let asProjectAdmin = draft.asProjectAdmin === true;
    if (asProjectAdmin && !isEligibleProjectAdminCandidate(user)) {
      asProjectAdmin = false;
    }
    if (asProjectAdmin && projectAdminTaken) {
      asProjectAdmin = false;
    }
    if (asProjectAdmin) {
      projectAdminTaken = true;
    }

    seen.add(userId);
    normalized.push({ userId, asProjectAdmin });
  }

  return normalized;
}

export function countCreateProjectAdmins(
  drafts: CreateProjectTeamMemberDraft[],
): number {
  return drafts.filter((draft) => draft.asProjectAdmin).length;
}

/** Place selected people after the project row exists. Continues on per-user errors. */
export async function placeCreateProjectTeamMembers(args: {
  writer: ProjectMembershipWriter;
  projectId: string;
  assignedBy: string;
  members: CreateProjectTeamMemberDraft[];
  usersById: Record<string, User>;
  assignments?: UserProjectAssignment[];
}): Promise<{ placed: string[]; failed: Array<{ userId: string; message: string }> }> {
  const placed: string[] = [];
  const failed: Array<{ userId: string; message: string }> = [];
  let assignments = args.assignments ?? [];

  for (const member of args.members) {
    const candidateUser = args.usersById[member.userId];
    if (!candidateUser) {
      failed.push({ userId: member.userId, message: "User not found" });
      continue;
    }
    try {
      await upsertProjectMembership(args.writer, {
        userId: member.userId,
        projectId: args.projectId,
        asProjectAdmin: member.asProjectAdmin,
        assignedBy: args.assignedBy,
        assignments,
        candidateUser,
      });
      placed.push(member.userId);
      assignments = [
        ...assignments.filter(
          (row) =>
            !(
              row.projectId === args.projectId &&
              row.userId === member.userId &&
              row.isActive
            ),
        ),
        {
          userId: member.userId,
          projectId: args.projectId,
          category: member.asProjectAdmin
            ? PROJECT_ADMIN_GRANT_CATEGORY
            : MEMBER_GRANT_CATEGORY,
          assignedAt: new Date().toISOString(),
          assignedBy: args.assignedBy,
          isActive: true,
        },
      ];
    } catch (error) {
      failed.push({
        userId: member.userId,
        message: error instanceof Error ? error.message : "Unable to place user",
      });
    }
  }

  return { placed, failed };
}
