import { useMemo } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUserStore } from "@/state/userStore.supabase";
import { isAdmin, type Project, type Task, type TaskActivity, type TaskUpdate } from "@/types/buildtrack";
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
  return (
    status === "new" ||
    status === "not_started" ||
    status === "assigned" ||
    status === "received"
  );
}

function isTerminalTaskStatus(status: string): boolean {
  return (
    status === "approved" ||
    status === "completed" ||
    status === "done" ||
    status === "cancelled"
  );
}

function formatCalendarLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

function formatRelativeTimestamp(timestamp?: string, now = Date.now()): string {
  if (!timestamp) {
    return "just now";
  }

  const parsedTimestamp = new Date(timestamp).getTime();
  if (!Number.isFinite(parsedTimestamp)) {
    return "just now";
  }

  const diffInMilliseconds = Math.max(0, now - parsedTimestamp);
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));

  if (diffInMinutes < 1) {
    return "just now";
  }

  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
}

function isWithinLastSevenDays(timestamp?: string, now = Date.now()): boolean {
  if (!timestamp) {
    return false;
  }

  const parsedTimestamp = new Date(timestamp).getTime();
  if (!Number.isFinite(parsedTimestamp)) {
    return false;
  }

  const diffInMilliseconds = now - parsedTimestamp;
  return diffInMilliseconds >= 0 && diffInMilliseconds <= SEVEN_DAYS_IN_MS;
}

interface DashboardActionLabelContext {
  previousCompletionPercentage?: number;
}

function getActivityNarrative(activity: TaskActivity): string | undefined {
  const description = activity.description?.trim();
  if (description) {
    return description;
  }

  const dataDescription = (activity.data as { description?: string } | undefined)?.description?.trim();
  return dataDescription || undefined;
}

function getUpdateNarrative(update: TaskUpdate): string | undefined {
  const description = update.description?.trim();
  return description || undefined;
}

function buildPhotoUpdateHeadline(photoCount: number): string {
  if (photoCount <= 1) {
    return "Added photo update";
  }

  return `Added ${photoCount} photos`;
}

function collectSummaryPhotoUrls(activityLike: TaskActivity | TaskUpdate): string[] {
  if ("activityType" in activityLike) {
    const photos = (activityLike.data as { photos?: string[] } | undefined)?.photos;
    return Array.isArray(photos) ? photos.filter(Boolean) : [];
  }

  return Array.isArray(activityLike.photos) ? activityLike.photos.filter(Boolean) : [];
}

function hasMeaningfulActivityProgressChange(
  activity: TaskActivity,
  context?: DashboardActionLabelContext,
): boolean {
  if (activity.activityType !== "progress_update" || activity.completionPercentage === undefined) {
    return false;
  }

  if (context?.previousCompletionPercentage !== undefined) {
    return activity.completionPercentage !== context.previousCompletionPercentage;
  }

  return activity.completionPercentage > 0;
}

function hasMeaningfulUpdateProgressChange(
  update: TaskUpdate,
  context?: DashboardActionLabelContext,
): boolean {
  if (update.completionPercentage === undefined) {
    return false;
  }

  if (context?.previousCompletionPercentage !== undefined) {
    return update.completionPercentage !== context.previousCompletionPercentage;
  }

  return update.completionPercentage > 0;
}

function buildDashboardFallbackActionLabelFromActivity(
  activity: TaskActivity,
  context?: DashboardActionLabelContext,
): string {
  switch (activity.activityType) {
    case "progress_update": {
      const photoCount = collectSummaryPhotoUrls(activity).length;
      const meaningfulProgressChange = hasMeaningfulActivityProgressChange(activity, context);

      if (photoCount > 0 && !meaningfulProgressChange) {
        return buildPhotoUpdateHeadline(photoCount);
      }

      return activity.completionPercentage !== undefined
        ? `Updated progress to ${activity.completionPercentage}%`
        : "Updated progress";
    }
    case "status_change": {
      const nextStatus =
        activity.status ??
        ("toStatus" in activity.data ? activity.data.toStatus : undefined);
      return nextStatus ? `Changed status to ${formatStatusLabel(nextStatus)}` : "Updated task status";
    }
    case "assignment":
      return "Updated assignment";
    case "creation":
      return "Created task";
    case "cancellation":
      return "Cancelled task";
    case "review_submission":
      return "Submitted task for review";
    case "review_acceptance":
      return "Approved task completion";
    case "review_rejection":
      return "Rejected task completion";
    case "assigner_comment":
      return "Added assigner comment";
    case "delegation_added":
      return "Added delegation";
    case "delegation_removed":
      return "Removed delegation";
    case "photo_batch_attached":
      return "Added photo evidence";
    case "draft_completed":
      return "Completed draft update";
    case "metadata_edit":
      return "Updated task details";
    default:
      return formatStatusLabel(activity.activityType);
  }
}

