import { renderHook } from "@testing-library/react-native";
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

  function setupBaseMocks(
    sectionFilter: "my_tasks" | "inbox" | "outbox" | "my_work" | "all" = "all",
    statusFilter: string = "all"
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
      sectionFilter,
      statusFilter,
      resetFilters: jest.fn(),
      setSelectedProject: jest.fn(),
    });
  }

  it("filters tasks by sectionFilter 'inbox' (assigned to me by others)", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-inbox",
          projectId: "project-1",
          title: "Inbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2", // assigned to me by someone else
        },
        {
          id: "task-outbox",
          projectId: "project-1",
          title: "Outbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1", // assigned by me to someone else
        },
        {
          id: "task-my-tasks",
          projectId: "project-1",
          title: "Self Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1", // self assigned
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks, // Simple mock that just returns the tasks as root nodes
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(1);
    expect(outputTasks[0].taskId).toBe("task-inbox");
  });

  it("filters tasks by sectionFilter 'outbox' (assigned by me to others)", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("outbox");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-inbox",
          projectId: "project-1",
          title: "Inbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-outbox",
          projectId: "project-1",
          title: "Outbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
        {
          id: "task-my-tasks",
          projectId: "project-1",
          title: "Self Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(1);
    expect(outputTasks[0].taskId).toBe("task-outbox");
  });

  it("filters tasks by sectionFilter 'my_tasks' (self assigned)", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("my_tasks");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-inbox",
          projectId: "project-1",
          title: "Inbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-outbox",
          projectId: "project-1",
          title: "Outbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
        {
          id: "task-my-tasks",
          projectId: "project-1",
          title: "Self Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(1);
    expect(outputTasks[0].taskId).toBe("task-my-tasks");
  });

  it("filters tasks by sectionFilter 'my_work' (inbox + my_tasks)", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("my_work");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-inbox",
          projectId: "project-1",
          title: "Inbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-outbox",
          projectId: "project-1",
          title: "Outbox Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
        {
          id: "task-my-tasks",
          projectId: "project-1",
          title: "Self Task",
          status: "new",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(2);
    expect(outputTasks.map(t => t.taskId).sort()).toEqual(["task-inbox", "task-my-tasks"].sort());
  });

  it("treats persisted reviewing filters as assigner-side review queues", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "reviewing");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-review-queue",
          projectId: "project-1",
          title: "Review queue task",
          status: "submitted_for_review",
          completionPercentage: 100,
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
        {
          id: "task-inbox-new",
          projectId: "project-1",
          title: "New Task",
          status: "new",
          completionPercentage: 0,
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2", // inbox eligible but not awaiting approval
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(1);
    expect(outputTasks[0].taskId).toBe("task-review-queue");
  });

  it("keeps legacy not_started, wip, and reviewing aliases visible under modern quick filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "new");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-not-started",
          projectId: "project-1",
          title: "Legacy not started",
          status: "not_started",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const newFilter = renderHook(() => useTasksViewAdapter());
    expect(newFilter.result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-not-started",
    ]);

    setupBaseMocks("inbox", "wip");
    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-wip",
          projectId: "project-1",
          title: "Legacy wip",
          status: "wip",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const wipFilter = renderHook(() => useTasksViewAdapter());
    expect(wipFilter.result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-wip",
    ]);

    setupBaseMocks("inbox", "reviewing");
    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-reviewing",
          projectId: "project-1",
          title: "Legacy reviewing",
          status: "reviewing",
          completionPercentage: 100,
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const reviewingFilter = renderHook(() => useTasksViewAdapter());
    expect(reviewingFilter.result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-reviewing",
    ]);
  });

  it("honors persisted legacy dashboard filter tokens including overdue variants", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "received-overdue");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-received-overdue",
          projectId: "project-1",
          title: "Received overdue",
          status: "received",
          dueDate: "2000-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-received-future",
          projectId: "project-1",
          title: "Received future",
          status: "received",
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-received-overdue",
    ]);
  });

  it("keeps rejected rework tasks visible under persisted legacy outbox wip filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("outbox", "wip");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-rejected-rework",
          projectId: "project-1",
          title: "Rejected rework",
          status: "rejected",
          priority: "high",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-rejected-rework",
    ]);
  });

  it("does not surface rejected tasks in persisted inbox wip filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "wip");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-rejected-inbox",
          projectId: "project-1",
          title: "Rejected inbox",
          status: "rejected",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "empty",
    ]);
  });

  it("keeps declined tasks visible under persisted legacy reviewing filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "reviewing");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-declined-review",
          projectId: "project-1",
          title: "Declined review",
          status: "declined",
          priority: "high",
          assignedTo: ["user-3"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-declined-review",
    ]);
  });

  it("keeps submitter-side overdue review queues visible under persisted outbox reviewing filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("outbox", "reviewing-overdue");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-submitted-overdue",
          projectId: "project-1",
          title: "Submitted overdue",
          status: "submitted_for_review",
          completionPercentage: 100,
          dueDate: "2000-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-submitted-future",
          projectId: "project-1",
          title: "Submitted future",
          status: "submitted_for_review",
          completionPercentage: 100,
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-created-by-me",
          projectId: "project-1",
          title: "Created by me",
          status: "submitted_for_review",
          completionPercentage: 100,
          dueDate: "2000-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-3"],
          assignedBy: "user-1",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-submitted-overdue",
    ]);
  });

  it("excludes rejected tasks from persisted wip-overdue filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "wip-overdue");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-rejected-overdue",
          projectId: "project-1",
          title: "Rejected overdue",
          status: "rejected",
          dueDate: "2000-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
        {
          id: "task-in-progress-overdue",
          projectId: "project-1",
          title: "In progress overdue",
          status: "in_progress",
          dueDate: "2000-01-01T00:00:00.000Z",
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        },
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-in-progress-overdue",
    ]);
  });

  it("groups subtasks correctly and sets indentationLevel", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    const parentTask = {
      id: "parent-task",
      projectId: "project-1",
      title: "Parent Task",
      status: "new",
      priority: "high",
    };

    const childTask = {
      id: "child-task",
      projectId: "project-1",
      title: "Child Task",
      status: "new",
      priority: "high",
      parentTaskId: "parent-task",
    };

    // A simple mock for buildTaskTree
    useTaskStore.mockReturnValue({
      tasks: [parentTask, childTask],
      isLoading: false,
      buildTaskTree: jest.fn().mockReturnValue([
        {
          ...parentTask,
          children: [
            {
              ...childTask,
              children: [],
            },
          ],
        },
      ]),
    });

    const { result } = renderHook(() => useTasksViewAdapter());
    
    const outputTasks = result.current.output.taskRowItems;
    expect(outputTasks.length).toBe(2);
    expect(outputTasks[0].taskId).toBe("parent-task");
    expect(outputTasks[0].indentationLevel).toBeUndefined();
    expect(outputTasks[1].taskId).toBe("child-task");
    expect(outputTasks[1].indentationLevel).toBe(1);
  });
});
