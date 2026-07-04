import React from "react";
import { act, render } from "@testing-library/react-native";
import { DashboardRoute, TasksRoute } from "../uiModeRoutes";
import type {
  CreateTaskParams,
  RootTabParamList,
} from "../navigationTypes";
import { useDevToggleStore } from "@/state/devToggleStore";

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

jest.mock("@/screens/legacy/LegacyDashboardScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: function MockLegacyDashboard() {
      return React.createElement(Text, { testID: "legacy-dashboard" });
    },
  };
});

jest.mock("@/screens/legacy/LegacyTasksScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: function MockLegacyTasks() {
      return React.createElement(Text, { testID: "legacy-tasks" });
    },
  };
});

describe("uiModeRoutes", () => {
  beforeEach(() => {
    useDevToggleStore.setState({ uiModernizationMode: "modern" });
  });

  it("switches DashboardRoute between modern and legacy instantly", () => {
    const modern = render(
      <DashboardRoute
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />,
    );

    expect(modern.getByTestId("modern-dashboard")).toBeTruthy();

    act(() => {
      useDevToggleStore.getState().toggleUiMode();
    });

    expect(modern.getByTestId("legacy-dashboard")).toBeTruthy();
  });

  it("switches TasksRoute between modern and legacy instantly", () => {
    const modern = render(
      <TasksRoute
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(modern.getByTestId("modern-tasks")).toBeTruthy();

    act(() => {
      useDevToggleStore.getState().toggleUiMode();
    });

    expect(modern.getByTestId("legacy-tasks")).toBeTruthy();
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

  it("allows task-detail camera launches to target the current task update flow", () => {
    const params: CreateTaskParams = {
      editTaskId: "task-1",
      actionType: "update",
      cameraLaunchContext: "task_detail",
      postCaptureDefault: "same_task_update",
      updateTargetSubTaskId: "subtask-1",
    };

    expect(params.cameraLaunchContext).toBe("task_detail");
    expect(params.postCaptureDefault).toBe("same_task_update");
  });

  it("keeps the profile route available for hidden worker-shell navigation", () => {
    const params: RootTabParamList["Profile"] = {
      screen: "ProfileMain",
    };

    expect(params.screen).toBe("ProfileMain");
  });
});
