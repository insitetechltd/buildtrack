import {
  assertValidTaskCreateInput,
  formatTaskCreateValidationError,
  normalizeCreateAssigneeIds,
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
});
