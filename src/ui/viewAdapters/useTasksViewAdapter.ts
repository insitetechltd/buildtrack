import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { isAdmin, type Priority, type Task, type TaskStatus } from "@/types/buildtrack";
import { getResponsibilityToken, isTaskOverdue } from "@/utils/accountabilityEngine";
import { getFileUrl } from "@/api/fileUploadService";
import type {
  TasksActiveFilterChipModel,
  TasksOverdueWindowValue,
  TasksQueueBucketId,
  TasksQueueFilterValue,
  TasksQueueId,
  TasksSortDirection,
  TasksSortField,
  TasksStatusFilterValue,
  TasksScreenRowItem,
  TasksScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { StatusSemanticToken } from "@/ui/contracts/primitives";
import type { TasksSearchInputData } from "@/ui/mappers/tasksMappers";

type AppliedTasksFilters = {
  queue: TasksQueueFilterValue;
  status: TasksStatusFilterValue;
  overdueWindow: TasksOverdueWindowValue;
};

type StagedFiltersUpdater =
  | AppliedTasksFilters
  | ((current: AppliedTasksFilters) => AppliedTasksFilters);

const DEFAULT_FILTERS: AppliedTasksFilters = {
  queue: "all_queues",
  status: "any_status",
  overdueWindow: "show_all",
};

const LEGACY_QUEUE_CYCLE: TasksQueueFilterValue[] = ["inbox", "outbox"];
const LEGACY_STATUS_CYCLE: TasksStatusFilterValue[] = ["new", "doing", "review"];

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

  return [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos]
    .map(resolveImageUri)
    .filter(
    (value, index, collection): value is string => Boolean(value) && collection.indexOf(value) === index,
  );
}

