import React from "react";
import { fireEvent, render, within } from "@testing-library/react-native";
import TasksScreen from "../TasksScreen";
import type { TasksScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

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
        latestUpdateAt: "2026-07-04T12:00:00.000Z",
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
        latestUpdateAt: "2026-07-04T11:00:00.000Z",
        indentationLevel: 1,
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
        contextLine: "Team Queue · Review · North Tower",
        latestUpdateAt: "2026-07-04T10:00:00.000Z",
      }),
    ];
    const [selectedQueue, setSelectedQueue] = React.useState<"all" | "my_queue" | "team_queue">("all");
    const [selectedBucket, setSelectedBucket] = React.useState<"all" | "new" | "wip" | "review">("all");
    const [selectedSortField, setSelectedSortField] = React.useState<
      "created_at" | "due_date" | "modified_at"
    >("modified_at");
    const [selectedSortDirection, setSelectedSortDirection] = React.useState<"asc" | "desc">("desc");
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const queueFilteredRows =
      selectedQueue === "all" ? allRows : allRows.filter((row) => row.queue === selectedQueue);
    const visibleRows = queueFilteredRows.filter((row) => {
      if (selectedBucket === "all") {
        return true;
      }

      return row.bucket === selectedBucket;
    });
    const taskRowItems = visibleRows.filter((row) => row.title.toLowerCase().includes(normalizedQuery));
    const queueOptions = [
      {
        id: "queue:all",
        value: "all",
        label: `All ${allRows.length}`,
        count: allRows.length,
        isSelected: selectedQueue === "all",
      },
      {
        id: "queue:my_queue",
        value: "my_queue",
        label: `My Queue ${allRows.filter((row) => row.queue === "my_queue").length}`,
        count: allRows.filter((row) => row.queue === "my_queue").length,
        isSelected: selectedQueue === "my_queue",
      },
      {
        id: "queue:team_queue",
        value: "team_queue",
        label: `Team Queue ${allRows.filter((row) => row.queue === "team_queue").length}`,
        count: allRows.filter((row) => row.queue === "team_queue").length,
        isSelected: selectedQueue === "team_queue",
      },
    ];
    const bucketOptions = [
      {
        id: "bucket:all",
        value: "all",
        label: `All ${queueFilteredRows.length}`,
        count: queueFilteredRows.length,
        isSelected: selectedBucket === "all",
      },
      {
        id: "bucket:new",
        value: "new",
        label: `New ${queueFilteredRows.filter((row) => row.bucket === "new").length}`,
        count: queueFilteredRows.filter((row) => row.bucket === "new").length,
        isSelected: selectedBucket === "new",
      },
      {
        id: "bucket:wip",
        value: "wip",
        label: `Doing ${queueFilteredRows.filter((row) => row.bucket === "wip").length}`,
        count: queueFilteredRows.filter((row) => row.bucket === "wip").length,
        isSelected: selectedBucket === "wip",
      },
      {
        id: "bucket:review",
        value: "review",
        label: `Review ${queueFilteredRows.filter((row) => row.bucket === "review").length}`,
        count: queueFilteredRows.filter((row) => row.bucket === "review").length,
        isSelected: selectedBucket === "review",
      },
    ];
    const sortOptions = [
      {
        id: "sort:created_at",
        value: "created_at",
        label: "Creation date",
        count: visibleRows.length,
        isSelected: selectedSortField === "created_at",
      },
      {
        id: "sort:due_date",
        value: "due_date",
        label: "Due date",
        count: visibleRows.length,
        isSelected: selectedSortField === "due_date",
      },
      {
        id: "sort:modified_at",
        value: "modified_at",
        label: "Modified date",
        count: visibleRows.length,
        isSelected: selectedSortField === "modified_at",
      },
    ];
    const sortDirectionOptions = [
      {
        id: "sortDirection:asc",
        value: "asc",
        label: "Earliest first",
        count: visibleRows.length,
        isSelected: selectedSortDirection === "asc",
      },
      {
        id: "sortDirection:desc",
        value: "desc",
        label: "Latest first",
        count: visibleRows.length,
        isSelected: selectedSortDirection === "desc",
      },
    ];
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
        sortLabel: "Priority first",
      },
      isSearchMode: false,
      queuePanels: [],
      searchResults: [],
      expandedTaskIds: [],
      taskRowItems,
      scalarMetrics: {
        totalVisibleTaskCount: taskRowItems.length,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: allRows.length,
        hasActiveFilters: false,
      },
    } as TasksScreenViewAdapterOutput;
    (baseOutput as any).filterControls = {
      queue: {
        id: "queue",
        label: "Queue",
        selectedValue: selectedQueue,
        options: queueOptions,
      },
      bucket: {
        id: "bucket",
        label: "Bucket",
        selectedValue: selectedBucket,
        options: bucketOptions,
      },
      sort: {
        id: "sort",
        label: "Sort by",
        selectedValue: selectedSortField,
        options: sortOptions,
      },
      sortDirection: {
        id: "sortDirection",
        label: "Order",
        selectedValue: selectedSortDirection,
        options: sortDirectionOptions,
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
            setSelectedQueue("all");
            setSelectedBucket("all");
          },
          selectQueue: (queue: "all" | "my_queue" | "team_queue") => {
            setSelectedQueue(queue);
            setSelectedBucket("all");
          },
          selectBucket: (bucket: "all" | "new" | "wip" | "review") => {
            setSelectedBucket(bucket);
          },
          selectSortField: (field: "created_at" | "due_date" | "modified_at") => {
            setSelectedSortField(field);
          },
          selectSortDirection: (direction: "asc" | "desc") => {
            setSelectedSortDirection(direction);
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
          setSelectedQueue("all");
          setSelectedBucket("all");
        },
        selectQueue: (queue: "all" | "my_queue" | "team_queue") => {
          setSelectedQueue(queue);
          setSelectedBucket("all");
        },
        selectBucket: (bucket: "all" | "new" | "wip" | "review") => {
          setSelectedBucket(bucket);
        },
        selectSortField: (field: "created_at" | "due_date" | "modified_at") => {
          setSelectedSortField(field);
        },
        selectSortDirection: (direction: "asc" | "desc") => {
          setSelectedSortDirection(direction);
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

  it("renders queue, bucket, sort, and direction controls without a back button", () => {
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

    expect(screen.getByTestId("tasks-screen__filter_queue")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__filter_bucket")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__filter_sort")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__filter_sort_direction")).toBeTruthy();
    expect(screen.queryByTestId("app-screen-header__back-trigger")).toBeNull();
    expect(screen.getByText("Sort by")).toBeTruthy();
    expect(screen.getByText("Modified date")).toBeTruthy();
    expect(screen.getByText("Latest first")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__task_list")).toBeTruthy();
    const searchRightSlot = screen.getByTestId("text-field:tasks-search__right-slot");
    expect(within(searchRightSlot).getByTestId("tasks-screen__search_count")).toBeTruthy();
    expect(within(searchRightSlot).getByText("3")).toBeTruthy();
    expect(screen.queryByText("Search-first list")).toBeNull();
    expect(screen.getByTestId("app-screen-header__root").props.className).toContain("bg-[#08576E]");
    expect(screen.getByTestId("app-screen-header__profile-trigger")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-1")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-2:no-photo-icon")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();
    expect(screen.queryByTestId("container-card:task-1")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__queues")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_profile")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_project_picker")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_developer_settings")).toBeNull();
    expect(screen.getByTestId("brand-header-title")).toBeTruthy();
    expect(screen.getByText("TASKR")).toBeTruthy();
    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__fab_create_task")).toBeNull();

    expect(onNavigateToProfile).not.toHaveBeenCalled();
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToDeveloperSettings).not.toHaveBeenCalled();
    expect(onNavigateToCreateTask).not.toHaveBeenCalled();
  });

  it("opens sort controls and applies the one-step font increase across the screen", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__filter_sort"));

    expect(screen.getByText("Creation date")).toBeTruthy();
    expect(screen.getByText("Due date")).toBeTruthy();
    expect(screen.getAllByText("Modified date").length).toBeGreaterThan(0);

    const searchCount = screen.getByTestId("tasks-screen__search_count");

    expect(within(searchCount).getByText("3").props.className).toContain("text-base");
    expect(screen.getByText("Queue").props.className).toContain("text-base");
    expect(screen.getByText("Bucket").props.className).toContain("text-base");
    expect(screen.getByText("Sort by").props.className).toContain("text-base");
    expect(screen.getByText("Install guardrails").props.className).toContain("text-xl");
  });

  it("updates the visible list when queue and bucket filters change", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__filter_queue"));
    expect(screen.getByText("Team Queue 1")).toBeTruthy();

    fireEvent.press(screen.getByText("Team Queue 1"));
    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__row_task-1")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__filter_bucket"));
    fireEvent.press(screen.getByText("Review 1"));
    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tasks-screen__filter_queue"));
    fireEvent.press(screen.getByText("My Queue 2"));
    fireEvent.press(screen.getByTestId("tasks-screen__filter_bucket"));
    fireEvent.press(screen.getByText("Doing 1"));
    expect(screen.getByTestId("tasks-screen__row_task-2")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__row_task-1")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__row_task-3")).toBeNull();
  });

  it("keeps search visible and applies it on top of the selected filters", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    const input = screen.getByTestId("text-field:tasks-search__input");
    fireEvent.changeText(input, "team");

    expect(screen.getByTestId("tasks-screen__row_task-3")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__row_task-1")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__header_reset_filters"));
    expect(screen.getByTestId("tasks-screen__task_list")).toBeTruthy();
  });

  it("renders the search-first empty state when no tasks match", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
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
    expect(screen.getByText("No matching tasks")).toBeTruthy();
  });

  it("matches the Activity header safe-area treatment and keeps a tighter static control gap", () => {
    const { SafeAreaView } = require("react-native-safe-area-context");

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    const safeArea = screen.UNSAFE_getByType(SafeAreaView);

    expect(safeArea.props.edges).toEqual(["left", "right", "bottom"]);
    expect(screen.getByTestId("tasks-screen__search_wrapper").props.className).toContain("mb-1");
  });

  it("renders the Tasks list rows through the shared activity-style shell", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__row_task-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-1:thumbnail-image")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-2:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__row_task-2:no-photo-icon")).toBeTruthy();
  });

  it("preserves nested-task indentation in the shared row path and keeps row tap-through navigation", () => {
    const onNavigateToTaskDetail = jest.fn();
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={onNavigateToTaskDetail}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__row_wrapper_task-2").props.className).toContain("ml-6");

    fireEvent.press(screen.getByTestId("tasks-screen__row_task-2"));

    expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-2");
  });
});
