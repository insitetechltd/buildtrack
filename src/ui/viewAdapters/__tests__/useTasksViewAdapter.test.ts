import { act, renderHook } from "@testing-library/react-native";
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
      ...overrides,
    };
  }

  function setupBaseMocks(
    sectionFilter: "my_tasks" | "inbox" | "outbox" | "my_work" | "all" = "all",
    statusFilter: string = "all",
    tasksLaunchPreset: { queue: "my_queue" | "team_queue"; bucket: "new" | "wip" | "review"; source: "activity_dashboard" | "tasks" } | null = null,
  ) {
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
      tasksLaunchPreset,
      sectionFilter,
      statusFilter,
      resetFilters: jest.fn(),
      setSelectedProject: jest.fn(),
      clearTasksLaunchPreset: jest.fn(),
    });
  }

  it("builds My Queue and Team Queue with Team Queue collapsed as a preview by default", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-my-new",
          title: "My New Task",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
        makeTask({
          id: "task-my-wip",
          title: "My Wip Task",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-03T10:00:00.000Z",
        }),
        makeTask({
          id: "task-team-review",
          title: "Team Review Task",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          updatedAt: "2026-07-02T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    expect(result.current.output.queuePanels[0].title).toBe("My Queue");
    expect(result.current.output.queuePanels[0].isExpanded).toBe(true);
    expect(result.current.output.queuePanels[0].buckets).toHaveLength(3);
    expect(result.current.output.queuePanels[0].buckets[0].isOpen).toBe(true);
    expect(result.current.output.queuePanels[1].title).toBe("Team Queue");
    expect(result.current.output.queuePanels[1].presentation).toBe("preview");
    expect(result.current.output.queuePanels[1].isExpanded).toBe(false);
    expect(result.current.output.queuePanels[1].totalCountLabel).toBe("1 task");
  });

  it("keeps one open bucket at a time inside a queue", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-new",
          title: "Needs start",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-wip",
          title: "Already doing",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    expect(result.current.output.queuePanels[0].buckets.map((bucket) => bucket.isOpen)).toEqual([
      true,
      false,
      false,
    ]);

    act(() => {
      result.current.actions.openBucket("my_queue", "wip");
    });

    expect(result.current.output.queuePanels[0].buckets.map((bucket) => bucket.isOpen)).toEqual([
      false,
      true,
      false,
    ]);
    expect(result.current.output.queuePanels[0].buckets[1].rows[0].taskId).toBe("task-wip");
  });

  it("switches into unified search mode with compact queue and bucket context", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-my-newer",
          title: "Tower punch list",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
        }),
        makeTask({
          id: "task-team-older",
          title: "Tower review package",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          updatedAt: "2026-07-02T09:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.setSearchQuery("tower");
    });

    expect(result.current.output.isSearchMode).toBe(true);
    expect(result.current.output.searchResults.map((row) => row.taskId)).toEqual([
      "task-my-newer",
      "task-team-older",
    ]);
    expect(result.current.output.searchResults[0].contextLabel).toBe("My Queue · New · Project A");
    expect(result.current.output.searchResults[1].contextLabel).toBe("Team Queue · Review · Project A");
    expect(result.current.output.searchResults[0].contextLine).toBe("My Queue · New · Project A");
    expect(result.current.output.searchResults[1].contextLine).toBe("Team Queue · Review · Project A");
    expect(result.current.output.taskRowItems).toEqual(result.current.output.searchResults);
  });

  it("opens the launched Team Queue bucket when a preset exists", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("all", "all", {
      queue: "team_queue",
      bucket: "review",
      source: "activity_dashboard",
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-team-review",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.queuePanels[0].isExpanded).toBe(false);
    expect(result.current.output.queuePanels[1].isExpanded).toBe(true);
    expect(result.current.output.queuePanels[1].buckets.map((bucket) => bucket.isOpen)).toEqual([
      false,
      false,
      true,
    ]);
  });
});
