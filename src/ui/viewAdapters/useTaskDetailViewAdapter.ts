import { useMemo, useEffect, useCallback, useState } from 'react';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useUserStore } from '../../state/userStore.supabase';
import { useProjectStoreWithInit } from '../../state/projectStore.supabase';
import { useDateFormatter } from '../../utils/dateFormatter';
import { useTranslation } from '../../utils/useTranslation';
import {
  extractBuildtrackStoragePath,
  getFileUrl,
  prefetchSignedUrls,
  subscribeSignedUrlCache,
} from "../../api/fileUploadService";
import { getResponsibilityToken } from '../../utils/accountabilityEngine';
import { buildActiveStageModel } from '../../components/taskDetail/taskDetailActiveStage';
import {
  getCustomTaskTags,
  getTaskTags,
  hasCriticalThisWeekTag,
  resolvePrimaryAssigneeId,
  withCriticalThisWeekTag,
} from '../contracts/taskTags';
import { canViewerSelectTask } from '../contracts/taskVisibilityPermissions';
import {
  mergeAssignedToIds,
  normalizeDelegatedUserIds,
} from '../contracts/taskDelegation';
import {
  canEditTaskDelegation,
  canSelectUserAsAssignee,
  filterSelectableAssigneeUsers,
  resolveAssigneeRoleFromUser,
} from '../contracts/taskDelegationPermissions';
import { getAssignableProjectUsers } from '../../screens/createTaskAssignees';
import type {
  TaskDetailActiveStageModel,
  TaskDetailQuickActionRowModel,
  TaskDetailScreenViewAdapterOutput,
  TaskDetailBannerModel,
  TaskDetailActivityModel,
  TaskDetailActivityThreadRow,
  TaskDetailAssigneeModel,
  TaskDetailDelegationSummaryModel,
  TaskDetailEvidenceSummaryModel,
  TaskDetailInfoCardModel,
  TasksScreenRowItem,
  TaskDetailActionItem,
  TaskDetailHeroModel,
  TaskDetailSectionModel,
  TaskDetailSubtaskSummaryModel,
} from '../contracts/viewAdapters';
import type { Task, TaskActivity, TaskStatus, Priority, TaskCategory, BillingStatus } from '../../types/buildtrack';
import { isManagerOrAdmin } from '../../types/buildtrack';
import type { StatusSemanticToken } from '../contracts/primitives';
import { isArchivableLifecycleStatus, isCompletedLifecycleStatus, isTerminalTaskStatus } from '../../utils/taskLifecycleStatus';
import { isDueThisLocalWeek } from '../../utils/localWeek';
import {
  isPreAcceptanceTaskStatus,
  isTaskAwaitingAssigneeAcceptance,
  resolveClientTaskStatus,
} from '../../utils/taskCreateValidation';

export interface UseTaskDetailViewAdapterProps {
  taskId: string;
  subTaskId?: string;
}

function isApprovedTaskStatus(status: TaskStatus): boolean {
  return isCompletedLifecycleStatus(status);
}

function isActiveWorkTaskStatus(status: TaskStatus): boolean {
  return status === 'accepted' || status === 'in_progress' || status === 'wip' || status === 'rejected';
}

