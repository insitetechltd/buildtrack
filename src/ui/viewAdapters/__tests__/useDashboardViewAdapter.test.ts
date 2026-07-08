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

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
}));

jest.mock("@/api/fileUploadService", () => ({
  getFileUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
}));

describe("useDashboardViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-04T09:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function setupBaseMocks(visibleProjects: Array<{
    id: string;
    name: string;
    location: string;
    status: "active" | "planning" | "on_hold" | "completed" | "cancelled";
    startDate?: string;
  }>) {
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
      getProjectsByUser: jest.fn().mockReturnValue(visibleProjects),
    });

    useProjectFilterStore.mockImplementation((selector: any) =>
      selector({
      selectedProjectId: visibleProjects[0]?.id ?? null,
      }),
    );
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

  it("builds critical dates from open tasks due in the current calendar week", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");
    jest.setSystemTime(new Date("2026-07-08T09:00:00.000Z"));

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
        startDate: "2026-01-01T00:00:00.000Z",
      },
    ]);

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-week-1",
          projectId: "project-1",
          title: "Approve facade mockup",
          description: "",
          priority: "critical",
          dueDate: "2026-07-08T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
        {
          id: "task-week-2",
          projectId: "project-1",
          title: "Install temporary barriers",
          description: "",
          priority: "high",
          dueDate: "2026-07-10T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
        {
          id: "task-next-week",
          projectId: "project-1",
          title: "Next week task",
          description: "",
          priority: "medium",
          dueDate: "2026-07-13T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
        {
          id: "task-no-date",
          projectId: "project-1",
          title: "Missing due date",
          description: "",
          priority: "medium",
          dueDate: undefined,
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.projectSummaryCard?.criticalDates).toEqual([
      {
        id: "critical-date:task-week-1",
        dateLabel: "Jul 8",
        title: "Approve facade mockup",
        subtitle: "Submitted For Review · Critical",
      },
      {
        id: "critical-date:task-week-2",
        dateLabel: "Jul 10",
        title: "Install temporary barriers",
        subtitle: "New · High",
      },
    ]);
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

  it("treats legacy not_started tasks as new work in dashboard bucket metrics", () => {
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
          id: "executor-not-started",
          projectId: "project-1",
          title: "Legacy executor task",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "not_started",
          completionPercentage: 0,
        },
        {
          id: "originator-not-started",
          projectId: "project-1",
          title: "Legacy originator task",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "not_started",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.scalarMetrics).toMatchObject({
      actionRequiredCount: 1,
      inProgressSentCount: 1,
      inboxNewCount: 1,
      outboxNewCount: 1,
      inboxWipCount: 0,
      outboxWipCount: 0,
    });
  });

  it("excludes legacy done tasks from dashboard open-task and bucket metrics", () => {
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
          id: "done-task",
          projectId: "project-1",
          title: "Legacy done task",
          description: "",
          priority: "medium",
          dueDate: "2000-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "done",
          completionPercentage: 100,
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
      inProgressSentCount: 0,
      inboxNewCount: 0,
      outboxNewCount: 0,
    });
  });

  it("returns only recent activity items for the active project", () => {
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
          id: "task-1",
          projectId: "project-1",
          title: "Concrete pour",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: ["https://example.com/photo-1.jpg"],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-1",
              description: "Pour completed for section A",
              photos: ["https://example.com/photo-1.jpg"],
              completionPercentage: 65,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 65,
        },
        {
          id: "task-2",
          projectId: "project-2",
          title: "Other project item",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-2",
              description: "Should be hidden",
              photos: [],
              completionPercentage: 20,
              status: "in_progress",
              timestamp: "2026-07-04T07:00:00.000Z",
              userId: "user-3",
            },
          ],
          status: "in_progress",
          completionPercentage: 20,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems.map((item: any) => item.taskId)).toEqual([
      "task-1",
    ]);
    expect(result.current.output.activityItems[0]).toMatchObject({
      title: "Concrete pour",
      subtitle: "Pour completed for section A",
      previewPhotoUri: "https://example.com/photo-1.jpg",
    });
  });

  it("does not invent an active project when the workspace has no selected project", () => {
    const { useProjectFilterStore } = require("@/state/projectFilterStore");

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
      },
    ]);

    useProjectFilterStore.mockImplementation((selector: any) =>
      selector({
      selectedProjectId: null,
      }),
    );

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activeProject).toBeNull();
    expect(result.current.output.summaryPills).toEqual([]);
    expect(result.current.output.taskShortcut).toBeNull();
    expect(result.current.output.activityItems).toEqual([]);
    expect(result.current.output.scalarMetrics.hasSelectedProject).toBe(false);
  });

  it("resolves storage paths into public preview-photo URLs for activity cards", () => {
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
          id: "task-1",
          projectId: "project-1",
          title: "Concrete pour",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: ["company-123/tasks/task-1/photo-1.jpg"],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-1",
              description: "Pour completed for section A",
              photos: ["company-123/tasks/task-1/photo-1.jpg"],
              completionPercentage: 65,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 65,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems[0].previewPhotoUri).toBe(
      "https://cdn.example.com/company-123/tasks/task-1/photo-1.jpg",
    );
  });

  it("excludes declined and archived tasks from activity-home counts", () => {
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
          id: "task-open",
          projectId: "project-1",
          title: "Open task",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          status: "in_progress",
          completionPercentage: 30,
        },
        {
          id: "task-declined",
          projectId: "project-1",
          title: "Declined task",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-3"],
          assignedBy: "user-2",
          createdAt: "2026-01-02T00:00:00.000Z",
          updates: [],
          status: "declined",
          declinedReason: "Needs rework",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.summaryPills).toEqual([
      { id: "open", label: "Open", value: "1" },
      { id: "overdue", label: "Overdue", value: "0" },
      { id: "review", label: "Review", value: "0" },
    ]);
    expect(result.current.output.taskShortcut?.countLabel).toBe("1 active");
  });

  it("sorts recent activity by timestamp instead of lexical id order", () => {
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
          id: "task-1",
          projectId: "project-1",
          title: "Older update",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "zzz-older",
              description: "First update",
              photos: [],
              completionPercentage: 25,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 25,
        },
        {
          id: "task-2",
          projectId: "project-1",
          title: "Newer update",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "aaa-newer",
              description: "Most recent update",
              photos: [],
              completionPercentage: 75,
              status: "in_progress",
              timestamp: "2026-07-04T09:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 75,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems.map((item: any) => item.title)).toEqual([
      "Newer update",
      "Older update",
    ]);
  });

  it("builds draft items from current task state without duplicating historical in-progress updates", () => {
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
          id: "task-current",
          projectId: "project-1",
          title: "Concrete pour",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-1",
              description: "Started pour",
              photos: [],
              completionPercentage: 20,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
            {
              id: "update-2",
              description: "Continuing pour",
              photos: [],
              completionPercentage: 60,
              status: "in_progress",
              timestamp: "2026-07-04T09:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 60,
        },
        {
          id: "task-stale",
          projectId: "project-1",
          title: "Old draft should not persist",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-3",
              description: "Previously in progress",
              photos: [],
              completionPercentage: 50,
              status: "in_progress",
              timestamp: "2026-07-04T07:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.draftItems).toHaveLength(1);
    expect(result.current.output.draftItems[0]).toMatchObject({
      taskId: "task-current",
      subtitle: "Continuing pour",
    });
  });

  it("sorts draft items by newest relevant update first", () => {
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
          id: "task-older",
          projectId: "project-1",
          title: "Older draft",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-older",
              description: "Older in-progress update",
              photos: [],
              completionPercentage: 20,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 20,
        },
        {
          id: "task-newer",
          projectId: "project-1",
          title: "Newer draft",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [
            {
              id: "update-newer",
              description: "Newest in-progress update",
              photos: [],
              completionPercentage: 80,
              status: "in_progress",
              timestamp: "2026-07-04T09:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 80,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.draftItems.map((item: any) => item.title)).toEqual([
      "Newer draft",
      "Older draft",
    ]);
  });
});
