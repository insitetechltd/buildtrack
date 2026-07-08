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
  let mockSelectQueue: jest.Mock;
  let mockSelectBucket: jest.Mock;
  let mockResetFilters: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelectQueue = jest.fn();
    mockSelectBucket = jest.fn();
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
          sectionFilterLabel: "Search-first list",
          statusFilterLabel: "All projects",
          sortLabel: "Priority first",
        },
        filterControls: {
          queue: {
            id: "queue",
            label: "Queue",
            selectedValue: "all",
            options: [
              { id: "queue:all", value: "all", label: "All 2", count: 2, isSelected: true },
              { id: "queue:my_queue", value: "my_queue", label: "My Queue 1", count: 1, isSelected: false },
              { id: "queue:team_queue", value: "team_queue", label: "Team Queue 1", count: 1, isSelected: false },
            ],
          },
          bucket: {
            id: "bucket",
            label: "Bucket",
            selectedValue: "all",
            options: [
              { id: "bucket:all", value: "all", label: "All 2", count: 2, isSelected: true },
              { id: "bucket:new", value: "new", label: "New 1", count: 1, isSelected: false },
              { id: "bucket:wip", value: "wip", label: "Doing 0", count: 0, isSelected: false },
              { id: "bucket:review", value: "review", label: "Review 1", count: 1, isSelected: false },
            ],
          },
        },
        isSearchMode: false,
        queuePanels: [],
        searchResults: [],
        expandedTaskIds: [],
        taskRowItems: [
          {
            id: "row-1",
            taskId: "task-1",
            title: "Install guardrails",
            cardPresentation: "thumbnail",
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
        selectQueue: mockSelectQueue,
        selectBucket: mockSelectBucket,
        toggleTaskExpansion: jest.fn(),
      },
    });
  });

  it("wires search-first filter presses through the screen", () => {
    const { getByTestId } = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("tasks-screen__filter_queue"));
    fireEvent.press(getByTestId("tasks-screen__filter_bucket"));
    fireEvent.press(getByTestId("tasks-screen__header_reset_filters"));

    expect(getByTestId("tasks-screen__task_list")).toBeTruthy();
    expect(mockResetFilters).toHaveBeenCalledTimes(1);
    expect(mockSelectQueue).not.toHaveBeenCalled();
    expect(mockSelectBucket).not.toHaveBeenCalled();
  });
});