function humanizeToken(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function getActivityNarrative(activity: TaskActivity): string | undefined {
  const description = activity.description?.trim();
  if (description) {
    return description;
  }

  const dataDescription = (activity.data as { description?: string } | undefined)?.description?.trim();
  return dataDescription || undefined;
}

interface TaskDetailHeadlineContext {
  previousCompletionPercentage?: number;
}

function buildPhotoUpdateHeadline(photoCount: number): string {
  if (photoCount <= 1) {
    return 'Added photo update';
  }

  return `Added ${photoCount} photos`;
}

function hasMeaningfulProgressChange(
  activity: TaskActivity,
  context?: TaskDetailHeadlineContext,
): boolean {
  if (activity.activityType !== 'progress_update' || activity.completionPercentage === undefined) {
    return false;
  }

  if (context?.previousCompletionPercentage !== undefined) {
    return activity.completionPercentage !== context.previousCompletionPercentage;
  }

  return activity.completionPercentage > 0;
}

function buildTaskDetailEventLabel(
  activity: TaskActivity,
  context?: TaskDetailHeadlineContext,
): string {
  switch (activity.activityType) {
    case 'progress_update': {
      const photoCount = collectActivityPhotoUrls(activity).length;
      const meaningfulProgressChange = hasMeaningfulProgressChange(activity, context);

      if (!meaningfulProgressChange && photoCount > 0) {
        return buildPhotoUpdateHeadline(photoCount);
      }

      return activity.completionPercentage !== undefined
        ? `Updated progress to ${activity.completionPercentage}%`
        : 'Updated progress';
    }
    case 'status_change':
      return activity.status
        ? `Changed status to ${humanizeToken(activity.status)}`
        : 'Updated task status';
    case 'assignment':
      return 'Updated assignment';
    case 'creation':
      return 'Created task';
    case 'cancellation':
      return 'Cancelled task';
    case 'review_submission':
      return 'Submitted task for review';
    case 'review_acceptance':
      return 'Approved task completion';
    case 'review_rejection':
      return 'Rejected task completion';
    case 'assigner_comment':
      return 'Added assigner comment';
    case 'delegation_added':
      return 'Added delegation';
    case 'delegation_removed':
      return 'Removed delegation';
    case 'photo_batch_attached':
      return 'Added photo evidence';
    case 'draft_completed':
      return 'Completed draft update';
    case 'metadata_edit':
      return 'Updated task details';
    default:
      return humanizeToken(activity.activityType);
  }
}

function buildTaskDetailHeadline(
  activity: TaskActivity,
  context?: TaskDetailHeadlineContext,
): string {
  const narrative = getActivityNarrative(activity);
  const fallbackLabel = buildTaskDetailEventLabel(activity, context);

  if (narrative && narrative.toLowerCase() !== fallbackLabel.toLowerCase()) {
    return narrative;
  }

  return fallbackLabel;
}

function buildActivityHeadlineContextMap(
  activities: TaskActivity[],
): Map<string, TaskDetailHeadlineContext> {
  const contextByActivityId = new Map<string, TaskDetailHeadlineContext>();
  const latestOlderCompletionByTaskId = new Map<string, number>();

  [...activities].reverse().forEach((activity) => {
    const taskKey = activity.taskId || activity.id;

    contextByActivityId.set(activity.id, {
      previousCompletionPercentage: latestOlderCompletionByTaskId.get(taskKey),
    });

    if (activity.completionPercentage !== undefined) {
      latestOlderCompletionByTaskId.set(taskKey, activity.completionPercentage);
    }
  });

  return contextByActivityId;
}

function buildTaskDetailEventDetail(activity: TaskActivity): string | undefined {
  const reason = (activity.data as { reason?: string } | undefined)?.reason?.trim();
  if (reason) {
    return `Reason: ${reason}`;
  }

  return undefined;
}

function buildTaskDetailTimestampLabel(
  activity: TaskActivity,
  dateFormatter: ReturnType<typeof useDateFormatter>,
): string {
  if (!activity.timestamp) {
    return '';
  }

  return dateFormatter.formatDateTime(activity.timestamp);
}

function isPdfAssetUri(uri: string): boolean {
  return /\.pdf(?:$|[?#])/i.test(uri);
}

function resolveAssetUri(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object') {
    const attachment = value as {
      uri?: string;
      annotatedUri?: string;
      public_url?: string;
      publicUrl?: string;
      storage_path?: string;
      storagePath?: string;
    };

    return (
      resolveAssetUri(attachment.public_url) ??
      resolveAssetUri(attachment.publicUrl) ??
      resolveAssetUri(attachment.annotatedUri) ??
      resolveAssetUri(attachment.uri) ??
      resolveAssetUri(attachment.storage_path) ??
      resolveAssetUri(attachment.storagePath)
    );
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (
    (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
    (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
  ) {
    try {
      return resolveAssetUri(JSON.parse(trimmedValue));
    } catch {
      // Fall through to storage-path resolution for non-JSON strings.
    }
  }

  if (/^(file:|content:|data:|asset:)/i.test(value)) {
    return value;
  }

  if (/^https?:/i.test(value)) {
    if (extractBuildtrackStoragePath(value)) {
      return getFileUrl(value) ?? undefined;
    }
    return value;
  }

  return getFileUrl(value) ?? undefined;
}

function getActivityAssetUris(activity: TaskActivity): string[] {
  const activityData = activity.data as { photos?: unknown[] } | undefined;
  return Array.isArray(activityData?.photos)
    ? activityData.photos.map(resolveAssetUri).filter((uri): uri is string => Boolean(uri))
    : [];
}

function collectActivityPhotoUrls(activity: TaskActivity): string[] {
  return getActivityAssetUris(activity).filter((uri) => !isPdfAssetUri(uri));
}

function collectActivityDocumentUri(activity: TaskActivity): string | undefined {
  return getActivityAssetUris(activity).find((uri) => isPdfAssetUri(uri));
}

function collectTaskPhotoAttachments(task: Task): string[] {
  return Array.isArray(task.attachments)
    ? task.attachments
        .map(resolveAssetUri)
        .filter((uri): uri is string => Boolean(uri))
        .filter((uri) => !isPdfAssetUri(uri))
    : [];
}

function collectCreationPhotoUrls(task: Task): string[] {
  return collectTaskPhotoAttachments(task);
}

/** Origin rows that carry the task's initial evidence attachments. */
function isOriginEvidenceActivity(activity: TaskActivity): boolean {
  return (
    activity.activityType === "creation" ||
    activity.activityType === "issue_reported"
  );
}

function shouldHideActivityProgressLabel(activity: TaskActivity): boolean {
  return (
    activity.activityType === "issue_reported" ||
    activity.activityType === "assigner_comment" ||
    activity.status === "reported" ||
    activity.status === "resolved" ||
    activity.status === "dismissed"
  );
}

function collectTaskDocumentAttachment(task: Task): string | undefined {
  return Array.isArray(task.attachments)
    ? task.attachments
        .map(resolveAssetUri)
        .filter((uri): uri is string => Boolean(uri))
        .find((uri) => isPdfAssetUri(uri))
    : undefined;
}

function getAttachmentFileName(uri: string | undefined): string | undefined {
  if (!uri) {
    return undefined;
  }

  const rawFileName = uri.split(/[?#]/)[0]?.split('/').pop();
  if (!rawFileName) {
    return undefined;
  }

  try {
    return decodeURIComponent(rawFileName);
  } catch {
    return rawFileName;
  }
}

function collectLatestTaskPhotoUrls(task: Task, activities: TaskActivity[]): string[] {
  const orderedActivityPhotos = activities.flatMap((activity) => collectActivityPhotoUrls(activity));
  const taskAttachments = collectTaskPhotoAttachments(task);

  return [...orderedActivityPhotos, ...taskAttachments].slice(0, 3);
}

function collectTotalTaskPhotoCount(task: Task, activities: TaskActivity[]): number {
  const activityPhotoCount = activities.reduce(
    (total, activity) => total + collectActivityPhotoUrls(activity).length,
    0,
  );
  const taskAttachmentCount = collectTaskPhotoAttachments(task).length;

  return activityPhotoCount + taskAttachmentCount;
}

function buildTaskDetailActiveStageModel({
  task,
  orderedActivities,
  dateFormatter,
  getUserById,
}: {
  task: Task;
  orderedActivities: TaskActivity[];
  dateFormatter: ReturnType<typeof useDateFormatter>;
  getUserById: (userId?: string) => { name?: string } | undefined;
}): TaskDetailActiveStageModel {
  const latestActivity = orderedActivities[0];
  const activityHeadlineContextById = buildActivityHeadlineContextMap(orderedActivities);

  if (latestActivity) {
    const photos = collectActivityPhotoUrls(latestActivity);
    const documentUri = collectActivityDocumentUri(latestActivity);
    const stageSource = buildActiveStageModel({
      id: latestActivity.id,
      mode: photos.length > 0 ? "photo" : documentUri ? "pdf" : "text",
      title: buildTaskDetailHeadline(
        latestActivity,
        activityHeadlineContextById.get(latestActivity.id),
      ),
      summary:
        buildTaskDetailEventDetail(latestActivity) ||
        latestActivity.description?.trim() ||
        "No additional update details.",
    });

    return {
      id: stageSource.id,
      density: "standard",
      structuralState: "stale",
      stageMode: stageSource.stageMode,
      title: stageSource.title,
      summary: stageSource.summary,
      actorLabel: getUserById(latestActivity.userId)?.name || "Unknown User",
      timestampLabel: buildTaskDetailTimestampLabel(latestActivity, dateFormatter),
      photos,
      activePhotoIndex: photos.length > 0 ? 0 : undefined,
      documentName: getAttachmentFileName(documentUri),
      documentUri,
    };
  }

  const photos = collectTaskPhotoAttachments(task);
  const documentUri = collectTaskDocumentAttachment(task);
  const stageSource = buildActiveStageModel({
    id: "task-active-stage",
    mode: photos.length > 0 ? "photo" : documentUri ? "pdf" : "text",
    title: "Latest task entry",
    summary: task.description?.trim() || "No additional update details.",
  });

  return {
    id: stageSource.id,
    density: "standard",
    structuralState: "stale",
    stageMode: stageSource.stageMode,
    title: stageSource.title,
    summary: stageSource.summary,
    actorLabel: getUserById(task.assignedBy)?.name || "Unknown User",
    timestampLabel: task.updatedAt
      ? dateFormatter.formatDateTime(task.updatedAt)
      : task.createdAt
        ? dateFormatter.formatDateTime(task.createdAt)
        : "",
    photos,
    activePhotoIndex: photos.length > 0 ? 0 : undefined,
    documentName: getAttachmentFileName(documentUri),
    documentUri,
  };
}

export function useTaskDetailViewAdapter({
  taskId,
  subTaskId,
}: UseTaskDetailViewAdapterProps): {
  output: TaskDetailScreenViewAdapterOutput;
  actions: {
    acceptTask: () => Promise<void>;
    declineTask: (reason: string) => Promise<void>;
    submitForReview: () => Promise<void>;
    approveTask: () => Promise<void>;
    toggleCriticalThisWeek: () => Promise<void>;
    setPrimaryAssignee: (userId: string) => Promise<void>;
    toggleDelegate: (userId: string) => Promise<void>;
    setLocationOnSite: (locationLabel: string) => Promise<void>;
    setTaskContainers: (args: {
      containerId?: string | null;
      subContainerId?: string | null;
    }) => Promise<void>;
    addCustomTag: (tag: string) => Promise<void>;
    removeCustomTag: (tag: string) => Promise<void>;
    archiveTask: () => Promise<void>;
    cancelTask: () => Promise<void>;
    triageTask: (payload: {
      assignedTo: string[];
      primaryAssigneeId?: string;
      delegatedUserIds?: string[];
      dueDate?: string;
      priority?: Priority;
      category?: TaskCategory;
      billingStatus?: BillingStatus;
      locationOnSite?: string;
    }) => Promise<void>;
    replyToReport: (payload: { description: string; photos?: string[] }) => Promise<void>;
    submitDockProgress: (payload: {
      description: string;
      photos?: string[];
      completionPercentage: number;
    }) => Promise<void>;
    cancelDockReview: () => Promise<void>;
    resolveReport: (note?: string) => Promise<void>;
    /** @deprecated Prefer resolveReport */
    dismissIssue: (reason?: string) => Promise<void>;
    fetchTask: () => Promise<void>;
  };
} {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const {
    tasks,
    fetchTaskById,
    acceptTask,
    declineTask,
    submitTaskForReview,
    cancelTaskReviewSubmission,
    acceptTaskCompletion,
    acceptSubTaskCompletion,
    submitSubTaskForReview,
    cancelSubTaskReviewSubmission,
    acceptSubTask,
    declineSubTask,
    archiveTask,
    cancelTask,
    updateTask,
    ensureProjectLocation,
    fetchArchivedTasks,
    addAssignerComment,
    addTaskUpdate,
    addSubTaskUpdate,
  } = taskStore;
  const { getUserById, getAllUsers, fetchUsersByCompany, fetchUsers } = useUserStore();
  const projectStore = useProjectStoreWithInit();
  const { getProjectUserAssignments, fetchProjectUserAssignments } = projectStore;
  const [signedUrlEpoch, bumpSignedUrlEpoch] = useState(0);
  const [detailFetchSettled, setDetailFetchSettled] = useState(false);

  const foundTask = tasks.find((t) => t.id === taskId);
  const subTask = subTaskId ? tasks.find((t) => t.id === subTaskId) : foundTask?.parentTaskId ? foundTask : null;
  const candidateTask = subTask || foundTask;
  const viewerProjectIds = user ? projectStore.projectIdsByUser?.[user.id] ?? [] : [];
  const taskProject = candidateTask?.projectId
    ? projectStore.projects.find((project) => project.id === candidateTask.projectId)
    : undefined;
  const canViewCandidate = candidateTask
    ? canViewerSelectTask({
        viewer: user,
        task: candidateTask,
        project: taskProject
          ? { id: taskProject.id, companyId: taskProject.companyId }
          : null,
        viewerProjectIds,
      })
    : false;
  const task = canViewCandidate ? candidateTask : undefined;
  const isViewingSubTask = Boolean(subTask && canViewCandidate);

  const childTasksData = useMemo(
    () => (task ? tasks.filter((t) => t.parentTaskId === task.id) : []),
    [tasks, task?.id]
  );

  const fetchTask = useCallback(async () => {
    if (taskId) await fetchTaskById(taskId);
    if (subTaskId) await fetchTaskById(subTaskId);
  }, [taskId, subTaskId, fetchTaskById]);

  useEffect(() => {
    let cancelled = false;
    setDetailFetchSettled(false);
    void (async () => {
      try {
        await fetchTask();
      } finally {
        if (!cancelled) {
          setDetailFetchSettled(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchTask]);

  useEffect(() => subscribeSignedUrlCache(() => bumpSignedUrlEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (
      !user ||
      !task?.projectId ||
      task.status !== "reported" ||
      !isManagerOrAdmin(user)
    ) {
      return;
    }
    const userFetch = user.companyId
      ? fetchUsersByCompany(user.companyId)
      : fetchUsers();
    void Promise.all([
      userFetch,
      fetchProjectUserAssignments(task.projectId, true),
    ]);
  }, [
    user,
    task?.projectId,
    task?.status,
    fetchUsersByCompany,
    fetchUsers,
    fetchProjectUserAssignments,
  ]);

  const triageAssignableUsers = useMemo(() => {
    if (
      !user ||
      !task?.projectId ||
      task.status !== "reported" ||
      !isManagerOrAdmin(user)
    ) {
      return [];
    }
    const projectMembers = getAssignableProjectUsers({
      projectId: task.projectId,
      assignments: getProjectUserAssignments(task.projectId),
      users: getAllUsers(),
    });
    return filterSelectableAssigneeUsers(projectMembers, {
      actorRole: resolveAssigneeRoleFromUser(user),
      actorUserId: user.id,
      resolveRole: resolveAssigneeRoleFromUser,
    });
  }, [
    user,
    task?.projectId,
    task?.status,
    getProjectUserAssignments,
    getAllUsers,
  ]);

  useEffect(() => {
    if (!task) {
      return;
    }
    const activityPhotos =
      task.activities?.flatMap((activity) => {
        const photos = (activity.data as { photos?: unknown[] } | undefined)?.photos;
        return Array.isArray(photos) ? photos : [];
      }) ?? [];
    const updatePhotos = task.updates?.flatMap((update) => update.photos ?? []) ?? [];
    const refs = [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos].flatMap((value) => {
      if (typeof value === "string" && value.length > 0) {
        return [value];
      }
      if (value && typeof value === "object") {
        const attachment = value as {
          uri?: string;
          annotatedUri?: string;
          public_url?: string;
          publicUrl?: string;
          storage_path?: string;
          storagePath?: string;
        };
        return [
          attachment.public_url,
          attachment.publicUrl,
          attachment.annotatedUri,
          attachment.uri,
          attachment.storage_path,
          attachment.storagePath,
        ].filter((candidate): candidate is string => typeof candidate === "string" && candidate.length > 0);
      }
      return [];
    });
    if (refs.length === 0) {
      return;
    }
    void prefetchSignedUrls(refs);
  }, [task]);

  // Touch epoch so memoized photo URIs rebuild after signed-URL cache fills.
  void signedUrlEpoch;

  if (!task || !user) {
    const unavailable = detailFetchSettled && Boolean(user) && !task;
    return {
      output: {
        screenId: 'TaskDetailScreen',
        readiness: {
          hasInitialFrame: unavailable,
          hasUsableData: false,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: !unavailable,
          isBackgroundRefreshing: false,
          hasCachedFrame: false,
          shouldRenderSkeletonShell: !unavailable,
          shouldRenderEmptyState: unavailable,
          freshnessLabel: '',
        },
        header: {
          taskId: taskId || '',
          title: unavailable ? 'Unavailable' : '',
          statusLabel: '',
          projectName: '',
          assigneeSummary: '',
        },
        taskHero: {
          id: 'task-hero',
          density: 'standard',
          structuralState: 'stale',
          title: unavailable ? 'This task is no longer available' : '',
          statusLabel: '',
          projectLabel: '',
          completionLabel: '',
          assignedByLabel: '',
          assignedToLabel: '',
        },
        delegationSummary: {
          id: 'delegation-summary',
          density: 'standard',
          structuralState: 'stale',
          assignedByLabel: '',
          assignedToLabel: '',
        },
        infoCard: {
          id: 'task-info-card',
          density: 'standard',
          structuralState: 'stale',
          title: unavailable ? 'This task is no longer available' : undefined,
          detailRows: [],
        },
        activeStage: {
          id: 'task-active-stage',
          density: 'standard',
          structuralState: 'stale',
          stageMode: 'no_photo',
          title: '',
          summary: '',
          actorLabel: '',
          timestampLabel: '',
          photos: [],
        },
        evidenceSummary: {
          id: 'evidence-summary',
          density: 'standard',
          structuralState: 'stale',
          latestPhotoUrls: [],
          totalPhotoCount: 0,
          emptyLabel: '',
        },
        activityThread: [],
        subtaskSummary: {
          id: 'subtask-summary',
          density: 'standard',
          structuralState: 'stale',
          title: 'Subtasks',
          totalCount: 0,
        },
        detailSections: [],
        actionItems: [],
        scalarMetrics: { attachmentCount: 0, updateCount: 0, childTaskCount: 0, completionPercentage: 0 },
        banners: [],
        activities: [],
        assigners: [],
        assignees: [],
        childTasks: [],
        canEditDelegation: false,
        reportTriage: undefined,
        detailDock: undefined,
      },
      actions: {
        acceptTask: async () => {},
        declineTask: async () => {},
        submitForReview: async () => {},
        approveTask: async () => {},
        toggleCriticalThisWeek: async () => {},
        setPrimaryAssignee: async () => {},
        toggleDelegate: async () => {},
        setLocationOnSite: async () => {},
        setTaskContainers: async () => {},
        addCustomTag: async () => {},
        removeCustomTag: async () => {},
        archiveTask: async () => {},
        cancelTask: async () => {},
        triageTask: async () => {},
        replyToReport: async () => {},
        submitDockProgress: async () => {},
        cancelDockReview: async () => {},
        resolveReport: async () => {},
        dismissIssue: async () => {},
        fetchTask,
      },
    };
  }

  const assignedTo = mergeAssignedToIds({
    assignedTo: task.assignedTo || [],
    primaryAssigneeId: task.primaryAssigneeId,
    delegatedUserIds: task.delegatedUserIds || [],
  });
  const displayStatus = resolveClientTaskStatus({
    status: task.status,
    assigned_by: task.assignedBy,
    assigned_to: assignedTo,
    primary_assignee_id: task.primaryAssigneeId,
    accepted_by: task.acceptedBy,
    accepted: task.accepted,
  });
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some((id) => String(id) === String(user.id));
  const isTaskCreator = String(task.assignedBy) === String(user.id);
  const actorAssigneeRole = resolveAssigneeRoleFromUser(user);
  const canEditDelegation = canEditTaskDelegation({
    actorUserId: user.id,
    taskAssignedBy: task.assignedBy,
    taskStatus: displayStatus,
  });
  const isCriticalThisWeek = hasCriticalThisWeekTag(task.tags);
  /** Same membership rule as Dashboard "This Week's Critical Tasks" (due in local Mon–Sun week). */
  const isDueThisWeekOnCriticalList =
    Boolean(task.dueDate) &&
    !task.archivedAt &&
    !isTerminalTaskStatus(displayStatus) &&
    isDueThisLocalWeek(task.dueDate);
  const showDueDateAsCritical = isDueThisWeekOnCriticalList || isCriticalThisWeek;
  const isAwaitingAcceptance = isTaskAwaitingAssigneeAcceptance({
    viewerUserId: user.id,
    status: displayStatus,
    assignedBy: task.assignedBy,
    assignedTo,
    acceptedBy: task.acceptedBy,
  });
  const isAwaitingReviewStatus =
    displayStatus === "submitted_for_review" ||
    task.status === "submitted_for_review" ||
    displayStatus === "reviewing" ||
    task.status === "reviewing";
  const isPMOrAdmin = isManagerOrAdmin(user);
  // Creator or PM/admin can Accept/Reject. Do not require completion===100 —
  // submitted rows sometimes miss a synced percentage.
  const isReviewerApprovalState =
    (isTaskCreator || isPMOrAdmin) && isAwaitingReviewStatus;
  // Assignee Cancel-review dock: workers who submitted. PM/creator use Accept/Reject instead.
  const showAssigneeCancelReviewDock =
    isAssignedToMe && isAwaitingReviewStatus && !isPMOrAdmin && !isTaskCreator;
  const isContributorReviewState =
    isAssignedToMe &&
    !isTaskCreator &&
    Number(task.completionPercentage) >= 100 &&
    !isAwaitingReviewStatus &&
    displayStatus !== 'declined' &&
    displayStatus !== 'cancelled' &&
    !isApprovedTaskStatus(displayStatus) &&
    !isPreAcceptanceTaskStatus(displayStatus);
  // Lock progress edits for any assignee (incl. self-assign creator) while review is pending.
  const isContributorUpdateLocked =
    isAssignedToMe &&
    (isAwaitingReviewStatus || isApprovedTaskStatus(displayStatus));
  const isActiveWorkState = isActiveWorkTaskStatus(displayStatus) && !isContributorReviewState;
  const canArchiveTask =
    !isViewingSubTask &&
    !task.archivedAt &&
    isArchivableLifecycleStatus(displayStatus) &&
    (isAssignedToMe || isTaskCreator || isPMOrAdmin);

  const getStatusToken = (status: TaskStatus): StatusSemanticToken => {
    switch (status) {
      case 'reported': return 'task_new';
      case 'new': return 'task_new';
      case 'assigned': return 'task_new';
      case 'received': return 'task_new';
      case 'not_started': return 'task_new';
      case 'accepted': return 'task_accepted';
      case 'in_progress': return 'task_in_progress';
      case 'wip': return 'task_in_progress';
      case 'submitted_for_review': return 'task_submitted_for_review';
      case 'reviewing': return 'task_submitted_for_review';
      case 'approved': return 'task_approved';
      case 'completed': return 'task_approved';
      case 'done': return 'task_approved';
      case 'rejected': return 'task_in_progress';
      case 'cancelled': return 'task_cancelled';
      case 'dismissed': return 'task_cancelled';
      case 'resolved': return 'task_cancelled';
      case 'declined': return 'task_submitted_for_review';
      default: return 'custom';
    }
  };

  const getStatusLabel = (status: TaskStatus) =>
    status?.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'New';

  const isTriageState = displayStatus === 'reported';
  const isReportReporter = String(task.assignedBy || "") === String(user.id);
  /** Worker reporter or PM can add follow-up on a reported issue via the dock. */
  const canContributeToReport = isTriageState && (isPMOrAdmin || isReportReporter);

  const reportTriage =
    isTriageState && isPMOrAdmin
      ? {
          defaultAssigneeId: task.assignedBy || "",
          title: task.title || "",
          availableUsers: triageAssignableUsers.map((member) => ({
            id: member.id,
            name: member.name,
            email: member.email,
            systemPermission: member.systemPermission,
            role: member.role,
          })),
        }
      : undefined;

  // Status is already on Progress in the hero card + timeline — no duplicate banners.
  const banners: TaskDetailBannerModel[] = [];

  const activities: TaskDetailActivityModel[] = (task.activities || []).map((a: any) => ({
    id: a.id,
    density: 'standard',
    structuralState: 'stale',
    userId: a.userId,
    userName: getUserById(a.userId)?.name || 'Unknown User',
    activityType: a.activityType || (a.status ? 'status_change' : 'progress_update'),
    timestamp: a.timestamp,
    description: a.description || '',
    reason: a.data?.reason,
    completionPercentage: a.completionPercentage,
    statusToken: a.status ? getStatusToken(a.status) : undefined,
    statusLabel: a.status ? getStatusLabel(a.status) : undefined,
    photos: a.data?.photos || [],
  }));

  const assigners: TaskDetailAssigneeModel[] = [];
  const assignedBy = task.assignedBy ? getUserById(task.assignedBy) : null;
  if (assignedBy) {
    assigners.push({
      id: assignedBy.id,
      name: assignedBy.name,
      phone: assignedBy.phone,
      isCurrentUser: assignedBy.id === user.id,
    });
  }

  const assignees: TaskDetailAssigneeModel[] = assignedTo.map((id) => {
    const u = getUserById(id);
    return u ? { id: u.id, name: u.name, phone: u.phone, isCurrentUser: u.id === user.id } : null;
  }).filter(Boolean) as TaskDetailAssigneeModel[];

  const childTasks: TasksScreenRowItem[] = childTasksData.map((ct) => ({
    id: ct.id,
    taskId: ct.id,
    density: 'standard',
    structuralState: 'stale',
    title: ct.title,
    statusToken: getStatusToken(ct.status),
    statusLabel: getStatusLabel(ct.status),
    responsibilityToken: getResponsibilityToken(ct, user.id),
    priorityLabel: ct.priority,
    assigneeSummary: ct.assignedTo.map((id) => getUserById(id)?.name).filter(Boolean).join(', ') || 'Unassigned',
    projectName: ct.projectId || 'Unknown Project',
    attachmentUris: ct.attachments ?? [],
    isOverdue:
      new Date(ct.dueDate) < new Date() &&
      !isApprovedTaskStatus(ct.status) &&
      ct.completionPercentage < 100,
  }));

  const orderedActivities = [...(task.activities || [])].sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  const primaryOwner = task.primaryAssigneeId
    ? getUserById(task.primaryAssigneeId)
    : assignees[0];
  const primaryAssigneeId =
    resolvePrimaryAssigneeId(assignedTo, primaryOwner?.id || task.primaryAssigneeId) ||
    primaryOwner?.id;
  const delegatedUserIds = normalizeDelegatedUserIds(
    task.delegatedUserIds?.length ? task.delegatedUserIds : assignedTo,
    primaryAssigneeId,
  );
  const delegatedAssignees = delegatedUserIds
    .map((id) => {
      const u = getUserById(id);
      return u ? { id: u.id, name: u.name } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string }>;

  const delegationSummary: TaskDetailDelegationSummaryModel = {
    id: 'delegation-summary',
    density: 'standard',
    structuralState: 'stale',
    assignedByLabel: assigners.map((assigner) => assigner.name).join(', ') || 'Unassigned',
    assignedToLabel: assignees.map((assignee) => assignee.name).join(', ') || 'Unassigned',
    primaryOwnerLabel: primaryOwner?.name,
    teamSummaryLabel:
      delegatedAssignees.length > 0
        ? `${delegatedAssignees.length} delegate${delegatedAssignees.length === 1 ? '' : 's'}: ${delegatedAssignees.map((d) => d.name).join(', ')}`
        : undefined,
  };

  const detailRows = [
    { id: 'row-due', label: t.taskDetail.due, value: dateFormatter.formatDateShort(task.dueDate) },
    { id: 'row-category', label: 'Category', value: task.category || 'General' },
  ];

  const infoCard: TaskDetailInfoCardModel = {
    id: 'task-info-card',
    density: 'standard',
    structuralState: 'stale',
    title: task.title,
    descriptionLabel: task.description || '',
    siteLocationLabel: task.locationOnSite || '',
    assignedByLabel: delegationSummary.assignedByLabel,
    assignedToLabel: isTriageState
      ? (assignees.length > 0
          ? delegationSummary.assignedToLabel
          : `Reported by ${delegationSummary.assignedByLabel}`)
      : delegationSummary.assignedToLabel,
    primaryOwnerLabel: isTriageState ? undefined : delegationSummary.primaryOwnerLabel,
    primaryAssigneeId: primaryAssigneeId || task.primaryAssigneeId,
    delegatedUserIds: isTriageState ? [] : delegatedUserIds,
    delegatedLabels: isTriageState ? [] : delegatedAssignees.map((d) => d.name),
    containerId: task.containerId,
    subContainerId: task.subContainerId,
    tagLabels: getCustomTaskTags(task.tags),
    statusLabel: getStatusLabel(displayStatus),
    categoryLabel: humanizeToken(task.category || 'general'),
    completionLabel: isTriageState ? undefined : `${task.completionPercentage}% complete`,
    dueDateLabel: task.dueDate
      ? dateFormatter.formatDateShort(task.dueDate)
      : undefined,
    isCritical: showDueDateAsCritical,
    criticalLabel: undefined,
    isAssignedToCurrentUser: isAssignedToMe,
    showEditAction:
      (isTaskCreator || isPMOrAdmin) && !isTriageState && !isReviewerApprovalState,
    editActionLabel: t.taskDetail.editTaskDetails,
    showReassignAction:
      (isTaskCreator || isPMOrAdmin) &&
      (task.status === "declined" || displayStatus === "declined"),
    reassignActionLabel: "Reassign",
    detailRows: [],
  };

  const combinedActivities = [
    ...(task.activities || []).map((activity) => ({
      activity,
      childTask: undefined as Task | undefined,
    })),
    ...childTasksData.flatMap((childTask) =>
      (childTask.activities || []).map((activity) => ({
        activity,
        childTask,
      })),
    ),
  ].sort(
    (left, right) => new Date(right.activity.timestamp).getTime() - new Date(left.activity.timestamp).getTime(),
  );
  const activityHeadlineContextById = buildActivityHeadlineContextMap(
    combinedActivities.map(({ activity }) => activity),
  );

  const creationPhotoUrls = collectCreationPhotoUrls(task);
  let hasAssignedCreationPhotos = false;

  const activityThread: TaskDetailActivityThreadRow[] = combinedActivities.map(({ activity, childTask }) => {
    const intrinsicPhotoUrls = collectActivityPhotoUrls(activity);
    const photoUrls =
      !hasAssignedCreationPhotos &&
      !childTask &&
      isOriginEvidenceActivity(activity) &&
      creationPhotoUrls.length > 0
        ? (() => {
            hasAssignedCreationPhotos = true;
            return creationPhotoUrls;
          })()
        : intrinsicPhotoUrls;

    return {
      id: activity.id,
      density: 'standard',
      structuralState: 'stale',
      actorLabel: getUserById(activity.userId)?.name || 'Unknown User',
      actorUserId: activity.userId,
      eventLabel: buildTaskDetailHeadline(activity, activityHeadlineContextById.get(activity.id)),
      timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
      progressLabel: shouldHideActivityProgressLabel(activity)
        ? "—"
        : activity.completionPercentage !== undefined
          ? `${activity.completionPercentage}%`
          : `${childTask?.completionPercentage ?? task.completionPercentage}%`,
      detailLabel: undefined,
      photoUrls,
      statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
      subtaskBadgeLabel: childTask ? 'Subtask' : undefined,
      subtaskTitleLabel: childTask?.title,
    };
  });

  const totalEvidencePhotoCount = collectTotalTaskPhotoCount(task, orderedActivities);
  const latestEvidencePhotoUrls = collectLatestTaskPhotoUrls(task, orderedActivities);
  const activeStage = buildTaskDetailActiveStageModel({
    task,
    orderedActivities,
    dateFormatter,
    getUserById: (userId) => (userId ? getUserById(userId) : undefined),
  });

  const taskHero: TaskDetailHeroModel = {
    id: 'task-hero',
    density: 'standard',
    structuralState: 'stale',
    title: task.title,
    statusLabel: getStatusLabel(displayStatus),
    categoryLabel: humanizeToken(task.category || 'general'),
    projectLabel: task.projectId || 'Unknown Project',
    completionLabel: `${task.completionPercentage}% complete`,
    dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
    nextStepLabel: undefined,
    isCritical: showDueDateAsCritical,
    criticalLabel: isCriticalThisWeek ? 'Critical this week' : undefined,
  };

  const evidenceSummary: TaskDetailEvidenceSummaryModel = {
    id: 'evidence-summary',
    density: 'standard',
    structuralState: 'stale',
    latestPhotoUrls: latestEvidencePhotoUrls,
    totalPhotoCount: totalEvidencePhotoCount,
    emptyLabel: 'No photo evidence yet.',
  };

  const subtaskSummary: TaskDetailSubtaskSummaryModel = {
    id: 'subtask-summary',
    density: 'standard',
    structuralState: 'stale',
    title: 'Subtasks',
    totalCount: childTasks.length,
  };

  const detailSections: TaskDetailSectionModel[] = [
    {
      id: 'section-details',
      density: 'standard',
      structuralState: 'stale',
      title: 'Details',
      rows: detailRows,
    },
    {
      id: 'section-description',
      density: 'standard',
      structuralState: 'stale',
      title: 'Description',
      rows: [
        { id: 'row-desc', label: 'Description', value: task.description || '' },
      ],
    },
  ];

  const actionItems: TaskDetailActionItem[] = [];
  const addActionItem = ({
    actionId,
    label,
    icon,
    isDisabled = false,
  }: {
    actionId: string;
    label: string;
    icon?: string;
    isDisabled?: boolean;
  }) => {
    if (actionItems.some((item) => item.actionId === actionId)) {
      return;
    }

    actionItems.push({
      id: `action-${actionId}`,
      actionId,
      density: 'standard',
      structuralState: 'stale',
      label,
      icon,
      isDisabled,
    });
  };

  const wasReassigned = task.status === 'new' && isTaskCreator && (task.activities || []).some((a: any) => a.description?.toLowerCase().includes('reassigned'));
  const canEditTask = (isTaskCreator || isPMOrAdmin) && !isTriageState;

  if (canEditTask && !isReviewerApprovalState) {
    addActionItem({
      actionId: 'edit_task',
      label: t.taskDetail.editTaskDetails,
      icon: 'create-outline',
    });
  }

  if (!isTriageState && isAwaitingAcceptance) {
    addActionItem({
      actionId: 'accept_task',
      label: t.taskDetail.accept,
      icon: 'checkmark-circle-outline',
    });
    addActionItem({
      actionId: 'decline_task',
      label: t.taskDetail.decline,
      icon: 'close-circle-outline',
    });
  }

  if (!isTriageState && isReviewerApprovalState) {
    addActionItem({
      actionId: 'approve_task',
      label: 'Approve',
      icon: 'checkmark-circle-outline',
    });
    addActionItem({
      actionId: 'reject_task',
      label: 'Reject',
      icon: 'close-circle-outline',
    });
    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });
  }

  if (
    !isTriageState &&
    (isActiveWorkState ||
      isContributorReviewState ||
      isReviewerApprovalState ||
      isContributorUpdateLocked)
  ) {
    if (isAssignedToMe || isReviewerApprovalState) {
      addActionItem({
        actionId: 'update_progress',
        label: 'Update',
        icon: 'create-outline',
        isDisabled: isContributorUpdateLocked,
      });
    }

    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });

    // Subtask create UI is deferred (product lock 2026-09-07) — do not emit add_subtask.
    // Domain createSubTask / parentTaskId remain for existing rows + a future enhancement.
  }

  const canReassignAfterDecline =
    (isTaskCreator || isPMOrAdmin) &&
    (task.status === "declined" || displayStatus === "declined");

  if (canReassignAfterDecline) {
    // Reassign: bottom dock + Team section (expanded). Keep actionItem for routing.
    addActionItem({
      actionId: 'reassign_task',
      label: 'Reassign',
      icon: 'people-outline',
    });
  }

  if (isTaskCreator && wasReassigned && !isTriageState) {
    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });
  }

  if (canArchiveTask) {
    // Archive lives on the bottom dock after approval.
    addActionItem({
      actionId: 'archive_task',
      label: 'Archive',
      icon: 'archive-outline',
    });
  }

  const quickActionIds = isTriageState
    ? []
    : isAwaitingAcceptance
      ? ['accept_task', 'decline_task']
      : [];

  const quickActions: TaskDetailQuickActionRowModel | undefined = quickActionIds.length
    ? {
        id: 'task-quick-actions',
        density: 'standard',
        structuralState: 'stale',
        actions: quickActionIds
          .map((actionId) => actionItems.find((action) => action.actionId === actionId))
          .filter((action): action is TaskDetailActionItem => Boolean(action)),
      }
    : undefined;

  const detailDock = canContributeToReport
    ? {
        mode: "report_reply" as const,
        completionPercentage: Number(task.completionPercentage) || 0,
      }
    : isReviewerApprovalState
      ? {
          // Creator or PM/admin → Accept / Reject (takes priority over assignee cancel).
          mode: "review_decision" as const,
          completionPercentage: Math.max(0, Number(task.completionPercentage) || 100),
        }
      : showAssigneeCancelReviewDock
        ? {
            // Worker assignee submitted → Cancel review.
            mode: "awaiting_review" as const,
            completionPercentage: Math.max(0, Number(task.completionPercentage) || 100),
          }
        : actionItems.some(
              (action) => action.actionId === "update_progress" && !action.isDisabled,
            )
          ? {
              mode: "progress" as const,
              completionPercentage: Number(task.completionPercentage) || 0,
            }
          : canArchiveTask
            ? {
                mode: "archive" as const,
                completionPercentage: Math.max(
                  0,
                  Number(task.completionPercentage) || 100,
                ),
              }
            : canReassignAfterDecline
              ? {
                  mode: "reassign" as const,
                  completionPercentage: Number(task.completionPercentage) || 0,
                }
              : undefined;

  if (
    !isTriageState &&
    isTaskCreator &&
    task.status !== 'declined' &&
    !wasReassigned &&
    !isReviewerApprovalState
  ) {
    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });
  }

  return {
    output: {
      screenId: 'TaskDetailScreen',
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
        freshnessLabel: '',
      },
      header: {
        taskId: task.id,
        title: t.tasks.taskDetails,
        statusLabel: getStatusLabel(displayStatus),
        projectName: task.projectId || 'Unknown Project',
        assigneeSummary: assignees.map((a) => a.name).join(', ') || 'Unassigned',
      },
      taskHero,
      delegationSummary,
      infoCard,
      quickActions,
      activeStage,
      evidenceSummary,
      activityThread,
      subtaskSummary,
      detailSections,
      actionItems,
      scalarMetrics: {
        attachmentCount: totalEvidencePhotoCount,
        updateCount: activities.length,
        childTaskCount: childTasks.length,
        completionPercentage: task.completionPercentage,
      },
      banners,
      activities,
      assigners,
      assignees,
      childTasks,
      canEditDelegation,
      reportTriage,
      detailDock,
    },
    actions: {
      acceptTask: async () => {
        if (isViewingSubTask && subTaskId) {
          await acceptSubTask(taskId, subTaskId, user.id);
        } else {
          await acceptTask(task.id, user.id);
        }
        await fetchTask();
      },
      declineTask: async (reason: string) => {
        if (isViewingSubTask && subTaskId) {
          await declineSubTask(taskId, subTaskId, user.id, reason);
        } else {
          await declineTask(task.id, user.id, reason);
        }
        await fetchTask();
      },
      submitForReview: async () => {
        if (isViewingSubTask && subTaskId) {
          await submitSubTaskForReview(taskId, subTaskId);
        } else {
          await submitTaskForReview(task.id);
        }
        await fetchTask();
      },
      approveTask: async () => {
        if (isViewingSubTask && subTaskId) {
          await acceptSubTaskCompletion(taskId, subTaskId, user.id);
        } else {
          await acceptTaskCompletion(task.id, user.id);
        }
        await fetchTask();
      },
      toggleCriticalThisWeek: async () => {
        await updateTask(task.id, {
          tags: withCriticalThisWeekTag(task.tags, !isCriticalThisWeek),
        } as Partial<Task>);
        await fetchTask();
      },
      setPrimaryAssignee: async (userId: string) => {
        if (!canEditDelegation) {
          return;
        }
        const candidate = getUserById(userId);
        if (
          !canSelectUserAsAssignee({
            candidateUserId: userId,
            assignableUserIds: assignedTo,
            actorRole: actorAssigneeRole,
            candidateRole: resolveAssigneeRoleFromUser(candidate),
          })
        ) {
          return;
        }
        const nextAssignedTo = mergeAssignedToIds({
          assignedTo: task.assignedTo || [],
          primaryAssigneeId: userId,
          delegatedUserIds: task.delegatedUserIds || [],
        });
        if (!nextAssignedTo.includes(userId)) {
          nextAssignedTo.push(userId);
        }
        const delegatedUserIds = normalizeDelegatedUserIds(nextAssignedTo, userId);
        await updateTask(task.id, {
          assignedTo: mergeAssignedToIds({
            primaryAssigneeId: userId,
            delegatedUserIds,
          }),
          primaryAssigneeId: userId,
          delegatedUserIds,
        } as Partial<Task>);
        await fetchTask();
      },
      toggleDelegate: async (userId: string) => {
        if (!canEditDelegation) {
          return;
        }
        const candidate = getUserById(userId);
        if (
          !canSelectUserAsAssignee({
            candidateUserId: userId,
            assignableUserIds: assignedTo,
            actorRole: actorAssigneeRole,
            candidateRole: resolveAssigneeRoleFromUser(candidate),
          })
        ) {
          return;
        }
        const primaryAssigneeId =
          resolvePrimaryAssigneeId(
            mergeAssignedToIds({
              assignedTo: task.assignedTo || [],
              primaryAssigneeId: task.primaryAssigneeId,
              delegatedUserIds: task.delegatedUserIds || [],
            }),
            task.primaryAssigneeId,
          ) || task.primaryAssigneeId;
        if (!userId || userId === primaryAssigneeId) {
          return;
        }
        const currentDelegates = normalizeDelegatedUserIds(
          task.delegatedUserIds?.length
            ? task.delegatedUserIds
            : mergeAssignedToIds({
                assignedTo: task.assignedTo || [],
                primaryAssigneeId,
              }),
          primaryAssigneeId,
        );
        const delegatedUserIds = currentDelegates.includes(userId)
          ? currentDelegates.filter((id) => id !== userId)
          : [...currentDelegates, userId];
        await updateTask(task.id, {
          assignedTo: mergeAssignedToIds({
            primaryAssigneeId,
            delegatedUserIds,
          }),
          primaryAssigneeId: primaryAssigneeId || undefined,
          delegatedUserIds,
        } as Partial<Task>);
        await fetchTask();
      },
      setLocationOnSite: async (locationLabel: string) => {
        const trimmed = String(locationLabel || "").trim();
        if (task.projectId && trimmed) {
          await ensureProjectLocation(task.projectId, trimmed, user.id);
        }
        await updateTask(task.id, {
          locationOnSite: trimmed || undefined,
        } as Partial<Task>);
        await fetchTask();
      },
      setTaskContainers: async ({ containerId, subContainerId }) => {
        await updateTask(task.id, {
          containerId: containerId || undefined,
          subContainerId: subContainerId || undefined,
        } as Partial<Task>);
        await fetchTask();
      },
      addCustomTag: async (rawTag: string) => {
        const tag = rawTag.trim().toLowerCase().replace(/\s+/g, '_');
        if (!tag) {
          return;
        }
        const nextTags = withCriticalThisWeekTag(
          [...getTaskTags(task.tags).filter((entry) => entry !== tag), tag],
          isCriticalThisWeek,
        );
        await updateTask(task.id, { tags: nextTags } as Partial<Task>);
        await fetchTask();
      },
      removeCustomTag: async (tag: string) => {
        const nextTags = getTaskTags(task.tags).filter((entry) => entry !== tag);
        await updateTask(task.id, { tags: nextTags } as Partial<Task>);
        await fetchTask();
      },
      archiveTask: async () => {
        await archiveTask(task.id, user.id);
        if (typeof fetchArchivedTasks === "function") {
          await fetchArchivedTasks();
        }
      },
      cancelTask: async () => {
        await cancelTask(task.id, user.id);
        await fetchTask();
      },
      triageTask: async (payload: {
        assignedTo: string[];
        primaryAssigneeId?: string;
        delegatedUserIds?: string[];
        dueDate?: string;
        priority?: Priority;
        category?: TaskCategory;
        billingStatus?: BillingStatus;
        locationOnSite?: string;
      }) => {
        await taskStore.triageTask(task.id, payload, user.id);
        await fetchTask();
      },
      replyToReport: async (payload: { description: string; photos?: string[] }) => {
        await addAssignerComment(task.id, {
          description: payload.description,
          photos: payload.photos || [],
          userId: user.id,
        });
        await fetchTask();
      },
      submitDockProgress: async (payload: {
        description: string;
        photos?: string[];
        completionPercentage: number;
      }) => {
        const calculatedStatus: TaskStatus =
          task.status === "accepted" ||
          task.status === "in_progress" ||
          task.status === "submitted_for_review"
            ? "in_progress"
            : task.status || "in_progress";
        const updatePayload = {
          description: payload.description,
          photos: payload.photos || [],
          completionPercentage: payload.completionPercentage,
          status: calculatedStatus,
          userId: user.id,
        };
        if (isViewingSubTask && subTaskId) {
          await addSubTaskUpdate(taskId, subTaskId, updatePayload);
        } else {
          await addTaskUpdate(task.id, updatePayload);
        }

        // At 100%, dock Send also submits for review (bottom dock owns this).
        // Description is required by the composer before Send fires.
        const shouldSubmitForReview =
          payload.completionPercentage >= 100 &&
          isAssignedToMe &&
          displayStatus !== "submitted_for_review" &&
          task.status !== "submitted_for_review" &&
          displayStatus !== "declined" &&
          displayStatus !== "cancelled" &&
          !isApprovedTaskStatus(displayStatus) &&
          !isPreAcceptanceTaskStatus(displayStatus);

        if (shouldSubmitForReview) {
          if (isViewingSubTask && subTaskId) {
            await submitSubTaskForReview(taskId, subTaskId);
          } else {
            await submitTaskForReview(task.id);
          }
        }

        await fetchTask();
      },
      cancelDockReview: async () => {
        if (isViewingSubTask && subTaskId) {
          await cancelSubTaskReviewSubmission(taskId, subTaskId);
        } else {
          await cancelTaskReviewSubmission(task.id);
        }
        await fetchTask();
      },
      resolveReport: async (note?: string) => {
        await taskStore.resolveReport(task.id, user.id, note);
        await fetchTask();
      },
      dismissIssue: async (reason?: string) => {
        await taskStore.resolveReport(task.id, user.id, reason);
        await fetchTask();
      },
      fetchTask,
    },
  };
}
