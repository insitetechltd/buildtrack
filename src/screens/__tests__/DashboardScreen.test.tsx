import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import type { DashboardScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaView: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => (
      <View testID="dashboard-screen__safe-area" {...props}>
        {children}
      </View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock("@/components/AppScreenHeader", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function MockAppScreenHeader({
    title,
    rightSlot,
    className,
  }: {
    title: string;
    rightSlot?: React.ReactNode;
    className?: string;
  }) {
    return (
      <View testID="app-screen-header__root" className={className}>
        <Text>{title}</Text>
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

  it("renders recent activity as thumbnail plus a three-line text stack", () => {
    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");

    const adapterOutput = {
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
        criticalDates: [],
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
              {
                id: "my-overdue",
                queue: "my_queue",
                bucket: "overdue",
                title: "Overdue",
                countLabel: "2",
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
          taskId: "task-activity-1",
          title: "Structural steel inspection — Level 12",
          subtitle: "Jake M. Added 3 photos",
          actorLabel: "Jake M.",
          actionLabel: "Added 3 photos",
          timestampLabel: "2h ago",
          previewPhotoUri: "https://example.com/steel-inspection-photo.jpg",
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
    } as DashboardScreenViewAdapterOutput;

    useDashboardViewAdapter.mockReturnValue({
      output: adapterOutput,
      visibility: {
        showCreateTaskFab: true,
        showProfileShortcut: true,
        showProjectPickerShortcut: false,
        showDeveloperSettingsShortcut: false,
      },
    });

    const onNavigateToTaskDetail = jest.fn();
    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
        onNavigateToTaskDetail={onNavigateToTaskDetail}
      />,
    );

    expect(screen.getByTestId("dashboard-screen__activity_activity-1_thumbnail")).toBeTruthy();
    expect(screen.getByText("Jake M. Added 3 photos")).toBeTruthy();
    expect(screen.getByText("Structural steel inspection — Level 12")).toBeTruthy();
    expect(screen.getByText("2h ago")).toBeTruthy();
    expect(screen.queryByText("Drafts In Progress")).toBeNull();
    expect(screen.getByText("Jake M. Added 3 photos").props.numberOfLines).toBe(1);
    expect(screen.getByText("Structural steel inspection — Level 12").props.numberOfLines).toBe(1);
    expect(screen.getByText("2h ago").props.numberOfLines).toBe(1);
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue").props.className).toContain("flex-1");
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue").props.className).toContain("min-w-0");

    fireEvent.press(screen.getByTestId("dashboard-screen__activity_activity-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-activity-1");
  });

  it("renders the tighter dashboard header, keeps the header profile shortcut, removes the duplicate camera FAB, and invokes non-profile navigation callbacks", () => {
    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");

    const adapterOutput = {
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
              {
                id: "my-overdue",
                queue: "my_queue",
                bucket: "overdue",
                title: "Overdue",
                countLabel: "2",
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
              {
                id: "team-overdue",
                queue: "team_queue",
                bucket: "overdue",
                title: "Overdue",
                countLabel: "1",
              },
            ],
          },
        ],
      },
      summaryPills: [],
      draftItems: [
        {
          id: "draft-1",
          taskId: "task-draft-1",
          title: "Prepare handover notes",
          subtitle: "Saved 10 minutes ago",
          timestampLabel: "10 minutes ago",
          statusLabel: "Draft",
          density: "standard",
          structuralState: "stale",
        },
      ],
      activityItems: [
        {
          id: "activity-1",
          taskId: "task-activity-1",
          title: "Guardrail layout approved",
          subtitle: "Package A · Structural",
          actorLabel: "Jake M.",
          actionLabel: "Approved task completion",
          timestampLabel: "5 minutes ago",
          statusLabel: "Approved",
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
    } as DashboardScreenViewAdapterOutput;

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
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_team_queue_overdue")).toBeTruthy();
    expect(screen.getByText("Today · Jul 4 · Day 185 · ☁️ 28°C")).toBeTruthy();
    expect(screen.getByText("North Tower").props.className).toContain("text-[32px]");
    expect(screen.getByText("Today · Jul 4 · Day 185 · ☁️ 28°C").props.className).toContain("text-base");
    expect(screen.getByText("Queue Overview").props.className).toContain("text-base");
    expect(screen.getByText("My Queue").props.className).toContain("text-sm");
    expect(screen.getByText("Concrete inspection").props.className).toContain("text-base");
    expect(screen.getByText("Guardrail layout approved").props.className).toContain("text-base");
    expect(screen.getByText("Jake M. Approved task completion").props.className).toContain("text-sm");
    expect(screen.queryByText("Drafts In Progress")).toBeNull();
    expect(screen.queryByText("Prepare handover notes")).toBeNull();
    expect(screen.getByTestId("dashboard-screen__safe-area").props.edges).toEqual([
      "bottom",
      "left",
      "right",
    ]);
    expect(screen.queryByText("Partly Cloudy")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__weather_tile")).toBeNull();
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.getByTestId("app-screen-header__root").props.className).toContain("pb-2");
    expect(screen.queryByTestId("dashboard-screen__header_profile")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_project_picker")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_developer_settings")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__fab_open_camera")).toBeNull();
    expect(screen.getByText("Taskr")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new").props.className).toContain("flex-1");
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new").props.className).toContain("min-w-0");
    expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue").props.className).toContain("bg-rose-50");

    fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });

    expect(onNavigateToProfile).not.toHaveBeenCalled();
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToDeveloperSettings).not.toHaveBeenCalled();
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();
  });
});
