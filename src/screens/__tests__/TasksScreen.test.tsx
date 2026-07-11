import React from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { fireEvent, render, within } from "@testing-library/react-native";

import TasksScreen from "../TasksScreen";
import type {
  TasksActiveFilterChipModel,
  TasksOverdueWindowValue,
  TasksQueueFilterValue,
  TasksScreenViewAdapterOutput,
  TasksStatusFilterValue,
} from "@/ui/contracts/viewAdapters";

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return {
    Ionicons: ({ name, testID }: { name: string; testID?: string }) => (
      <Text testID={testID ?? `icon:${name}`}>{name}</Text>
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
    showBackButton,
    onBackPress,
  }: {
    title: string;
    titleNode?: React.ReactNode;
    rightSlot?: React.ReactNode;
    className?: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
  }) {
    return (
      <View testID="app-screen-header__root" className={className}>
        {showBackButton ? (
          <Pressable testID="app-screen-header__back-trigger" onPress={onBackPress}>
            <Text>Back</Text>
          </Pressable>
        ) : null}
        {titleNode ? titleNode : <Text>{title}</Text>}
        {rightSlot}
        <Pressable testID="app-screen-header__profile-trigger">
          <Text>Profile</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("@/components/primitives/input/TextField", () => {
  return function MockTextField({ contract, onChangeText, rightSlot }: any) {
    const { View, Text, TextInput } = require("react-native");
    const testId = contract?.testId ?? `text-field:${contract?.id}`;

    return (
      <View testID={testId}>
        {contract?.label ? <Text>{contract.label}</Text> : null}
        <Text testID={`${testId}__density`}>{contract?.density}</Text>
        <TextInput
          testID={`${testId}__input`}
          value={contract?.value}
          placeholder={contract?.placeholder}
          onChangeText={onChangeText}
        />
        {rightSlot ? <View testID={`${testId}__right-slot`}>{rightSlot}</View> : null}
      </View>
    );
  };
});

jest.mock("react-native-modal", () => {
  const React = require("react");
  const { View } = require("react-native");

  return function MockModal({ children, isVisible }: any) {
    if (!isVisible) {
      return null;
    }

    return <View testID="mock-modal">{children}</View>;
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return {
    Swipeable: ({
      children,
      renderLeftActions,
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
      renderLeftActions?: () => React.ReactNode;
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
        {renderLeftActions ? (
          <View testID={`${testID ?? "mock-swipeable"}__left-actions`}>{renderLeftActions()}</View>
        ) : null}
        {children}
        {renderRightActions ? (
          <View testID={`${testID ?? "mock-swipeable"}__right-actions`}>{renderRightActions()}</View>
        ) : null}
      </View>
    ),
  };
});

jest.mock("@/ui/viewAdapters/useTasksViewAdapter", () => {
  const React = require("react");
  let overrideOutput: Partial<TasksScreenViewAdapterOutput> | null = null;
  let latestActions: Record<string, unknown> | null = null;

  const DEFAULT_FILTERS = {
    queue: "all_queues" as TasksQueueFilterValue,
    status: "any_status" as TasksStatusFilterValue,
    overdueWindow: "show_all" as TasksOverdueWindowValue,
  };

  const makeRow = (overrides: Record<string, unknown>) => ({
    id: "row-1",
    taskId: "task-1",
    title: "Install guardrails",
    cardPresentation: "thumbnail",
    statusToken: "task_new" as any,
    statusLabel: "New",
    responsibilityToken: "OTHER_OPEN" as any,
    priorityLabel: "High",
    dueDateLabel: "2026-07-10",
    assigneeSummary: "Sam",
    projectName: "North Tower",
    isOverdue: false,
    attachmentUris: [],
    density: "compact",
    structuralState: "stale",
    queue: "my_queue",
    queueLabel: "My Queue",
    bucket: "new",
    bucketLabel: "New",
    contextLabel: "North Tower",
    contextLine: "Level 12, Grid B-C",
    latestUpdateAt: "2026-07-04T12:00:00.000Z",
    latestUpdateLabel: "Due: 2026-07-10",
    ...overrides,
  });

  const getQueueLabel = (value: TasksQueueFilterValue) => {
    switch (value) {
      case "inbox":
        return "Inbox";
      case "outbox":
        return "Outbox";
      case "archived":
        return "Archived";
      case "all_queues":
      default:
        return "All queues";
    }
  };

  const getStatusLabel = (value: TasksStatusFilterValue) => {
    switch (value) {
      case "new":
        return "New";
      case "doing":
        return "Doing";
      case "review":
        return "Review";
      case "overdue":
        return "Overdue";
      case "any_status":
      default:
        return "Any status";
    }
  };

  const getOverdueWindowLabel = (value: TasksOverdueWindowValue) => {
    switch (value) {
      case "three_active":
        return "3 active";
      case "one_week":
        return "1 week";
      case "one_month":
        return "1 month";
      case "show_all":
      default:
        return "Show all";
    }
  };

  const buildActiveFilterChips = (filters: typeof DEFAULT_FILTERS): TasksActiveFilterChipModel[] => {
    const chips: TasksActiveFilterChipModel[] = [];

    if (filters.queue !== "all_queues") {
      chips.push({ id: "queue", label: `Queue: ${getQueueLabel(filters.queue)}` });
    }

    if (filters.status !== "any_status") {
      chips.push({ id: "status", label: `Status: ${getStatusLabel(filters.status)}` });
    }

    if (filters.overdueWindow !== "show_all") {
      chips.push({
        id: "overdueWindow",
        label: `Overdue: ${getOverdueWindowLabel(filters.overdueWindow)}`,
      });
    }

    return chips;
  };

  const useTasksViewAdapter = (props?: { onNavigateToTaskDetail?: (taskId: string, subTaskId?: string) => void }) => {
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isFiltersSheetOpen, setIsFiltersSheetOpen] = React.useState(false);
    const [stagedFilters, setStagedFilters] = React.useState(DEFAULT_FILTERS);
    const [appliedFilters, setAppliedFilters] = React.useState(DEFAULT_FILTERS);

    const allRows = [
      makeRow({
        taskId: "task-1",
        title: "Install guardrails",
        queue: "my_queue",
        queueLabel: "My Queue",
        bucket: "new",
        bucketLabel: "New",
        statusLabel: "New",
      }),
      makeRow({
        id: "row-2",
        taskId: "task-2",
        title: "Verify anchor points",
        queue: "my_queue",
        queueLabel: "My Queue",
        bucket: "wip",
        bucketLabel: "Doing",
        statusToken: "task_in_progress" as any,
        statusLabel: "Doing",
        latestUpdateLabel: "Due: 2026-07-05",
        indentationLevel: 1,
        isOverdue: true,
      }),
      makeRow({
        id: "row-3",
        taskId: "task-3",
        title: "Team review package",
        queue: "team_queue",
        queueLabel: "Team Queue",
        bucket: "review",
        bucketLabel: "Review",
        statusToken: "task_submitted_for_review" as any,
        statusLabel: "Review",
        contextLine: "Team Queue · Review · North Tower",
        latestUpdateLabel: "Due: 2026-07-01",
        isOverdue: true,
      }),
    ];

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredRows = allRows.filter((row) => {
      const matchesSearch =
        normalizedQuery.length === 0 || row.title.toLowerCase().includes(normalizedQuery);
      const matchesQueue =
        appliedFilters.queue === "all_queues" ||
        (appliedFilters.queue === "inbox" && row.queue === "my_queue") ||
        (appliedFilters.queue === "outbox" && row.queue === "team_queue") ||
        appliedFilters.queue === "archived";
      const matchesStatus =
        appliedFilters.status === "any_status" ||
        (appliedFilters.status === "new" && row.bucket === "new") ||
        (appliedFilters.status === "doing" && row.bucket === "wip") ||
        (appliedFilters.status === "review" && row.bucket === "review") ||
        (appliedFilters.status === "overdue" && row.isOverdue);
      const matchesOverdueWindow =
        appliedFilters.overdueWindow === "show_all" ? true : row.isOverdue;

      return matchesSearch && matchesQueue && matchesStatus && matchesOverdueWindow;
    });

    const activeFilterChips = buildActiveFilterChips(appliedFilters);
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
        sectionFilterLabel: "Search-first list",
        statusFilterLabel: "All projects",
        sortLabel: "Due date · Earliest first",
      },
      filterButton: {
        label: "Filters",
        isActive: activeFilterChips.length > 0,
        activeCount: activeFilterChips.length,
      },
      filterSheet: {
        isOpen: isFiltersSheetOpen,
        stagedQueue: stagedFilters.queue,
        stagedStatus: stagedFilters.status,
        stagedOverdueWindow: stagedFilters.overdueWindow,
      },
      activeFilterChips,
      resultSummaryLabel: `${filteredRows.length} task${filteredRows.length === 1 ? "" : "s"}`,
      filterControls: {
        mode: {
          id: "mode",
          label: "Mode",
          selectedValue: appliedFilters.status === "overdue" ? "overdue" : "all",
          options: [
            { id: "mode:all", value: "all", label: "All", count: 3, isSelected: appliedFilters.status !== "overdue" },
            { id: "mode:overdue", value: "overdue", label: "Overdue", count: 2, isSelected: appliedFilters.status === "overdue" },
          ],
        },
        queue: {
          id: "queue",
          label: "Queue",
          selectedValue: appliedFilters.queue === "outbox" ? "team_queue" : "my_queue",
          options: [
            { id: "queue:my_queue", value: "my_queue", label: "Inbox", count: 2, isSelected: appliedFilters.queue === "inbox" },
            { id: "queue:team_queue", value: "team_queue", label: "Outbox", count: 1, isSelected: appliedFilters.queue === "outbox" },
          ],
        },
        status: {
          id: "status",
          label: "Status",
          selectedValue:
            appliedFilters.status === "doing"
              ? "wip"
              : appliedFilters.status === "review"
                ? "review"
                : "new",
          options: [
            { id: "status:new", value: "new", label: "New", count: 1, isSelected: appliedFilters.status === "new" },
            { id: "status:wip", value: "wip", label: "Doing", count: 1, isSelected: appliedFilters.status === "doing" },
            { id: "status:review", value: "review", label: "Review", count: 1, isSelected: appliedFilters.status === "review" },
          ],
        },
      },
      isSearchMode: normalizedQuery.length > 0,
      queuePanels: [],
      searchResults: normalizedQuery.length > 0 ? filteredRows : [],
      expandedTaskIds: [],
      taskRowItems: filteredRows,
      scalarMetrics: {
        totalVisibleTaskCount: filteredRows.length,
        overdueVisibleTaskCount: filteredRows.filter((row) => row.isOverdue).length,
        selectedProjectTaskCount: allRows.length,
        hasActiveFilters: normalizedQuery.length > 0 || activeFilterChips.length > 0,
      },
    };

    const mergedOutput = overrideOutput ? { ...baseOutput, ...overrideOutput } : baseOutput;

    latestActions = {
      resetFilters: () => {
        setSearchQuery("");
        setIsFiltersSheetOpen(false);
        setStagedFilters(DEFAULT_FILTERS);
        setAppliedFilters(DEFAULT_FILTERS);
      },
      openFiltersSheet: () => {
        setStagedFilters(appliedFilters);
        setIsFiltersSheetOpen(true);
      },
      closeFiltersSheet: () => setIsFiltersSheetOpen(false),
      stageQueueFilter: (value: TasksQueueFilterValue) =>
        setStagedFilters((current) => ({ ...current, queue: value })),
      stageStatusFilter: (value: TasksStatusFilterValue) =>
        setStagedFilters((current) => ({ ...current, status: value })),
      stageOverdueWindowFilter: (value: TasksOverdueWindowValue) =>
        setStagedFilters((current) => ({ ...current, overdueWindow: value })),
      applyStagedFilters: () => {
        setAppliedFilters(stagedFilters);
        setIsFiltersSheetOpen(false);
      },
      resetStagedFilters: () => setStagedFilters(DEFAULT_FILTERS),
      removeAppliedFilterChip: (chipId: TasksActiveFilterChipModel["id"]) => {
        const resetValue =
          chipId === "queue"
            ? { queue: "all_queues" as TasksQueueFilterValue }
            : chipId === "status"
              ? { status: "any_status" as TasksStatusFilterValue }
              : { overdueWindow: "show_all" as TasksOverdueWindowValue };

        setAppliedFilters((current) => ({ ...current, ...resetValue }));
        setStagedFilters((current) => ({ ...current, ...resetValue }));
      },
      cycleQueue: jest.fn(),
      cycleStatus: jest.fn(),
      selectAllMode: jest.fn(),
      selectOverdueOnly: jest.fn(),
      toggleTaskExpansion: jest.fn(),
      archiveTask: jest.fn().mockResolvedValue(undefined),
    };

    const outputWithNavigation = {
      ...mergedOutput,
      searchResults: (mergedOutput.searchResults ?? []).map((row) => ({
        ...row,
        onPress: row.onPress ?? (props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(row.taskId) : undefined),
      })),
      taskRowItems: (mergedOutput.taskRowItems ?? []).map((row) => ({
        ...row,
        onPress: row.onPress ?? (props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(row.taskId) : undefined),
      })),
    };

    return {
      output: outputWithNavigation,
      searchQuery,
      setSearchQuery,
      searchInput: {
        id: "tasks-search",
        label: "Search",
        value: searchQuery,
        placeholder: "Search tasks",
        density: "compact",
        structuralState: "stale",
      },
      visibility: {
        showCreateTaskFab: true,
        showProfileShortcut: true,
        showProjectPickerShortcut: true,
        showDeveloperSettingsShortcut: true,
        showResetFiltersShortcut: true,
      },
      actions: latestActions,
    };
  };

  const __setTasksScreenOverride = (value: Partial<TasksScreenViewAdapterOutput> | null) => {
    overrideOutput = value;
  };

  const __getTasksScreenActions = () => latestActions;

  return { useTasksViewAdapter, __setTasksScreenOverride, __getTasksScreenActions };
});

describe("TasksScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride(null);
  });

  it("renders the Search + Filters row on the off-white body and hides chips by default", () => {
    const screen = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("bg-slate-50");
    expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("pt-1");
    expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("pb-1");
    expect(screen.getByTestId("tasks-screen__filters_button")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__filter_all")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__active_filter_chips")).toBeNull();
    expect(within(screen.getByTestId("text-field:tasks-search__right-slot")).getByText("3")).toBeTruthy();
    expect(screen.getByTestId("text-field:tasks-search__density").children.join("")).toBe("compact");
    expect(screen.getByTestId("tasks-screen__search_count").props.className).toContain("font-mono");
  });

  it("opens the filters sheet, applies staged filters, and removes an active chip immediately", () => {
    const screen = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__filters_button"));
    expect(screen.getByTestId("tasks-filters-sheet")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-filters-sheet__queue_outbox"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__status_review"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__apply"));

    expect(screen.getByTestId("tasks-screen__active_filter_chips")).toBeTruthy();
    expect(screen.getByText("Queue: Outbox")).toBeTruthy();
    expect(screen.getByText("Status: Review")).toBeTruthy();
    expect(within(screen.getByTestId("tasks-screen__filters_badge")).getByText("2")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__row_task-1")).toBeNull();
    expect(screen.getByTestId("tasks-screen__chip_remove_queue").props.className).toContain("bg-[#07111E]");
    expect(screen.getByTestId("tasks-screen__active_filter_chips").props.className).toContain("mt-1");
    expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("pb-4");
    expect(screen.getByTestId("tasks-screen__chip_remove_queue").props.className).toContain("px-3.5");
    expect(screen.getByTestId("tasks-screen__chip_remove_queue").props.className).toContain("py-2");
    expect(screen.getByText("Queue: Outbox").props.className).toContain("text-[12.5px]");

    fireEvent.press(screen.getByTestId("tasks-screen__chip_remove_queue"));
    expect(screen.queryByText("Queue: Outbox")).toBeNull();
    expect(screen.getByText("Status: Review")).toBeTruthy();
    expect(within(screen.getByTestId("tasks-screen__filters_badge")).getByText("1")).toBeTruthy();
  });

  it("renders the overdue window chip label with the approved copy", () => {
    const screen = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__filters_button"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__overdue_window_three_active"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__apply"));

    expect(screen.getByText("Overdue: 3 active")).toBeTruthy();
  });

  it("keeps search independent from the filters badge, resets filters, and preserves row tap-through navigation", () => {
    const onNavigateToTaskDetail = jest.fn();
    const screen = render(
      <TasksScreen onNavigateToTaskDetail={onNavigateToTaskDetail} onNavigateToCreateTask={jest.fn()} />,
    );

    fireEvent.changeText(screen.getByTestId("text-field:tasks-search__input"), "team");
    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__filters_badge")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__filters_button"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__status_review"));
    fireEvent.press(screen.getByTestId("tasks-filters-sheet__apply"));
    expect(within(screen.getByTestId("tasks-screen__filters_badge")).getByText("1")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__header_reset_filters"));
    expect(screen.getByTestId("tasks-screen__row_task-1")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-2")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__filters_badge")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-2"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-2");
    expect(screen.getByTestId("tasks-screen__row_wrapper_task-2").props.className).toContain("ml-6");
  });

  it("shows archive on right swipe, update on left swipe, and renders icon-only row actions", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const onNavigateToCreateTask = jest.fn();
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");

    mockedModule.__setTasksScreenOverride({
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
          assigneeSummary: "Sam",
          projectName: "North Tower",
          isOverdue: false,
          attachmentUris: [],
          density: "compact",
          structuralState: "stale",
          contextLine: "North Tower",
          latestUpdateLabel: "Due: 2026-07-10",
          canShowTaskUpdateAction: true,
          canShowArchiveAction: true,
        } as any,
      ],
      scalarMetrics: {
        totalVisibleTaskCount: 1,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: 1,
        hasActiveFilters: false,
      },
      resultSummaryLabel: "1 task",
    });

    const screen = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={onNavigateToCreateTask} />,
    );

    expect(
      within(screen.getByTestId("tasks-screen__row_task-1:swipeable__left-actions")).getByTestId(
        "tasks-screen__row_task-1:archive-action",
      ),
    ).toBeTruthy();
    expect(
      within(screen.getByTestId("tasks-screen__row_task-1:swipeable__right-actions")).getByTestId(
        "tasks-screen__row_task-1:update-action",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Task Update")).toBeNull();
    expect(screen.queryByText("Archive")).toBeNull();
    expect(screen.getByTestId("tasks-screen__row_task-1:archive-action-icon")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-1:update-action-icon")).toBeTruthy();
    expect(
      screen.getByTestId("tasks-screen__row_task-1:swipeable__overshoot-left").children.join(""),
    ).toBe("false");
    expect(
      screen.getByTestId("tasks-screen__row_task-1:swipeable__overshoot-right").children.join(""),
    ).toBe("false");
    expect(
      screen.getByTestId("tasks-screen__row_task-1:archive-action-wrapper").props.className,
    ).toContain("w-[60px]");
    expect(
      screen.getByTestId("tasks-screen__row_task-1:update-action-wrapper").props.className,
    ).toContain("w-[60px]");
    expect(screen.getByTestId("tasks-screen__row_task-1:archive-action").props.className).toContain(
      "w-[72px]",
    );
    expect(screen.getByTestId("tasks-screen__row_task-1:update-action").props.className).toContain(
      "w-[72px]",
    );
    expect(screen.getByTestId("tasks-screen__row_task-1:archive-action-icon-offset")).toHaveStyle({
      transform: [{ translateX: -5 }],
    });
    expect(screen.getByTestId("tasks-screen__row_task-1:update-action-icon-offset")).toHaveStyle({
      transform: [{ translateX: 5 }],
    });

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1:update-action"));
    expect(onNavigateToCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "update",
        editTaskId: "task-1",
        sourceScreen: "tasks",
      }),
    );

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1:archive-action"));
    expect(alertSpy).toHaveBeenCalled();

    const actions = mockedModule.__getTasksScreenActions();
    const alertButtons = alertSpy.mock.calls[0]?.[2] ?? [];
    const archiveButton = alertButtons.find((button: any) => button.text === "Archive");
    archiveButton?.onPress?.();

    expect(actions.archiveTask).toHaveBeenCalledWith("task-1");
    alertSpy.mockRestore();
  });

  it("does not open task details while a row swipe interaction is active", () => {
    const onNavigateToTaskDetail = jest.fn();
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={onNavigateToTaskDetail}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-1");

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1:swipeable__open-start"));
    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1:swipeable__will-open"));
    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1:swipeable__close"));
    fireEvent.press(screen.getByTestId("tasks-screen__row_task-1"));
    expect(onNavigateToTaskDetail).toHaveBeenCalledTimes(2);
  });

  it("renders the floating Overdue badge instead of the old dot marker on overdue task cards", () => {
    const screen = render(
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    expect(screen.getByTestId("tasks-screen__row_task-2:overdue-badge")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-3:overdue-badge")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-2:overdue-badge").props.className).toContain("px-3");
    expect(screen.getByTestId("tasks-screen__row_task-2:overdue-badge").props.className).toContain("py-1.5");
    expect(screen.getAllByText("Overdue")[0].props.className).toContain("text-sm");
    expect(screen.queryByTestId("tasks-screen__row_task-2:overdue-dot")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__row_task-3:overdue-dot")).toBeNull();
  });

  it("renders the search-first empty state when no tasks match", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
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
      <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
    );

    expect(screen.getByTestId("tasks-screen__empty_state")).toBeTruthy();
    expect(screen.getByText("No matching tasks")).toBeTruthy();
  });
});
