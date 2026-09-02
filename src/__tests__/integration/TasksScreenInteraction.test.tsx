import React from "react";
import { render, fireEvent, within, act } from "@testing-library/react-native";

import TasksScreen from "../../../src/screens/TasksScreen";
import { useTasksViewAdapter } from "../../../src/ui/viewAdapters/useTasksViewAdapter";
import { triggerRefresh } from "../../../src/utils/DataRefreshManager";

jest.mock("../../../src/ui/viewAdapters/useTasksViewAdapter");
jest.mock("../../../src/utils/DataRefreshManager", () => ({
  triggerRefresh: jest.fn(() => Promise.resolve()),
}));
const mockUseTasksViewAdapter = useTasksViewAdapter as jest.Mock;

jest.mock("react-native-modal", () => {
  return function MockModal({ children, isVisible }: any) {
    const { View } = require("react-native");

    if (!isVisible) {
      return null;
    }

    return <View testID="mock-modal">{children}</View>;
  };
});

jest.mock("../../../src/components/primitives/input/TextField", () => {
  return function MockTextField({ contract, rightSlot }: any) {
    const { View, Text } = require("react-native");
    const resolvedTestId = contract?.testId ?? `text-field:${contract?.id}`;
    const placeholder = contract?.placeholder;

    return (
      <View testID={resolvedTestId}>
        {contract?.label ? <Text>{contract.label}</Text> : null}
        {placeholder ? <Text>{placeholder}</Text> : null}
        {rightSlot ? <View testID={`${resolvedTestId}__right-slot`}>{rightSlot}</View> : null}
      </View>
    );
  };
});

describe("TasksScreen Interactions", () => {
  let mockResetFilters: jest.Mock;
  let mockOpenFiltersSheet: jest.Mock;
  let mockCloseFiltersSheet: jest.Mock;
  let mockStageQueueFilter: jest.Mock;
  let mockStageStatusFilter: jest.Mock;
  let mockStageOverdueWindowFilter: jest.Mock;
  let mockApplyStagedFilters: jest.Mock;
  let mockResetStagedFilters: jest.Mock;
  let mockRemoveAppliedFilterChip: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockResetFilters = jest.fn();
    mockOpenFiltersSheet = jest.fn();
    mockCloseFiltersSheet = jest.fn();
    mockStageQueueFilter = jest.fn();
    mockStageStatusFilter = jest.fn();
    mockStageOverdueWindowFilter = jest.fn();
    mockApplyStagedFilters = jest.fn();
    mockResetStagedFilters = jest.fn();
    mockRemoveAppliedFilterChip = jest.fn();

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
          sortLabel: "Due date · Earliest first",
        },
        filterButton: {
          label: "Filters",
          isActive: true,
          activeCount: 2,
        },
        filterSheet: {
          isOpen: false,
          stagedQueue: "outbox",
          stagedStatus: "review",
          stagedOverdueWindow: "show_all",
        },
        activeFilterChips: [
          { id: "queue", label: "Queue: Outbox" },
          { id: "status", label: "Status: Review" },
        ],
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
            queueLabel: "Mine",
            bucket: "new",
            bucketLabel: "New",
            contextLabel: "North Tower",
            latestUpdateAt: "2026-07-04T09:00:00.000Z",
            latestUpdateLabel: "Due: 2026-07-05",
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
        openFiltersSheet: mockOpenFiltersSheet,
        closeFiltersSheet: mockCloseFiltersSheet,
        stageQueueFilter: mockStageQueueFilter,
        stageStatusFilter: mockStageStatusFilter,
        stageOverdueWindowFilter: mockStageOverdueWindowFilter,
        applyStagedFilters: mockApplyStagedFilters,
        resetStagedFilters: mockResetStagedFilters,
        removeAppliedFilterChip: mockRemoveAppliedFilterChip,
        toggleTaskExpansion: jest.fn(),
      },
    });
  });

  it("wires the filters button and chip removal through the Search + Filters contract", () => {
    const { getByTestId, getByText, queryByText, queryByTestId } = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    expect(getByTestId("text-field:tasks-search")).toBeTruthy();
    expect(within(getByTestId("text-field:tasks-search__right-slot")).getByText("1")).toBeTruthy();
    expect(getByTestId("tasks-screen__filters_button")).toBeTruthy();
    expect(getByText("Queue: Outbox")).toBeTruthy();
    expect(getByText("Status: Review")).toBeTruthy();
    expect(queryByTestId("tasks-screen__filter_all")).toBeNull();
    expect(queryByTestId("tasks-screen__filter_overdue")).toBeNull();

    fireEvent.press(getByTestId("tasks-screen__filters_button"));
    fireEvent.press(getByTestId("tasks-screen__chip_remove_queue"));
    expect(queryByTestId("tasks-screen__header_reset_filters")).toBeNull();

    expect(getByTestId("tasks-screen__task_list")).toBeTruthy();
    expect(mockOpenFiltersSheet).toHaveBeenCalledTimes(1);
    expect(mockRemoveAppliedFilterChip).toHaveBeenCalledWith("queue");
    expect(queryByText("Mine")).toBeNull();
    expect(queryByText("Bucket")).toBeNull();
    expect(queryByText("Sort by")).toBeNull();
  });

  it("wires Tasks pull-to-refresh to a forced triggerRefresh without header reload button", async () => {
    const { getByTestId, queryByTestId } = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    const list = getByTestId("tasks-screen__task_list");
    expect(list.props.refreshControl).toBeTruthy();
    expect(list.props.refreshControl.props.refreshing).toBe(false);
    expect(queryByTestId("tasks-screen__header_reset_filters")).toBeNull();

    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(triggerRefresh).toHaveBeenCalledWith({ force: true });
  });
});
