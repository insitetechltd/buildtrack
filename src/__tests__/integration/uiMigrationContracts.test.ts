import {
  calculateScreenMigrationScore,
  getRankedScreenMigrationInventory,
  SCREEN_MIGRATION_DIMENSION_WEIGHTS,
  SCREEN_MIGRATION_INVENTORY,
} from "@/ui/contracts/screenScoring";
import {
  PrimitiveDensityMode,
  PrimitiveStructuralState,
  type ContainerPrimitiveContract,
  type InputPrimitiveContract,
  type StatusPrimitiveContract,
} from "@/ui/contracts/primitives";
import type {
  DashboardScreenViewAdapterOutput,
  TaskDetailScreenViewAdapterOutput,
  TasksScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { NavigationScreenReadiness } from "@/ui/contracts/navigationBridge";

describe("Sprint 4 UI migration contracts", () => {
  it("exports the seven weighted migration dimensions and ranks the Wave 1 screens first", () => {
    expect(Object.keys(SCREEN_MIGRATION_DIMENSION_WEIGHTS)).toHaveLength(7);

    const rankedScreens = getRankedScreenMigrationInventory();

    expect(rankedScreens.slice(0, 3).map((entry) => entry.screenId)).toEqual([
      "TasksScreen",
      "DashboardScreen",
      "TaskDetailScreen",
    ]);
  });

  it("produces a higher migration score for TasksScreen than ProjectsScreen", () => {
    const tasksScore = calculateScreenMigrationScore(
      SCREEN_MIGRATION_INVENTORY.TasksScreen
    );
    const projectsScore = calculateScreenMigrationScore(
      SCREEN_MIGRATION_INVENTORY.ProjectsScreen
    );

    expect(tasksScore.totalPriorityScore).toBeGreaterThan(
      projectsScore.totalPriorityScore
    );
  });

  it("supports deterministic primitive contracts and screen adapter outputs", () => {
    const density: PrimitiveDensityMode = "compact";
    const structuralState: PrimitiveStructuralState = "stale";

    const inputContract: InputPrimitiveContract = {
      primitiveId: "task-title-input",
      family: "input",
      density,
      structuralState,
      isLoading: false,
      isEmpty: false,
      isStale: true,
      isDisabled: false,
      accessibilityLabel: "Task title",
      label: "Task title",
      helperText: "Enter a concise title",
      validation: {
        status: "valid",
        severity: "none",
        message: undefined,
      },
      interaction: {
        isDisabled: false,
        isReadOnly: false,
        isRequired: true,
      },
      content: {
        value: "Pour slab",
        placeholder: "Enter title",
      },
    };

    const statusContract: StatusPrimitiveContract = {
      primitiveId: "task-status-badge",
      family: "status",
      density: "standard",
      structuralState: "loading",
      isLoading: true,
      isEmpty: false,
      isStale: false,
      isDisabled: false,
      accessibilityLabel: "Task status",
      semanticToken: "task_in_progress",
      category: "task",
      emphasis: "strong",
      label: "In Progress",
      icon: "progress",
      tooltip: "Task is currently being worked on",
    };

    const containerContract: ContainerPrimitiveContract = {
      primitiveId: "task-card",
      family: "container",
      density: "expanded",
      structuralState: "empty",
      isLoading: false,
      isEmpty: true,
      isStale: false,
      isDisabled: false,
      accessibilityLabel: "Task card",
      chrome: {
        title: "Open Tasks",
        subtitle: "Current project workload",
        metadataRows: [],
        actionSlots: [
          {
            actionId: "refresh",
            label: "Refresh",
            icon: "refresh",
            isDisabled: false,
          },
        ],
      },
      body: {
        empty: {
          title: "No tasks",
          message: "There are no open tasks for this project.",
        },
        skeleton: {
          rowCount: 3,
          metadataColumnCount: 2,
          hasMediaPlaceholder: true,
        },
      },
    };

    const dashboardAdapter: DashboardScreenViewAdapterOutput = {
      screenId: "DashboardScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: true,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Fresh",
      },
      projectSummaryItems: [],
      highlightedTaskItems: [],
      quickActionItems: [],
      scalarMetrics: {
        openTaskCount: 4,
        overdueTaskCount: 1,
        projectCount: 2,
        hasSelectedProject: true,
        actionRequiredCount: 1,
        inProgressSentCount: 2,
        awaitingApprovalCount: 1,
        actionRequiredOverdueCount: 0,
        inProgressSentOverdueCount: 1,
        awaitingApprovalOverdueCount: 0,
      },
    };

    const tasksAdapter: TasksScreenViewAdapterOutput = {
      screenId: "TasksScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: true,
        isNavigationTransitionActive: false,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: true,
        hasCachedFrame: true,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Refreshing",
      },
      filterSummary: {
        selectedProjectId: "project-1",
        sectionFilterLabel: "My Work",
        statusFilterLabel: "All",
        sortLabel: "Priority",
      },
      taskRowItems: [],
      scalarMetrics: {
        totalVisibleTaskCount: 12,
        overdueVisibleTaskCount: 2,
        selectedProjectTaskCount: 8,
        hasActiveFilters: true,
      },
    };

    const taskDetailAdapter: TaskDetailScreenViewAdapterOutput = {
      screenId: "TaskDetailScreen",
      readiness: {
        hasInitialFrame: true,
        hasUsableData: true,
        isBackgroundRefreshing: false,
        isNavigationTransitionActive: true,
      },
      continuity: {
        isInitialLoading: false,
        isBackgroundRefreshing: false,
        hasCachedFrame: true,
        shouldRenderSkeletonShell: false,
        shouldRenderEmptyState: false,
        freshnessLabel: "Fresh",
      },
      header: {
        taskId: "task-1",
        title: "Pour slab",
        statusLabel: "In Progress",
        projectName: "North Tower",
        assigneeSummary: "2 assignees",
      },
      detailSections: [],
      actionItems: [],
      scalarMetrics: {
        attachmentCount: 3,
        updateCount: 5,
        childTaskCount: 2,
        completionPercentage: 40,
      },
    };

    const readiness: NavigationScreenReadiness = {
      hasInitialFrame: true,
      hasUsableData: true,
      isBackgroundRefreshing: false,
      isNavigationTransitionActive: false,
    };

    expect(inputContract.density).toBe("compact");
    expect(statusContract.semanticToken).toBe("task_in_progress");
    expect(containerContract.body.skeleton?.rowCount).toBe(3);
    expect(dashboardAdapter.scalarMetrics.projectCount).toBe(2);
    expect(tasksAdapter.scalarMetrics.hasActiveFilters).toBe(true);
    expect(taskDetailAdapter.scalarMetrics.childTaskCount).toBe(2);
    expect(readiness.hasInitialFrame).toBe(true);
  });
});
