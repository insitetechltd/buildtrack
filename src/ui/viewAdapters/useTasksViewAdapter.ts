import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { isAdmin, type Priority, type Task, type TaskStatus } from "@/types/buildtrack";
import { getResponsibilityToken, isTaskOverdue } from "@/utils/accountabilityEngine";
import type {
  TasksQueueBucket,
  TasksQueueBucketId,
  TasksQueueId,
  TasksQueuePanel,
  TasksScreenRowItem,
  TasksScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { StatusSemanticToken } from "@/ui/contracts/primitives";
import type { TasksSearchInputData } from "@/ui/mappers/tasksMappers";

function formatTaskStatusLabel(status: TaskStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapTaskStatusToToken(status: TaskStatus): StatusSemanticToken {
  switch (status) {
    case "new":
    case "assigned":
    case "received":
    case "not_started":
      return "task_new";
    case "accepted":
      return "task_accepted";
    case "in_progress":
    case "wip":
      return "task_in_progress";
    case "submitted_for_review":
    case "reviewing":
      return "task_submitted_for_review";
    case "approved":
    case "completed":
    case "done":
      return "task_approved";
    case "declined":
    case "rejected":
      return "task_rejected";
    case "cancelled":
      return "task_cancelled";
    default:
      return "custom";
  }
}

function formatPriority(priority: Priority): string {
  return priority.replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildAssigneeSummary(task: Task): string {
  const assignees = task.assignedTo ?? [];
  if (assignees.length === 0) {
    return "Unassigned";
  }

  if (assignees.length === 1) {
    return "1 assignee";
  }

  return `${assignees.length} assignees`;
}

function collectTaskPhotoUris(task: Task): string[] {
  const activityPhotos =
    task.activities?.flatMap((activity) => {
      const photos = (activity.data as { photos?: string[] } | undefined)?.photos;
      return Array.isArray(photos) ? photos : [];
    }) ?? [];
  const updatePhotos = task.updates?.flatMap((update) => update.photos ?? []) ?? [];

  return [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos].filter(
    (value, index, collection): value is string => Boolean(value) && collection.indexOf(value) === index,
  );
}

function buildContextLine(task: Task): string | undefined {
  const locationParts = [task.location?.address, task.containerId, task.subContainerId].filter(Boolean);
  const locationLine = locationParts.join(", ");

  if (locationLine) {
    return locationLine;
  }

  const description = task.description?.trim();

  if (description) {
    return description;
  }

  return undefined;
}

function matchesNewStatusFilter(status: TaskStatus): boolean {
  return status === "new" || status === "not_started" || status === "assigned" || status === "received";
}

function matchesWipStatusFilter(status: TaskStatus): boolean {
  return status === "accepted" || status === "in_progress" || status === "wip" || status === "rejected";
}

function matchesReviewingStatusFilter(status: TaskStatus): boolean {
  return status === "submitted_for_review" || status === "reviewing" || status === "declined";
}

function matchesOutboxReviewingStatusFilter(status: TaskStatus): boolean {
  return status === "submitted_for_review" || status === "reviewing";
}

function isOverdueFilter(statusFilter: string): boolean {
  return (
    statusFilter === "received-overdue" ||
    statusFilter === "assigned-overdue" ||
    statusFilter === "wip-overdue" ||
    statusFilter === "reviewing-overdue"
  );
}

function matchesStatusFilter(status: TaskStatus, statusFilter: string): boolean {
  switch (statusFilter) {
    case "new":
    case "received":
    case "assigned":
    case "received-overdue":
    case "assigned-overdue":
      return matchesNewStatusFilter(status);
    case "wip":
    case "wip-overdue":
      return matchesWipStatusFilter(status);
    case "reviewing":
    case "reviewing-overdue":
      return matchesReviewingStatusFilter(status);
    default:
      return true;
  }
}

function getQueueTitle(queue: TasksQueueId): "My Queue" | "Team Queue" {
  return queue === "my_queue" ? "My Queue" : "Team Queue";
}

function getBucketTitle(bucket: TasksQueueBucketId): string {
  switch (bucket) {
    case "new":
      return "New";
    case "wip":
      return "Doing";
    case "review":
      return "Review";
    case "overdue":
      return "Overdue";
  }

  return "New";
}

function getLatestMeaningfulTimestamp(task: Task): string {
  const activityTimestamps =
    task.activities?.flatMap((activity) => [activity.timestamp, activity.createdAt].filter(Boolean)) ?? [];
  const updateTimestamps = task.updates?.map((update) => update.timestamp).filter(Boolean) ?? [];

  const timestamps = [
    task.updatedAt,
    task.lastEditedAt,
    task.reviewedAt,
    task.acceptedAt,
    task.createdAt,
    ...activityTimestamps,
    ...updateTimestamps,
  ].filter((value): value is string => Boolean(value));

  return timestamps.sort((left, right) => right.localeCompare(left))[0] ?? "";
}

function formatLatestUpdateLabel(task: Task): string | undefined {
  const timestamp = getLatestMeaningfulTimestamp(task);

  if (!timestamp) {
    return undefined;
  }

  return timestamp.slice(0, 10);
}

function compareTasksByLatestMeaningfulUpdate(left: Task, right: Task): number {
  const rightTimestamp = getLatestMeaningfulTimestamp(right);
  const leftTimestamp = getLatestMeaningfulTimestamp(left);

  return rightTimestamp.localeCompare(leftTimestamp);
}

function resolveQueueForTask(task: Task, currentUserId: string): TasksQueueId | null {
  const isAssignedToUser = (task.assignedTo ?? []).includes(currentUserId);
  const isAssignedByUser = task.assignedBy === currentUserId;

  if (isAssignedToUser) {
    return "my_queue";
  }

  if (isAssignedByUser) {
    return "team_queue";
  }

  return null;
}

function resolveBucketForTask(task: Task): TasksQueueBucketId | null {
  if (matchesNewStatusFilter(task.status)) {
    return "new";
  }

  if (matchesWipStatusFilter(task.status)) {
    return "wip";
  }

  if (matchesReviewingStatusFilter(task.status)) {
    return "review";
  }

  return null;
}

function matchesSearchQuery(task: Task, projectName: string, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  const haystack = [
    task.title,
    task.description,
    task.taskReference,
    task.containerId,
    task.subContainerId,
    projectName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function deriveInitialQueueFromLegacyFilters(
  sectionFilter: string,
  statusFilter: string,
): { queue: TasksQueueId; bucket: TasksQueueBucketId } {
  const isReviewQueueFilter = statusFilter === "reviewing" || statusFilter === "reviewing-overdue";
  const bucket: TasksQueueBucketId =
    statusFilter === "wip" || statusFilter === "wip-overdue"
      ? "wip"
      : isReviewQueueFilter
        ? "review"
        : "new";

  if (sectionFilter === "outbox") {
    return { queue: "team_queue", bucket };
  }

  if (sectionFilter === "inbox" && isReviewQueueFilter) {
    return { queue: "team_queue", bucket: "review" };
  }

  return { queue: "my_queue", bucket };
}

function sortTaskTree(nodes: Task[]): Task[] {
  return [...nodes]
    .sort(compareTasksByLatestMeaningfulUpdate)
    .map((node) => ({
      ...node,
      children: Array.isArray(node.children) ? sortTaskTree(node.children) : [],
    }));
}

export interface TasksViewAdapterProps {
  onNavigateToTaskDetail?: (taskId: string) => void;
}

export interface TasksViewAdapterHookResult {
  output: TasksScreenViewAdapterOutput;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInput: TasksSearchInputData;
  visibility: {
    showCreateTaskFab: boolean;
    showProfileShortcut: boolean;
    showProjectPickerShortcut: boolean;
    showDeveloperSettingsShortcut: boolean;
    showResetFiltersShortcut: boolean;
  };
  actions: {
    resetFilters: () => void;
    toggleQueue: (queue: TasksQueueId) => void;
    openBucket: (queue: TasksQueueId, bucket: TasksQueueBucketId) => void;
    toggleTaskExpansion: (taskId: string) => void;
  };
}

export function useTasksViewAdapter(props?: TasksViewAdapterProps): TasksViewAdapterHookResult {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const projectFilterStore = useProjectFilterStore();
  const currentUserId = user?.id ?? "";
  const initialLaunchState = useMemo(() => {
    if (projectFilterStore.tasksLaunchPreset) {
      return {
        queue: projectFilterStore.tasksLaunchPreset.queue,
        bucket: projectFilterStore.tasksLaunchPreset.bucket,
      };
    }

    return deriveInitialQueueFromLegacyFilters(
      projectFilterStore.sectionFilter,
      projectFilterStore.statusFilter,
    );
  }, [
    projectFilterStore.sectionFilter,
    projectFilterStore.statusFilter,
    projectFilterStore.tasksLaunchPreset,
  ]);

  const tasks = taskStore.tasks ?? [];
  const isLoadingTasks = Boolean(taskStore.isLoading);
  const selectedProjectId = projectFilterStore.selectedProjectId ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQueues, setExpandedQueues] = useState<Record<TasksQueueId, boolean>>({
    my_queue: initialLaunchState.queue === "my_queue",
    team_queue: initialLaunchState.queue === "team_queue",
  });
  const [openBucketsByQueue, setOpenBucketsByQueue] = useState<Record<TasksQueueId, TasksQueueBucketId | null>>({
    my_queue: initialLaunchState.queue === "my_queue" ? initialLaunchState.bucket : "new",
    team_queue: initialLaunchState.queue === "team_queue" ? initialLaunchState.bucket : null,
  });
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const tasksLaunchPreset = projectFilterStore.tasksLaunchPreset;
  const clearTasksLaunchPreset = projectFilterStore.clearTasksLaunchPreset;

  useEffect(() => {
    if (!tasksLaunchPreset) {
      return;
    }

    setExpandedQueues({
      my_queue: tasksLaunchPreset.queue === "my_queue",
      team_queue: tasksLaunchPreset.queue === "team_queue",
    });
    setOpenBucketsByQueue({
      my_queue: tasksLaunchPreset.queue === "my_queue"
        ? tasksLaunchPreset.bucket
        : "new",
      team_queue: tasksLaunchPreset.queue === "team_queue"
        ? tasksLaunchPreset.bucket
        : null,
    });
    clearTasksLaunchPreset?.();
  }, [clearTasksLaunchPreset, tasksLaunchPreset]);

  const { queuePanels, searchResults, taskRowItems, scalarMetrics, continuity, structuralState } = useMemo(() => {
    const hasTasks = tasks.length > 0;
    const isInitialLoading = isLoadingTasks && !hasTasks;
    const isBackgroundRefreshing = isLoadingTasks && hasTasks;
    const structuralState: TasksSearchInputData["structuralState"] = isInitialLoading
      ? "loading"
      : hasTasks
        ? isBackgroundRefreshing
          ? "stale"
          : "stale"
        : "empty";

    const candidateTasks = tasks.filter((task) => {
      if (selectedProjectId && task.projectId !== selectedProjectId) {
        return false;
      }

      const queue = resolveQueueForTask(task, currentUserId);
      const bucket = resolveBucketForTask(task);

      return Boolean(queue && bucket);
    });

    const tasksByQueueAndBucket = new Map<string, Task[]>();
    candidateTasks.forEach((task) => {
      const queue = resolveQueueForTask(task, currentUserId);
      const bucket = resolveBucketForTask(task);

      if (!queue || !bucket) {
        return;
      }

      const key = `${queue}:${bucket}`;
      const currentTasks = tasksByQueueAndBucket.get(key) ?? [];
      currentTasks.push(task);
      tasksByQueueAndBucket.set(key, currentTasks);
    });

    const buildRowsForBucket = (queue: TasksQueueId, bucket: TasksQueueBucketId): TasksScreenRowItem[] => {
      const queueTasks = tasksByQueueAndBucket.get(`${queue}:${bucket}`) ?? [];
      const sortedTree = sortTaskTree(taskStore.buildTaskTree(queueTasks));
      const flatTasks: Array<{ task: Task; level: number }> = [];

      const flattenNode = (node: Task, level = 0) => {
        flatTasks.push({ task: node, level });
        node.children?.forEach((child) => flattenNode(child, level + 1));
      };

      sortedTree.forEach((node) => flattenNode(node));

      return flatTasks.map<TasksScreenRowItem>(({ task, level }) => {
        const project = projectStore.getProjectById(task.projectId);
        const projectName = project?.name ?? "Project";
        const latestUpdateLabel = formatLatestUpdateLabel(task);
        const photoUris = collectTaskPhotoUris(task);

        return {
          id: `tasks-row:${queue}:${bucket}:${task.id}`,
          taskId: task.id,
          title: task.title,
          onPress: props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(task.id) : undefined,
          cardPresentation: "thumbnail",
          statusToken: mapTaskStatusToToken(task.status),
          statusLabel: formatTaskStatusLabel(task.status),
          responsibilityToken: getResponsibilityToken(task, currentUserId),
          priorityLabel: formatPriority(task.priority),
          dueDateLabel: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
          assigneeSummary: buildAssigneeSummary(task),
          projectName,
          isOverdue: isTaskOverdue(task),
          primaryPhotoUri: photoUris[0],
          attachmentUris: photoUris.slice(1),
          indentationLevel: level > 0 ? level : undefined,
          queue,
          queueLabel: getQueueTitle(queue),
          bucket,
          bucketLabel: getBucketTitle(bucket),
          contextLabel: projectName,
          contextLine: buildContextLine(task),
          latestUpdateAt: getLatestMeaningfulTimestamp(task),
          latestUpdateLabel,
          isExpanded: expandedTaskIds.includes(task.id),
          density: "compact",
          structuralState,
        };
      });
    };

    const buildBucket = (queue: TasksQueueId, bucket: TasksQueueBucketId): TasksQueueBucket => {
      const rows = buildRowsForBucket(queue, bucket);

      return {
        id: `${queue}:${bucket}`,
        title: getBucketTitle(bucket),
        taskCountLabel: String(rows.length),
        bucket,
        isOpen: openBucketsByQueue[queue] === bucket,
        rows,
      };
    };

    const queuePanels: TasksQueuePanel[] = ([
      { queue: "my_queue", presentation: "primary" as const },
      { queue: "team_queue", presentation: "preview" as const },
    ] as const).map(({ queue, presentation }) => {
      const buckets = (["new", "wip", "review"] as TasksQueueBucketId[]).map((bucket) =>
        buildBucket(queue, bucket),
      );
      const totalCount = buckets.reduce((sum, bucket) => sum + bucket.rows.length, 0);

      return {
        id: `tasks-queue:${queue}`,
        queue,
        title: getQueueTitle(queue),
        totalCountLabel: `${totalCount} ${totalCount === 1 ? "task" : "tasks"}`,
        presentation,
        isExpanded: expandedQueues[queue],
        buckets,
      };
    });

    const searchResults = candidateTasks
      .filter((task) => {
        const projectName = projectStore.getProjectById(task.projectId)?.name ?? "Project";
        return matchesSearchQuery(task, projectName, normalizedSearchQuery);
      })
      .sort(compareTasksByLatestMeaningfulUpdate)
      .map<TasksScreenRowItem>((task) => {
        const queue = resolveQueueForTask(task, currentUserId) ?? "my_queue";
        const bucket = resolveBucketForTask(task) ?? "new";
        const project = projectStore.getProjectById(task.projectId);
        const projectName = project?.name ?? "Project";
        const latestUpdateLabel = formatLatestUpdateLabel(task);
        const photoUris = collectTaskPhotoUris(task);
        const searchProvenanceLine = `${getQueueTitle(queue)} · ${getBucketTitle(bucket)} · ${projectName}`;

        return {
          id: `tasks-search:${task.id}`,
          taskId: task.id,
          title: task.title,
          onPress: props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(task.id) : undefined,
          cardPresentation: "thumbnail",
          statusToken: mapTaskStatusToToken(task.status),
          statusLabel: formatTaskStatusLabel(task.status),
          responsibilityToken: getResponsibilityToken(task, currentUserId),
          priorityLabel: formatPriority(task.priority),
          dueDateLabel: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
          assigneeSummary: buildAssigneeSummary(task),
          projectName,
          isOverdue: isTaskOverdue(task),
          primaryPhotoUri: photoUris[0],
          attachmentUris: photoUris.slice(1),
          queue,
          queueLabel: getQueueTitle(queue),
          bucket,
          bucketLabel: getBucketTitle(bucket),
          contextLabel: searchProvenanceLine,
          contextLine: searchProvenanceLine,
          latestUpdateAt: getLatestMeaningfulTimestamp(task),
          latestUpdateLabel,
          isExpanded: expandedTaskIds.includes(task.id),
          density: "compact",
          structuralState,
        };
      });

    const activeQueueRows = queuePanels.flatMap((panel) => {
      if (!panel.isExpanded) {
        return [];
      }

      return panel.buckets.find((bucket) => bucket.isOpen)?.rows ?? [];
    });

    const taskRowItems = normalizedSearchQuery.length > 0 ? searchResults : activeQueueRows;
    const overdueVisibleTaskCount = taskRowItems.filter((row) => row.isOverdue).length;

    return {
      queuePanels,
      searchResults,
      taskRowItems,
      scalarMetrics: {
        totalVisibleTaskCount: taskRowItems.length,
        overdueVisibleTaskCount,
        selectedProjectTaskCount: candidateTasks.length,
        hasActiveFilters: Boolean(selectedProjectId),
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing,
        hasCachedFrame: candidateTasks.length > 0,
        shouldRenderSkeletonShell: isInitialLoading,
        shouldRenderEmptyState: !isInitialLoading && taskRowItems.length === 0,
        freshnessLabel: isBackgroundRefreshing ? "Refreshing" : isInitialLoading ? "Loading" : "Ready",
      },
      structuralState,
    };
  }, [
    currentUserId,
    expandedQueues,
    expandedTaskIds,
    isLoadingTasks,
    openBucketsByQueue,
    normalizedSearchQuery,
    projectStore,
    props,
    selectedProjectId,
    tasks,
    taskStore,
  ]);

  const readiness = useMemo(() => {
    return {
      hasInitialFrame: true,
      hasUsableData: taskRowItems.length > 0,
      isBackgroundRefreshing: continuity.isBackgroundRefreshing,
      isNavigationTransitionActive: false,
    };
  }, [continuity.isBackgroundRefreshing, taskRowItems.length]);

  const output: TasksScreenViewAdapterOutput = {
    screenId: "TasksScreen",
    readiness,
    continuity,
    filterSummary: {
      selectedProjectId,
      sectionFilterLabel: normalizedSearchQuery.length > 0 ? "All Task Results" : "Ownership Queues",
      statusFilterLabel: selectedProjectId ? "Project scoped" : "All projects",
      sortLabel: "Latest update",
    },
    isSearchMode: normalizedSearchQuery.length > 0,
    queuePanels,
    searchResults,
    expandedTaskIds,
    taskRowItems,
    scalarMetrics,
  };

  const searchInput: TasksSearchInputData = {
    id: "tasks-search",
    label: "Search",
    value: searchQuery,
    placeholder: "Search tasks",
    density: "standard",
    structuralState,
  };

  const resetFilters = () => {
    setSearchQuery("");
    setExpandedQueues({
      my_queue: true,
      team_queue: false,
    });
    setOpenBucketsByQueue({
      my_queue: "new",
      team_queue: null,
    });
    setExpandedTaskIds([]);
    projectFilterStore.resetFilters();
  };

  const toggleQueue = (queue: TasksQueueId) => {
    setExpandedQueues((current) => ({
      ...current,
      [queue]: !current[queue],
    }));
  };

  const openBucket = (queue: TasksQueueId, bucket: TasksQueueBucketId) => {
    setExpandedQueues((current) => ({
      ...current,
      [queue]: true,
    }));
    setOpenBucketsByQueue((current) => ({
      ...current,
      [queue]: bucket,
    }));
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  return {
    output,
    searchQuery,
    setSearchQuery,
    searchInput,
    visibility: {
      showCreateTaskFab: Boolean(user && !isAdmin(user)),
      showProfileShortcut: Boolean(user),
      showProjectPickerShortcut: Boolean(user),
      showDeveloperSettingsShortcut: __DEV__,
      showResetFiltersShortcut: Boolean(user),
    },
    actions: {
      resetFilters,
      toggleQueue,
      openBucket,
      toggleTaskExpansion,
    },
  };
}
