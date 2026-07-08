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
    tasksLaunchPreset: { queue: "my_queue" | "team_queue"; bucket: "new" | "wip" | "review" | "overdue"; source: "activity_dashboard" | "tasks" } | null = null,
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
    expect(result.current.output.queuePanels[0].buckets).toHaveLength(4);
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
      false,
    ]);

    act(() => {
      result.current.actions.openBucket("my_queue", "wip");
    });

    expect(result.current.output.queuePanels[0].buckets.map((bucket) => bucket.isOpen)).toEqual([
      false,
      true,
      false,
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
      false,
    ]);
  });

  it("splits overdue tasks out of New, Doing, and Review into a dedicated Overdue bucket", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-my-new",
          title: "My New Task",
          status: "new",
          dueDate: "2099-07-10T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
        makeTask({
          id: "task-my-wip",
          title: "My Wip Task",
          status: "in_progress",
          dueDate: "2099-07-11T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-03T10:00:00.000Z",
        }),
        makeTask({
          id: "task-my-review",
          title: "My Review Task",
          status: "submitted_for_review",
          dueDate: "2099-07-12T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-02T10:00:00.000Z",
        }),
        makeTask({
          id: "task-my-overdue-new",
          title: "My Overdue New Task",
          status: "new",
          dueDate: "2020-07-10T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-05T10:00:00.000Z",
        }),
        makeTask({
          id: "task-my-overdue-review",
          title: "My Overdue Review Task",
          status: "submitted_for_review",
          dueDate: "2020-07-11T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-06T10:00:00.000Z",
        }),
        makeTask({
          id: "task-team-overdue-wip",
          title: "Team Overdue Wip Task",
          status: "in_progress",
          dueDate: "2020-07-12T00:00:00.000Z",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          updatedAt: "2026-07-01T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() =>
      useTasksViewAdapter({
        onNavigateToTaskDetail: jest.fn(),
      }),
    );

    const myQueue = result.current.output.queuePanels.find((panel) => panel.queue === "my_queue");
    const teamQueue = result.current.output.queuePanels.find((panel) => panel.queue === "team_queue");
    const myOverdueBucket = myQueue?.buckets.find((bucket) => bucket.bucket === "overdue");
    const teamOverdueBucket = teamQueue?.buckets.find((bucket) => bucket.bucket === "overdue");

    expect(myQueue?.buckets.map((bucket) => `${bucket.title}:${bucket.taskCountLabel}`)).toEqual([
      "New:1",
      "Doing:1",
      "Review:1",
      "Overdue:2",
    ]);
    expect(myOverdueBucket?.rows.map((row) => row.taskId)).toEqual([
      "task-my-overdue-review",
      "task-my-overdue-new",
    ]);
    expect(teamQueue?.buckets.map((bucket) => `${bucket.title}:${bucket.taskCountLabel}`)).toEqual([
      "New:0",
      "Doing:0",
      "Review:0",
      "Overdue:1",
    ]);
    expect(teamOverdueBucket?.rows.map((row) => row.taskId)).toEqual(["task-team-overdue-wip"]);
  });

  it("builds compact task-card rows with location first and description as the fallback third line", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("all", "all", {
      queue: "my_queue",
      bucket: "new",
      source: "tasks",
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-thumbnail",
          title: "Structural steel inspection — Level 12",
          status: "submitted_for_review",
          dueDate: "2099-07-10T00:00:00.000Z",
          attachments: ["https://example.com/task-photo.jpg"],
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          containerId: "Level 12",
          subContainerId: "Grid B–C",
          updatedAt: "2026-07-06T10:00:00.000Z",
        }),
        makeTask({
          id: "task-description-fallback",
          title: "North facade patching",
          description: "Patch spalled concrete before paint inspection",
          status: "new",
          dueDate: "2099-07-11T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          updatedAt: "2026-07-05T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() =>
      useTasksViewAdapter({
        onNavigateToTaskDetail: jest.fn(),
      }),
    );

    const rowsById = Object.fromEntries(
      result.current.output.queuePanels.flatMap((panel) =>
        panel.buckets.flatMap((bucket) => bucket.rows.map((row) => [row.taskId, row] as const)),
      ),
    );

    expect(rowsById["task-thumbnail"].cardPresentation).toBe("thumbnail");
    expect(rowsById["task-thumbnail"].primaryPhotoUri).toBe("https://example.com/task-photo.jpg");
    expect(rowsById["task-thumbnail"].supportingLine).toBeUndefined();
    expect(rowsById["task-thumbnail"].contextLine).toBe("Level 12, Grid B–C");
    expect(rowsById["task-thumbnail"].photoDisplayMode).toBe("photo_centric");
    expect(rowsById["task-description-fallback"].contextLine).toBe(
      "Patch spalled concrete before paint inspection",
    );
  });
});
