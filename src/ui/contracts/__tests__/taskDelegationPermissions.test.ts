import {
  areAssigneesLockedForStatus,
  canEditTaskDelegation,
  canSelectAssignee,
  canSelectUserAsAssignee,
  filterSelectableAssigneeIds,
  filterSelectableAssigneeUsers,
  getAssigneePrivilegeRank,
  resolveAssigneeRoleFromUser,
} from "../taskDelegationPermissions";

describe("taskDelegationPermissions", () => {
  describe("areAssigneesLockedForStatus", () => {
    it("allows change on pre-acceptance / reject statuses", () => {
      expect(areAssigneesLockedForStatus(undefined)).toBe(false);
      expect(areAssigneesLockedForStatus("new")).toBe(false);
      expect(areAssigneesLockedForStatus("not_started")).toBe(false);
      expect(areAssigneesLockedForStatus("rejected")).toBe(false);
      expect(areAssigneesLockedForStatus("declined")).toBe(false);
    });

    it("locks after acceptance / active work", () => {
      expect(areAssigneesLockedForStatus("accepted")).toBe(true);
      expect(areAssigneesLockedForStatus("in_progress")).toBe(true);
      expect(areAssigneesLockedForStatus("submitted_for_review")).toBe(true);
      expect(areAssigneesLockedForStatus("completed")).toBe(true);
    });
  });

  describe("canEditTaskDelegation", () => {
    it("allows create flow for a signed-in actor", () => {
      expect(
        canEditTaskDelegation({
          actorUserId: "creator-1",
          isCreateFlow: true,
        }),
      ).toBe(true);
    });

    it("denies create flow without actor", () => {
      expect(canEditTaskDelegation({ isCreateFlow: true })).toBe(false);
    });

    it("allows task creator when assignees are not locked", () => {
      expect(
        canEditTaskDelegation({
          actorUserId: "creator-1",
          taskAssignedBy: "creator-1",
          taskStatus: "new",
        }),
      ).toBe(true);
    });

    it("denies non-creator even when status is editable", () => {
      expect(
        canEditTaskDelegation({
          actorUserId: "other-1",
          taskAssignedBy: "creator-1",
          taskStatus: "new",
        }),
      ).toBe(false);
    });

    it("denies creator when assignees are locked by status", () => {
      expect(
        canEditTaskDelegation({
          actorUserId: "creator-1",
          taskAssignedBy: "creator-1",
          taskStatus: "in_progress",
        }),
      ).toBe(false);
    });
  });

  describe("canSelectAssignee (who→whom privilege)", () => {
    it("ranks admin/company_admin above manager/supervisor above foreman above member/worker", () => {
      expect(getAssigneePrivilegeRank("admin")).toBeGreaterThan(
        getAssigneePrivilegeRank("manager"),
      );
      expect(getAssigneePrivilegeRank("company_admin")).toBe(
        getAssigneePrivilegeRank("admin"),
      );
      expect(getAssigneePrivilegeRank("supervisor")).toBe(
        getAssigneePrivilegeRank("manager"),
      );
      expect(getAssigneePrivilegeRank("foreman")).toBeGreaterThan(
        getAssigneePrivilegeRank("member"),
      );
      expect(getAssigneePrivilegeRank("worker")).toBe(
        getAssigneePrivilegeRank("member"),
      );
    });

    it("allows peer and down-rank selection; denies up-rank", () => {
      expect(
        canSelectAssignee({ actorRole: "manager", candidateRole: "member" }),
      ).toBe(true);
      expect(
        canSelectAssignee({ actorRole: "manager", candidateRole: "manager" }),
      ).toBe(true);
      expect(
        canSelectAssignee({ actorRole: "member", candidateRole: "manager" }),
      ).toBe(false);
      expect(
        canSelectAssignee({ actorRole: "foreman", candidateRole: "supervisor" }),
      ).toBe(false);
      expect(
        canSelectAssignee({
          actorRole: "admin",
          candidateRole: "company_admin",
        }),
      ).toBe(true);
    });

    it("denies when actor role is missing", () => {
      expect(canSelectAssignee({ candidateRole: "member" })).toBe(false);
    });

    it("treats missing candidate role as member band", () => {
      expect(canSelectAssignee({ actorRole: "member" })).toBe(true);
      expect(canSelectAssignee({ actorRole: "worker", candidateRole: undefined })).toBe(
        true,
      );
    });
  });

  describe("resolveAssigneeRoleFromUser", () => {
    it("prefers systemPermission over legacy role", () => {
      expect(
        resolveAssigneeRoleFromUser({
          systemPermission: "manager",
          role: "worker",
        }),
      ).toBe("manager");
      expect(resolveAssigneeRoleFromUser({ role: "foreman" })).toBe("foreman");
    });
  });

  describe("canSelectUserAsAssignee / filterSelectableAssigneeIds", () => {
    it("requires membership in the assignable pool", () => {
      const pool = new Set(["u1", "u2"]);
      expect(
        canSelectUserAsAssignee({ candidateUserId: "u1", assignableUserIds: pool }),
      ).toBe(true);
      expect(
        canSelectUserAsAssignee({ candidateUserId: "u9", assignableUserIds: pool }),
      ).toBe(false);
      expect(
        canSelectUserAsAssignee({
          candidateUserId: "u2",
          assignableUserIds: ["u1", "u2"],
        }),
      ).toBe(true);
    });

    it("filters candidates to the assignable pool", () => {
      expect(filterSelectableAssigneeIds(["u1", "u9", "u2"], ["u1", "u2"])).toEqual([
        "u1",
        "u2",
      ]);
    });

    it("applies who→whom when actorRole is provided", () => {
      expect(
        canSelectUserAsAssignee({
          candidateUserId: "u-mgr",
          assignableUserIds: ["u-mgr", "u-mem"],
          actorRole: "member",
          candidateRole: "manager",
        }),
      ).toBe(false);
      expect(
        canSelectUserAsAssignee({
          candidateUserId: "u-mem",
          assignableUserIds: ["u-mgr", "u-mem"],
          actorRole: "member",
          candidateRole: "member",
        }),
      ).toBe(true);
    });

    it("filters ids by role map when actorRole set", () => {
      expect(
        filterSelectableAssigneeIds(["u-mgr", "u-mem"], ["u-mgr", "u-mem"], {
          actorRole: "member",
          roleByUserId: { "u-mgr": "manager", "u-mem": "member" },
        }),
      ).toEqual(["u-mem"]);
    });

    it("filters user objects for Create picker", () => {
      const users = [
        { id: "a", role: "admin" },
        { id: "m", role: "member" },
      ];
      expect(
        filterSelectableAssigneeUsers(users, {
          actorRole: "manager",
          resolveRole: (u) => u.role,
        }).map((u) => u.id),
      ).toEqual(["m"]);
    });

    it("always allows selecting yourself when you are in the assignable pool", () => {
      expect(
        canSelectUserAsAssignee({
          candidateUserId: "me",
          assignableUserIds: ["me", "peer"],
          actorRole: "member",
          candidateRole: "admin",
          actorUserId: "me",
        }),
      ).toBe(true);
    });
  });
});
