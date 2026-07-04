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
      activeProject: {
        id: "project-1",
        title: "North Tower",
        subtitle: "Package A",
      },
      projectSummaryCard: {
        title: "North Tower",
        todayLabel: "Today · Jul 4",
        elapsedDayLabel: "Day 185",
        weatherLabel: "Partly Cloudy",
        weatherTemperatureLabel: "28°C",
        criticalDates: [
          {
            id: "critical-date-1",
            dateLabel: "Jul 7",
            title: "Concrete inspection",
            subtitle: "Submitted For Review · Critical",
          },
        ],
      },
      queueDashboard: {
        groups: [
          {
            id: "group-my",
            title: "My Queue",
            cells: [
              {
                id: "my-new",
                queue: "my_queue",
                bucket: "new",
                title: "New",
                countLabel: "3",
              },
              {
                id: "my-wip",
                queue: "my_queue",
                bucket: "wip",
                title: "Doing",
                countLabel: "4",
              },
              {
                id: "my-review",
                queue: "my_queue",
                bucket: "review",
                title: "Review",
                countLabel: "1",
              },
            ],
          },
          {
            id: "group-team",
            title: "Team Queue",
            cells: [
              {
                id: "team-new",
                queue: "team_queue",
                bucket: "new",
                title: "New",
                countLabel: "2",
              },
              {
                id: "team-wip",
                queue: "team_queue",
                bucket: "wip",
                title: "Doing",
                countLabel: "1",
              },
              {
                id: "team-review",
                queue: "team_queue",
                bucket: "review",
                title: "Review",
                countLabel: "0",
              },
            ],
          },
        ],
      },
      summaryPills: [],
      draftItems: [],
      activityItems: [],
      taskShortcut: null,
      projectSummaryItems: [],
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
        inboxNewCount: 3,
        inboxNewOverdueCount: 1,
        inboxWipCount: 4,
        inboxWipOverdueCount: 1,
        inboxReviewingCount: 1,
        inboxReviewingOverdueCount: 0,
        outboxNewCount: 2,
        outboxNewOverdueCount: 0,
        outboxWipCount: 1,
        outboxWipOverdueCount: 0,
        outboxReviewingCount: 0,
        outboxReviewingOverdueCount: 0,
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
    const onNavigateToTasks = jest.fn();
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      />,
    );

    expect(screen.getByTestId("dashboard-screen__project_summary_card")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_team_queue_wip")).toBeTruthy();

    fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });

    fireEvent.press(screen.getByTestId("dashboard-screen__fab_open_camera"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_profile"));
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("dashboard-screen__header_developer_settings"));
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);
  });
});
