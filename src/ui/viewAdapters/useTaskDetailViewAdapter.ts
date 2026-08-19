import { useMemo, useEffect, useCallback, useState } from 'react';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useUserStore } from '../../state/userStore.supabase';
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
  getTaskTags,
  hasCriticalThisWeekTag,
  resolvePrimaryAssigneeId,
  withCriticalThisWeekTag,
} from '../contracts/taskTags';
import {
  mergeAssignedToIds,
  normalizeDelegatedUserIds,
} from '../contracts/taskDelegation';
import {
  canEditTaskDelegation,
  canSelectUserAsAssignee,
  resolveAssigneeRoleFromUser,
} from '../contracts/taskDelegationPermissions';
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
import type { Task, TaskActivity, TaskStatus } from '../../types/buildtrack';
import type { StatusSemanticToken } from '../contracts/primitives';
import { isCompletedLifecycleStatus } from '../../utils/taskLifecycleStatus';

export interface UseTaskDetailViewAdapterProps {
  taskId: string;
  subTaskId?: string;
}

function isPreAcceptanceTaskStatus(status: TaskStatus): boolean {
  return (
    status === 'new' ||
    status === 'not_started' ||
    status === 'assigned' ||
    status === 'received'
  );
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

function isCreationActivity(activity: TaskActivity): boolean {
  return activity.activityType === 'creation';
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
    fetchTask: () => Promise<void>;
  };
} {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { tasks, fetchTaskById, acceptTask, declineTask, submitTaskForReview, acceptTaskCompletion, acceptSubTaskCompletion, submitSubTaskForReview, acceptSubTask, declineSubTask, archiveTask, cancelTask, updateTask, ensureProjectLocation, fetchArchivedTasks } = useTaskStore();
  const { getUserById } = useUserStore();
  const [signedUrlEpoch, bumpSignedUrlEpoch] = useState(0);

  const foundTask = tasks.find((t) => t.id === taskId);
  const subTask = subTaskId ? tasks.find((t) => t.id === subTaskId) : foundTask?.parentTaskId ? foundTask : null;
  const task = subTask || foundTask;
  const isViewingSubTask = !!subTask;

  const childTasksData = useMemo(
    () => (task ? tasks.filter((t) => t.parentTaskId === task.id) : []),
    [tasks, task?.id]
  );

  const fetchTask = useCallback(async () => {
    if (taskId) await fetchTaskById(taskId);
    if (subTaskId) await fetchTaskById(subTaskId);
  }, [taskId, subTaskId, fetchTaskById]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => subscribeSignedUrlCache(() => bumpSignedUrlEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (!task) {
      return;
    }
    const activityPhotos =
      task.activities?.flatMap((activity) => {
        const photos = (activity.data as { photos?: string[] } | undefined)?.photos;
        return Array.isArray(photos) ? photos : [];
      }) ?? [];
    const updatePhotos = task.updates?.flatMap((update) => update.photos ?? []) ?? [];
    const refs = [...(task.attachments ?? []), ...updatePhotos, ...activityPhotos].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );
    if (refs.length === 0) {
      return;
    }
    void prefetchSignedUrls(refs);
  }, [task]);

  // Touch epoch so memoized photo URIs rebuild after signed-URL cache fills.
  void signedUrlEpoch;

  if (!task || !user) {
    return {
      output: {
        screenId: 'TaskDetailScreen',
        readiness: {
          hasInitialFrame: false,
          hasUsableData: false,
          isBackgroundRefreshing: false,
          isNavigationTransitionActive: false,
        },
        continuity: {
          isInitialLoading: true,
          isBackgroundRefreshing: false,
          hasCachedFrame: false,
          shouldRenderSkeletonShell: true,
          shouldRenderEmptyState: false,
          freshnessLabel: '',
        },
        header: { taskId: '', title: '', statusLabel: '', projectName: '', assigneeSummary: '' },
        taskHero: {
          id: 'task-hero',
          density: 'standard',
          structuralState: 'stale',
          title: '',
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
        fetchTask,
      },
    };
  }

  const assignedTo = mergeAssignedToIds({
    assignedTo: task.assignedTo || [],
    primaryAssigneeId: task.primaryAssigneeId,
    delegatedUserIds: task.delegatedUserIds || [],
  });
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some((id) => String(id) === String(user.id));
  const isTaskCreator = String(task.assignedBy) === String(user.id);
  const actorAssigneeRole = resolveAssigneeRoleFromUser(user);
  const canEditDelegation = canEditTaskDelegation({
    actorUserId: user.id,
    taskAssignedBy: task.assignedBy,
    taskStatus: task.status,
  });
  const isCriticalThisWeek = hasCriticalThisWeekTag(task.tags);
  const isAwaitingAcceptance = isAssignedToMe && isPreAcceptanceTaskStatus(task.status);
  const isReviewerApprovalState =
    isTaskCreator && task.status === 'submitted_for_review' && task.completionPercentage === 100;
  const isContributorReviewState =
    isAssignedToMe &&
    !isTaskCreator &&
    task.completionPercentage === 100 &&
    task.status !== 'submitted_for_review' &&
    task.status !== 'declined' &&
    task.status !== 'cancelled' &&
    !isApprovedTaskStatus(task.status) &&
    !isPreAcceptanceTaskStatus(task.status);
  const isActiveWorkState = isActiveWorkTaskStatus(task.status) && !isContributorReviewState;
  const canArchiveTask =
    !isViewingSubTask &&
    !task.archivedAt &&
    isCompletedLifecycleStatus(task.status) &&
    (isAssignedToMe || isTaskCreator);

  const getStatusToken = (status: TaskStatus): StatusSemanticToken => {
    switch (status) {
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
      case 'declined': return 'task_submitted_for_review';
      default: return 'custom';
    }
  };

  const getStatusLabel = (status: TaskStatus) =>
    status?.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'New';

  const banners: TaskDetailBannerModel[] = [];

  if (isAssignedToMe && task.completionPercentage === 100 && task.status === 'submitted_for_review') {
    banners.push({
      id: 'banner-submitted',
      density: 'standard',
      structuralState: 'stale',
      type: 'submitted_for_review',
      title: t.taskDetail.submittedForReview,
      iconName: 'time-outline',
      colorScheme: 'amber',
    });
  }

  if (isTaskCreator && task.status === 'submitted_for_review' && task.completionPercentage === 100) {
    banners.push({
      id: 'banner-review-required',
      density: 'standard',
      structuralState: 'stale',
      type: 'review_required',
      title: 'Please Review Complete Task',
      iconName: 'time-outline',
      colorScheme: 'amber',
    });
  }

  if (isApprovedTaskStatus(task.status) && task.reviewedBy) {
    const reviewer = getUserById(task.reviewedBy)?.name || t.projects.unknown;
    const reviewDate = task.reviewedAt ? ` ${dateFormatter.formatDateShort(task.reviewedAt)}` : '';
    banners.push({
      id: 'banner-approved',
      density: 'standard',
      structuralState: 'stale',
      type: 'approved',
      title: `✓ ${t.taskDetail.taskApproved}`,
      subtitle: `${t.taskDetail.reviewedAndApproved} ${reviewer}${reviewDate}`,
      iconName: 'checkmark-done-circle',
      colorScheme: 'green',
    });
  }

  if (task.status === 'declined' && task.assignedBy === user.id) {
    const declineActivity = task.activities?.find(
      (a: any) => a.activityType === 'status_change' && a.status === 'declined'
    );
    const declinedByUser = declineActivity?.userId ? getUserById(declineActivity.userId) : null;
    banners.push({
      id: 'banner-declined',
      density: 'standard',
      structuralState: 'stale',
      type: 'declined',
      title: declinedByUser ? `Task Declined by ${declinedByUser.name}` : t.taskDetail.taskDeclined,
      subtitle: task.declinedReason ? `${t.taskDetail.reason} ${task.declinedReason}` : undefined,
      iconName: 'close-circle',
      colorScheme: 'red',
    });
  }

  if (task.status === 'rejected' && task.completionPercentage === 100 && task.assignedBy === user.id) {
    banners.push({
      id: 'banner-rejected',
      density: 'standard',
      structuralState: 'stale',
      type: 'rejected',
      title: t.taskDetail.taskRejected,
      subtitle: t.taskDetail.completionRejected || 'Task completion was rejected. The assignee needs to make corrections.',
      iconName: 'close-circle',
      colorScheme: 'red',
    });
  }

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
    descriptionLabel: task.description || '',
    siteLocationLabel: task.locationOnSite || '',
    assignedByLabel: delegationSummary.assignedByLabel,
    assignedToLabel: delegationSummary.assignedToLabel,
    primaryOwnerLabel: delegationSummary.primaryOwnerLabel,
    primaryAssigneeId: primaryAssigneeId || task.primaryAssigneeId,
    delegatedUserIds,
    delegatedLabels: delegatedAssignees.map((d) => d.name),
    containerId: task.containerId,
    subContainerId: task.subContainerId,
    tagLabels: getTaskTags(task.tags),
    statusLabel: getStatusLabel(task.status),
    categoryLabel: humanizeToken(task.category || 'general'),
    completionLabel: `${task.completionPercentage}% complete`,
    dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
    isCritical: isCriticalThisWeek,
    criticalLabel: isCriticalThisWeek ? 'Critical this week' : undefined,
    isAssignedToCurrentUser: isAssignedToMe,
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
      isCreationActivity(activity) &&
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
      eventLabel: buildTaskDetailHeadline(activity, activityHeadlineContextById.get(activity.id)),
      timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
      progressLabel:
        activity.completionPercentage !== undefined
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
    statusLabel: getStatusLabel(task.status),
    categoryLabel: humanizeToken(task.category || 'general'),
    projectLabel: task.projectId || 'Unknown Project',
    completionLabel: `${task.completionPercentage}% complete`,
    dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
    nextStepLabel: undefined,
    isCritical: isCriticalThisWeek,
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
  }: {
    actionId: string;
    label: string;
    icon?: string;
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
      isDisabled: false,
    });
  };

  const wasReassigned = task.status === 'new' && isTaskCreator && (task.activities || []).some((a: any) => a.description?.toLowerCase().includes('reassigned'));
  const canEditTask = isTaskCreator;

  if (canEditTask && !isReviewerApprovalState) {
    addActionItem({
      actionId: 'edit_task',
      label: t.taskDetail.editTaskDetails,
      icon: 'create-outline',
    });
  }

  if (isAwaitingAcceptance) {
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

  if (isReviewerApprovalState) {
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

  if (isActiveWorkState || isContributorReviewState || isReviewerApprovalState) {
    if (isAssignedToMe || isReviewerApprovalState) {
      addActionItem({
        actionId: 'update_progress',
        label: 'Update',
        icon: 'create-outline',
      });
    }

    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });

    if (!isViewingSubTask && isActiveWorkState) {
      addActionItem({
        actionId: 'add_subtask',
        label: 'Add Subtask',
        icon: 'add-circle-outline',
      });
    }
  }

  if (isContributorReviewState) {
    addActionItem({
      actionId: 'submit_review',
      label: 'Submit for Review',
      icon: 'send',
    });
  }

  if (isTaskCreator && task.status === 'declined') {
    addActionItem({
      actionId: 'reassign_task',
      label: 'Reassign',
      icon: 'people-outline',
    });
  }

  if (isTaskCreator && wasReassigned) {
    addActionItem({
      actionId: 'add_comment',
      label: 'Add Comment',
      icon: 'chatbubble-outline',
    });
  }

  if (canArchiveTask) {
    addActionItem({
      actionId: 'archive_task',
      label: 'Archive',
      icon: 'archive-outline',
    });
  }

  const quickActionIds = isAwaitingAcceptance
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

  if (isTaskCreator && task.status !== 'declined' && !wasReassigned && !isReviewerApprovalState) {
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
        title: task.title,
        statusLabel: getStatusLabel(task.status),
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
      fetchTask,
    },
  };
}
