import { useEffect, useMemo, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useAuthStore } from "@/state/authStore";
import { isPlatformSuperuser } from "@/config/platformSuperusers";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { useUnattachedPhotoBatchStore } from "@/state/unattachedPhotoBatchStore";
import { useUserStore } from "@/state/userStore.supabase";
import { type Project, type Task } from "@/types/buildtrack";
import { resolveWorkspaceProjectId } from "@/ui/contracts/workspaceProject";
import {
  buildActivityFeedRows,
  resolveActivityFeedSeenAtMs,
} from "@/ui/contracts/activityFeed";
import { useActivityFeedReadStore } from "@/state/activityFeedReadStore";
import { getResponsibilityToken, isTaskOverdue } from "@/utils/accountabilityEngine";
import {
  extractBuildtrackStoragePath,
  getFileUrl,
  prefetchSignedUrls,
  subscribeSignedUrlCache,
} from "@/api/fileUploadService";
import {
  filterTasksForViewer,
  isProjectScopeReady,
  resolveTaskSelectRoleBand,
} from "@/ui/contracts/taskVisibilityPermissions";
import type {
  DashboardActivityItem,
  DashboardProjectSummaryItem,
  DashboardScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { PrimitiveStructuralState, StatusSemanticToken } from "@/ui/contracts/primitives";
import {
  deleteLocalTaskDraft,
  listLocalTaskDrafts,
  purgeExpiredLocalTaskDrafts,
  type LocalTaskDraft,
} from "@/utils/localTaskDraftStore";
import { reconcileUnrecoverableWipTasks } from "@/utils/reconcileUnrecoverableWipTasks";

function formatProjectStatusLabel(status: Project["status"] | string): string {
  const normalized = status === "on_hold" ? "active" : status;
  if (normalized === "active") {
    return "On-going";
  }
  return String(normalized)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapProjectStatusToToken(status: Project["status"] | string): StatusSemanticToken {
  switch (status === "on_hold" ? "active" : status) {
    case "planning":
      return "project_planning";
    case "active":
      return "project_active";
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

function formatWeekdayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

function startOfLocalWeek(date: Date): Date {
  const start = new Date(date);
  const currentDay = start.getDay();
  const daysFromMonday = (currentDay + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

function endOfLocalWeek(date: Date): Date {
  const end = startOfLocalWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
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

function resolveImageUri(uri?: string | null): string | undefined {
  if (!uri) {
    return undefined;
  }

  if (typeof uri === "object") {
    const attachment = uri as {
      uri?: string;
      annotatedUri?: string;
      public_url?: string;
      publicUrl?: string;
      storage_path?: string;
      storagePath?: string;
    };
    return (
      resolveImageUri(attachment.public_url) ??
      resolveImageUri(attachment.publicUrl) ??
      resolveImageUri(attachment.annotatedUri) ??
      resolveImageUri(attachment.uri) ??
      resolveImageUri(attachment.storage_path) ??
      resolveImageUri(attachment.storagePath)
    );
  }

  if (/^(file:|content:|data:|asset:)/i.test(uri)) {
    return uri;
  }

  const trimmedUri = uri.trim();
  if (
    (trimmedUri.startsWith("{") && trimmedUri.endsWith("}")) ||
    (trimmedUri.startsWith("[") && trimmedUri.endsWith("]"))
  ) {
    try {
      return resolveImageUri(JSON.parse(trimmedUri));
    } catch {
      // Fall through to storage-path resolution for non-JSON strings.
    }
  }

  if (/^https?:/i.test(uri)) {
    if (extractBuildtrackStoragePath(uri)) {
      return getFileUrl(uri) ?? undefined;
    }
    return uri;
  }

  return getFileUrl(uri) ?? undefined;
}

function collectTaskPhotoRefs(task: Task): string[] {
  const activityPhotos =
    task.activities?.flatMap((activity: NonNullable<Task["activities"]>[number]) => {
      const photos = (activity.data as { photos?: string[] } | undefined)?.photos;
      return Array.isArray(photos) ? photos : [];
    }) ?? [];
  const updatePhotos =
    task.updates?.flatMap((update: NonNullable<Task["updates"]>[number]) => update.photos ?? []) ??
    [];

  return [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function collectTaskPhotoUris(task: Task): string[] {
  const activityPhotos =
    task.activities?.flatMap((activity: NonNullable<Task["activities"]>[number]) => {
      const photos = (activity.data as { photos?: string[] } | undefined)?.photos;
      return Array.isArray(photos) ? photos : [];
    }) ?? [];
  const updatePhotos =
    task.updates?.flatMap((update: NonNullable<Task["updates"]>[number]) => update.photos ?? []) ??
    [];

  return [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos]
    .map(resolveImageUri)
    .filter(
    (value, index, collection): value is string => Boolean(value) && collection.indexOf(value) === index,
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
  actions: {
    deleteDraftTask: (localDraftId: string) => Promise<void>;
    refreshLocalDrafts: () => Promise<void>;
    markActivityFeedSeen: () => void;
  };
}

export function useDashboardViewAdapter(): DashboardViewAdapterHookResult {
  const { user } = useAuthStore();
  const selectedProjectId = useProjectFilterStore((state) => state.selectedProjectId);
  const setSelectedProject = useProjectFilterStore((state) => state.setSelectedProject);
  const projectStore = useProjectStoreWithInit();
  const taskStore = useTaskStore();
  const unattachedBatchStore = useUnattachedPhotoBatchStore();
  const getUserById = useUserStore((state) => state.getUserById);
  const markActivityFeedSeenForScope = useActivityFeedReadStore(
    (state) => state.markActivityFeedSeen,
  );
  const currentUserId = user?.id ?? "";
  const [signedUrlEpoch, bumpSignedUrlEpoch] = useState(0);
  const [localDrafts, setLocalDrafts] = useState<LocalTaskDraft[]>([]);

  const refreshLocalDrafts = useCallback(async () => {
    await purgeExpiredLocalTaskDrafts();
    setLocalDrafts(await listLocalTaskDrafts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshLocalDrafts();
    }, [refreshLocalDrafts]),
  );

  const projects = user ? projectStore.getProjectsByUser(user.id) : [];

  // Keep filter store aligned with Activity display (single-project auto-select).
  useEffect(() => {
    if (!currentUserId || selectedProjectId || projects.length !== 1) {
      return;
    }
    const onlyProjectId = projects[0]?.id;
    if (!onlyProjectId) {
      return;
    }
    void setSelectedProject(onlyProjectId, currentUserId);
  }, [currentUserId, projects, selectedProjectId, setSelectedProject]);

  const viewerProjectIds = user ? projectStore.projectIdsByUser?.[user.id] ?? [] : [];
  const projectsById = useMemo(() => {
    const byId: Record<string, { id: string; companyId?: string | null }> = {};
    for (const project of projectStore.projects ?? []) {
      byId[project.id] = { id: project.id, companyId: project.companyId };
    }
    return byId;
  }, [projectStore.projects]);
  const projectScopeReady = useMemo(
    () =>
      isProjectScopeReady({
        projectCount: projectStore.projects?.length ?? 0,
        hasFetchedProjectsOnce: Boolean(
          projectStore.projectQueryMeta?.["projects:all"]?.hasFetchedOnce,
        ),
      }),
    [projectStore.projectQueryMeta, projectStore.projects],
  );
  const awaitingProjectScope = useMemo(() => {
    if (!user) {
      return false;
    }
    const band = resolveTaskSelectRoleBand(user);
    return (band === "admin" || band === "manager") && !projectScopeReady;
  }, [projectScopeReady, user]);
  const tasks = useMemo(
    () =>
      filterTasksForViewer({
        viewer: user,
        tasks: taskStore.tasks ?? [],
        projectsById,
        viewerProjectIds,
      }),
    [projectsById, taskStore.tasks, user, viewerProjectIds],
  );
  const unattachedBatches = unattachedBatchStore.batches ?? [];
  const isLoadingProjects = Boolean(projectStore.isLoading) || awaitingProjectScope;

  useEffect(() => subscribeSignedUrlCache(() => bumpSignedUrlEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (!user) {
      return;
    }
    // Persist does not keep task payloads. Landing Activity must force-refetch.
    void taskStore.fetchTasks?.(true);
  }, [taskStore.fetchTasks, user]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    void reconcileUnrecoverableWipTasks({
      tasks: taskStore.tasks,
      userId: currentUserId,
      cancelTask: taskStore.cancelTask,
    });
  }, [currentUserId, taskStore.cancelTask, taskStore.tasks]);

  useEffect(() => {
    const prefetchProjectId = resolveWorkspaceProjectId(
      selectedProjectId,
      projects.map((project) => project.id),
    );
    const refs = (
      prefetchProjectId ? tasks.filter((task) => task.projectId === prefetchProjectId) : []
    ).flatMap((task) => collectTaskPhotoRefs(task));
    if (refs.length === 0) {
      return;
    }
    void prefetchSignedUrls(refs);
  }, [tasks, selectedProjectId, projects]);

  const {
    activeProject,
    projectSummaryItems,
    scalarMetrics,
    continuity,
    summaryPills,
    activityItems,
    taskShortcut,
    projectSummaryCard,
    queueDashboard,
  } = useMemo(() => {
    const hasProjects = projects.length > 0;
    const visibleProjectIds = new Set(projects.map((project) => project.id));
    const resolvedActiveProjectId = resolveWorkspaceProjectId(
      selectedProjectId,
      projects.map((project) => project.id),
    );
    const resolvedActiveProject = resolvedActiveProjectId
      ? projects.find((project) => project.id === resolvedActiveProjectId) ?? null
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
    const activityFeedRows = resolvedActiveProject
      ? buildActivityFeedRows({
          projectId: resolvedActiveProject.id,
          tasks: activeProjectTasks,
          photoBatches: unattachedBatchStore.getBatchesForProject(resolvedActiveProject.id),
        })
      : [];
    const taskById = new Map(activeProjectTasks.map((task) => [task.id, task]));
    const mappedActivityItems: DashboardActivityItem[] = activityFeedRows.map((row) => {
      let previewPhotoUri: string | undefined;
      let actorLabel: string | undefined;

      if (row.taskId.startsWith("project:")) {
        const batchId = row.id.replace(/^unattached-batch-/, "");
        const batch = resolvedActiveProject
          ? unattachedBatchStore
              .getBatchesForProject(resolvedActiveProject.id)
              .find((entry) => entry.id === batchId)
          : undefined;
        previewPhotoUri = batch?.photoUrls[0];
        actorLabel = batch?.userId
          ? getUserById(batch.userId)?.name
          : undefined;
      } else {
        const task = taskById.get(row.taskId);
        if (task) {
          const update = task.updates?.find((entry) => entry.id === row.id);
          // Recent Activity: only show a photo when THIS event uploaded one.
          // Do not fall back to create-time / other task attachments.
          previewPhotoUri = resolveImageUri(update?.photos?.[0]);
          const actorUserId = update?.userId ?? task.assignedBy;
          actorLabel = actorUserId ? getUserById(actorUserId)?.name : undefined;
        }
      }

      return {
        id: row.id,
        taskId: row.taskId,
        title: row.title,
        subtitle: row.subtitle,
        timestampLabel: row.timestampLabel,
        statusLabel: row.statusLabel,
        previewPhotoUri,
        actorLabel,
        density: "standard" as const,
        structuralState,
      };
    });

    const queueCounts = {
      my_queue: {
        new: 0,
        wip: 0,
        review: 0,
      },
      team_queue: {
        new: 0,
        wip: 0,
        review: 0,
      },
    };

    activeProjectTasks.forEach((task) => {
      if (isTerminalTaskStatus(task.status)) {
        return;
      }

      const bucket = getQueueBucket(task.status);
      if (!bucket) {
        return;
      }

      const isAssignedToMe = (task.assignedTo ?? []).includes(currentUserId);
      const isAssignedByMe = task.assignedBy === currentUserId;

      if (isAssignedToMe) {
        queueCounts.my_queue[bucket] += 1;
      }

      if (isAssignedByMe && !isAssignedToMe) {
        queueCounts.team_queue[bucket] += 1;
      }
    });

    const today = new Date();
    const weekStart = startOfLocalWeek(today);
    const weekEnd = endOfLocalWeek(today);

    const criticalDates = [...activeProjectOpenTasks]
      .filter((task) => {
        if (!task.dueDate) {
          return false;
        }

        const parsedDueDate = new Date(task.dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
          return false;
        }

        return parsedDueDate >= weekStart && parsedDueDate <= weekEnd;
      })
      .map((task) => {
        const parsedDueDate = new Date(task.dueDate!);
        return {
          task,
          dateLabel: formatCalendarLabel(parsedDueDate),
          sortTimestamp: parsedDueDate.getTime(),
        };
      })
      .sort((left, right) => left.sortTimestamp - right.sortTimestamp)
      .slice(0, 3)
      .map(({ task, dateLabel }) => ({
        id: `critical-date:${task.id}`,
        taskId: task.id,
        dateLabel,
        title: task.title,
        subtitle: buildCriticalDateSubtitle(task),
        imageUri: collectTaskPhotoUris(task)[0],
      }));
    const resolvedProjectSummaryCard = resolvedActiveProject
      ? {
          title: resolvedActiveProject.name,
          todayLabel: `${formatWeekdayLabel(today)} · ${formatCalendarLabel(today)}`,
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
  }, [
    currentUserId,
    isLoadingProjects,
    projects,
    selectedProjectId,
    signedUrlEpoch,
    tasks,
    unattachedBatches,
  ]);

  const readiness = useMemo(() => {
    return {
      hasInitialFrame: true,
      hasUsableData: projectSummaryItems.length > 0,
      isBackgroundRefreshing: continuity.isBackgroundRefreshing,
      isNavigationTransitionActive: false,
    };
  }, [continuity.isBackgroundRefreshing, projectSummaryItems.length]);

  const draftItems = useMemo((): DashboardActivityItem[] => {
    const structuralState: PrimitiveStructuralState = "ready";
    return localDrafts.map((draft) => ({
      id: `draft:${draft.id}`,
      localDraftId: draft.id,
      title: draft.titlePreview,
      subtitle: "Draft — not submitted",
      timestampLabel: new Date(draft.savedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      statusLabel: "Draft",
      density: "standard",
      structuralState,
    }));
  }, [localDrafts]);

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

  const markActivityFeedSeen = useCallback(() => {
    if (!currentUserId) {
      return;
    }

    const resolvedProjectId = resolveWorkspaceProjectId(
      selectedProjectId,
      projects.map((project) => project.id),
    );
    if (!resolvedProjectId) {
      return;
    }

    const feedRows = buildActivityFeedRows({
      projectId: resolvedProjectId,
      tasks: tasks.filter((task) => task.projectId === resolvedProjectId),
      photoBatches: unattachedBatchStore.getBatchesForProject(resolvedProjectId),
    });

    markActivityFeedSeenForScope(
      currentUserId,
      resolvedProjectId,
      resolveActivityFeedSeenAtMs(feedRows),
    );
  }, [
    currentUserId,
    markActivityFeedSeenForScope,
    projects,
    selectedProjectId,
    tasks,
    unattachedBatchStore,
  ]);

  return {
    output,
    visibility: {
      showCreateTaskFab: Boolean(user),
      showProfileShortcut: Boolean(user),
      showProjectPickerShortcut: Boolean(user),
      showDeveloperSettingsShortcut: isPlatformSuperuser(user),
    },
    actions: {
      refreshLocalDrafts,
      markActivityFeedSeen,
      deleteDraftTask: async (localDraftId: string) => {
        if (!currentUserId) {
          throw new Error("Sign in to delete a draft.");
        }
        await deleteLocalTaskDraft(localDraftId);
        await refreshLocalDrafts();
      },
    },
  };
}
