import React from "react";
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

  it("builds dropdown filters with All states, dynamic counts, and modified-date sort defaults", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-critical-review",
          title: "Critical review item",
          priority: "critical",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          updatedAt: "2026-07-03T12:00:00.000Z",
        }),
        makeTask({
          id: "task-high-new",
          title: "High priority new item",
          priority: "high",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
        }),
        makeTask({
          id: "task-high-wip",
          title: "High priority doing item",
          priority: "high",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T11:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(
      (result.current.output as any).filterControls.queue.options.map((option: any) => option.label),
    ).toEqual(["All 3", "My Queue 2", "Team Queue 1"]);
    expect(
      (result.current.output as any).filterControls.bucket.options.map((option: any) => option.label),
    ).toEqual(["All 3", "New 1", "Doing 1", "Review 1"]);
    expect((result.current.output as any).filterControls.sort.selectedValue).toBe("modified_at");
    expect((result.current.output as any).filterControls.sortDirection.selectedValue).toBe("desc");
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-high-new",
      "task-high-wip",
      "task-critical-review",
    ]);
  });

  it("recomputes bucket counts from the selected queue and preserves search provenance", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-my-new",
          title: "Tower punch list",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
        }),
        makeTask({
          id: "task-my-wip",
          title: "Tower install",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T11:00:00.000Z",
        }),
        makeTask({
          id: "task-team-review",
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
      (result.current.actions as any).selectQueue("team_queue");
    });

    expect(
      (result.current.output as any).filterControls.bucket.options.map((option: any) => option.label),
    ).toEqual(["All 1", "New 0", "Doing 0", "Review 1"]);
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-team-review"]);

    act(() => {
      result.current.setSearchQuery("tower");
    });

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-team-review"]);
    expect(result.current.output.taskRowItems[0].contextLine).toBe("Team Queue · Review · Project A");
  });

  it("uses tasksLaunchPreset on the first frame instead of flashing All filters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const useEffectSpy = jest.spyOn(React, "useEffect").mockImplementation(() => undefined);

    setupBaseMocks({
      tasksLaunchPreset: {
        queue: "team_queue",
        bucket: "review",
        source: "activity_dashboard",
      },
    });

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-my-new",
          title: "My queue task",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
        }),
        makeTask({
          id: "task-team-review",
          title: "Team review package",
          status: "submitted_for_review",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect((result.current.output as any).filterControls.queue.selectedValue).toBe("team_queue");
    expect((result.current.output as any).filterControls.bucket.selectedValue).toBe("review");
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-team-review"]);

    useEffectSpy.mockRestore();
  });

  it("uses status flow as the final tie-break when priority and recency match", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-review",
          title: "Review task",
          priority: "high",
          status: "submitted_for_review",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
          createdAt: "2026-07-01T10:00:00.000Z",
        }),
        makeTask({
          id: "task-wip",
          title: "Doing task",
          priority: "high",
          status: "in_progress",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
          createdAt: "2026-07-01T10:00:00.000Z",
        }),
        makeTask({
          id: "task-new",
          title: "New task",
          priority: "high",
          status: "new",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
          createdAt: "2026-07-01T10:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-new",
      "task-wip",
      "task-review",
    ]);
  });

  it("resolves storage-path task photos into public card thumbnail URLs", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-photo",
          title: "Photo task",
          status: "new",
          attachments: ["company-123/tasks/task-photo/photo-1.jpg"],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          updatedAt: "2026-07-04T12:00:00.000Z",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    expect(result.current.output.taskRowItems[0].primaryPhotoUri).toBe(
      "https://cdn.example.com/company-123/tasks/task-photo/photo-1.jpg",
    );
  });

  it("sorts visible rows by created date in ascending and descending order", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-created-middle",
          title: "Created middle",
          createdAt: "2026-07-02T10:00:00.000Z",
          updatedAt: "2026-07-05T10:00:00.000Z",
          dueDate: "2026-07-12T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-created-early",
          title: "Created early",
          createdAt: "2026-07-01T10:00:00.000Z",
          updatedAt: "2026-07-06T10:00:00.000Z",
          dueDate: "2026-07-11T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-created-late",
          title: "Created late",
          createdAt: "2026-07-03T10:00:00.000Z",
          updatedAt: "2026-07-04T10:00:00.000Z",
          dueDate: "2026-07-13T00:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      (result.current.actions as any).selectSortField("created_at");
      (result.current.actions as any).selectSortDirection("asc");
    });

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-created-early",
      "task-created-middle",
      "task-created-late",
    ]);

    act(() => {
      (result.current.actions as any).selectSortDirection("desc");
    });

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-created-late",
      "task-created-middle",
      "task-created-early",
    ]);
  });

  it("sorts filtered rows by due date and keeps missing timestamps at the end", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-due-late",
          title: "Due later",
          status: "new",
          dueDate: "2026-07-20T00:00:00.000Z",
          createdAt: "2026-07-01T10:00:00.000Z",
          updatedAt: "2026-07-04T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-due-missing",
          title: "Due missing",
          status: "new",
          dueDate: undefined,
          createdAt: "2026-07-02T10:00:00.000Z",
          updatedAt: "2026-07-05T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-due-early",
          title: "Due early",
          status: "new",
          dueDate: "2026-07-10T00:00:00.000Z",
          createdAt: "2026-07-03T10:00:00.000Z",
          updatedAt: "2026-07-06T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-team-review",
          title: "Review item",
          status: "submitted_for_review",
          dueDate: "2026-07-08T00:00:00.000Z",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      result.current.actions.selectQueue("my_queue");
      result.current.actions.selectBucket("new");
      (result.current.actions as any).selectSortField("due_date");
      (result.current.actions as any).selectSortDirection("asc");
    });

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-due-early",
      "task-due-late",
      "task-due-missing",
    ]);
  });

  it("sorts by modified date using the latest meaningful task timestamp", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks();

    useTaskStore.mockReturnValue({
      tasks: [
        makeTask({
          id: "task-modified-old",
          title: "Modified old",
          createdAt: "2026-07-01T10:00:00.000Z",
          updatedAt: "2026-07-02T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
        makeTask({
          id: "task-modified-new",
          title: "Modified new",
          createdAt: "2026-07-01T10:00:00.000Z",
          updatedAt: "2026-07-06T10:00:00.000Z",
          assignedTo: ["user-1"],
          assignedBy: "user-2",
        }),
      ],
      isLoading: false,
      buildTaskTree: (tasks: any[]) => tasks,
    });

    const { result } = renderHook(() => useTasksViewAdapter());

    act(() => {
      (result.current.actions as any).selectSortField("modified_at");
      (result.current.actions as any).selectSortDirection("desc");
    });

    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-modified-new",
      "task-modified-old",
    ]);
  });
});
