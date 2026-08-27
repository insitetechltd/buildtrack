import {
  canManageProjectRoster,
  companyUsersEligibleForProjectAdd,
  getProjectMembershipLabel,
  getProjectRoleLabel,
  isEligibleProjectAdminCandidate,
  MEMBER_GRANT_CATEGORY,
  PROJECT_ADMIN_GRANT_CATEGORY,
  upsertProjectMembership,
  type ProjectMembershipWriter,
} from "../projectMembership";
import type { User, UserProjectAssignment } from "@/types/buildtrack";

describe("projectMembership contract", () => {
  const worker: User = {
    id: "u-worker",
    name: "Alice",
    email: "a@x.test",
    role: "worker",
    systemPermission: "member",
    companyId: "co-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as User;

  const otherCompany: User = {
    ...worker,
    id: "u-out",
    companyId: "co-2",
  };

  const pending: User = {
    ...worker,
    id: "u-pending",
    isPending: true,
  };

  const admin: User = {
    ...worker,
    id: "u-admin",
    role: "admin",
    systemPermission: "admin",
  };

  const manager: User = {
    ...worker,
    id: "u-mgr",
    role: "manager",
    systemPermission: "manager",
  };

  it("labels Project Admin grant; member grant is Member (not trade titles)", () => {
    expect(getProjectRoleLabel(PROJECT_ADMIN_GRANT_CATEGORY)).toBe("Project Admin");
    expect(getProjectRoleLabel(MEMBER_GRANT_CATEGORY)).toBe("Member");
  });

  it("limits add-member pool to same-company non-pending users", () => {
    expect(
      companyUsersEligibleForProjectAdd(
        [worker, otherCompany, pending, admin],
        "co-1",
        ["u-admin"],
      ).map((user) => user.id),
    ).toEqual(["u-worker"]);
  });

  it("lets host company admin and PM seats be Project Admin candidates — not workers", () => {
    expect(isEligibleProjectAdminCandidate(admin)).toBe(true);
    expect(isEligibleProjectAdminCandidate(manager)).toBe(true);
    expect(isEligibleProjectAdminCandidate(worker)).toBe(false);
  });

  it("places people as member by default without trade roles", async () => {
    const writer: ProjectMembershipWriter = {
      assignUserToProject: jest.fn().mockResolvedValue(undefined),
      updateUserProjectCategory: jest.fn(),
    };

    await upsertProjectMembership(writer, {
      userId: "u-worker",
      projectId: "p1",
      assignedBy: "admin",
      assignments: [],
    });

    expect(writer.assignUserToProject).toHaveBeenCalledWith(
      "u-worker",
      "p1",
      MEMBER_GRANT_CATEGORY,
      "admin",
    );
  });

  it("rejects crowning a worker as Project Admin when candidate is provided", async () => {
    const writer: ProjectMembershipWriter = {
      assignUserToProject: jest.fn(),
      updateUserProjectCategory: jest.fn(),
    };

    await expect(
      upsertProjectMembership(writer, {
        userId: worker.id,
        projectId: "p1",
        asProjectAdmin: true,
        assignedBy: "admin",
        assignments: [],
        candidateUser: worker,
      }),
    ).rejects.toThrow(/company admin or PM/);
  });

  it("crowns Project Admin and demotes previous PA to member without removing them", async () => {
    const assignUserToProject = jest.fn().mockResolvedValue(undefined);
    const updateUserProjectCategory = jest.fn().mockResolvedValue(undefined);
    const writer: ProjectMembershipWriter = {
      assignUserToProject,
      updateUserProjectCategory,
    };
    const assignments: UserProjectAssignment[] = [
      {
        id: "a1",
        userId: "old-pa",
        projectId: "p1",
        category: PROJECT_ADMIN_GRANT_CATEGORY,
        assignedAt: "2026-01-01T00:00:00.000Z",
        assignedBy: "admin",
        isActive: true,
      },
    ];

    const result = await upsertProjectMembership(writer, {
      userId: "new-pa",
      projectId: "p1",
      asProjectAdmin: true,
      assignedBy: "admin",
      assignments,
      candidateUser: manager,
    });

    expect(result).toBe("inserted");
    expect(assignUserToProject).toHaveBeenCalledWith(
      "new-pa",
      "p1",
      PROJECT_ADMIN_GRANT_CATEGORY,
      "admin",
    );
    expect(updateUserProjectCategory).toHaveBeenCalledWith(
      "old-pa",
      "p1",
      MEMBER_GRANT_CATEGORY,
    );
  });

  it("updates membership when the user is already on the project", async () => {
    const writer: ProjectMembershipWriter = {
      assignUserToProject: jest.fn(),
      updateUserProjectCategory: jest.fn().mockResolvedValue(undefined),
    };
    const result = await upsertProjectMembership(writer, {
      userId: "u-worker",
      projectId: "p1",
      assignedBy: "admin",
      assignments: [
        {
          id: "a2",
          userId: "u-worker",
          projectId: "p1",
          category: "inspector",
          assignedAt: "2026-01-01T00:00:00.000Z",
          assignedBy: "admin",
          isActive: true,
        },
      ],
    });

    expect(result).toBe("updated");
    expect(writer.assignUserToProject).not.toHaveBeenCalled();
    expect(writer.updateUserProjectCategory).toHaveBeenCalledWith(
      "u-worker",
      "p1",
      MEMBER_GRANT_CATEGORY,
    );
  });

  it("gates on-job roster management to Project Admin grant only", () => {
    const paAssignment: UserProjectAssignment = {
      id: "a-pa",
      userId: "u-mgr",
      projectId: "p1",
      category: PROJECT_ADMIN_GRANT_CATEGORY,
      assignedAt: "2026-01-01T00:00:00.000Z",
      assignedBy: "admin",
      isActive: true,
    };
    const memberAssignment: UserProjectAssignment = {
      id: "a-ca",
      userId: "u-admin",
      projectId: "p1",
      category: MEMBER_GRANT_CATEGORY,
      assignedAt: "2026-01-01T00:00:00.000Z",
      assignedBy: "admin",
      isActive: true,
    };

    expect(canManageProjectRoster(manager, "p1", [paAssignment])).toBe(true);
    expect(canManageProjectRoster(admin, "p1", [memberAssignment])).toBe(false);
    expect(canManageProjectRoster(admin, "p1", [])).toBe(false);
    expect(getProjectMembershipLabel(paAssignment)).toBe("Project Admin");
    expect(getProjectMembershipLabel(memberAssignment)).toBe("Member");
    expect(
      getProjectMembershipLabel({
        ...memberAssignment,
        category: "contractor",
      }),
    ).toBe("Member");
  });
});
