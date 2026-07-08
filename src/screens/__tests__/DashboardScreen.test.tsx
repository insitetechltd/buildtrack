import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import type { DashboardScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");
jest.mock("@/components/AppScreenHeader", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function MockAppScreenHeader({
    title,
    titleNode,
    rightSlot,
    className,
  }: {
    title: string;
    titleNode?: React.ReactNode;
    rightSlot?: React.ReactNode;
    className?: string;
  }) {
    return (
      <View testID="app-screen-header__root" className={className}>
        {titleNode ? titleNode : <Text>{title}</Text>}
        {rightSlot}
        <Pressable testID="app-screen-header__profile-trigger">
          <Text>Profile</Text>
        </Pressable>
      </View>
    );
  };
});

describe("DashboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the branded dashboard header, removes the Active Project label, and keeps critical dates as a peer section", () => {
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
        weatherIconLabel: "☁️",
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
      activityItems: [
        {
          id: "activity-1",
          taskId: "task-1",
          title: "Photo-backed activity",
          subtitle: "Has a preview image",
          timestampLabel: "Jul 7 at 6:48 PM",
          statusLabel: "in progress",
          previewPhotoUri: "https://example.com/activity-photo.jpg",
          density: "standard",
          structuralState: "stale",
        },
        {
          id: "activity-2",
          taskId: "task-2",
          title: "Text-only activity",
          subtitle: "No preview image",
          timestampLabel: "Task activity",
          statusLabel: "new",
          density: "standard",
          structuralState: "stale",
        },
      ],
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

    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByText("TASKR")).toBeTruthy();
    expect(screen.getByText("Site activity")).toBeTruthy();
    expect(screen.getByTestId("app-screen-header__root").props.className).toContain("bg-[#08576E]");
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_team_queue_wip")).toBeTruthy();
    expect(screen.getByText("This Week's Critical Dates")).toBeTruthy();
    expect(screen.getByText("Today · Jul 4 · Day 185 · ☁️ 28°C")).toBeTruthy();
    expect(screen.queryByText("Active Project")).toBeNull();
    expect(screen.queryByText("Partly Cloudy")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__weather_tile")).toBeNull();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-2:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-2:no-photo-icon")).toBeTruthy();
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__header_profile")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_project_picker")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_developer_settings")).toBeNull();

    fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });

    fireEvent.press(screen.getByTestId("dashboard-screen__activity_activity-1"));
    expect(screen.getByText("Photo-backed activity")).toBeTruthy();

    expect(onNavigateToProfile).not.toHaveBeenCalled();
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToDeveloperSettings).not.toHaveBeenCalled();
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();
  });

  it("falls back to the shared placeholder rail when the preview image cannot load", () => {
    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");

    useDashboardViewAdapter.mockReturnValue({
      output: {
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
        projectSummaryCard: null,
        queueDashboard: null,
        summaryPills: [],
        draftItems: [],
        activityItems: [
          {
            id: "activity-1",
            taskId: "task-1",
            title: "Photo-backed activity",
            subtitle: "Has a preview image",
            timestampLabel: "Jul 7 at 6:48 PM",
            statusLabel: "in progress",
            previewPhotoUri: "https://example.com/broken.jpg",
            density: "standard",
            structuralState: "stale",
          },
        ],
        taskShortcut: null,
        projectSummaryItems: [],
        highlightedTaskItems: [],
        quickActionItems: [],
        scalarMetrics: {
          openTaskCount: 1,
          overdueTaskCount: 0,
          projectCount: 1,
          hasSelectedProject: true,
          actionRequiredCount: 0,
          inProgressSentCount: 0,
          awaitingApprovalCount: 0,
          actionRequiredOverdueCount: 0,
          inProgressSentOverdueCount: 0,
          awaitingApprovalOverdueCount: 0,
          inboxNewCount: 0,
          inboxNewOverdueCount: 0,
          inboxWipCount: 0,
          inboxWipOverdueCount: 0,
          inboxReviewingCount: 0,
          inboxReviewingOverdueCount: 0,
          outboxNewCount: 0,
          outboxNewOverdueCount: 0,
          outboxWipCount: 0,
          outboxWipOverdueCount: 0,
          outboxReviewingCount: 0,
          outboxReviewingOverdueCount: 0,
        },
      },
      visibility: {
        showCreateTaskFab: false,
        showProfileShortcut: true,
        showProjectPickerShortcut: false,
        showDeveloperSettingsShortcut: false,
      },
    });

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail-image"), "error");

    expect(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail-placeholder")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:no-photo-icon")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-1:thumbnail-image")).toBeNull();
    expect(screen.getByText("Photo-backed activity")).toBeTruthy();
    expect(screen.getByText("Has a preview image")).toBeTruthy();
  });
});
