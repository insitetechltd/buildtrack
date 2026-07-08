import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import TasksScreen from "../TasksScreen";
import type { TasksScreenViewAdapterOutput } from "@/ui/contracts/viewAdapters";

jest.mock("@/ui/viewAdapters/useTasksViewAdapter", () => {
  const React = require("react");
  let overrideOutput: Record<string, unknown> | null = null;
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
    cardPresentation: "thumbnail",
    density: "compact",
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
    const [isDraftsExpanded, setIsDraftsExpanded] = React.useState(
      Boolean((overrideOutput as any)?.draftsSection?.isExpanded),
    );
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const allRows = [
      makeRow({
        id: "row-1",
        taskId: "task-1",
        title: "Structural steel inspection — Level 12",
        statusToken: "task_submitted_for_review",
        statusLabel: "Submitted for review",
        isOverdue: false,
        primaryPhotoUri: "https://example.com/task-photo.jpg",
        supportingLine: "REVIEW",
        contextLine: "Level 12, Grid B–C",
        photoDisplayMode: "photo_centric",
        assigneeSummary: "1 assignee",
        queue: "my_queue",
        queueLabel: "My Queue",
        bucket: "new",
        bucketLabel: "New",
        contextLabel: "North Tower",
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
    const draftRows = [
      makeRow({
        id: "draft-row-1",
        taskId: "task-draft-1",
        title: "Prepare handover notes",
        statusLabel: "Draft",
        contextLabel: "North Tower",
      }),
      makeRow({
        id: "draft-row-2",
        taskId: "task-draft-2",
        title: "Confirm temporary signage",
        statusLabel: "Draft",
        contextLabel: "North Tower",
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
          {
            id: "my_queue:overdue",
            title: "Overdue",
            taskCountLabel: "0",
            bucket: "overdue" as const,
            isOpen: openBucketsByQueue.my_queue === "overdue",
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
          {
            id: "team_queue:overdue",
            title: "Overdue",
            taskCountLabel: "0",
            bucket: "overdue" as const,
            isOpen: openBucketsByQueue.team_queue === "overdue",
            rows: [],
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
      draftsSection: null,
      scalarMetrics: {
        totalVisibleTaskCount: taskRowItems.length,
        overdueVisibleTaskCount: 0,
        selectedProjectTaskCount: allRows.length,
        hasActiveFilters: false,
      },
    };

    if (overrideOutput) {
      const overrideQueuePanels = (overrideOutput as any).queuePanels;
      const overrideDraftsSection = (overrideOutput as any).draftsSection;
      const draftsSection =
        overrideDraftsSection === null || overrideDraftsSection === undefined
          ? null
          : {
              title: overrideDraftsSection.title ?? "Drafts",
              countLabel: overrideDraftsSection.countLabel ?? String((overrideDraftsSection.rows ?? draftRows).length),
              isExpanded: isDraftsExpanded,
              rows: overrideDraftsSection.rows ?? draftRows,
            };
      const queuePanels = overrideQueuePanels
        ? overrideQueuePanels.map((panel: any) => ({
            ...panel,
            isExpanded: expandedQueues[panel.queue] ?? panel.isExpanded,
            buckets: panel.buckets.map((bucket: any) => ({
              ...bucket,
              isOpen: openBucketsByQueue[panel.queue] === bucket.bucket,
            })),
          }))
        : baseOutput.queuePanels;
      const taskRowItems =
        normalizedQuery.length > 0
          ? searchResults
          : queuePanels.flatMap((panel: any) =>
              panel.isExpanded ? panel.buckets.find((bucket: any) => bucket.isOpen)?.rows ?? [] : [],
            );

      return {
        output: {
          ...baseOutput,
          ...overrideOutput,
          queuePanels,
          taskRowItems,
          draftsSection,
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
          openBucket: (queue: "my_queue" | "team_queue", bucket: "new" | "wip" | "review" | "overdue") => {
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
          toggleDraftsSection: () => setIsDraftsExpanded((current: boolean) => !current),
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
        openBucket: (queue: "my_queue" | "team_queue", bucket: "new" | "wip" | "review" | "overdue") => {
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
        toggleDraftsSection: () => setIsDraftsExpanded((current: boolean) => !current),
      },
    };
  };

  const __setTasksScreenOverride = (value: Record<string, unknown> | null) => {
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
    expect(screen.getByText("Tasks").props.className).toContain("text-[28px]");
    expect(screen.queryByText("Ownership Queues")).toBeNull();
    expect(screen.queryByText("All projects · Latest update")).toBeNull();
    expect(screen.queryByText("1 visible")).toBeNull();
    expect(screen.getByText("My Queue").props.className).toContain("text-xl");
    expect(screen.getByText("New · 1").props.className).toContain("text-base");
    expect(screen.getByText("Structural steel inspection — Level 12").props.className).toContain("text-lg");
    expect(screen.getByTestId("tasks-screen__queue_bucket_row_my_queue")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__queue_bucket_row_team_queue")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_new").props.className).toContain("flex-1");
    expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_new").props.className).toContain("min-w-0");
    expect(screen.queryByTestId("tasks-screen__queue_bucket_scroll_my_queue")).toBeNull();

    fireEvent.press(screen.getByTestId("tasks-screen__fab_create_task"));
    expect(onNavigateToCreateTask).toHaveBeenCalledTimes(1);

    expect(screen.queryByTestId("app-screen-header__profile-trigger")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_profile")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_project_picker")).toBeNull();
    expect(screen.queryByTestId("tasks-screen__header_developer_settings")).toBeNull();
    expect(onNavigateToProfile).not.toHaveBeenCalled();
    expect(onNavigateToProjectPicker).not.toHaveBeenCalled();
    expect(onNavigateToDeveloperSettings).not.toHaveBeenCalled();
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

  it("renders a collapsed drafts section at the bottom of tasks when drafts exist", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
      draftsSection: {
        title: "Drafts",
        countLabel: "2",
        isExpanded: false,
        rows: [
          {
            id: "draft-row-1",
            taskId: "task-draft-1",
            title: "Prepare handover notes",
            statusToken: "custom",
            statusLabel: "Draft",
            responsibilityToken: "OTHER_OPEN",
            priorityLabel: "Medium",
            assigneeSummary: "Unassigned",
            projectName: "North Tower",
            isOverdue: false,
            attachmentUris: [],
            density: "compact",
            structuralState: "stale",
          },
          {
            id: "draft-row-2",
            taskId: "task-draft-2",
            title: "Confirm temporary signage",
            statusToken: "custom",
            statusLabel: "Draft",
            responsibilityToken: "OTHER_OPEN",
            priorityLabel: "Low",
            assigneeSummary: "Unassigned",
            projectName: "North Tower",
            isOverdue: false,
            attachmentUris: [],
            density: "compact",
            structuralState: "stale",
          },
        ],
      },
    });

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__drafts_section")).toBeTruthy();
    expect(screen.getByText("Drafts · 2")).toBeTruthy();
    expect(screen.queryByText("Prepare handover notes")).toBeNull();
  });

  it("expands the drafts section in place when tapped", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
      draftsSection: {
        title: "Drafts",
        countLabel: "2",
        isExpanded: false,
      },
    });

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__drafts_toggle"));

    expect(screen.getByText("Prepare handover notes")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-draft-1")).toBeTruthy();
  });

  it("renders the Tasks list card with a compact full-height thumbnail, status badge, and location line", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-1:status-badge")).toBeTruthy();
    expect(screen.getByText("Structural steel inspection — Level 12")).toBeTruthy();
    expect(screen.getByText("Submitted for review")).toBeTruthy();
    expect(screen.getByText("Level 12, Grid B–C")).toBeTruthy();
    expect(screen.queryByText("REVIEW")).toBeNull();
  });

  it("does not render the Ownership Queues summary container above the queue panels", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__queues")).toBeTruthy();
    expect(screen.queryByTestId("tasks-screen__summary_card")).toBeNull();
    expect(screen.queryByText("Ownership Queues")).toBeNull();
    expect(screen.queryByText("Project scoped · Latest update")).toBeNull();
    expect(screen.queryByText("All projects · Latest update")).toBeNull();
  });

  it("renders an overdue bucket button for both queues even when the count is zero", () => {
    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__queue_bucket_team_queue_overdue")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue").props.className).toContain("flex-1");
    expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue").props.className).toContain("min-w-0");
  });

  it("opens the overdue bucket list for a queue and shows mixed overdue tasks", () => {
    const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");
    mockedModule.__setTasksScreenOverride({
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
              taskCountLabel: "0",
              bucket: "new",
              isOpen: false,
              rows: [],
            },
            {
              id: "my_queue:wip",
              title: "Doing",
              taskCountLabel: "0",
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
            {
              id: "my_queue:overdue",
              title: "Overdue",
              taskCountLabel: "2",
              bucket: "overdue",
              isOpen: false,
              rows: [
                {
                  id: "overdue-row-1",
                  taskId: "task-overdue-1",
                  title: "Overdue install guardrails",
                  statusToken: "task_new",
                  statusLabel: "New",
                  responsibilityToken: "OTHER_OPEN",
                  priorityLabel: "High",
                  assigneeSummary: "Sam",
                  projectName: "North Tower",
                  isOverdue: true,
                  attachmentUris: [],
                  density: "compact",
                  structuralState: "stale",
                },
                {
                  id: "overdue-row-2",
                  taskId: "task-overdue-2",
                  title: "Overdue review package",
                  statusToken: "task_submitted_for_review",
                  statusLabel: "Submitted for review",
                  responsibilityToken: "OTHER_OPEN",
                  priorityLabel: "High",
                  assigneeSummary: "Sam",
                  projectName: "North Tower",
                  isOverdue: true,
                  attachmentUris: [],
                  density: "compact",
                  structuralState: "stale",
                },
              ],
            },
          ],
        },
        {
          id: "tasks-queue:team_queue",
          queue: "team_queue",
          title: "Team Queue",
          totalCountLabel: "0 tasks",
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
              taskCountLabel: "0",
              bucket: "review",
              isOpen: false,
              rows: [],
            },
            {
              id: "team_queue:overdue",
              title: "Overdue",
              taskCountLabel: "0",
              bucket: "overdue",
              isOpen: false,
              rows: [],
            },
          ],
        },
      ],
    });

    const screen = render(
      <TasksScreen
        onNavigateToTaskDetail={jest.fn()}
        onNavigateToCreateTask={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue"));

    expect(screen.getByTestId("tasks-screen__queue_bucket_list_my_queue_overdue")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-overdue-1")).toBeTruthy();
    expect(screen.getByTestId("container-card:task-overdue-2")).toBeTruthy();
  });
});
