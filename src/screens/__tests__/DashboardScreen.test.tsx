import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import type { DashboardScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders global actions (header shortcuts + create task FAB) and invokes navigation callbacks", () => {
    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");

    const adapterOutput: DashboardScreenViewAdapterOutput = {
      screenId: "DashboardScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: true,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Ready",
      },
      projectSummaryItems: [
        {
          id: "item-1",
          projectId: "project-1",
          title: "North Tower",
          subtitle: "Package A",
          statusToken: "project_active",
          statusLabel: "Active",
          openTaskCount: 2,
          overdueTaskCount: 0,
          density: "standard",
          structuralState: "stale",
        },
      ],
      highlightedTaskItems: [],
      quickActionItems: [],
      scalarMetrics: {
        openTaskCount: 6,
        overdueTaskCount: 2,
        projectCount: 1,
        hasSelectedProject: true,
        actionRequiredCount: 3,
        inProgressSentCount: 4,
        awaitingApprovalCount: 1,
        actionRequiredOverdueCount: 2,
        inProgressSentOverdueCount: 1,
        awaitingApprovalOverdueCount: 0,
      },
    };

    useDashboardViewAdapter.mockReturnValue({
      output: adapterOutput,
      visibility: {
        showCreateTaskFab: true,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: true,
      },
    });

    const onNavigateToCreateTask = jest.fn();
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      />,
    );

    expect(screen.getByTestId("container-card:project-1")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__metric_action_required")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__metric_in_progress")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__metric_awaiting_approval")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__metric_action_required_overdue")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__metric_in_progress_overdue")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__metric_awaiting_approval_overdue")).toBeNull();

    fireEvent.press(screen.getByTestId("dashboard-screen__fab_create_task"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_profile"));
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_developer_settings"));
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);
  });
});
