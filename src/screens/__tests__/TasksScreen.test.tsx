import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TasksScreen from "../TasksScreen";
import type { TasksScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useTasksViewAdapter", () => {
  const React = require("react");
  let overrideOutput: Partial<TasksScreenViewAdapterOutput> | null = null;
  const makeRow = (overrides: Record<string, unknown>) => ({
    id: "row-1",
    taskId: "task-1",
    title: "Install guardrails",
    statusToken: "task_in_progress",
    statusLabel: "In progress",
    responsibilityToken: "OTHER_OPEN",
    priorityLabel: "High",
    dueDateLabel: "Tomorrow",
    assigneeSummary: "Sam",
    projectName: "North Tower",
    isOverdue: false,
    attachmentUris: [],
    density: "standard",
    structuralState: "stale",
    ...overrides,
  });

  const useTasksViewAdapter = () => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [expandedQueues, setExpandedQueues] = React.useState({
      my_queue: true,
      team_queue: false,
    });
    const [openBucketsByQueue, setOpenBucketsByQueue] = React.useState({
      my_queue: "new",
      team_queue: null,
    });
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const allRows = [
      makeRow({
        id: "row-1",
        taskId: "task-1",
        title: "Install guardrails",
        cardPresentation: "thumbnail",
        statusToken: "task_new",
        statusLabel: "New",
        queue: "my_queue",
        queueLabel: "My Queue",
        bucket: "new",
        bucketLabel: "New",
        contextLabel: "North Tower",
        contextLine: "Level 12, Grid B–C",
        primaryPhotoUri: "https://example.com/task-photo.jpg",
      }),
      makeRow({
        id: "row-2",
        taskId: "task-2",
        title: "Verify anchor points",
        statusToken: "task_in_progress",
        statusLabel: "In progress",
        queue: "my_queue",
        queueLabel: "My Queue",
        bucket: "wip",
        bucketLabel: "Doing",
        contextLabel: "North Tower",
      }),
      makeRow({
        id: "row-3",
        taskId: "task-3",
        title: "Team review package",
        statusToken: "task_submitted_for_review",
        statusLabel: "Submitted for review",
        queue: "team_queue",
        queueLabel: "Team Queue",
        bucket: "review",
        bucketLabel: "Review",
        contextLabel: "Team Queue · Review · North Tower",
      }),
    ];
    const searchResults =
      normalizedQuery.length === 0
        ? []
        : allRows.filter((row) => row.title.toLowerCase().includes(normalizedQuery));

    const queuePanels = [
      {
        id: "tasks-queue:my_queue",
        queue: "my_queue",
        title: "My Queue",
        totalCountLabel: "2 tasks",
        presentation: "primary" as const,
        isExpanded: expandedQueues.my_queue,
        buckets: [
          {
            id: "my_queue:new",
            title: "New",
            taskCountLabel: "1",
            bucket: "new" as const,
            isOpen: openBucketsByQueue.my_queue === "new",
            rows: allRows.filter((row) => row.bucket === "new"),
          },
          {
            id: "my_queue:wip",
            title: "Doing",
            taskCountLabel: "1",
            bucket: "wip" as const,
            isOpen: openBucketsByQueue.my_queue === "wip",
            rows: allRows.filter((row) => row.bucket === "wip"),
          },
          {
            id: "my_queue:review",
            title: "Review",
            taskCountLabel: "0",
            bucket: "review" as const,
            isOpen: openBucketsByQueue.my_queue === "review",
            rows: [],
          },
        ],
      },
      {
        id: "tasks-queue:team_queue",
        queue: "team_queue",
        title: "Team Queue",
        totalCountLabel: "1 task",
        presentation: "preview" as const,
        isExpanded: expandedQueues.team_queue,
        buckets: [
          {
            id: "team_queue:new",
            title: "New",
            taskCountLabel: "0",
            bucket: "new" as const,
            isOpen: openBucketsByQueue.team_queue === "new",
            rows: [],
          },
          {
            id: "team_queue:wip",
            title: "Doing",
            taskCountLabel: "0",
            bucket: "wip" as const,
            isOpen: openBucketsByQueue.team_queue === "wip",
            rows: [],
          },
          {
            id: "team_queue:review",
            title: "Review",
            taskCountLabel: "1",
            bucket: "review" as const,
            isOpen: openBucketsByQueue.team_queue === "review",
            rows: allRows.filter((row) => row.bucket === "review"),
          },
        ],
      },
    ];
    const taskRowItems =
      normalizedQuery.length > 0
        ? searchResults
        : queuePanels.flatMap((panel) =>
            panel.isExpanded ? panel.buckets.find((bucket) => bucket.isOpen)?.rows ?? [] : [],
          );
    const baseOutput: TasksScreenViewAdapterOutput = {
      screenId: "TasksScreen",
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
      filterSummary: {
        selectedProjectId: null,
        sectionFilterLabel: normalizedQuery.length > 0 ? "All Task Results" : "Ownership Queues",
        statusFilterLabel: "All projects",
        sortLabel: "Latest update",
      },
      isSearchMode: normalizedQuery.length > 0,
      queuePanels,
      searchResults,
      expandedTaskIds: [],
      taskRowItems,
      scalarMetrics: {
        totalVisibleTaskCount: taskRowItems.length,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: allRows.length,
        hasActiveFilters: false,
      },
    };

    if (overrideOutput) {
      return {
        output: {
          ...baseOutput,
          ...overrideOutput,
        },
        searchQuery,
        setSearchQuery,
        searchInput: {
          id: "tasks-search",
          label: "Search",
          value: searchQuery,
          placeholder: "Search tasks",
          density: "standard",
          structuralState: "stale",
        },
        visibility: {
          showCreateTaskFab: true,
          showProfileShortcut: true,
          showProjectPickerShortcut: true,
          showDeveloperSettingsShortcut: true,
          showResetFiltersShortcut: true,
        },
        actions: {
          resetFilters: () => {
            setSearchQuery("");
            setExpandedQueues({ my_queue: true, team_queue: false });
            setOpenBucketsByQueue({ my_queue: "new", team_queue: null });
          },
          toggleQueue: (queue: "my_queue" | "team_queue") => {
            setExpandedQueues((current: typeof expandedQueues) => ({
              ...current,
              [queue]: !current[queue],
            }));
          },
          openBucket: (queue: "my_queue" | "team_queue", bucket: "new" | "wip" | "review") => {
            setExpandedQueues((current: typeof expandedQueues) => ({
              ...current,
              [queue]: true,
            }));
            setOpenBucketsByQueue((current: typeof openBucketsByQueue) => ({
              ...current,
              [queue]: bucket,
            }));
          },
          toggleTaskExpansion: jest.fn(),
        },
      };
    }

    return {
      output: {
        ...baseOutput,
      },
      searchQuery,
      setSearchQuery,
      searchInput: {
        id: "tasks-search",
        label: "Search",
        value: searchQuery,
        placeholder: "Search tasks",
        density: "standard",
        structuralState: "stale",
      },
      visibility: {
        showCreateTaskFab: true,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: true,
        showResetFiltersShortcut: true,
      },
      actions: {
        resetFilters: () => {
          setSearchQuery("");
          setExpandedQueues({ my_queue: true, team_queue: false });
          setOpenBucketsByQueue({ my_queue: "new", team_queue: null });
        },
        toggleQueue: (queue: "my_queue" | "team_queue") => {
          setExpandedQueues((current: typeof expandedQueues) => ({
            ...current,
            [queue]: !current[queue],
          }));
        },
        openBucket: (queue: "my_queue" | "team_queue", bucket: "new" | "wip" | "review") => {
          setExpandedQueues((current: typeof expandedQueues) => ({
            ...current,
            [queue]: true,
          }));
          setOpenBucketsByQueue((current: typeof openBucketsByQueue) => ({
            ...current,
            [queue]: bucket,
          }));
        },
        toggleTaskExpansion: jest.fn(),
      },
    };
  };

  const __setTasksScreenOverride = (value: Partial<TasksScreenViewAdapterOutput> | null) => {
    overrideOutput = value;
  };

  return { useTasksViewAdapter, __setTasksScreenOverride };
});