function buildDashboardActionLabelFromActivity(
  activity: TaskActivity,
  context?: DashboardActionLabelContext,
): string {
  const fallbackLabel = buildDashboardFallbackActionLabelFromActivity(activity, context);
  const narrative = getActivityNarrative(activity);
  const photoCount = collectSummaryPhotoUrls(activity).length;
  const meaningfulProgressChange = hasMeaningfulActivityProgressChange(activity, context);

  if (activity.activityType === "progress_update" && photoCount > 0 && !meaningfulProgressChange) {
    return fallbackLabel;
  }

  if (
    activity.activityType === "progress_update" &&
    narrative &&
    narrative.toLowerCase() !== fallbackLabel.toLowerCase()
  ) {
    return narrative;
  }

  return fallbackLabel;
}

function buildDashboardFallbackActionLabelFromUpdate(
  update: TaskUpdate,
  context?: DashboardActionLabelContext,
): string {
  if (update.status === "submitted_for_review" || update.status === "reviewing") {
    return "Submitted task for review";
  }

  if (update.status === "approved" || update.status === "completed" || update.status === "done") {
    return "Approved task completion";
  }

  if (update.status === "rejected") {
    return "Rejected task completion";
  }

  const photoCount = collectSummaryPhotoUrls(update).length;
  const meaningfulProgressChange = hasMeaningfulUpdateProgressChange(update, context);

  if (photoCount > 0 && !meaningfulProgressChange) {
    return buildPhotoUpdateHeadline(photoCount);
  }

  if (meaningfulProgressChange && update.completionPercentage !== undefined) {
    return `Updated progress to ${update.completionPercentage}%`;
  }

  return "Updated progress";
}

function buildDashboardActionLabelFromUpdate(
  update: TaskUpdate,
  context?: DashboardActionLabelContext,
): string {
  const fallbackLabel = buildDashboardFallbackActionLabelFromUpdate(update, context);
  const narrative = getUpdateNarrative(update);

  if (
    (update.status === "submitted_for_review" || update.status === "reviewing") &&
    fallbackLabel === "Submitted task for review"
  ) {
    return fallbackLabel;
  }

  if (
    (update.status === "approved" || update.status === "completed" || update.status === "done") &&
    fallbackLabel === "Approved task completion"
  ) {
    return fallbackLabel;
  }

  if (update.status === "rejected" && fallbackLabel === "Rejected task completion") {
    return fallbackLabel;
  }

  if (narrative && narrative.toLowerCase() !== fallbackLabel.toLowerCase()) {
    return narrative;
  }

  return fallbackLabel;
}

function buildActionLabelContextMap<
  T extends {
    id: string;
    timestamp?: string;
    completionPercentage?: number;
  },
>(items: T[]): Map<string, DashboardActionLabelContext> {
  const contextById = new Map<string, DashboardActionLabelContext>();
  let previousCompletionPercentage: number | undefined;

  [...items]
    .sort((left, right) => new Date(left.timestamp ?? 0).getTime() - new Date(right.timestamp ?? 0).getTime())
    .forEach((item) => {
      contextById.set(item.id, {
        previousCompletionPercentage,
      });

      if (item.completionPercentage !== undefined) {
        previousCompletionPercentage = item.completionPercentage;
      }
    });

  return contextById;
}

function buildDashboardFallbackActionLabel(task: Task): string {
  if (task.status === "submitted_for_review" || task.status === "reviewing") {
    return "Submitted task for review";
  }

  if (task.status === "approved" || task.status === "completed" || task.status === "done") {
    return "Approved task completion";
  }

  if (task.status === "rejected") {
    return "Rejected task completion";
  }

  if (
    (task.status === "in_progress" || task.status === "accepted" || task.status === "wip") &&
    task.completionPercentage > 0
  ) {
    return `Updated progress to ${task.completionPercentage}%`;
  }

  return "Created task";
}

function resolveDashboardActivityActorLabel(
  activityLike: Pick<TaskActivity | TaskUpdate, "userId">,
  getUserById: (userId: string) => { name?: string } | undefined,
): string | undefined {
  return getUserById(activityLike.userId)?.name;
}

function resolveDashboardActivityPreviewPhoto(
  activityLike: TaskActivity | TaskUpdate,
  task: Task,
): string | undefined {
  return collectSummaryPhotoUrls(activityLike)[0] || task.attachments?.[0];
}

