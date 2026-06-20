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

  it("filters out non-AWAITING_APPROVAL tasks when statusFilter is 'reviewing' and sectionFilter is 'inbox'", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks("inbox", "reviewing");

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-inbox-reviewing",
          projectId: "project-1",
          title: "Reviewing Task",
          status: "submitted_for_review",
          completionPercentage: 100, // This makes getWorkflowPhase return "REVIEW" and token "AWAITING_APPROVAL"
          priority: "high",
          assignedTo: ["user-1"],
          assignedBy: "user-2", // inbox eligible
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
    expect(outputTasks[0].taskId).toBe("task-inbox-reviewing");
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
