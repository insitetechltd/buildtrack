import type { Task } from "@/types/buildtrack";
import {
  classifyLoadedTaskWorkflowGaps,
  classifyTaskWorkflowGaps,
  type WorkflowGapCode,
} from "../taskWorkflowGaps";

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "Install conduit",
    description: "Level 3",
    priority: "medium",
    dueDate: "2026-08-30",
    category: "electrical",
    attachments: [],
    assignedTo: ["worker-1"],
    assignedBy: "originator-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updates: [],
    status: "new",
    completionPercentage: 0,
    ...overrides,
  };
}

describe("classifyTaskWorkflowGaps", () => {
  it("returns null for soft-deleted tasks", () => {
    expect(
      classifyTaskWorkflowGaps(
        baseTask({ deletedAt: "2026-08-20T00:00:00.000Z" }),
      ),
    ).toBeNull();
  });

  it("returns null for intended new + assignee", () => {
    expect(
      classifyTaskWorkflowGaps(
        baseTask({
          status: "new",
          assignedTo: ["worker-1"],
          assignedBy: "originator-1",
        }),
      ),
    ).toBeNull();
  });

  it("returns null for intended in_progress + assignee", () => {
    expect(
      classifyTaskWorkflowGaps(
        baseTask({
          status: "in_progress",
          assignedTo: ["worker-1"],
          assignedBy: "originator-1",
        }),
      ),
    ).toBeNull();
  });

  it("returns null for intended declined (not a gap)", () => {
    expect(
      classifyTaskWorkflowGaps(
        baseTask({
          status: "declined",
          assignedTo: ["worker-1"],
          assignedBy: "originator-1",
          declinedReason: "Need more photos",
        }),
      ),
    ).toBeNull();
  });

  it("flags GAP_NO_TITLE", () => {
    const gap = classifyTaskWorkflowGaps(baseTask({ title: "   " }));
    expect(gap?.codes).toContain("GAP_NO_TITLE");
    expect(gap?.primary).toBe("GAP_NO_TITLE");
  });

  it("flags GAP_NO_PROJECT", () => {
    const gap = classifyTaskWorkflowGaps(baseTask({ projectId: "" }));
    expect(gap?.codes).toContain("GAP_NO_PROJECT");
  });

  it("flags GAP_NO_ORIGINATOR", () => {
    const gap = classifyTaskWorkflowGaps(baseTask({ assignedBy: "" }));
    expect(gap?.codes).toContain("GAP_NO_ORIGINATOR");
  });

  it("flags GAP_UNASSIGNED_WIP as primary when WIP has empty assignees", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({
        status: "in_progress",
        assignedTo: ["  ", ""],
        title: "WIP garbage",
      }),
    );
    expect(gap?.codes).toContain("GAP_UNASSIGNED_WIP");
    expect(gap?.primary).toBe("GAP_UNASSIGNED_WIP");
  });

  it("flags GAP_UNASSIGNED_OPEN for new with empty assignees", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({ status: "new", assignedTo: [] }),
    );
    expect(gap?.codes).toContain("GAP_UNASSIGNED_OPEN");
    expect(gap?.codes).not.toContain("GAP_UNASSIGNED_WIP");
  });

  it("flags GAP_LEGACY_STATUS", () => {
    const gap = classifyTaskWorkflowGaps(baseTask({ status: "wip" }));
    expect(gap?.codes).toContain("GAP_LEGACY_STATUS");
  });

  it("flags GAP_PHASE_UNKNOWN for unexpected status strings", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({ status: "mystery" as Task["status"] }),
    );
    expect(gap?.codes).toContain("GAP_PHASE_UNKNOWN");
  });

  it("flags GAP_REVIEW_INCOMPLETE", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({
        status: "submitted_for_review",
        completionPercentage: 80,
      }),
    );
    expect(gap?.codes).toContain("GAP_REVIEW_INCOMPLETE");
  });

  it("does not flag review incomplete at 100%", () => {
    expect(
      classifyTaskWorkflowGaps(
        baseTask({
          status: "submitted_for_review",
          completionPercentage: 100,
        }),
      ),
    ).toBeNull();
  });

  it("flags GAP_SELF_NEW when creator is in assignees", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({
        status: "new",
        assignedBy: "me",
        assignedTo: ["me"],
      }),
    );
    expect(gap?.codes).toContain("GAP_SELF_NEW");
  });

  it("lists multiple codes and picks lowest rank as primary", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({
        title: "",
        projectId: "",
        status: "in_progress",
        assignedTo: [],
      }),
    );
    expect(gap?.codes).toEqual(
      expect.arrayContaining([
        "GAP_NO_TITLE",
        "GAP_NO_PROJECT",
        "GAP_UNASSIGNED_WIP",
      ] as WorkflowGapCode[]),
    );
    expect(gap?.primary).toBe("GAP_NO_TITLE");
  });

  it("treats whitespace-only assignees as empty", () => {
    const gap = classifyTaskWorkflowGaps(
      baseTask({ status: "accepted", assignedTo: [" \t "] }),
    );
    expect(gap?.codes).toContain("GAP_UNASSIGNED_WIP");
  });
});

describe("classifyLoadedTaskWorkflowGaps", () => {
  it("skips clean and deleted rows", () => {
    const rows = classifyLoadedTaskWorkflowGaps([
      baseTask({ id: "ok" }),
      baseTask({
        id: "deleted",
        title: "",
        deletedAt: "2026-08-20T00:00:00.000Z",
      }),
      baseTask({ id: "gap", title: "" }),
    ]);
    expect(rows.map((r) => r.taskId)).toEqual(["gap"]);
  });
});
