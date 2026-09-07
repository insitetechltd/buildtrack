import type { TaskStatus } from "@/types/buildtrack";
import {
  assertValidTaskUpdate,
  isTerminalTaskStatus,
  projectTaskUpdate,
  taskRequiresAssignees,
  validateTaskUpdateProjection,
} from "../taskUpdateValidation";

const openTask = {
  title: "Install conduit",
  projectId: "project-1",
  assignedBy: "pm-1",
  assignedTo: ["worker-1"],
  status: "new" as TaskStatus,
};

describe("taskUpdateValidation", () => {
  it("accepts a valid projected update", () => {
    expect(validateTaskUpdateProjection(openTask)).toEqual([]);
    expect(() =>
      assertValidTaskUpdate(openTask, { title: "Updated title" }),
    ).not.toThrow();
  });

  it("rejects clearing all assignees on open tasks", () => {
    expect(
      validateTaskUpdateProjection({ ...openTask, assignedTo: [] }),
    ).toContain("NO_ASSIGNEES");

    expect(() =>
      assertValidTaskUpdate(openTask, { assignedTo: [] }),
    ).toThrow(/assign this task/i);
  });

  it("allows empty assignees on terminal tasks", () => {
    expect(
      validateTaskUpdateProjection({
        ...openTask,
        status: "approved",
        assignedTo: [],
      }),
    ).toEqual([]);
  });

  it("rejects in_progress without assignees", () => {
    expect(
      validateTaskUpdateProjection({
        ...openTask,
        status: "in_progress",
        assignedTo: [],
      }),
    ).toContain("NO_ASSIGNEES");
  });

  it("rejects self-assigned new status (GAP_SELF_NEW at source)", () => {
    expect(
      validateTaskUpdateProjection({
        ...openTask,
        status: "new",
        assignedTo: ["pm-1"],
      }),
    ).toContain("SELF_ASSIGNED_MUST_BE_IN_PROGRESS");
  });

  it("skips validation for non-structural updates", () => {
    expect(() =>
      assertValidTaskUpdate(
        { ...openTask, assignedTo: [], status: "in_progress" },
        { description: "only narrative" } as Partial<typeof openTask>,
      ),
    ).not.toThrow();
  });

  it("merges current state with partial updates", () => {
    expect(
      projectTaskUpdate(openTask, { title: "  Patched  " }).title,
    ).toBe("  Patched  ");
    expect(projectTaskUpdate(openTask, {}).status).toBe("new");
  });

  it("allows empty assignees while status is reported (PM triage edit)", () => {
    expect(
      validateTaskUpdateProjection({
        ...openTask,
        status: "reported",
        assignedTo: [],
      }),
    ).toEqual([]);

    expect(() =>
      assertValidTaskUpdate(
        {
          ...openTask,
          status: "reported",
          assignedTo: [],
        },
        { title: "Clarified report title" },
      ),
    ).not.toThrow();
  });

  it("allows empty assignees on resolved reports", () => {
    expect(
      validateTaskUpdateProjection({
        ...openTask,
        status: "resolved",
        assignedTo: [],
      }),
    ).toEqual([]);
  });

  it("classifies terminal vs assignee-required statuses", () => {
    expect(isTerminalTaskStatus("approved")).toBe(true);
    expect(isTerminalTaskStatus("resolved")).toBe(true);
    expect(isTerminalTaskStatus("in_progress")).toBe(false);
    expect(taskRequiresAssignees("cancelled")).toBe(false);
    expect(taskRequiresAssignees("reported")).toBe(false);
    expect(taskRequiresAssignees("declined")).toBe(true);
  });
});
