import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import TasksScreen from "../../../src/screens/TasksScreen";
import { useTasksViewAdapter } from "../../../src/ui/viewAdapters/useTasksViewAdapter";

// Mock the view adapter
jest.mock("../../../src/ui/viewAdapters/useTasksViewAdapter");
const mockUseTasksViewAdapter = useTasksViewAdapter as jest.Mock;

// Mock child components
jest.mock("../../../src/components/primitives/container/ContainerCard", () => {
  return function MockContainerCard() {
    return <></>;
  };
});
jest.mock("../../../src/components/primitives/input/TextField", () => {
  return function MockTextField() {
    return <></>;
  };
});

describe("TasksScreen Interactions", () => {
  let mockToggleQueue: jest.Mock;
  let mockOpenBucket: jest.Mock;
  let mockResetFilters: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockToggleQueue = jest.fn();
    mockOpenBucket = jest.fn();
    mockResetFilters = jest.fn();

    mockUseTasksViewAdapter.mockReturnValue({
      output: {
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
          sectionFilterLabel: "Ownership Queues",
          statusFilterLabel: "All projects",
          sortLabel: "Latest update",
        },
        isSearchMode: false,
        queuePanels: [
          {
            id: "tasks-queue:my_queue",
            queue: "my_queue",
            title: "My Queue",
            totalCountLabel: "2 tasks",
            presentation: "primary",
            isExpanded: true,
            buckets: [
              {
                id: "my_queue:new",
                title: "New",
                taskCountLabel: "1",
                bucket: "new",
                isOpen: true,
                rows: [
                  {
                    id: "row-1",
                    taskId: "task-1",
                    title: "Install guardrails",
                    statusToken: "task_new",
                    statusLabel: "New",
                    responsibilityToken: "OTHER_OPEN",
                    priorityLabel: "High",
                    dueDateLabel: "2026-07-05",
                    assigneeSummary: "Sam",
                    projectName: "North Tower",
                    isOverdue: false,
                    attachmentUris: [],
                    queue: "my_queue",
                    queueLabel: "My Queue",
                    bucket: "new",
                    bucketLabel: "New",
                    contextLabel: "North Tower",
                    latestUpdateAt: "2026-07-04T09:00:00.000Z",
                    latestUpdateLabel: "2026-07-04",
                    isExpanded: false,
                    density: "compact",
                    structuralState: "stale",
                  },
                ],
              },
              {
                id: "my_queue:wip",
                title: "Doing",
                taskCountLabel: "1",
                bucket: "wip",
                isOpen: false,
                rows: [],
              },
              {
                id: "my_queue:review",
                title: "Review",
                taskCountLabel: "0",
                bucket: "review",
                isOpen: false,
                rows: [],
              },
            ],
          },
          {
            id: "tasks-queue:team_queue",
            queue: "team_queue",
            title: "Team Queue",
            totalCountLabel: "1 task",
            presentation: "preview",
            isExpanded: false,
            buckets: [
              {
                id: "team_queue:new",
                title: "New",
                taskCountLabel: "0",
                bucket: "new",
                isOpen: false,
                rows: [],
              },
              {
                id: "team_queue:wip",
                title: "Doing",
                taskCountLabel: "0",
                bucket: "wip",
                isOpen: false,
                rows: [],
              },
              {
                id: "team_queue:review",
                title: "Review",
                taskCountLabel: "1",
                bucket: "review",
                isOpen: false,
                rows: [],
              },
            ],
          },
        ],
        searchResults: [],
        expandedTaskIds: [],
        taskRowItems: [],
        scalarMetrics: {
          totalVisibleTaskCount: 1,
          overdueVisibleTaskCount: 0,
          selectedProjectTaskCount: 1,
          hasActiveFilters: false,
        },
      },
      searchInput: {
        id: "tasks-search",
        label: "Search",
        value: "",
        placeholder: "Search tasks",
        density: "standard",
        structuralState: "stale",
      },
      setSearchQuery: jest.fn(),
      visibility: {
        showCreateTaskFab: false,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: false,
        showResetFiltersShortcut: true,
      },
      actions: {
        resetFilters: mockResetFilters,
        toggleQueue: mockToggleQueue,
        openBucket: mockOpenBucket,
        toggleTaskExpansion: jest.fn(),
      },
    });
  });

  it("wires queue toggle and bucket presses through the screen", () => {
    const { getByTestId } = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("tasks-screen__queue_toggle_team_queue"));
    expect(mockToggleQueue).toHaveBeenCalledWith("team_queue");

    fireEvent.press(getByTestId("tasks-screen__queue_bucket_my_queue_wip"));
    expect(mockOpenBucket).toHaveBeenCalledWith("my_queue", "wip");

    fireEvent.press(getByTestId("tasks-screen__queue_bucket_team_queue_review"));
    expect(mockOpenBucket).toHaveBeenCalledWith("team_queue", "review");

    fireEvent.press(getByTestId("tasks-screen__header_reset_filters"));
    expect(mockResetFilters).toHaveBeenCalledTimes(1);
  });
});
