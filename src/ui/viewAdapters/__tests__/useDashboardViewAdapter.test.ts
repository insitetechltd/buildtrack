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

jest.mock("@/state/userStore.supabase", () => ({
  useUserStore: jest.fn(),
}));

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: jest.fn(),
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
    const { useUserStore } = require("@/state/userStore.supabase");

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

    useUserStore.mockReturnValue({
      getUserById: jest.fn((id: string) => {
        const usersById: Record<string, { name: string }> = {
          "user-1": { name: "Jake M." },
          "user-2": { name: "Casey R." },
          "user-3": { name: "Morgan T." },
        };

        return usersById[id];
      }),
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

  it("exposes an active-project summary card and dense queue dashboard for the selected project", () => {
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
          dueDate: "2026-07-08T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
          tags: ["critical_this_week"],
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
      todayLabel: "Today · Jul 4",
      elapsedDayLabel: "Day 185",
      weatherIconLabel: "☁️",
      weatherTemperatureLabel: "28°C",
    });
    expect(result.current.output.projectSummaryCard?.criticalDates).toEqual([
      {
        id: "critical-date:task-team-review",
        dateLabel: "Jul 8",
        title: "Approve facade mockup",
        subtitle: "Submitted For Review · Critical · Critical this week",
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
          {
            id: "dashboard-queue:my_queue:overdue",
            queue: "my_queue",
            bucket: "overdue",
            title: "Overdue",
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
          {
            id: "dashboard-queue:team_queue:overdue",
            queue: "team_queue",
            bucket: "overdue",
            title: "Overdue",
            countLabel: "0",
          },
        ],
      },
    ]);
  });

  it("builds four queue-overview cells per group on Activity and moves overdue work into the overdue bucket", () => {
    const { useTaskStore } = require("@/state/taskStore.supabase");

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
          id: "task-my-review",
          projectId: "project-1",
          title: "Sign off handrail package",
          description: "",
          priority: "medium",
          dueDate: "2026-07-07T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
        {
          id: "task-my-overdue",
          projectId: "project-1",
          title: "Overdue site walk",
          description: "",
          priority: "critical",
          dueDate: "2026-07-03T00:00:00.000Z",
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
          id: "task-team-overdue",
          projectId: "project-1",
          title: "Overdue team review",
          description: "",
          priority: "critical",
          dueDate: "2026-07-03T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-3"],
          assignedBy: "user-1",
          createdAt: "2026-07-01T00:00:00.000Z",
          updates: [],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.queueDashboard?.groups[0]?.cells.map((cell) => cell.title)).toEqual([
      "New",
      "Doing",
      "Review",
      "Overdue",
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
            countLabel: "1",
          },
          {
            id: "dashboard-queue:my_queue:overdue",
            queue: "my_queue",
            bucket: "overdue",
            title: "Overdue",
            countLabel: "1",
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
            countLabel: "0",
          },
          {
            id: "dashboard-queue:team_queue:overdue",
            queue: "team_queue",
            bucket: "overdue",
            title: "Overdue",
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

  it("builds recent activity rows with actor/action, task title, date, and preview photo", () => {
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
          id: "task-activity-1",
          projectId: "project-1",
          title: "Structural steel inspection — Level 12",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-06-01T00:00:00.000Z",
          updates: [],
          activities: [
            {
              id: "activity-1",
              taskId: "task-activity-1",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: "2026-07-04T07:00:00.000Z",
              data: {
                description: "",
                photos: [
                  "https://example.com/steel-inspection-photo.jpg",
                  "https://example.com/steel-inspection-photo-2.jpg",
                ],
                completionPercentage: 0,
                status: "in_progress",
              },
              description: "",
              completionPercentage: 0,
              status: "in_progress",
              createdAt: "2026-07-04T07:00:00.000Z",
            },
          ],
          status: "in_progress",
          completionPercentage: 0,
        },
        {
          id: "task-old-activity",
          projectId: "project-1",
          title: "Older activity should be hidden",
          description: "",
          priority: "medium",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-06-20T00:00:00.000Z",
          updates: [],
          activities: [
            {
              id: "activity-older-than-7-days",
              taskId: "task-old-activity",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: "2026-06-26T08:55:00.000Z",
              data: {
                description: "Older work",
                photos: [],
                completionPercentage: 20,
                status: "in_progress",
              },
              description: "Older work",
              completionPercentage: 20,
              status: "in_progress",
              createdAt: "2026-06-26T08:55:00.000Z",
            },
          ],
          status: "in_progress",
          completionPercentage: 20,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(result.current.output.activityItems).toHaveLength(1);
    expect(result.current.output.activityItems[0]).toMatchObject({
      id: "activity-1",
      taskId: "task-activity-1",
      actorLabel: "Jake M.",
      actionLabel: "Added 2 photos",
      title: "Structural steel inspection — Level 12",
      timestampLabel: "2 hours ago",
      previewPhotoUri: "https://example.com/steel-inspection-photo.jpg",
    });
    expect(result.current.output.draftItems).toEqual([]);
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

  it("builds richer action text from update data for compact dashboard activity rows", () => {
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
              timestamp: "2026-07-04T07:00:00.000Z",
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

    expect(result.current.output.activityItems[0]).toMatchObject({
      taskId: "task-current",
      timestampLabel: "just now",
      actionLabel: "Continuing pour",
      subtitle: "just now · Continuing pour",
    });
    expect(result.current.output.draftItems).toEqual([]);
  });

  it("uses a photo-oriented label instead of unchanged progress wording for photo-only updates", () => {
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
          id: "task-photo-only",
          projectId: "project-1",
          title: "Photo-only Task",
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
              id: "activity-photo-only",
              description: "",
              photos: [
                "https://example.com/photo-1.jpg",
                "https://example.com/photo-2.jpg",
              ],
              completionPercentage: 0,
              status: "in_progress",
              timestamp: "2026-07-04T07:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "in_progress",
          completionPercentage: 0,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(
      result.current.output.activityItems.find((item: any) => item.id === "activity-photo-only"),
    ).toMatchObject({
      actionLabel: "Added 2 photos",
      subtitle: "2 hours ago · Added 2 photos",
    });
  });

  it("keeps progress wording only when the update represents a meaningful progress change", () => {
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
          id: "task-progress-change",
          projectId: "project-1",
          title: "Progress Change Task",
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
              id: "activity-progress-old",
              description: "",
              photos: [],
              completionPercentage: 10,
              status: "in_progress",
              timestamp: "2026-07-04T07:00:00.000Z",
              userId: "user-1",
            },
            {
              id: "activity-progress-change",
              description: "",
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
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(
      result.current.output.activityItems.find((item: any) => item.id === "activity-progress-change"),
    ).toMatchObject({
      actionLabel: "Updated progress to 40%",
      subtitle: "1 hour ago · Updated progress to 40%",
    });
  });

  it("keeps review-related wording meaningful even when a raw description is present", () => {
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
          id: "task-review-submitted",
          projectId: "project-1",
          title: "Inspection package",
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
              id: "activity-review-submitted",
              description: "Ready for your sign-off",
              photos: [],
              completionPercentage: 100,
              status: "submitted_for_review",
              timestamp: "2026-07-04T06:00:00.000Z",
              userId: "user-1",
            },
          ],
          status: "submitted_for_review",
          completionPercentage: 100,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(
      result.current.output.activityItems.find((item: any) => item.id === "activity-review-submitted"),
    ).toMatchObject({
      actionLabel: "Submitted task for review",
      subtitle: "3 hours ago · Submitted task for review",
    });
  });

  it("drops activity older than 7 days from the dashboard feed", () => {
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
          title: "Older task activity",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          activities: [
            {
              id: "activity-older-than-7-days",
              taskId: "task-older",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: "2026-06-26T09:00:00.000Z",
              data: {
                description: "Old update",
                photos: [],
                completionPercentage: 20,
                status: "in_progress",
              },
              description: "Old update",
              completionPercentage: 20,
              status: "in_progress",
              createdAt: "2026-06-26T09:00:00.000Z",
            },
          ],
          status: "in_progress",
          completionPercentage: 20,
        },
        {
          id: "task-newer",
          projectId: "project-1",
          title: "Newer task activity",
          description: "",
          priority: "high",
          dueDate: "2099-01-01T00:00:00.000Z",
          category: "general",
          attachments: [],
          assignedTo: ["user-1"],
          assignedBy: "user-2",
          createdAt: "2026-01-01T00:00:00.000Z",
          updates: [],
          activities: [
            {
              id: "activity-within-7-days",
              taskId: "task-newer",
              userId: "user-1",
              activityType: "progress_update",
              timestamp: "2026-07-02T09:00:00.000Z",
              data: {
                description: "New update",
                photos: [],
                completionPercentage: 80,
                status: "in_progress",
              },
              description: "New update",
              completionPercentage: 80,
              status: "in_progress",
              createdAt: "2026-07-02T09:00:00.000Z",
            },
          ],
          status: "in_progress",
          completionPercentage: 80,
        },
      ],
    });

    const { result } = renderHook(() => useDashboardViewAdapter());

    expect(
      result.current.output.activityItems.some((item: any) => item.id === "activity-older-than-7-days"),
    ).toBe(false);
    expect(result.current.output.activityItems.map((item: any) => item.id)).toEqual([
      "activity-within-7-days",
    ]);
    expect(result.current.output.draftItems).toEqual([]);
  });
});
