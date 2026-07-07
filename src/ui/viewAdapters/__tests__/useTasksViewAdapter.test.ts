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

  it("builds dropdown filters with All states, dynamic counts, and ordered visible rows", () => {
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
    expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
      "task-critical-review",
      "task-high-new",
      "task-high-wip",
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
});