function formatElapsedDayLabel(startDate?: string): string {
  if (!startDate) {
    return "Day 1";
  }

  const parsedStartDate = new Date(startDate);
  if (Number.isNaN(parsedStartDate.getTime())) {
    return "Day 1";
  }

  const dayDifference = Math.floor(
    (Date.now() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return `Day ${Math.max(1, dayDifference + 1)}`;
}

function getQueueBucket(taskStatus: string): "new" | "wip" | "review" | null {
  if (isPreAcceptanceTaskStatus(taskStatus)) {
    return "new";
  }

  if (
    taskStatus === "in_progress" ||
    taskStatus === "accepted" ||
    taskStatus === "wip" ||
    taskStatus === "rejected"
  ) {
    return "wip";
  }

  if (
    taskStatus === "submitted_for_review" ||
    taskStatus === "reviewing" ||
    taskStatus === "declined"
  ) {
    return "review";
  }

  return null;
}

function buildCriticalDateSubtitle(task: {
  status: string;
  priority?: string;
  tags?: string[];
}): string {
  const statusLabel = formatStatusLabel(task.status);
  const priorityLabel = task.priority
    ? task.priority.replace(/\b\w/g, (character) => character.toUpperCase())
    : null;
  const isTaggedCritical = Array.isArray(task.tags) && task.tags.includes("critical_this_week");

  return [statusLabel, priorityLabel, isTaggedCritical ? "Critical this week" : null]
    .filter(Boolean)
    .join(" · ");
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
  const { getUserById } = useUserStore();
  const currentUserId = user?.id ?? "";

  const projects = user ? projectStore.getProjectsByUser(user.id) : [];
  const tasks = taskStore.tasks ?? [];
  const isLoadingProjects = Boolean(projectStore.isLoading);

  const {
    activeProject,
    projectSummaryItems,
    scalarMetrics,
    continuity,
    summaryPills,
    draftItems,
    activityItems,
    taskShortcut,
    projectSummaryCard,
    queueDashboard,
  } = useMemo(() => {
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
        const activities = Array.isArray(task.activities) ? task.activities : [];
        const updates = Array.isArray(task.updates) ? task.updates : [];

        if (activities.length > 0) {
          const actionLabelContextById = buildActionLabelContextMap(activities);

          return activities.map((activity) => ({
            id: activity.id,
            taskId: task.id,
            title: task.title,
            actorLabel: resolveDashboardActivityActorLabel(activity, getUserById),
            actionLabel: buildDashboardActionLabelFromActivity(
              activity,
              actionLabelContextById.get(activity.id),
            ),
            previewPhotoUri: resolveDashboardActivityPreviewPhoto(activity, task),
            sortTimestamp: activity.timestamp,
          }));
        }

        if (updates.length > 0) {
          const actionLabelContextById = buildActionLabelContextMap(updates);

          return updates.map((update) => ({
            id: update.id,
            taskId: task.id,
            title: task.title,
            actorLabel: resolveDashboardActivityActorLabel(update, getUserById),
            actionLabel: buildDashboardActionLabelFromUpdate(
              update,
              actionLabelContextById.get(update.id),
            ),
            previewPhotoUri: resolveDashboardActivityPreviewPhoto(update, task),
            sortTimestamp: update.timestamp,
          }));
        }

        return [
          {
            id: `activity-task:${task.id}`,
            taskId: task.id,
            title: task.title,
            actorLabel: task.assignedBy ? getUserById(task.assignedBy)?.name : undefined,
            actionLabel: buildDashboardFallbackActionLabel(task),
            previewPhotoUri: task.attachments?.[0],
            sortTimestamp: task.createdAt,
          },
        ];
      })
      .filter((item) => isWithinLastSevenDays(item.sortTimestamp))
      .sort(
        (left, right) =>
          new Date((right as { sortTimestamp: string }).sortTimestamp).getTime() -
          new Date((left as { sortTimestamp: string }).sortTimestamp).getTime(),
      )
      .map(({ sortTimestamp, ...item }) => {
        const timestampLabel = formatRelativeTimestamp(sortTimestamp);
        const actionLabel = item.actionLabel;

        return {
          ...item,
          subtitle: `${timestampLabel} · ${actionLabel}`,
          timestampLabel,
          density: "standard" as const,
          structuralState,
        };
      });

    const mappedDraftItems: DashboardActivityItem[] = [];

    const queueCounts = {
      my_queue: {
        new: 0,
        wip: 0,
        review: 0,
        overdue: 0,
      },
      team_queue: {
        new: 0,
        wip: 0,
        review: 0,
        overdue: 0,
      },
    };

    activeProjectTasks.forEach((task) => {
      if (isTerminalTaskStatus(task.status)) {
        return;
      }

      const isAssignedToMe = (task.assignedTo ?? []).includes(currentUserId);
      const isAssignedByMe = task.assignedBy === currentUserId;
      const overdue = isTaskOverdue(task);
      const bucket = overdue ? "overdue" : getQueueBucket(task.status);

      if (!bucket) {
        return;
      }

      if (isAssignedToMe) {
        queueCounts.my_queue[bucket] += 1;
      }

      if (isAssignedByMe && !isAssignedToMe) {
        queueCounts.team_queue[bucket] += 1;
      }
    });

    const criticalDates = [...activeProjectOpenTasks]
      .filter((task) => {
        const hasCriticalTag = Array.isArray(task.tags) && task.tags.includes("critical_this_week");
        return hasCriticalTag;
      })
      .map((task) => {
        const parsedDueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isValidDueDate = Boolean(parsedDueDate && !Number.isNaN(parsedDueDate.getTime()));
        const dueTimestamp = isValidDueDate ? parsedDueDate!.getTime() : Number.MAX_SAFE_INTEGER;
        const isOverdue = isValidDueDate ? parsedDueDate!.getTime() < Date.now() : false;

        return {
          task,
          dateLabel: isValidDueDate ? formatCalendarLabel(parsedDueDate!) : "This week",
          sortTimestamp: isOverdue ? 0 : dueTimestamp,
        };
      })
      .sort((left, right) => {
        return left.sortTimestamp - right.sortTimestamp;
      })
      .slice(0, 3)
      .map(({ task, dateLabel }) => ({
        id: `critical-date:${task.id}`,
        dateLabel,
        title: task.title,
        subtitle: buildCriticalDateSubtitle(task),
      }));

    const today = new Date();
    const resolvedProjectSummaryCard = resolvedActiveProject
      ? {
          title: resolvedActiveProject.name,
          todayLabel: `Today · ${formatCalendarLabel(today)}`,
          elapsedDayLabel: formatElapsedDayLabel(resolvedActiveProject.startDate),
          weatherIconLabel: "☁️",
          weatherTemperatureLabel: "28°C",
          criticalDates,
        }
      : null;

    const resolvedQueueDashboard = {
      groups: [
        {
          id: "dashboard-queue:my_queue",
          title: "My Queue" as const,
          cells: [
            {
              id: "dashboard-queue:my_queue:new",
              queue: "my_queue" as const,
              bucket: "new" as const,
              title: "New",
              countLabel: String(queueCounts.my_queue.new),
            },
            {
              id: "dashboard-queue:my_queue:wip",
              queue: "my_queue" as const,
              bucket: "wip" as const,
              title: "Doing",
              countLabel: String(queueCounts.my_queue.wip),
            },
            {
              id: "dashboard-queue:my_queue:review",
              queue: "my_queue" as const,
              bucket: "review" as const,
              title: "Review",
              countLabel: String(queueCounts.my_queue.review),
            },
            {
              id: "dashboard-queue:my_queue:overdue",
              queue: "my_queue" as const,
              bucket: "overdue" as const,
              title: "Overdue",
              countLabel: String(queueCounts.my_queue.overdue),
            },
          ],
        },
        {
          id: "dashboard-queue:team_queue",
          title: "Team Queue" as const,
          cells: [
            {
              id: "dashboard-queue:team_queue:new",
              queue: "team_queue" as const,
              bucket: "new" as const,
              title: "New",
              countLabel: String(queueCounts.team_queue.new),
            },
            {
              id: "dashboard-queue:team_queue:wip",
              queue: "team_queue" as const,
              bucket: "wip" as const,
              title: "Doing",
              countLabel: String(queueCounts.team_queue.wip),
            },
            {
              id: "dashboard-queue:team_queue:review",
              queue: "team_queue" as const,
              bucket: "review" as const,
              title: "Review",
              countLabel: String(queueCounts.team_queue.review),
            },
            {
              id: "dashboard-queue:team_queue:overdue",
              queue: "team_queue" as const,
              bucket: "overdue" as const,
              title: "Overdue",
              countLabel: String(queueCounts.team_queue.overdue),
            },
          ],
        },
      ],
    };

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
      projectSummaryCard: resolvedProjectSummaryCard,
      queueDashboard: resolvedQueueDashboard,
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
  }, [currentUserId, getUserById, isLoadingProjects, projects, selectedProjectId, tasks]);

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
    projectSummaryCard,
    queueDashboard,
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
