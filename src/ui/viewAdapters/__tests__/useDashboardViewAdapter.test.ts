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

const mockGetBatchesForProject = jest.fn().mockReturnValue([]);
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

jest.mock("@/state/unattachedPhotoBatchStore", () => ({
  useUnattachedPhotoBatchStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      batches: [],
      addBatch: jest.fn(),
      dismissBatch: jest.fn(),
      getBatchesForProject: (projectId: string) => {
        const mocked = mockGetBatchesForProject(projectId) ?? [];
        const now = Date.now();
        return mocked.filter(
          (b: any) =>
            b.projectId === projectId && now - b.savedAt <= FIVE_DAYS_MS,
        );
      },
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/api/fileUploadService", () => ({
  getFileUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
  extractBuildtrackStoragePath: jest.fn((value: string) =>
    /^https?:|^file:|^content:|^data:|^asset:/i.test(value) ? null : value
  ),
  prefetchSignedUrls: jest.fn(() => Promise.resolve()),
  subscribeSignedUrlCache: jest.fn(() => () => {}),
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

  it("exposes an active-project summary card with week-based critical dates and a dense queue dashboard for the selected project", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
        startDate: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "project-2",
        name: "South Annex",
        location: "Site B",
        status: "planning",
        startDate: "2026-02-01T00:00:00.000Z",
      },
    ]);

    useTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-my-new",
          projectId: "project-1",
          title: "Review concrete delivery",
          description: "",
          priority: "high",
          dueDate: "2026-07-06T00:00:00.000Z",
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
          id: "task-my-wip",
          projectId: "project-1",
          title: "Coordinate crane access",
          description: "",
          priority: "medium",
          dueDate: "2026-07-07T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "in_progress",
          completionPercentage: 35,
        },
        {
          id: "task-team-review",
          projectId: "project-1",
          title: "Approve facade mockup",
          description: "",
          priority: "critical",
          dueDate: "2026-07-05T00:00:00.000Z",
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
          id: "task-other-project",
          projectId: "project-2",
          title: "Hidden other project queue item",
          description: "",
          priority: "low",
          dueDate: "2026-07-06T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-3",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.projectSummaryCard).toMatchObject({
      title: "North Tower",
      todayLabel: "Saturday · Jul 4",
      elapsedDayLabel: "Day 185",
      weatherIconLabel: "☁️",
      weatherTemperatureLabel: "28°C",
    });
    expect(result.current.output.projectSummaryCard?.criticalDates).toEqual([
      {
        id: "critical-date:task-team-review",
        taskId: "task-team-review",
        dateLabel: "Jul 5",
        title: "Approve facade mockup",
        subtitle: "Submitted For Review · Critical",
      },
    ]);

    expect(result.current.output.queueDashboard?.groups).toEqual([
      {
        id: "dashboard-queue:my_queue",
        title: "My Queue",
        cells: [
          {
            id: "dashboard-queue:my_queue:new",
            queue: "my_queue",
            bucket: "new",
            title: "New",
            countLabel: "1",
          },
          {
            id: "dashboard-queue:my_queue:wip",
            queue: "my_queue",
            bucket: "wip",
            title: "Doing",
            countLabel: "1",
          },
          {
            id: "dashboard-queue:my_queue:review",
            queue: "my_queue",
            bucket: "review",
            title: "Review",
            countLabel: "0",
          },
        ],
      },
      {
        id: "dashboard-queue:team_queue",
        title: "Team Queue",
        cells: [
          {
            id: "dashboard-queue:team_queue:new",
            queue: "team_queue",
            bucket: "new",
            title: "New",
            countLabel: "0",
          },
          {
            id: "dashboard-queue:team_queue:wip",
            queue: "team_queue",
            bucket: "wip",
            title: "Doing",
            countLabel: "0",
          },
          {
            id: "dashboard-queue:team_queue:review",
            queue: "team_queue",
            bucket: "review",
            title: "Review",
            countLabel: "1",
          },
        ],
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

  it("limits recent activity to the last 120 hours for the active project", () => {
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
          id: "task-fresh-update",
          projectId: "project-1",
          title: "Fresh update task",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T08:00:00.000Z",
          updates: [
            {
              id: "update-fresh",
              description: "Fresh update inside the window",
              photos: [],
              completionPercentage: 40,
              status: "in_progress",
              timestamp: "2026-07-04T08:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 40,
        },
        {
          id: "task-stale-update",
          projectId: "project-1",
          title: "Stale update task",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-06-28T08:00:00.000Z",
          updates: [
            {
              id: "update-stale",
              description: "Stale update outside the window",
              photos: [],
              completionPercentage: 20,
              status: "in_progress",
              timestamp: "2026-06-29T08:59:59.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 20,
        },
        {
          id: "task-fresh-fallback",
          projectId: "project-1",
          title: "Fresh fallback task",
          description: "Uses createdAt fallback",
          priority: "low",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-02T12:00:00.000Z",
          updates: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems.map((item: any) => item.taskId)).toEqual([
      "task-fresh-update",
      "task-fresh-fallback",
    ]);
    expect(result.current.output.activityItems.map((item: any) => item.title)).toEqual([
      "Fresh update task",
      "Fresh fallback task",
    ]);
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

  it("extracts preview-photo URIs from object-shaped task attachments on activity cards", () => {
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
          attachments: [
            {
              uri: "file:///activity-photo-object.jpg",
              fileName: "activity-photo-object.jpg",
              isAnnotated: false,
            },
          ],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-04T08:00:00.000Z",
          updates: [],
          status: "in_progress",
          completionPercentage: 65,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems[0].previewPhotoUri).toBe(
      "file:///activity-photo-object.jpg",
    );
  });

  it("extracts preview-photo URIs from JSON-stringified attachment blobs on activity cards", () => {
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
          attachments: [
            JSON.stringify({
              uri: "file:///activity-photo-stringified.jpg",
              fileName: "activity-photo-stringified.jpg",
              isAnnotated: false,
            }),
          ],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-04T08:00:00.000Z",
          updates: [],
          status: "in_progress",
          completionPercentage: 65,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems[0].previewPhotoUri).toBe(
      "file:///activity-photo-stringified.jpg",
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

  it("prepends synthetic activity rows from unattached photo batches (within 5 days) for the selected project", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
      {
        id: "project-1",
        name: "North Tower",
        location: "Site A",
        status: "active",
      },
    ]);

    useTaskStore.mockReturnValue({ tasks: [] });
    mockGetBatchesForProject.mockImplementation((projectId: string) =>
      projectId === "project-1"
        ? [
            {
              id: "batch-fresh",
              projectId: "project-1",
              companyId: "co-1",
              userId: "user-1",
              photoUrls: [
                "https://cdn.example.com/fresh-1.jpg",
                "https://cdn.example.com/fresh-2.jpg",
              ],
              captions: ["Main entry progress"],
              savedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
            },
          ]
        : [],
    );

    const { result } = renderHook(() => useDashboardViewAdapter());

    const synthetic = result.current.output.activityItems.find(
      (item: any) => item.id === "unattached-batch-batch-fresh",
    );
    expect(synthetic).toBeTruthy();
    expect(synthetic.taskId).toBe("project:project-1");
    expect(synthetic.title).toContain("2 photos captured");
    expect(synthetic.subtitle).toBe("Main entry progress");
    expect(synthetic.statusLabel).toBe("Saved to project");
    expect(synthetic.previewPhotoUri).toBe("https://cdn.example.com/fresh-1.jpg");
  });

  it("excludes unattached batches older than 5 days from activity items", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

    setupBaseMocks([
      {
        id: "project-old",
        name: "Old Works",
        location: "Site Z",
        status: "active",
      },
    ]);

    useTaskStore.mockReturnValue({ tasks: [] });
    const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
    mockGetBatchesForProject.mockImplementation((projectId: string) =>
      projectId === "project-old"
        ? [
            {
              id: "batch-expired",
              projectId: "project-old",
              companyId: "co-1",
              userId: "user-1",
              photoUrls: ["https://cdn.example.com/old-1.jpg"],
              captions: [],
              savedAt: Date.now() - (FIVE_DAYS_MS + 5 * 60 * 1000),
            },
          ]
        : [],
    );

    const { result } = renderHook(() => useDashboardViewAdapter());
    const expired = result.current.output.activityItems.find(
      (item: any) => item.id === "unattached-batch-batch-expired",
    );
    expect(expired).toBeUndefined();
  });
});
