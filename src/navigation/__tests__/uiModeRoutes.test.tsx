import React from "react";
import { render } from "@testing-library/react-native";
import { DashboardRoute, TasksRoute } from "../uiModeRoutes";
import {
  buildPhotoShortcutCreateTaskParams,
  resolveTaskDetailCameraTabParams,
} from "../photoShortcutRoutes";
import type {
  RootStackParamList,
  RootTabParamList,
  TaskDetailParams,
} from "../navigationTypes";

jest.mock("@/screens/DashboardScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: function MockModernDashboard() {
      return React.createElement(Text, { testID: "modern-dashboard" });
    },
  };
});

jest.mock("@/screens/TasksScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: function MockModernTasks() {
      return React.createElement(Text, { testID: "modern-tasks" });
    },
  };
});

describe("uiModeRoutes", () => {
  it("always renders modern DashboardRoute", () => {
    const modern = render(
      <DashboardRoute
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />,
    );

    expect(modern.getByTestId("modern-dashboard")).toBeTruthy();
  });

  it("always renders modern TasksRoute", () => {
    const modern = render(
      <TasksRoute
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(modern.getByTestId("modern-tasks")).toBeTruthy();
  });

  it("allows the camera tab to receive a global create-task capture intent", () => {
    const params: RootTabParamList["Camera"] = {
      screen: "CreateTaskMain",
      params: {
        actionType: "photos",
        cameraLaunchContext: "global",
        postCaptureDefault: "create_task",
      },
    };

    expect(params).toEqual(
      expect.objectContaining({
        screen: "CreateTaskMain",
        params: expect.objectContaining({
          actionType: "photos",
          cameraLaunchContext: "global",
          postCaptureDefault: "create_task",
        }),
      }),
    );
  });

  it("keeps task-detail camera params on the same-task update path with subtask preservation", () => {
    const params = buildPhotoShortcutCreateTaskParams({
      taskId: "task-1",
      subTaskId: "subtask-1",
      actionType: "photos",
      sourceScreen: "tasks",
      selectedPhotos: [],
      uploadedPhotoUrls: [],
    });

    expect(params).toEqual(
      expect.objectContaining({
        editTaskId: "task-1",
        actionType: "photos",
        cameraLaunchContext: "task_detail",
        postCaptureDefault: "same_task_update",
        updateTargetSubTaskId: "subtask-1",
        sourceScreen: "tasks",
        sourceTaskId: "task-1",
        sourceSubTaskId: "subtask-1",
      }),
    );
  });

  it("resolves the bottom camera tab into task-detail shortcut params only while task detail is active", () => {
    const taskDetailParams: TaskDetailParams = {
      taskId: "task-1",
      subTaskId: "subtask-1",
    };

    expect(
      resolveTaskDetailCameraTabParams({
        index: 2,
        routes: [
          {
            name: "Activity",
            state: {
              index: 0,
              routes: [{ name: "DashboardMain" }],
            },
          },
          { name: "Camera" },
          {
            name: "Tasks",
            state: {
              index: 1,
              routes: [
                { name: "TasksList" },
                {
                  name: "TaskDetail",
                  params: taskDetailParams,
                },
              ],
            },
          },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        screen: "CreateTaskMain",
        params: expect.objectContaining({
          actionType: "update",
          cameraLaunchContext: "task_detail",
          postCaptureDefault: "same_task_update",
          updateTargetSubTaskId: "subtask-1",
          sourceScreen: "tasks",
          sourceTaskId: "task-1",
          sourceSubTaskId: "subtask-1",
        }),
      }),
    );

    expect(
      resolveTaskDetailCameraTabParams({
        index: 0,
        routes: [
          {
            name: "Activity",
            state: {
              index: 0,
              routes: [{ name: "DashboardMain" }],
            },
          },
          { name: "Camera" },
          { name: "Tasks" },
        ],
      }),
    ).toBeUndefined();
  });

  it("marks dashboard task-detail camera launches with dashboard source metadata", () => {
    expect(
      resolveTaskDetailCameraTabParams({
        index: 0,
        routes: [
          {
            name: "Activity",
            state: {
              index: 1,
              routes: [
                { name: "DashboardMain" },
                {
                  name: "TaskDetailFromDashboard",
                  params: { taskId: "task-9", subTaskId: "subtask-4" },
                },
              ],
            },
          },
          { name: "Camera" },
          { name: "Tasks" },
        ],
      }),
    ).toEqual(
      expect.objectContaining({
        screen: "CreateTaskMain",
        params: expect.objectContaining({
          sourceScreen: "dashboard",
          sourceTaskId: "task-9",
          sourceSubTaskId: "subtask-4",
        }),
      }),
    );
  });

  it("keeps the profile route available at the root stack after leaving the worker tab shell", () => {
    const params: RootStackParamList["Profile"] = {
      screen: "ProfileMain",
    };

    expect(params.screen).toBe("ProfileMain");
  });
});
