import {
  areAssigneesLockedForStatus,
  canEditTaskDelegation,
  canSelectUserAsAssignee,
  filterSelectableAssigneeIds,
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
  });
});
