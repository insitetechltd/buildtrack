import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useTasksViewAdapter } from "../useTasksViewAdapter";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/api/fileUploadService", () => ({
  getFileUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
  extractBuildtrackStoragePath: jest.fn((value: string) =>
    /^https?:|^file:|^content:|^data:|^asset:/i.test(value) ? null : value
  ),
  prefetchSignedUrls: jest.fn(() => Promise.resolve()),
  subscribeSignedUrlCache: jest.fn(() => () => {}),
}));

describe("useTasksViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeTask(overrides: Record<string, unknown>) {
    return {
      id: "task-1",
      projectId: "project-1",
      title: "Default Task",
      description: "Default description",
      status: "new",
      priority: "high",
      dueDate: "2026-07-10T00:00:00.000Z",
      category: "general",
      attachments: [],
      assignedTo: ["user-1"],
      assignedBy: "user-2",
      createdAt: "2026-07-01T10:00:00.000Z",
      updatedAt: "2026-07-01T10:00:00.000Z",
      updates: [],
      completionPercentage: 0,
      activities: [],
      ...overrides,
    };
  }

  function setupBaseMocks(overrides: Record<string, unknown> = {}) {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");
    const { useProjectFilterStore } = require("@/state/projectFilterStore");

    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        role: "manager",
      },
    });

    useProjectStoreWithInit.mockReturnValue({
      isLoading: false,
      getProjectById: jest.fn().mockReturnValue({ name: "Project A", companyId: "company-1" }),
      projectIdsByUser: {
        "user-1": ["project-1", "project-2", "project-a", "project-b"],
      },
      projects: [
        { id: "project-1", companyId: "company-1" },
        { id: "project-2", companyId: "company-1" },
        { id: "project-a", companyId: "company-1" },
        { id: "project-b", companyId: "company-1" },
      ],
    });

    useProjectFilterStore.mockReturnValue({
      selectedProjectId: null,
      tasksLaunchPreset: null,
      sectionFilter: "all",
      statusFilter: "all",
      resetFilters: jest.fn(),
      setSelectedProject: jest.fn(),
      clearTasksLaunchPreset: jest.fn(),
      ...overrides,
    });
  }

  it("keeps staged sheet selections separate until apply and excludes search from badge count", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-inbox-new",
          title: "Inbox new task",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-outbox-review",
          title: "Review handoff",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        }),
      ],
      archivedTasks: [
        makeTask({
          id: "task-archived",
          title: "Archived closeout",
          status: "approved",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          archivedAt: "2026-07-10T09:00:00.000Z",
        }),
      ],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageQueueFilter("outbox");
      result.current.actions.stageStatusFilter("review");
      result.current.setSearchQuery("review");
    });

    expect(result.current.output.filterSheet.isOpen).toBe(true);
    expect(result.current.output.filterSheet.stagedQueue).toBe("outbox");
    expect(result.current.output.filterSheet.stagedStatus).toBe("review");
    expect(result.current.output.filterButton.activeCount).toBe(0);
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-outbox-review"]);

    act(() => {
      result.current.actions.applyStagedFilters();
    });

    expect(result.current.output.filterSheet.isOpen).toBe(false);
    expect(result.current.output.filterButton.activeCount).toBe(2);
    expect(result.current.output.activeFilterChips.map((chip) => chip.label)).toEqual([
      "Queue: Outbox",
      "Status: Review",
    ]);
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-outbox-review"]);
  });

  it("removes an applied chip immediately and updates visible rows for archived queue support", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-inbox-new",
          title: "Inbox new task",
          status: "new",
          dueDate: "2026-07-11T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      archivedTasks: [
        makeTask({
          id: "task-archived",
          title: "Archived closeout",
          status: "approved",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          archivedAt: "2026-07-10T09:00:00.000Z",
        }),
        makeTask({
          id: "task-archived-unrelated",
          title: "Archived unrelated closeout",
          status: "approved",
          assignedTo: ["user-9"],
          assignedBy: "user-8",
          archivedAt: "2026-07-09T09:00:00.000Z",
        }),
      ],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageQueueFilter("archived");
      result.current.actions.applyStagedFilters();
    });

    expect(result.current.output.filterButton.activeCount).toBe(1);
    expect(result.current.output.activeFilterChips).toEqual([{ id: "queue", label: "Queue: Archived" }]);
    expect(result.current.output.taskRowItems.map((row) => row.taskId).sort()).toEqual([
      "task-archived",
      "task-archived-unrelated",
    ]);

    act(() => {
      result.current.actions.removeAppliedFilterChip("queue");
    });

    expect(result.current.output.filterButton.activeCount).toBe(0);
    expect(result.current.output.activeFilterChips).toEqual([]);
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-inbox-new"]);
  });

  it("uses the approved overdue chip copy for applied overdue window filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-overdue",
          title: "Overdue handrail fix",
          status: "in_progress",
          dueDate: "2026-07-08T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageOverdueWindowFilter("three_active");
      result.current.actions.applyStagedFilters();
    });
    expect(result.current.output.activeFilterChips).toContainEqual({
      id: "overdueWindow",
      label: "Overdue: 3 active",
    });

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageOverdueWindowFilter("one_week");
      result.current.actions.applyStagedFilters();
    });
    expect(result.current.output.activeFilterChips).toContainEqual({
      id: "overdueWindow",
      label: "Overdue: 1 week",
    });

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageOverdueWindowFilter("one_month");
      result.current.actions.applyStagedFilters();
    });
    expect(result.current.output.activeFilterChips).toContainEqual({
      id: "overdueWindow",
      label: "Overdue: 1 month",
    });
  });

  it("defaults to newest-created order and can switch via Filters order options", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-older",
          title: "Older task",
          status: "new",
          dueDate: "2026-07-01T00:00:00.000Z",
          createdAt: "2026-07-01T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-newer",
          title: "Newer task",
          status: "new",
          dueDate: "2026-07-20T00:00:00.000Z",
          createdAt: "2026-07-10T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.filterSummary.sortLabel).toBe("Created · Newest first");
    expect(result.current.output.filterSheet.stagedSortOrder).toBe("newest_created");
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-newer",
      "task-older",
    ]);
    expect(result.current.output.filterButton.activeCount).toBe(0);

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageSortOrderFilter("due_soonest");
      result.current.actions.applyStagedFilters();
    });

    expect(result.current.output.filterSummary.sortLabel).toBe("Due date · Earliest first");
    expect(result.current.output.activeFilterChips).toContainEqual({
      id: "sortOrder",
      label: "Order: Due soonest",
    });
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-older",
      "task-newer",
    ]);

    act(() => {
      result.current.actions.removeAppliedFilterChip("sortOrder");
    });

    expect(result.current.output.filterButton.activeCount).toBe(0);
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-newer",
      "task-older",
    ]);
  });

  it("fetches archived tasks when archived queue is requested without archived rows loaded", async () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const fetchArchivedTasks = jest.fn();

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-inbox-new",
          title: "Inbox new task",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.actions.openFiltersSheet();
      result.current.actions.stageQueueFilter("archived");
    });

    await waitFor(() => {
      expect(fetchArchivedTasks).toHaveBeenCalledTimes(1);
    });
  });

  it("surfaces swipe actions for top-level task rows and archives through the adapter action", async () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const archiveTask = jest.fn().mockResolvedValue(undefined);
    const fetchArchivedTasks = jest.fn().mockResolvedValue(undefined);

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-in-progress",
          title: "Install guardrails",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-approved",
          title: "Close out punch list",
          status: "approved",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-created-approved",
          title: "Assigner closeout",
          status: "approved",
          assignedTo: ["user-9"],
          assignedBy: "user-1",
        }),
        makeTask({
          id: "task-child",
          title: "Nested closeout note",
          status: "approved",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          parentTaskId: "task-approved",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks,
      archiveTask,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    const inProgressRow = result.current.output.taskRowItems.find((row) => row.taskId === "task-in-progress");
    const approvedRow = result.current.output.taskRowItems.find((row) => row.taskId === "task-approved");
    const createdApprovedRow = result.current.output.taskRowItems.find(
      (row) => row.taskId === "task-created-approved",
    );
    const childRow = result.current.output.taskRowItems.find((row) => row.taskId === "task-child");

    expect(inProgressRow).toMatchObject({
      canShowTaskUpdateAction: true,
      canShowArchiveAction: false,
    });
    expect(approvedRow).toMatchObject({
      canShowTaskUpdateAction: false,
      canShowArchiveAction: true,
    });
    expect(createdApprovedRow).toMatchObject({
      canShowTaskUpdateAction: false,
      canShowArchiveAction: true,
    });
    expect(childRow).toMatchObject({
      canShowTaskUpdateAction: false,
      canShowArchiveAction: false,
    });

    await act(async () => {
      await result.current.actions.archiveTask("task-approved");
    });

    expect(archiveTask).toHaveBeenCalledWith("task-approved", "user-1");
    expect(fetchArchivedTasks).toHaveBeenCalledTimes(1);
  });

  it("lists peer project tasks for managers (same visibility as Activity)", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-mine",
          title: "My assignment",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-peer",
          title: "Peer job task",
          status: "in_progress",
          assignedTo: ["bob"],
          assignedBy: "alice",
          projectId: "project-1",
        }),
        makeTask({
          id: "task-other-project",
          title: "Off-job task",
          status: "in_progress",
          assignedTo: ["bob"],
          assignedBy: "alice",
          projectId: "project-not-mine",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId).sort()).toEqual([
      "task-mine",
      "task-peer",
    ]);
    expect(
      result.current.output.taskRowItems.find((row) => row.taskId === "task-peer")?.queue,
    ).toBe("team_queue");
  });

  it("keeps workers on assigned/created only even when peers share the project", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();
    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        role: "worker",
      },
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-mine",
          title: "My assignment",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-peer",
          title: "Peer job task",
          status: "in_progress",
          assignedTo: ["bob"],
          assignedBy: "alice",
          projectId: "project-1",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-mine"]);
  });

  it("soft-scopes the list to the selected workspace project for multi-project PMs", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");

    setupBaseMocks({ selectedProjectId: "project-1" });
    useProjectStoreWithInit.mockReturnValue({
      isLoading: false,
      getProjectById: jest.fn((id: string) =>
        id === "project-1"
          ? { name: "Insite Office", companyId: "company-1" }
          : { name: "Project A", companyId: "company-1" },
      ),
      projectIdsByUser: {
        "user-1": ["project-1", "project-2"],
      },
      projects: [
        { id: "project-1", companyId: "company-1", name: "Insite Office" },
        { id: "project-2", companyId: "company-1", name: "Project A" },
      ],
      projectQueryMeta: { "projects:all": { hasFetchedOnce: true } },
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-office",
          title: "Office punch",
          projectId: "project-1",
          assignedTo: ["bob"],
          assignedBy: "user-1",
        }),
        makeTask({
          id: "task-site-a",
          title: "Site A waterproofing",
          projectId: "project-2",
          assignedTo: ["bob"],
          assignedBy: "user-1",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-office"]);
    expect(result.current.output.filterSummary.statusFilterLabel).toBe("Project scoped");
    expect(result.current.output.filterSummary.selectedProjectId).toBe("project-1");
  });

  it("auto-scopes when the PM belongs to only one project even without a stored selection", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");

    setupBaseMocks({ selectedProjectId: null });
    useProjectStoreWithInit.mockReturnValue({
      isLoading: false,
      getProjectById: jest.fn().mockReturnValue({ name: "Insite Office", companyId: "company-1" }),
      projectIdsByUser: {
        "user-1": ["project-1"],
      },
      projects: [{ id: "project-1", companyId: "company-1", name: "Insite Office" }],
      projectQueryMeta: { "projects:all": { hasFetchedOnce: true } },
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-office",
          title: "Office punch",
          projectId: "project-1",
          assignedTo: ["bob"],
          assignedBy: "user-1",
        }),
        makeTask({
          id: "task-leaked",
          title: "Should not appear",
          projectId: "project-2",
          assignedTo: ["bob"],
          assignedBy: "alice",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-office"]);
    expect(result.current.output.filterSummary.statusFilterLabel).toBe("Project scoped");
  });

  it("labels cards with project name in all-projects view so mixed jobs are obvious", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");

    setupBaseMocks({ selectedProjectId: null });
    useProjectStoreWithInit.mockReturnValue({
      isLoading: false,
      getProjectById: jest.fn((id: string) =>
        id === "project-1"
          ? { name: "Insite Office", companyId: "company-1" }
          : { name: "Project A", companyId: "company-1" },
      ),
      projectIdsByUser: {
        "user-1": ["project-1", "project-2"],
      },
      projects: [
        { id: "project-1", companyId: "company-1", name: "Insite Office" },
        { id: "project-2", companyId: "company-1", name: "Project A" },
      ],
      projectQueryMeta: { "projects:all": { hasFetchedOnce: true } },
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-site-a",
          title: "Site A waterproofing",
          description: "Site evidence required",
          projectId: "project-2",
          assignedTo: ["bob"],
          assignedBy: "user-1",
        }),
      ],
      archivedTasks: [],
      isLoading: false,
      fetchArchivedTasks: jest.fn(),
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.filterSummary.statusFilterLabel).toBe("All projects");
    expect(result.current.output.taskRowItems[0]?.contextLine).toBe(
      "Project A · Site evidence required",
    );
  });
});
