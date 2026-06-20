import { renderHook } from "@testing-library/react-native";
import { useDashboardViewAdapter } from "../useDashboardViewAdapter";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithInit: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

describe("useDashboardViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupBaseMocks(visibleProjects: Array<{
    id: string;
    name: string;
    location: string;
    status: "active" | "planning" | "on_hold" | "completed" | "cancelled";
  }>) {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");

    useAuthStore.mockReturnValue({
      user: {
        id: "user-1",
        role: "manager",
      },
    });

    useProjectStoreWithInit.mockReturnValue({
      isLoading: false,
      getProjectsByUser: jest.fn().mockReturnValue(visibleProjects),
    });
  }

  it("computes dashboard responsibility token counts and overdue distributions per project", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithInit } = require("@/state/projectStore.supabase");
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
        {
          id: "project-1",
          name: "North Tower",
          location: "Site A",
          status: "active",
        },
        {
          id: "project-2",
          name: "South Annex",
          location: "Site B",
          status: "planning",
        },
      ]);

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-action-overdue",
          projectId: "project-1",
          title: "Accept work package",
          description: "",
          priority: "high",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
        {
          id: "task-action-open",
          projectId: "project-1",
          title: "Rework install",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "rejected",
          completionPercentage: 40,
        },
        {
          id: "task-sent-overdue",
          projectId: "project-1",
          title: "Subcontractor in progress",
          description: "",
          priority: "medium",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "accepted",
          completionPercentage: 50,
        },
        {
          id: "task-sent-open",
          projectId: "project-1",
          title: "Self-owned progress",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "in_progress",
          completionPercentage: 25,
        },
        {
          id: "task-review-overdue",
          projectId: "project-1",
          title: "Pending review overdue",
          description: "",
          priority: "critical",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
        {
          id: "task-review-open",
          projectId: "project-1",
          title: "Pending review current",
          description: "",
          priority: "critical",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
        {
          id: "task-archived",
          projectId: "project-1",
          title: "Archived complete",
          description: "",
          priority: "low",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "approved",
          completionPercentage: 100,
        },
        {
          id: "task-second-project",
          projectId: "project-2",
          title: "Second project action",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    const firstProject = result.current.output.projectSummaryItems[0];
    const secondProject = result.current.output.projectSummaryItems[1];

    expect(firstProject.projectId).toBe("project-1");
    expect(firstProject.openTaskCount).toBe(6);
    expect(firstProject.overdueTaskCount).toBe(3);

    expect(secondProject.projectId).toBe("project-2");
    expect(secondProject.openTaskCount).toBe(1);
    expect(secondProject.overdueTaskCount).toBe(0);

    expect(result.current.output.scalarMetrics).toMatchObject({
      openTaskCount: 7,
      overdueTaskCount: 3,
      projectCount: 2,
      hasSelectedProject: true,
      actionRequiredCount: 3,
      inProgressSentCount: 2,
      awaitingApprovalCount: 2,
      actionRequiredOverdueCount: 1,
      inProgressSentOverdueCount: 1,
      awaitingApprovalOverdueCount: 1,
    });
  });

  it("ignores tasks from projects outside the current user's visible project set", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
      },
    ]);

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "visible-task",
          projectId: "project-1",
          title: "Visible action required",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
        {
          id: "hidden-task",
          projectId: "project-hidden",
          title: "Hidden action required",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.projectSummaryItems).toHaveLength(1);
    expect(result.current.output.projectSummaryItems[0]).toMatchObject({
      projectId: "project-1",
      openTaskCount: 1,
      overdueTaskCount: 0,
    });
    expect(result.current.output.scalarMetrics).toMatchObject({
      openTaskCount: 1,
      overdueTaskCount: 0,
      actionRequiredCount: 1,
      actionRequiredOverdueCount: 0,
    });
  });

  it("excludes overdue VOID_ARCHIVED tasks from both project and global overdue counters", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
      },
    ]);

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "declined-archived",
          projectId: "project-1",
          title: "Declined subcontractor work",
          description: "",
          priority: "high",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "declined",
          declinedReason: "Cannot staff this scope",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.projectSummaryItems[0]).toMatchObject({
      projectId: "project-1",
      openTaskCount: 0,
      overdueTaskCount: 0,
    });
    expect(result.current.output.scalarMetrics).toMatchObject({
      openTaskCount: 0,
      overdueTaskCount: 0,
      actionRequiredCount: 0,
      actionRequiredOverdueCount: 0,
      inProgressSentCount: 0,
      inProgressSentOverdueCount: 0,
      awaitingApprovalCount: 0,
      awaitingApprovalOverdueCount: 0,
    });
  });
});
