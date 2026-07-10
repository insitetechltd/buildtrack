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
      getProjectById: jest.fn().mockReturnValue({ name: "Project A" }),
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
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-archived"]);

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
});
