import {
  buildProjectDerivedState,
  type QueryMeta,
} from "../projectStore.supabase";
import {
  buildTaskDerivedState,
} from "../taskStore.supabase";

describe("Sprint 2 normalized store helpers", () => {
  const idleMeta: QueryMeta = {
    key: "projects:user:user-123",
    hasHydratedData: false,
    hasFetchedOnce: false,
    isInitialLoading: false,
    isBackgroundRefreshing: false,
    isManualRefreshing: false,
    lastFetchedAt: null,
    lastSuccessfulFetchAt: null,
    staleAt: null,
    expiresAt: null,
    error: null,
    emptyStateResolved: false,
  };

  it("builds stable project indexes, summaries, and query ID maps", () => {
    const state = buildProjectDerivedState(
      [
        {
          id: "project-1",
          name: "North Tower",
          description: "Fit-out",
          status: "active",
          companyId: "company-1",
          createdBy: "user-1",
          startDate: "2026-06-01T00:00:00.000Z",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      [
        {
          id: "assignment-1",
          userId: "user-123",
          projectId: "project-1",
          category: "worker",
          assignedAt: "2026-06-01T00:00:00.000Z",
          assignedBy: "user-1",
          isActive: true,
        },
      ],
      {
        "projects:user:user-123": idleMeta,
      }
    );

    expect(state.projectsById["project-1"]?.name).toBe("North Tower");
    expect(state.projectIdsByUser["user-123"]).toEqual(["project-1"]);
    expect(state.projectIdsByCompany["company-1"]).toEqual(["project-1"]);
    expect(state.projectSummaryById["project-1"]?.summaryHash).toContain("project-1");
    expect(state.queryProjectIds["projects:user:user-123"]).toEqual(["project-1"]);
  });

  it("builds task indexes, child maps, previews, and query ID maps", () => {
    const state = buildTaskDerivedState(
      [
        {
          id: "task-1",
          projectId: "project-1",
          title: "Pour slab",
          description: "Level 2 slab",
          priority: "high",
          category: "general",
          dueDate: "2026-06-20T00:00:00.000Z",
          assignedTo: ["user-123"],
          assignedBy: "manager-1",
          attachments: [],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          updates: [],
          activities: [],
          status: "in_progress",
          completionPercentage: 40,
        },
        {
          id: "task-2",
          projectId: "project-1",
          parentTaskId: "task-1",
          title: "Set forms",
          description: "Edge forms",
          priority: "medium",
          category: "general",
          dueDate: "2026-06-18T00:00:00.000Z",
          assignedTo: ["user-123"],
          assignedBy: "manager-1",
          attachments: [],
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          updates: [],
          activities: [],
          status: "new",
          completionPercentage: 0,
        },
      ],
      [],
      {
        "tasks:project:project-1": {
          ...idleMeta,
          key: "tasks:project:project-1",
        },
      }
    );

    expect(state.tasksById["task-1"]?.title).toBe("Pour slab");
    expect(state.taskIdsByProject["project-1"]).toEqual(["task-1", "task-2"]);
    expect(state.topLevelTaskIdsByProject["project-1"]).toEqual(["task-1"]);
    expect(state.childTaskIdsByParent["task-1"]).toEqual(["task-2"]);
    expect(state.taskIdsByUser["user-123"]).toEqual(["task-1", "task-2"]);
    expect(state.taskPreviewById["task-1"]?.previewHash).toContain("task-1");
    expect(state.queryTaskIds["tasks:project:project-1"]).toEqual(["task-1", "task-2"]);
  });
});