function resolveImageUri(uri?: string | null): string | undefined {
  if (!uri) {
    return undefined;
  }

  if (/^(https?:|file:|content:|data:|asset:)/i.test(uri)) {
    return uri;
  }

  return getFileUrl(uri) ?? undefined;
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

function formatTaskDateLabel(prefix: string, timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  return `${prefix}: ${timestamp.slice(0, 10)}`;
}

function buildSortAwareDateLabel(task: Task, field: TasksSortField): string | undefined {
  const modifiedAt = getLatestMeaningfulTimestamp(task) || undefined;
  const createdAt = task.createdAt || undefined;
  const dueDate = task.dueDate || undefined;

  if (field === "due_date") {
    return (
      formatTaskDateLabel("Due", dueDate) ??
      formatTaskDateLabel("Modified", modifiedAt) ??
      formatTaskDateLabel("Created on", createdAt)
    );
  }

  if (field === "modified_at") {
    return (
      formatTaskDateLabel("Modified", modifiedAt) ??
      formatTaskDateLabel("Created on", createdAt) ??
      formatTaskDateLabel("Due", dueDate)
    );
  }

  return (
    formatTaskDateLabel("Created on", createdAt) ??
    formatTaskDateLabel("Modified", modifiedAt) ??
    formatTaskDateLabel("Due", dueDate)
  );
}

function getPriorityRank(priority: Priority): number {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function getStatusFlowRank(status: TaskStatus): number {
  if (matchesNewStatusFilter(status)) return 0;
  if (matchesWipStatusFilter(status)) return 1;
  if (matchesReviewingStatusFilter(status)) return 2;
  return 3;
}

function compareTasksForSearchFirstList(left: Task, right: Task): number {
  const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  const recencyDelta = getLatestMeaningfulTimestamp(right).localeCompare(
    getLatestMeaningfulTimestamp(left),
  );
  if (recencyDelta !== 0) {
    return recencyDelta;
  }

  return getStatusFlowRank(left.status) - getStatusFlowRank(right.status);
}

function getNextCycleValue<TValue extends string>(cycle: TValue[], current: TValue): TValue {
  const currentIndex = cycle.indexOf(current);

  if (currentIndex === -1) {
    return cycle[0];
  }

  return cycle[(currentIndex + 1) % cycle.length];
}

function getComparableTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getSortTimestamp(task: Task, field: TasksSortField): number | null {
  if (field === "created_at") {
    return getComparableTimestamp(task.createdAt);
  }

  if (field === "due_date") {
    return getComparableTimestamp(task.dueDate);
  }

  return getComparableTimestamp(getLatestMeaningfulTimestamp(task));
}

function compareTasksBySortField(
  left: Task,
  right: Task,
  field: TasksSortField,
  direction: TasksSortDirection,
): number {
  const leftTimestamp = getSortTimestamp(left, field);
  const rightTimestamp = getSortTimestamp(right, field);

  if (leftTimestamp === null && rightTimestamp === null) {
    return compareTasksForSearchFirstList(left, right);
  }

  if (leftTimestamp === null) {
    return 1;
  }

  if (rightTimestamp === null) {
    return -1;
  }

  const delta = direction === "asc" ? leftTimestamp - rightTimestamp : rightTimestamp - leftTimestamp;
  if (delta !== 0) {
    return delta;
  }

  return compareTasksForSearchFirstList(left, right);
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

function getQueueFilterLabel(queue: TasksQueueFilterValue): string {
  switch (queue) {
    case "inbox":
      return "Inbox";
    case "outbox":
      return "Outbox";
    case "archived":
      return "Archived";
    case "all_queues":
    default:
      return "All queues";
  }
}

function getStatusFilterLabel(status: TasksStatusFilterValue): string {
  switch (status) {
    case "new":
      return "New";
    case "doing":
      return "Doing";
    case "review":
      return "Review";
    case "overdue":
      return "Overdue";
    case "any_status":
    default:
      return "Any status";
  }
}

function getOverdueWindowLabel(value: TasksOverdueWindowValue): string {
  switch (value) {
    case "three_active":
      return "3 active";
    case "one_week":
      return "1 week";
    case "one_month":
      return "1 month";
    case "show_all":
    default:
      return "Show all";
  }
}

function getFiltersFromLaunchPreset(
  bucket?: "new" | "wip" | "review" | "overdue",
  queue?: TasksQueueId,
): AppliedTasksFilters {
  if (!bucket || !queue) {
    return DEFAULT_FILTERS;
  }

  let status: TasksStatusFilterValue = "any_status";
  if (bucket === "wip") {
    status = "doing";
  } else if (bucket === "review") {
    status = "review";
  } else if (bucket === "overdue") {
    status = "overdue";
  } else if (bucket === "new") {
    status = "new";
  }

  return {
    queue: queue === "team_queue" ? "outbox" : "inbox",
    status,
    overdueWindow: "show_all",
  };
}

function isWithinOverdueWindow(task: Task, overdueWindow: TasksOverdueWindowValue): boolean {
  if (overdueWindow === "show_all") {
    return true;
  }

  if (!isTaskOverdue(task) || !task.dueDate) {
    return false;
  }

  const dueDate = new Date(task.dueDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(dueDate) || dueDate > now) {
    return false;
  }

  const daysOverdue = (now - dueDate) / (1000 * 60 * 60 * 24);
  switch (overdueWindow) {
    case "three_active":
      return daysOverdue <= 3;
    case "one_week":
      return daysOverdue <= 7;
    case "one_month":
      return daysOverdue <= 30;
    case "show_all":
    default:
      return true;
  }
}

function buildActiveFilterChips(filters: AppliedTasksFilters): TasksActiveFilterChipModel[] {
  const chips: TasksActiveFilterChipModel[] = [];

  if (filters.queue !== "all_queues") {
    chips.push({
      id: "queue",
      label: `Queue: ${getQueueFilterLabel(filters.queue)}`,
    });
  }

  if (filters.status !== "any_status") {
    chips.push({
      id: "status",
      label: `Status: ${getStatusFilterLabel(filters.status)}`,
    });
  }

  if (filters.overdueWindow !== "show_all") {
    chips.push({
      id: "overdueWindow",
      label: `Overdue: ${getOverdueWindowLabel(filters.overdueWindow)}`,
    });
  }

  return chips;
}

function getLegacyQueueValue(queue: TasksQueueFilterValue): TasksQueueId {
  return queue === "outbox" ? "team_queue" : "my_queue";
}

function getLegacyStatusValue(status: TasksStatusFilterValue): "new" | "wip" | "review" {
  if (status === "doing") {
    return "wip";
  }

  if (status === "review") {
    return "review";
  }

  return "new";
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
    openFiltersSheet: () => void;
    closeFiltersSheet: () => void;
    stageQueueFilter: (value: TasksQueueFilterValue) => void;
    stageStatusFilter: (value: TasksStatusFilterValue) => void;
    stageOverdueWindowFilter: (value: TasksOverdueWindowValue) => void;
    applyStagedFilters: () => void;
    resetStagedFilters: () => void;
    removeAppliedFilterChip: (
      chipId: TasksActiveFilterChipModel["id"],
    ) => void;
    cycleQueue: () => void;
    cycleStatus: () => void;
    selectAllMode: () => void;
    selectOverdueOnly: () => void;
    toggleTaskExpansion: (taskId: string) => void;
    archiveTask: (taskId: string) => Promise<void>;
  };
}

export function useTasksViewAdapter(props?: TasksViewAdapterProps): TasksViewAdapterHookResult {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const projectFilterStore = useProjectFilterStore();
  const currentUserId = user?.id ?? "";
  const launchPresetFilters = useMemo(
    () =>
      getFiltersFromLaunchPreset(
        projectFilterStore.tasksLaunchPreset?.bucket,
        projectFilterStore.tasksLaunchPreset?.queue,
      ),
    [projectFilterStore.tasksLaunchPreset?.bucket, projectFilterStore.tasksLaunchPreset?.queue],
  );
  const tasks = taskStore.tasks ?? [];
  const archivedTasks = taskStore.archivedTasks ?? [];
  const fetchArchivedTasks = taskStore.fetchArchivedTasks;
  const archiveTaskInStore = taskStore.archiveTask;
  const isLoadingTasks = Boolean(taskStore.isLoading);
  const selectedProjectId = projectFilterStore.selectedProjectId ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedTasksFilters>(launchPresetFilters);
  const [stagedFilters, setStagedFilters] = useState<AppliedTasksFilters>(launchPresetFilters);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const stagedFiltersRef = useRef<AppliedTasksFilters>(launchPresetFilters);
  const archivedFetchRequestedRef = useRef(false);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const tasksLaunchPreset = projectFilterStore.tasksLaunchPreset;
  const clearTasksLaunchPreset = projectFilterStore.clearTasksLaunchPreset;

  useEffect(() => {
    if (!tasksLaunchPreset) {
      return;
    }

    const nextFilters = getFiltersFromLaunchPreset(tasksLaunchPreset.bucket, tasksLaunchPreset.queue);
    stagedFiltersRef.current = nextFilters;
    setAppliedFilters(nextFilters);
    setStagedFilters(nextFilters);
    clearTasksLaunchPreset?.();
  }, [clearTasksLaunchPreset, tasksLaunchPreset]);

  useEffect(() => {
    const needsArchivedTasks =
      appliedFilters.queue === "archived" || stagedFilters.queue === "archived";

    if (!needsArchivedTasks) {
      archivedFetchRequestedRef.current = false;
      return;
    }

    if (archivedTasks.length > 0) {
      archivedFetchRequestedRef.current = false;
      return;
    }

    if (typeof fetchArchivedTasks !== "function" || archivedFetchRequestedRef.current) {
      return;
    }

    archivedFetchRequestedRef.current = true;
    void fetchArchivedTasks();
  }, [appliedFilters.queue, archivedTasks.length, fetchArchivedTasks, stagedFilters.queue]);

  const syncAppliedAndStagedFilters = (nextFilters: AppliedTasksFilters) => {
    stagedFiltersRef.current = nextFilters;
    setAppliedFilters(nextFilters);
    setStagedFilters(nextFilters);
  };

  const updateAppliedFilters = (
    updater: (current: AppliedTasksFilters) => AppliedTasksFilters,
  ) => {
    setAppliedFilters((current) => {
      const next = updater(current);
      stagedFiltersRef.current = next;
      setStagedFilters(next);
      return next;
    });
  };

  const updateStagedFilters = (updater: StagedFiltersUpdater) => {
    const next =
      typeof updater === "function"
        ? (updater as (current: AppliedTasksFilters) => AppliedTasksFilters)(stagedFiltersRef.current)
        : updater;
    stagedFiltersRef.current = next;
    setStagedFilters(next);
  };

  const {
    activeFilterChips,
    filterButton,
    filterControls,
    filterSheet,
    resultSummaryLabel,
    searchResults,
    taskRowItems,
    scalarMetrics,
    continuity,
    structuralState,
  } = useMemo(() => {
    const activeTasks = tasks.filter((task) => !task.archivedAt);
    const allKnownTasks = [...activeTasks, ...archivedTasks];
    const hasTasks = allKnownTasks.length > 0;
    const isInitialLoading = isLoadingTasks && !hasTasks;
    const isBackgroundRefreshing = isLoadingTasks && hasTasks;
    const structuralState: TasksSearchInputData["structuralState"] = isInitialLoading
      ? "loading"
      : hasTasks
        ? "stale"
        : "empty";

    const candidateTasks = allKnownTasks.filter((task) => {
      if (selectedProjectId && task.projectId !== selectedProjectId) {
        return false;
      }

      return Boolean(resolveQueueForTask(task, currentUserId));
    });

    const visibleQueueTasks = candidateTasks.filter((task) => {
      switch (appliedFilters.queue) {
        case "inbox":
          return !task.archivedAt && resolveQueueForTask(task, currentUserId) === "my_queue";
        case "outbox":
          return !task.archivedAt && resolveQueueForTask(task, currentUserId) === "team_queue";
        case "archived":
          return Boolean(task.archivedAt);
        case "all_queues":
        default:
          return !task.archivedAt;
      }
    });

    const statusScopedTasks = visibleQueueTasks.filter((task) => {
      switch (appliedFilters.status) {
        case "new":
          return matchesNewStatusFilter(task.status);
        case "doing":
          return matchesWipStatusFilter(task.status);
        case "review":
          return matchesReviewingStatusFilter(task.status);
        case "overdue":
          return isTaskOverdue(task);
        case "any_status":
        default:
          return true;
      }
    });

    const overdueWindowScopedTasks = statusScopedTasks.filter((task) =>
      isWithinOverdueWindow(task, appliedFilters.overdueWindow),
    );

    const myQueueTasks = candidateTasks.filter(
      (task) => resolveQueueForTask(task, currentUserId) === "my_queue",
    );
    const teamQueueTasks = candidateTasks.filter(
      (task) => resolveQueueForTask(task, currentUserId) === "team_queue",
    );

    const searchScopedTasks = overdueWindowScopedTasks.filter((task) => {
      const projectName = projectStore.getProjectById(task.projectId)?.name ?? "Project";
      return matchesSearchQuery(task, projectName, normalizedSearchQuery);
    });

    const sortedVisibleTasks = [...searchScopedTasks].sort((left, right) => {
      const leftDue = left.dueDate ?? "9999-12-31T00:00:00.000Z";
      const rightDue = right.dueDate ?? "9999-12-31T00:00:00.000Z";
      return leftDue.localeCompare(rightDue);
    });
    const visibleTasksById = new Map(sortedVisibleTasks.map((task) => [task.id, task]));
    const getIndentationLevel = (task: Task): number => {
      let level = 0;
      let currentParentId = task.parentTaskId;

      while (currentParentId) {
        const parentTask = visibleTasksById.get(currentParentId);
        if (!parentTask) {
          break;
        }

        level += 1;
        currentParentId = parentTask.parentTaskId;
      }

      return level;
    };

    const taskRowItems = sortedVisibleTasks.map<TasksScreenRowItem>((task) => {
      const level = getIndentationLevel(task);
      const isTopLevelTask = !task.parentTaskId;
      const isArchivedTask = Boolean(task.archivedAt);
      const canShowTaskUpdateAction =
        isTopLevelTask && !isArchivedTask && task.status !== "cancelled";
      const canShowArchiveAction =
        isTopLevelTask && !isArchivedTask && task.status !== "cancelled";
      const queue = resolveQueueForTask(task, currentUserId) ?? "my_queue";
      const bucket = resolveBucketForTask(task) ?? "new";
      const project = projectStore.getProjectById(task.projectId);
      const projectName = project?.name ?? "Project";
      const latestUpdateLabel = buildSortAwareDateLabel(task, "due_date");
      const photoUris = collectTaskPhotoUris(task);
      const searchProvenanceLine = `${getQueueTitle(queue)} · ${getBucketTitle(bucket)} · ${projectName}`;
      const contextLine =
        normalizedSearchQuery.length > 0 ? searchProvenanceLine : buildContextLine(task) ?? projectName;

      return {
        id: `tasks-row:${queue}:${bucket}:${task.id}`,
        taskId: task.id,
        title: task.title,
        onPress:
          !task.archivedAt && props?.onNavigateToTaskDetail
            ? () => props.onNavigateToTaskDetail?.(task.id)
            : undefined,
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
        contextLabel: normalizedSearchQuery.length > 0 ? searchProvenanceLine : projectName,
        contextLine,
        latestUpdateAt: getLatestMeaningfulTimestamp(task),
        latestUpdateLabel,
        isExpanded: expandedTaskIds.includes(task.id),
        canShowTaskUpdateAction,
        canShowArchiveAction,
        density: "compact",
        structuralState,
      };
    });

    const bucketCounts = {
      new: candidateTasks.filter((task) => matchesNewStatusFilter(task.status)).length,
      wip: candidateTasks.filter((task) => matchesWipStatusFilter(task.status)).length,
      review: candidateTasks.filter((task) => matchesReviewingStatusFilter(task.status)).length,
    };

    const activeFilterChips = buildActiveFilterChips(appliedFilters);
    const activeBottomSheetFilterCount = activeFilterChips.length;
    const overdueVisibleTaskCount = taskRowItems.filter((row) => row.isOverdue).length;

    return {
      activeFilterChips,
      filterButton: {
        label: "Filters" as const,
        isActive: activeBottomSheetFilterCount > 0,
        activeCount: activeBottomSheetFilterCount,
      },
      filterSheet: {
        isOpen: isFiltersSheetOpen,
        stagedQueue: stagedFilters.queue,
        stagedStatus: stagedFilters.status,
        stagedOverdueWindow: stagedFilters.overdueWindow,
      },
      filterControls: {
        mode: {
          id: "mode" as const,
          label: "Mode",
          selectedValue:
            appliedFilters.status === "overdue" || appliedFilters.overdueWindow !== "show_all"
              ? "overdue"
              : "all",
          options: [
            {
              id: "mode:all",
              value: "all" as const,
              label: "All",
              count: candidateTasks.filter((task) => !task.archivedAt).length,
              isSelected:
                appliedFilters.status !== "overdue" && appliedFilters.overdueWindow === "show_all",
            },
            {
              id: "mode:overdue",
              value: "overdue" as const,
              label: "Overdue",
              count: candidateTasks.filter((task) => isTaskOverdue(task)).length,
              isSelected:
                appliedFilters.status === "overdue" || appliedFilters.overdueWindow !== "show_all",
            },
          ],
        },
        queue: {
          id: "queue" as const,
          label: "Queue",
          selectedValue: getLegacyQueueValue(appliedFilters.queue),
          options: [
            {
              id: "queue:my_queue",
              value: "my_queue" as const,
              label: "Inbox",
              count: myQueueTasks.length,
              isSelected: appliedFilters.queue === "inbox",
            },
            {
              id: "queue:team_queue",
              value: "team_queue" as const,
              label: "Outbox",
              count: teamQueueTasks.length,
              isSelected: appliedFilters.queue === "outbox",
            },
          ],
        },
        status: {
          id: "status" as const,
          label: "Status",
          selectedValue: getLegacyStatusValue(appliedFilters.status),
          options: [
            {
              id: "status:new",
              value: "new" as const,
              label: "New",
              count: bucketCounts.new,
              isSelected: appliedFilters.status === "new",
            },
            {
              id: "status:wip",
              value: "wip" as const,
              label: "Doing",
              count: bucketCounts.wip,
              isSelected: appliedFilters.status === "doing",
            },
            {
              id: "status:review",
              value: "review" as const,
              label: "Review",
              count: bucketCounts.review,
              isSelected: appliedFilters.status === "review",
            },
          ],
        },
      } as any,
      resultSummaryLabel: `${taskRowItems.length} task${taskRowItems.length === 1 ? "" : "s"}`,
      searchResults: normalizedSearchQuery.length > 0 ? taskRowItems : [],
      taskRowItems,
      scalarMetrics: {
        totalVisibleTaskCount: taskRowItems.length,
        overdueVisibleTaskCount,
        selectedProjectTaskCount: candidateTasks.length,
        hasActiveFilters: Boolean(
          selectedProjectId ||
            normalizedSearchQuery.length > 0 ||
            activeBottomSheetFilterCount > 0,
        ),
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
    expandedTaskIds,
    appliedFilters,
    archivedTasks,
    isFiltersSheetOpen,
    isLoadingTasks,
    normalizedSearchQuery,
    projectStore,
    props,
    selectedProjectId,
    stagedFilters,
    tasks,
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
      sectionFilterLabel: "Search-first list",
      statusFilterLabel: selectedProjectId ? "Project scoped" : "All projects",
      sortLabel: "Due date · Earliest first",
    },
    filterButton,
    filterSheet,
    activeFilterChips,
    resultSummaryLabel,
    filterControls,
    isSearchMode: normalizedSearchQuery.length > 0,
    queuePanels: [],
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
    density: "expanded",
    structuralState,
  };

  const resetFilters = () => {
    setSearchQuery("");
    setIsFiltersSheetOpen(false);
    syncAppliedAndStagedFilters(DEFAULT_FILTERS);
    setExpandedTaskIds([]);
    projectFilterStore.resetFilters();
  };

  const openFiltersSheet = () => {
    updateStagedFilters(appliedFilters);
    setIsFiltersSheetOpen(true);
  };

  const closeFiltersSheet = () => {
    setIsFiltersSheetOpen(false);
  };

  const stageQueueFilter = (value: TasksQueueFilterValue) => {
    updateStagedFilters((current) => ({ ...current, queue: value }));
  };

  const stageStatusFilter = (value: TasksStatusFilterValue) => {
    updateStagedFilters((current) => ({ ...current, status: value }));
  };

  const stageOverdueWindowFilter = (value: TasksOverdueWindowValue) => {
    updateStagedFilters((current) => ({ ...current, overdueWindow: value }));
  };

  const applyStagedFilters = () => {
    setAppliedFilters(stagedFiltersRef.current);
    setIsFiltersSheetOpen(false);
  };

  const resetStagedFilters = () => {
    updateStagedFilters(DEFAULT_FILTERS);
  };

  const removeAppliedFilterChip = (chipId: TasksActiveFilterChipModel["id"]) => {
    updateAppliedFilters((current) => ({
      ...current,
      [chipId]:
        chipId === "queue"
          ? "all_queues"
          : chipId === "status"
            ? "any_status"
            : "show_all",
    }));
  };

  const cycleQueue = () => {
    updateAppliedFilters((current) => ({
      ...current,
      queue: getNextCycleValue(
        LEGACY_QUEUE_CYCLE,
        current.queue === "outbox" ? "outbox" : "inbox",
      ),
    }));
  };

  const cycleStatus = () => {
    updateAppliedFilters((current) => ({
      ...current,
      status: getNextCycleValue(
        LEGACY_STATUS_CYCLE,
        current.status === "doing" || current.status === "review" ? current.status : "new",
      ),
    }));
  };

  const selectAllMode = () => {
    updateAppliedFilters(() => ({
      ...DEFAULT_FILTERS,
    }));
  };

  const selectOverdueOnly = () => {
    updateAppliedFilters((current) => ({
      ...current,
      status: "overdue",
    }));
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const archiveTask = async (taskId: string) => {
    if (!currentUserId) {
      return;
    }

    await archiveTaskInStore(taskId, currentUserId);
    await fetchArchivedTasks();
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
      openFiltersSheet,
      closeFiltersSheet,
      stageQueueFilter,
      stageStatusFilter,
      stageOverdueWindowFilter,
      applyStagedFilters,
      resetStagedFilters,
      removeAppliedFilterChip,
      cycleQueue,
      cycleStatus,
      selectAllMode,
      selectOverdueOnly,
      toggleTaskExpansion,
      archiveTask,
    },
  };
}
