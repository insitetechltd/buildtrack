import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";
import DashboardScreen from "../DashboardScreen";
import type { DashboardScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock("@/ui/viewAdapters/useDashboardViewAdapter");
jest.mock("@/utils/DataRefreshManager", () => ({
  triggerRefresh: jest.fn(() => Promise.resolve()),
}));
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    Swipeable: ({
      children,
      renderRightActions,
      overshootLeft,
      overshootRight,
      onSwipeableOpenStartDrag,
      onSwipeableWillOpen,
      onSwipeableCloseStartDrag,
      onSwipeableClose,
      testID,
    }: {
      children: React.ReactNode;
      renderRightActions?: () => React.ReactNode;
      overshootLeft?: boolean;
      overshootRight?: boolean;
      onSwipeableOpenStartDrag?: (direction: "left" | "right") => void;
      onSwipeableWillOpen?: (direction: "left" | "right") => void;
      onSwipeableCloseStartDrag?: (direction: "left" | "right") => void;
      onSwipeableClose?: (direction: "left" | "right") => void;
      testID?: string;
    }) => (
      <View testID={testID ?? "mock-swipeable"}>
        <Text testID={`${testID ?? "mock-swipeable"}__overshoot-left`}>
          {String(overshootLeft ?? "")}
        </Text>
        <Text testID={`${testID ?? "mock-swipeable"}__overshoot-right`}>
          {String(overshootRight ?? "")}
        </Text>
        <Pressable
          testID={`${testID ?? "mock-swipeable"}__open-start`}
          onPress={() => onSwipeableOpenStartDrag?.("right")}
        />
        <Pressable
          testID={`${testID ?? "mock-swipeable"}__will-open`}
          onPress={() => onSwipeableWillOpen?.("right")}
        />
        <Pressable
          testID={`${testID ?? "mock-swipeable"}__close-start`}
          onPress={() => onSwipeableCloseStartDrag?.("right")}
        />
        <Pressable
          testID={`${testID ?? "mock-swipeable"}__close`}
          onPress={() => onSwipeableClose?.("right")}
        />
        {renderRightActions ? (
          <View testID={`${testID ?? "mock-swipeable"}__right-actions`}>{renderRightActions()}</View>
        ) : null}
        {children}
      </View>
    ),
  };
});
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
        todayLabel: "Saturday · Jul 4",
        elapsedDayLabel: "Day 185",
        weatherIconLabel: "☁️",
        weatherTemperatureLabel: "28°C",
        criticalDates: [
          {
            id: "critical-date-1",
            taskId: "task-critical-1",
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
      draftItems: [
        {
          id: "draft:local-draft-1",
          localDraftId: "local-draft-1",
          title: "Draft inspection",
          subtitle: "Draft — not submitted",
          timestampLabel: "Jul 4 at 8:30 AM",
          statusLabel: "Draft",
          density: "standard",
          structuralState: "stale",
        },
      ],
      activityItems: [
        {
          id: "activity-1",
          taskId: "task-1",
          title: "Photo-backed activity",
          subtitle: "Has a preview image",
          timestampLabel: "Jul 7 at 6:48 PM",
          statusLabel: "in progress",
          previewPhotoUri: "https://example.com/activity-photo.jpg",
          actorLabel: "Alex Chen",
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
          actorLabel: "Bob Worker",
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
      actions: {
        deleteDraftTask: jest.fn(),
        markActivityFeedSeen: jest.fn(),
      },
    });

    const onNavigateToCreateTask = jest.fn();
    const onNavigateToTasks = jest.fn();
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();
    const onNavigateToTaskDetail = jest.fn();

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToTaskDetail={onNavigateToTaskDetail}
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
    expect(screen.getByText("This Week's Critical Tasks")).toBeTruthy();
    expect(screen.getByText("Saturday · Jul 4 · Day 185 · ☁️ 28°C")).toBeTruthy();
    expect(screen.queryByText("Active Project")).toBeNull();
    expect(screen.queryByText("Partly Cloudy")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__weather_tile")).toBeNull();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:layout-photo-hero")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:hero-actor-label")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:post-header")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-1:hero-image")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-1:overlay-title")).toBeNull();
    expect(screen.getByTestId("dashboard-screen__activity_activity-2:layout-compact")).toBeTruthy();
    expect(screen.getByTestId("dashboard-screen__activity_activity-2:post-header")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-2:thumbnail")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-2:thumbnail-placeholder")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-2:no-photo-icon")).toBeNull();
    expect(screen.getByTestId("dashboard-screen__drafts_toggle")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__draft_item_local-draft-1")).toBeNull();
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__header_profile")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_project_picker")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__header_developer_settings")).toBeNull();
    const { ScrollView } = require("react-native");
    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(scrollView.props.contentContainerStyle).toMatchObject({ paddingTop: 15 });

    fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
    expect(onNavigateToTasks).toHaveBeenCalledWith({
      launchQueue: "my_queue",
      launchBucket: "new",
      launchSource: "activity_dashboard",
    });

    fireEvent.press(screen.getByTestId("dashboard-screen__activity_activity-1"));
    expect(screen.getByText("Photo-backed activity")).toBeTruthy();

    fireEvent.press(screen.getByTestId("dashboard-screen__critical_task_critical-date-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-critical-1");

    fireEvent.press(screen.getByTestId("dashboard-screen__drafts_toggle"));
    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_local-draft-1"));
    expect(onNavigateToCreateTask).toHaveBeenCalledWith({
      localDraftId: "local-draft-1",
      sourceScreen: "dashboard",
      clearForm: false,
      _timestamp: expect.any(Number),
    });
    expect(onNavigateToTaskDetail).not.toHaveBeenCalledWith("local-draft-1");

    expect(onNavigateToProfile).not.toHaveBeenCalled();
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToDeveloperSettings).not.toHaveBeenCalled();
  });

  it("keeps post shell and drops photo when the preview image cannot load", () => {
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
            actorLabel: "Alex Chen",
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
      actions: {
        deleteDraftTask: jest.fn(),
        markActivityFeedSeen: jest.fn(),
      },
    });

    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
        onNavigateToProfile={jest.fn()}
      />,
    );

    fireEvent(screen.getByTestId("dashboard-screen__activity_activity-1:hero-image"), "error");

    expect(screen.getByTestId("dashboard-screen__activity_activity-1:layout-compact")).toBeTruthy();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-1:hero")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-1:thumbnail")).toBeNull();
    expect(screen.queryByTestId("dashboard-screen__activity_activity-1:thumbnail-placeholder")).toBeNull();
    expect(screen.getByText("Photo-backed activity")).toBeTruthy();
    expect(screen.getByText("Has a preview image")).toBeTruthy();
    expect(screen.getByText("Alex Chen")).toBeTruthy();
  });

  it("shows swipe-left delete on draft rows and confirms before deleting", () => {
    const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");
    const deleteDraftTask = jest.fn().mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

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
        activeProject: { id: "project-1", title: "North Tower" },
        projectSummaryCard: null,
        queueDashboard: null,
        summaryPills: [],
        draftItems: [
          {
            id: "draft:task-draft-1",
            taskId: "task-draft-1",
            title: "Draft inspection",
            subtitle: "Pending notes",
            timestampLabel: "Jul 4 at 8:30 AM",
            statusLabel: "in progress",
            density: "standard",
            structuralState: "stale",
          },
        ],
        activityItems: [],
        taskShortcut: null,
        projectSummaryItems: [],
        highlightedTaskItems: [],
        quickActionItems: [],
        scalarMetrics: {
          openTaskCount: 0,
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
      actions: { deleteDraftTask, markActivityFeedSeen: jest.fn() },
    });

    const onNavigateToCreateTask = jest.fn();
    const screen = render(
      <DashboardScreen
        onNavigateToTasks={jest.fn()}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateToProfile={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("dashboard-screen__drafts_toggle"));
    expect(
      within(screen.getByTestId("dashboard-screen__draft_item_task-draft-1:swipeable__right-actions")).getByTestId(
        "dashboard-screen__draft_item_task-draft-1:delete-action",
      ),
    ).toBeTruthy();
    expect(
      screen.getByTestId("dashboard-screen__draft_item_task-draft-1:swipeable__overshoot-left").children.join(""),
    ).toBe("false");
    expect(
      screen.getByTestId("dashboard-screen__draft_item_task-draft-1:swipeable__overshoot-right").children.join(""),
    ).toBe("false");

    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1:delete-action"));
    expect(alertSpy).toHaveBeenCalled();
    const alertButtons = alertSpy.mock.calls[0]?.[2] ?? [];
    const deleteButton = alertButtons.find((button: { text?: string }) => button.text === "Delete");
    deleteButton?.onPress?.();
    expect(deleteDraftTask).toHaveBeenCalledWith("task-draft-1");

    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1:swipeable__open-start"));
    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1"));
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1:swipeable__close"));
    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1"));
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("dashboard-screen__draft_item_task-draft-1"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    alertSpy.mockRestore();
  });
});
