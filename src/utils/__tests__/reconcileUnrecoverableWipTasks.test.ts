import type { Task } from "@/types/buildtrack";
import {
  reconcileUnrecoverableWipTasks,
  resetReconciledWipTaskIdsForTests,
  wasWipTaskReconciled,
} from "../reconcileUnrecoverableWipTasks";

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "Broken WIP",
    description: "",
    priority: "medium",
    dueDate: "2026-08-30",
    category: "general",
    attachments: [],
    assignedTo: [],
    assignedBy: "originator-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updates: [],
    status: "in_progress",
    completionPercentage: 0,
    ...overrides,
  };
}

describe("reconcileUnrecoverableWipTasks", () => {
  beforeEach(() => {
    resetReconciledWipTaskIdsForTests();
  });

  it("cancels unassigned in_progress tasks owned by the user", async () => {
    const cancelTask = jest.fn().mockResolvedValue(undefined);

    const cancelled = await reconcileUnrecoverableWipTasks({
      tasks: [baseTask()],
      userId: "originator-1",
      cancelTask,
    });

    expect(cancelled).toEqual(["task-1"]);
    expect(cancelTask).toHaveBeenCalledWith("task-1", "originator-1");
    expect(wasWipTaskReconciled("task-1")).toBe(true);
  });

  it("skips valid in_progress tasks with assignees", async () => {
    const cancelTask = jest.fn().mockResolvedValue(undefined);

    const cancelled = await reconcileUnrecoverableWipTasks({
      tasks: [
        baseTask({
          assignedTo: ["worker-1"],
        }),
      ],
      userId: "originator-1",
      cancelTask,
    });

    expect(cancelled).toEqual([]);
    expect(cancelTask).not.toHaveBeenCalled();
  });

  it("does not cancel tasks owned by another user", async () => {
    const cancelTask = jest.fn().mockResolvedValue(undefined);

    await reconcileUnrecoverableWipTasks({
      tasks: [baseTask({ assignedBy: "other-user" })],
      userId: "originator-1",
      cancelTask,
    });

    expect(cancelTask).not.toHaveBeenCalled();
  });

  it("runs only once per task id per session", async () => {
    const cancelTask = jest.fn().mockResolvedValue(undefined);
    const args = {
      tasks: [baseTask()],
      userId: "originator-1",
      cancelTask,
    };

    await reconcileUnrecoverableWipTasks(args);
    await reconcileUnrecoverableWipTasks(args);

    expect(cancelTask).toHaveBeenCalledTimes(1);
  });
});