describe("TasksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride(null);
  });

  it("renders queue panels, keeps Team Queue in preview, and preserves existing shortcuts", () => {
    const onNavigateToCreateTask = jest.fn();
    const onNavigateToProfile = jest.fn();
    const onNavigateToProjectPicker = jest.fn();
    const onNavigateToDeveloperSettings = jest.fn();

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={onNavigateToCreateTask}
        onNavigateBack={jest.fn()}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToProjectPicker={onNavigateToProjectPicker}
        onNavigateToDeveloperSettings={onNavigateToDeveloperSettings}
      />,
    );

    expect(screen.getByTestId("tasks-screen__queues")).toBeTruthy();
    expect(screen.getByText("My Queue")).toBeTruthy();
    expect(screen.getByText("Team Queue")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1")).toBeTruthy();
    expect(screen.queryByTestId("container-card:task-3")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__fab_create_task"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_profile"));
    expect(onNavigateToProfile).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__header_project_picker"));
    expect(onNavigateToProjectPicker).toHaveBeenCalledWith(true);

    fireEvent.press(screen.getByTestId("tasks-screen__header_developer_settings"));
    expect(onNavigateToDeveloperSettings).toHaveBeenCalledTimes(1);
  });

  it("opens Team Queue and keeps one bucket visible at a time", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("container-card:task-3")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__queue_toggle_team_queue"));
    fireEvent.press(screen.getByTestId("tasks-screen__queue_bucket_team_queue_review"));
    expect(screen.getByTestId("container-card:task-3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__queue_bucket_my_queue_wip"));
    expect(screen.getByTestId("container-card:task-2")).toBeTruthy();
    expect(screen.queryByTestId("container-card:task-1")).toBeNull();
  });

  it("switches into global search mode when the search query is populated", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    const input = screen.getByTestId("text-field:tasks-search__input");
    fireEvent.changeText(input, "team");

    expect(screen.getByTestId("tasks-screen__search_results")).toBeTruthy();
    expect(screen.queryByText("My Queue")).toBeNull();
    expect(screen.getByTestId("container-card:task-3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__header_reset_filters"));
    expect(screen.getByTestId("tasks-screen__queues")).toBeTruthy();
  });

  it("renders the queue empty state when there are no visible tasks", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
      isSearchMode: false,
      queuePanels: [],
      searchResults: [],
      expandedTaskIds: [],
      taskRowItems: [],
      scalarMetrics: {
        totalVisibleTaskCount: 0,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: 0,
        hasActiveFilters: false,
      },
    });

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__empty_state")).toBeTruthy();
    expect(screen.getByText("No Tasks")).toBeTruthy();
  });

  it("renders the Tasks list card with the reskinned thumbnail hierarchy", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1:content")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1:title")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1:status-line")).toBeTruthy();
  });
});
