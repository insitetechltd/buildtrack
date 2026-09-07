import {
  assertValidTaskCreateInput,
  formatTaskCreateValidationError,
  isTaskAwaitingAssigneeAcceptance,
  normalizeCreateAssigneeIds,
  resolveClientTaskStatus,
  resolveInitialTaskCreateStatus,
  validateTaskCreateInput,
} from "../taskCreateValidation";

describe("taskCreateValidation", () => {
  const valid = {
    title: "Install conduit",
    projectId: "project-1",
    assignedBy: "pm-1",
    assignedTo: ["worker-1"],
  };

  it("accepts a valid create payload", () => {
    expect(validateTaskCreateInput(valid)).toEqual([]);
    expect(() => assertValidTaskCreateInput(valid)).not.toThrow();
  });

  it("rejects empty title", () => {
    expect(
      validateTaskCreateInput({ ...valid, title: "   " }),
    ).toContain("NO_TITLE");
  });

  it("rejects missing project", () => {
    expect(
      validateTaskCreateInput({ ...valid, projectId: "" }),
    ).toContain("NO_PROJECT");
  });

  it("rejects missing originator", () => {
    expect(
      validateTaskCreateInput({ ...valid, assignedBy: "" }),
    ).toContain("NO_ORIGINATOR");
  });

  it("rejects empty assignees (GAP_UNASSIGNED_OPEN at source)", () => {
    expect(
      validateTaskCreateInput({ ...valid, assignedTo: [] }),
    ).toContain("NO_ASSIGNEES");
  });

  it("trims assignee ids before counting", () => {
    expect(normalizeCreateAssigneeIds(["  ", "worker-1"])).toEqual(["worker-1"]);
    expect(
      validateTaskCreateInput({ ...valid, assignedTo: ["  ", ""] }),
    ).toContain("NO_ASSIGNEES");
  });

  it("formats the highest-priority validation error", () => {
    expect(
      formatTaskCreateValidationError(["NO_TITLE", "NO_ASSIGNEES"]),
    ).toBe("Title is required");
  });

  it("resolves in_progress for self-assigned create", () => {
    expect(
      resolveInitialTaskCreateStatus("pm-1", ["pm-1", "worker-1"]),
    ).toBe("in_progress");
  });

  it("resolves new for delegated create", () => {
    expect(resolveInitialTaskCreateStatus("pm-1", ["worker-1"])).toBe("new");
  });

  it("resolves reported for report_issue intent even with empty assignees", () => {
    expect(
      validateTaskCreateInput({ ...valid, assignedTo: [], intentMode: "report_issue" }),
    ).toEqual([]);
    expect(
      resolveInitialTaskCreateStatus("worker-1", [], "report_issue"),
    ).toBe("reported");
  });

  it("resolves in_progress for my_task intent mode", () => {
    expect(
      resolveInitialTaskCreateStatus("worker-1", ["worker-1"], "my_task"),
    ).toBe("in_progress");
  });

  it("preserves reported status in resolveClientTaskStatus without altering it", () => {
    expect(
      resolveClientTaskStatus({
        status: "reported",
        assigned_by: "worker-1",
        assigned_to: [],
      }),
    ).toBe("reported");
  });

  it("preserves dismissed status in resolveClientTaskStatus without altering it", () => {
    expect(
      resolveClientTaskStatus({
        status: "dismissed",
        assigned_by: "worker-1",
        assigned_to: [],
      }),
    ).toBe("dismissed");
  });

  it("does not await acceptance for self-assigned tasks still marked new", () => {
    expect(
      isTaskAwaitingAssigneeAcceptance({
        viewerUserId: "pm-1",
        status: "new",
        assignedBy: "pm-1",
        assignedTo: ["pm-1"],
      }),
    ).toBe(false);
  });

  it("does not await acceptance after accept persisted acceptedBy with stale new status", () => {
    expect(
      isTaskAwaitingAssigneeAcceptance({
        viewerUserId: "worker-1",
        status: "new",
        assignedBy: "pm-1",
        assignedTo: ["worker-1"],
        acceptedBy: "worker-1",
      }),
    ).toBe(false);
  });

  it("awaits acceptance for delegated unaccepted tasks", () => {
    expect(
      isTaskAwaitingAssigneeAcceptance({
        viewerUserId: "worker-1",
        status: "new",
        assignedBy: "pm-1",
        assignedTo: ["worker-1"],
      }),
    ).toBe(true);
  });

  it("heals self-assigned rows whose status column stayed at default new", () => {
    expect(
      resolveClientTaskStatus({
        status: "new",
        current_status: "in_progress",
        assigned_by: "pm-1",
        assigned_to: ["pm-1"],
        accepted_by: "pm-1",
      }),
    ).toBe("in_progress");
  });

  it("heals accepted rows whose status column stayed at default new", () => {
    expect(
      resolveClientTaskStatus({
        status: "new",
        current_status: "in_progress",
        assigned_by: "pm-1",
        assigned_to: ["worker-1"],
        accepted_by: "worker-1",
      }),
    ).toBe("in_progress");
  });

  it("keeps delegated unaccepted rows as new", () => {
    expect(
      resolveClientTaskStatus({
        status: "new",
        current_status: "new",
        assigned_by: "pm-1",
        assigned_to: ["worker-1"],
      }),
    ).toBe("new");
  });
});
