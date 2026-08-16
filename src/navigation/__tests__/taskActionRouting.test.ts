import { resolveStandaloneTaskAction } from "../taskActionRouting";
import { resolveTaskDetailUpdateShortcut } from "../photoShortcutRoutes";

describe("taskActionRouting", () => {
  it("routes photos/update to UpdateProgress", () => {
    expect(
      resolveStandaloneTaskAction({
        editTaskId: "task-1",
        actionType: "photos",
        updateTargetSubTaskId: "sub-1",
        sourceScreen: "tasks",
      }),
    ).toEqual({
      kind: "updateProgress",
      params: expect.objectContaining({
        taskId: "task-1",
        subTaskId: "sub-1",
        sourceScreen: "tasks",
      }),
    });
  });

  it("routes comment and reassign to standalone screens", () => {
    expect(
      resolveStandaloneTaskAction({
        editTaskId: "task-1",
        actionType: "comment",
      })?.kind,
    ).toBe("addComment");
    expect(
      resolveStandaloneTaskAction({
        editTaskId: "task-1",
        actionType: "reassign",
      })?.kind,
    ).toBe("reassign");
  });

  it("keeps edit on CreateTask", () => {
    expect(
      resolveStandaloneTaskAction({
        editTaskId: "task-1",
        actionType: "edit",
      })?.kind,
    ).toBe("createTask");
  });
});

describe("resolveTaskDetailUpdateShortcut", () => {
  it("resolves Tasks TaskDetail to UpdateProgress params", () => {
    expect(
      resolveTaskDetailUpdateShortcut({
        index: 2,
        routes: [
          { name: "Activity" },
          { name: "Camera" },
          {
            name: "Tasks",
            state: {
              index: 1,
              routes: [
                { name: "TasksList" },
                { name: "TaskDetail", params: { taskId: "task-9", subTaskId: "sub-2" } },
              ],
            },
          },
        ],
      }),
    ).toEqual({
      tabName: "Tasks",
      params: expect.objectContaining({
        taskId: "task-9",
        subTaskId: "sub-2",
        sourceScreen: "tasks",
      }),
    });
  });
});
