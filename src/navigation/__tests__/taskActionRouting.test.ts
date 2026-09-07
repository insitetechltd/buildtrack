import { resolveStandaloneTaskAction } from "../taskActionRouting";
import {
  resolveReportTriageShortcut,
  resolveTaskDetailUpdateShortcut,
  resolveTasksListCreateShortcut,
} from "../photoShortcutRoutes";

jest.mock("../../state/taskStore.supabase", () => ({
  useTaskStore: {
    getState: jest.fn(() => ({
      tasks: [{ id: "task-9", status: "in_progress" }],
    })),
  },
}));

jest.mock("../../state/authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      user: {
        id: "manager-1",
        role: "manager",
        systemPermission: "manager",
      },
    })),
  },
}));

const reportedDetailTabState = {
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
          { name: "TaskDetail", params: { taskId: "task-9" } },
        ],
      },
    },
  ],
};

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

  it("routes triage to CreateTask with actionType triage", () => {
    expect(
      resolveStandaloneTaskAction({
        editTaskId: "task-report-1",
        actionType: "triage",
        sourceScreen: "tasks",
      }),
    ).toEqual({
      kind: "createTask",
      params: expect.objectContaining({
        editTaskId: "task-report-1",
        actionType: "triage",
        sourceScreen: "tasks",
      }),
    });
  });
});

describe("resolveTaskDetailUpdateShortcut", () => {
  beforeEach(() => {
    const { useTaskStore } = require("../../state/taskStore.supabase");
    useTaskStore.getState.mockReturnValue({
      tasks: [{ id: "task-9", status: "in_progress" }],
    });
  });

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

  it("does not auto-open UpdateProgress when report triage dial applies", () => {
    const { useTaskStore } = require("../../state/taskStore.supabase");
    useTaskStore.getState.mockReturnValue({
      tasks: [{ id: "task-9", status: "reported" }],
    });

    expect(resolveTaskDetailUpdateShortcut(reportedDetailTabState)).toBeUndefined();
    expect(resolveReportTriageShortcut(reportedDetailTabState)).toEqual({
      tabName: "Tasks",
      taskId: "task-9",
      subTaskId: undefined,
    });
  });
});

describe("resolveTasksListCreateShortcut", () => {
  it("resolves the Tasks list as a create-task FAB", () => {
    expect(
      resolveTasksListCreateShortcut({
        index: 2,
        routes: [
          { name: "Activity" },
          { name: "Camera" },
          {
            name: "Tasks",
            state: {
              index: 0,
              routes: [{ name: "TasksList" }],
            },
          },
        ],
      }),
    ).toBe(true);
  });

  it("treats a Tasks tab with no nested state as the list", () => {
    expect(
      resolveTasksListCreateShortcut({
        index: 2,
        routes: [{ name: "Activity" }, { name: "Camera" }, { name: "Tasks" }],
      }),
    ).toBe(true);
  });

  it("does not resolve Activity or Task Detail", () => {
    expect(
      resolveTasksListCreateShortcut({
        index: 0,
        routes: [
          {
            name: "Activity",
            state: { index: 0, routes: [{ name: "DashboardMain" }] },
          },
          { name: "Camera" },
          { name: "Tasks" },
        ],
      }),
    ).toBe(false);
    expect(
      resolveTasksListCreateShortcut({
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
                { name: "TaskDetail", params: { taskId: "task-9" } },
              ],
            },
          },
        ],
      }),
    ).toBe(false);
  });
});
