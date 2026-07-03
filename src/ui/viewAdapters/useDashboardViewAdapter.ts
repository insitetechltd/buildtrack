import { useMemo } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { isAdmin, type Project } from "@/types/buildtrack";
import { getResponsibilityToken, isTaskOverdue } from "@/utils/accountabilityEngine";
import type {
  DashboardActivityItem,
  DashboardProjectSummaryItem,
  DashboardScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { PrimitiveStructuralState, StatusSemanticToken } from "@/ui/contracts/primitives";

function formatProjectStatusLabel(status: Project["status"]): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapProjectStatusToToken(status: Project["status"]): StatusSemanticToken {
  switch (status) {
    case "planning":
      return "project_planning";
    case "active":
      return "project_active";
    case "on_hold":
      return "project_on_hold";
    case "completed":
      return "project_completed";
    case "cancelled":
      return "project_cancelled";
    default:
      return "custom";
  }
}

function isPreAcceptanceTaskStatus(status: string): boolean {
  return status === "new" || status === "not_started";
}

function isTerminalTaskStatus(status: string): boolean {
  return (
    status === "approved" ||
    status === "completed" ||
    status === "done" ||
    status === "cancelled" ||
    status === "rejected"
  );
}

export interface DashboardViewAdapterHookResult {
  output: DashboardScreenViewAdapterOutput;
  visibility: {
    showCreateTaskFab: boolean;
    showProfileShortcut: boolean;
    showProjectPickerShortcut: boolean;
    showDeveloperSettingsShortcut: boolean;
  };
}

export function useDashboardViewAdapter(): DashboardViewAdapterHookResult {
  const { user } = useAuthStore();
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const projectStore = useProjectStoreWithInit();
  const taskStore = useTaskStore();
  const currentUserId = user?.id ?? "";

  const projects = user ? projectStore.getProjectsByUser(user.id) : [];
  const tasks = taskStore.tasks ?? [];
  const isLoadingProjects = Boolean(projectStore.isLoading);

  const { activeProject, projectSummaryItems, scalarMetrics, continuity, summaryPills, draftItems, activityItems, taskShortcut } = useMemo(() => {
    const hasProjects = projects.length > 0;
    const visibleProjectIds = new Set(projects.map((project) => project.id));
    const resolvedActiveProject = selectedProjectId
      ? projects.find((project) => project.id === selectedProjectId) ?? null
      : null;
    const isInitialLoading = isLoadingProjects && !hasProjects;
    const isBackgroundRefreshing = isLoadingProjects && hasProjects;
    const structuralState: PrimitiveStructuralState = isInitialLoading
      ? "loading"
      : hasProjects
        ? isBackgroundRefreshing
          ? "stale"
          : "stale"
        : "empty";

    const projectMetrics = new Map<
      string,
      {
        openTaskCount: number;
        overdueTaskCount: number;
      }
    >();

    let actionRequiredCount = 0;
    let inProgressSentCount = 0;
    let awaitingApprovalCount = 0;
    let actionRequiredOverdueCount = 0;
    let inProgressSentOverdueCount = 0;
    let awaitingApprovalOverdueCount = 0;

    let inboxNewCount = 0;
    let inboxNewOverdueCount = 0;
    let inboxWipCount = 0;
    let inboxWipOverdueCount = 0;
    let inboxReviewingCount = 0;
    let inboxReviewingOverdueCount = 0;

    let outboxNewCount = 0;
    let outboxNewOverdueCount = 0;
    let outboxWipCount = 0;
    let outboxWipOverdueCount = 0;
    let outboxReviewingCount = 0;
    let outboxReviewingOverdueCount = 0;

    tasks.forEach((task) => {
      if (!visibleProjectIds.has(task.projectId)) {
        return;
      }

      const responsibilityToken = getResponsibilityToken(task, currentUserId);
      const overdue = isTaskOverdue(task);
      const metricsForProject = projectMetrics.get(task.projectId) ?? {
        openTaskCount: 0,
        overdueTaskCount: 0,
      };

      if (responsibilityToken !== "VOID_ARCHIVED") {
        metricsForProject.openTaskCount += 1;
        if (overdue) {
          metricsForProject.overdueTaskCount += 1;
        }
      }

      if (responsibilityToken === "ACTION_REQUIRED") {
        actionRequiredCount += 1;
        if (overdue) {
          actionRequiredOverdueCount += 1;
        }
      } else if (responsibilityToken === "IN_PROGRESS_SENT") {
        inProgressSentCount += 1;
        if (overdue) {
          inProgressSentOverdueCount += 1;
        }
      } else if (responsibilityToken === "AWAITING_APPROVAL") {
        awaitingApprovalCount += 1;
        if (overdue) {
          awaitingApprovalOverdueCount += 1;
        }
      }

      // Legacy 6 bucket logic
      const isAssignedToMe = (task.assignedTo ?? []).includes(currentUserId);
      const isAssignedByMe = task.assignedBy === currentUserId;

      if (isAssignedToMe && !isTerminalTaskStatus(task.status)) {
        if (isPreAcceptanceTaskStatus(task.status)) {
          inboxNewCount++;
          if (overdue) inboxNewOverdueCount++;
        } else if (task.status === "in_progress" || task.status === "accepted") {
          inboxWipCount++;
          if (overdue) inboxWipOverdueCount++;
        } else if (task.status === "submitted_for_review") {
          inboxReviewingCount++;
          if (overdue) inboxReviewingOverdueCount++;
        }
      }

      if (isAssignedByMe && !isAssignedToMe && !isTerminalTaskStatus(task.status)) {
        if (isPreAcceptanceTaskStatus(task.status)) {
          outboxNewCount++;
          if (overdue) outboxNewOverdueCount++;
        } else if (task.status === "in_progress" || task.status === "accepted") {
          outboxWipCount++;
          if (overdue) outboxWipOverdueCount++;
        } else if (task.status === "submitted_for_review") {
          outboxReviewingCount++;
          if (overdue) outboxReviewingOverdueCount++;
        }
      }

      projectMetrics.set(task.projectId, metricsForProject);
    });

    const summaryItems: DashboardProjectSummaryItem[] = hasProjects
      ? projects.map((project) => {
          const metricsForProject = projectMetrics.get(project.id) ?? {
            openTaskCount: 0,
            overdueTaskCount: 0,
          };

          return {
            id: `dashboard-project:${project.id}`,
            projectId: project.id,
            title: project.name,
            subtitle: project.location,
            statusToken: mapProjectStatusToToken(project.status),
            statusLabel: formatProjectStatusLabel(project.status),
            openTaskCount: metricsForProject.openTaskCount,
            overdueTaskCount: metricsForProject.overdueTaskCount,
            density: "standard",
            structuralState,
          };
        })
      : [
          {
            id: "dashboard-project:empty",
            projectId: "empty",
            title: "No Projects",
            subtitle: "Projects will appear here once available.",
            statusToken: "workspace_empty",
            statusLabel: "Empty",
            openTaskCount: 0,
            overdueTaskCount: 0,
            density: "standard",
            structuralState,
          },
        ];

    const totalOpenTaskCount = summaryItems.reduce((acc, item) => acc + item.openTaskCount, 0);
    const totalOverdueTaskCount = summaryItems.reduce((acc, item) => acc + item.overdueTaskCount, 0);
    const activeProjectTasks = resolvedActiveProject
      ? tasks.filter((task) => task.projectId === resolvedActiveProject.id)
      : [];
    const activeProjectOpenTasks = activeProjectTasks.filter(
      (task) => getResponsibilityToken(task, currentUserId) !== "VOID_ARCHIVED",
    );
    const activeProjectReviewTasks = activeProjectTasks.filter(
      (task) => task.status === "submitted_for_review",
    );
    const activeProjectOverdueTasks = activeProjectOpenTasks.filter((task) =>
      isTaskOverdue(task),
    );
    const mappedActivityItems: DashboardActivityItem[] = activeProjectTasks
      .flatMap((task) => {
        const updates = Array.isArray(task.updates) ? task.updates : [];

        if (updates.length === 0) {
          return [
            {
              id: `activity-task:${task.id}`,
              taskId: task.id,
              title: task.title,
              subtitle: task.description || resolvedActiveProject?.name || "Active project task",
              timestampLabel: "Task activity",
              statusLabel: task.status.replace(/_/g, " "),
              previewPhotoUri: task.attachments?.[0],
              density: "standard" as const,
              structuralState,
              sortTimestamp: task.createdAt,
            },
          ];
        }

        return updates.map((update) => ({
          id: update.id,
          taskId: task.id,
          title: task.title,
          subtitle: update.description,
          timestampLabel: new Date(update.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          statusLabel: update.status.replace(/_/g, " "),
          previewPhotoUri: update.photos?.[0] || task.attachments?.[0],
          density: "standard" as const,
          structuralState,
          sortTimestamp: update.timestamp,
        }));
      })
      .sort(
        (left, right) =>
          new Date((right as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime() -
          new Date((left as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime(),
      )
      .map(({ sortTimestamp: _sortTimestamp, ...item }) => item as DashboardActivityItem);

    const mappedDraftItems: DashboardActivityItem[] = activeProjectTasks
      .filter((task) => task.status === "in_progress" || task.status === "accepted")
      .map((task) => {
        const updates = Array.isArray(task.updates) ? task.updates : [];
        const latestUpdate = [...updates].sort(
          (left, right) =>
            new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
        )[0];

        return {
          id: `draft:${task.id}`,
          taskId: task.id,
          title: task.title,
          subtitle:
            latestUpdate?.description || task.description || resolvedActiveProject?.name || "In progress",
          timestampLabel: latestUpdate
            ? new Date(latestUpdate.timestamp).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })
            : "In progress",
          statusLabel: task.status.replace(/_/g, " "),
          previewPhotoUri: latestUpdate?.photos?.[0] || task.attachments?.[0],
          density: "standard",
          structuralState,
          sortTimestamp: latestUpdate?.timestamp || task.createdAt,
        };
      })
      .sort(
        (left, right) =>
          new Date((right as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime() -
          new Date((left as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime(),
      )
      .map(({ sortTimestamp: _sortTimestamp, ...item }) => item as DashboardActivityItem);

    return {
      activeProject: resolvedActiveProject
        ? {
            id: resolvedActiveProject.id,
            title: resolvedActiveProject.name,
            subtitle: resolvedActiveProject.location,
          }
        : null,
      projectSummaryItems: summaryItems,
      summaryPills: resolvedActiveProject
        ? [
            { id: "open", label: "Open", value: String(activeProjectOpenTasks.length) },
            { id: "overdue", label: "Overdue", value: String(activeProjectOverdueTasks.length) },
            { id: "review", label: "Review", value: String(activeProjectReviewTasks.length) },
          ]
        : [],
      draftItems: mappedDraftItems,
      activityItems: mappedActivityItems,
      taskShortcut: resolvedActiveProject
        ? {
            title: "All Tasks",
            subtitle: resolvedActiveProject.name,
            countLabel: `${activeProjectOpenTasks.length} active`,
          }
        : null,
      scalarMetrics: {
        openTaskCount: totalOpenTaskCount,
        overdueTaskCount: totalOverdueTaskCount,
        projectCount: hasProjects ? projects.length : 0,
        hasSelectedProject: Boolean(resolvedActiveProject),
        actionRequiredCount,
        inProgressSentCount,
        awaitingApprovalCount,
        actionRequiredOverdueCount,
        inProgressSentOverdueCount,
        awaitingApprovalOverdueCount,
        inboxNewCount,
        inboxNewOverdueCount,
        inboxWipCount,
        inboxWipOverdueCount,
        inboxReviewingCount,
        inboxReviewingOverdueCount,
        outboxNewCount,
        outboxNewOverdueCount,
        outboxWipCount,
        outboxWipOverdueCount,
        outboxReviewingCount,
        outboxReviewingOverdueCount,
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing,
        hasCachedFrame: hasProjects,
        shouldRenderSkeletonShell: isInitialLoading,
        shouldRenderEmptyState: !isInitialLoading && !hasProjects,
        freshnessLabel: isBackgroundRefreshing ? "Refreshing" : isInitialLoading ? "Loading" : "Ready",
      },
    };
  }, [currentUserId, isLoadingProjects, projects, selectedProjectId, tasks]);

  const readiness = useMemo(() => {
    return {
      hasInitialFrame: true,
      hasUsableData: projectSummaryItems.length > 0,
      isBackgroundRefreshing: continuity.isBackgroundRefreshing,
      isNavigationTransitionActive: false,
    };
  }, [continuity.isBackgroundRefreshing, projectSummaryItems.length]);

  const output: DashboardScreenViewAdapterOutput = {
    screenId: "DashboardScreen",
    readiness,
    continuity,
    activeProject,
    summaryPills,
    draftItems,
    activityItems,
    taskShortcut,
    projectSummaryItems,
    highlightedTaskItems: [],
    quickActionItems: [],
    scalarMetrics,
  };

  return {
    output,
    visibility: {
      showCreateTaskFab: Boolean(user && !isAdmin(user)),
      showProfileShortcut: Boolean(user),
      showProjectPickerShortcut: Boolean(user),
      showDeveloperSettingsShortcut: __DEV__,
    },
  };
}
