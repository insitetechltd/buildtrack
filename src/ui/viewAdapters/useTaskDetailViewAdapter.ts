import { useMemo, useEffect, useCallback } from 'react';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useUserStore } from '../../state/userStore.supabase';
import { useDateFormatter } from '../../utils/dateFormatter';
import { useTranslation } from '../../utils/useTranslation';
import { getResponsibilityToken } from '../../utils/accountabilityEngine';
import { CRITICAL_THIS_WEEK_TAG } from '../contracts/viewAdapters';
import type {
  TaskDetailScreenViewAdapterOutput,
  TaskDetailBannerModel,
  TaskDetailActivityModel,
  TaskDetailActivityThreadRow,
  TaskDetailAssigneeModel,
  TaskDetailDelegationSummaryModel,
  TaskDetailEvidenceSummaryModel,
  TasksScreenRowItem,
  TaskDetailActionItem,
  TaskDetailHeroModel,
  TaskDetailSectionModel,
  TaskDetailSubtaskSummaryModel,
} from '../contracts/viewAdapters';
import type { Task, TaskActivity, TaskStatus } from '../../types/buildtrack';
import type { StatusSemanticToken } from '../contracts/primitives';

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
  return status === 'approved' || status === 'completed' || status === 'done';
}

function getTaskTags(tags?: string[]): string[] {
  return Array.isArray(tags) ? tags.filter(Boolean) : [];
}

function hasCriticalThisWeekTag(task: Pick<Task, 'tags'>): boolean {
  return getTaskTags(task.tags).includes(CRITICAL_THIS_WEEK_TAG);
}

function withCriticalThisWeekTag(tags: string[] | undefined, isEnabled: boolean): string[] {
  const normalizedTags = getTaskTags(tags).filter((tag) => tag !== CRITICAL_THIS_WEEK_TAG);

  return isEnabled ? [...normalizedTags, CRITICAL_THIS_WEEK_TAG] : normalizedTags;
}

function humanizeToken(value: string | undefined): string {
  if (!value) {
    return '';
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildTaskDetailEventLabel(activity: TaskActivity): string {
  switch (activity.activityType) {
    case 'progress_update':
      return activity.completionPercentage !== undefined
        ? `Updated progress to ${activity.completionPercentage}%`
        : 'Updated progress';
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

function buildTaskDetailEventDetail(activity: TaskActivity): string | undefined {
  const trimmedDescription = activity.description?.trim();
  const normalizedEventLabel = buildTaskDetailEventLabel(activity).toLowerCase();

  if (trimmedDescription && trimmedDescription.toLowerCase() !== normalizedEventLabel) {
    return trimmedDescription;
  }

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

function collectActivityPhotoUrls(activity: TaskActivity): string[] {
  const activityData = activity.data as { photos?: string[] } | undefined;
  return Array.isArray(activityData?.photos) ? activityData.photos.filter(Boolean) : [];
}

function collectLatestTaskPhotoUrls(task: Task, activities: TaskActivity[]): string[] {
  const orderedActivityPhotos = activities.flatMap((activity) => collectActivityPhotoUrls(activity));
  const taskAttachments = Array.isArray(task.attachments) ? task.attachments.filter(Boolean) : [];

  return [...orderedActivityPhotos, ...taskAttachments].slice(0, 3);
}

function collectTotalTaskPhotoCount(task: Task, activities: TaskActivity[]): number {
  const activityPhotoCount = activities.reduce(
    (total, activity) => total + collectActivityPhotoUrls(activity).length,
    0,
  );
  const taskAttachmentCount = Array.isArray(task.attachments) ? task.attachments.filter(Boolean).length : 0;

  return activityPhotoCount + taskAttachmentCount;
}

function buildNextStepLabel(
  task: Task,
  isAssignedToMe: boolean,
  isTaskCreator: boolean,
): string | undefined {
  if (isApprovedTaskStatus(task.status)) {
    return 'Work is complete and approved.';
  }

  if (task.status === 'submitted_for_review') {
    return isTaskCreator ? 'Review the submitted work.' : 'Waiting for review.';
  }

  if (task.status === 'declined') {
    return isTaskCreator ? 'Reassign or update task details.' : 'Review the decline reason.';
  }

  if (task.status === 'rejected') {
    return isAssignedToMe
      ? 'Update the work and resubmit for review.'
      : 'Waiting for the assignee to resubmit.';
  }

  if (isPreAcceptanceTaskStatus(task.status)) {
    return isAssignedToMe ? 'Accept this task to start work.' : 'Waiting for assignee acceptance.';
  }

  if (isAssignedToMe) {
    return 'Update progress and add photo evidence.';
  }

  if (isTaskCreator) {
    return 'Track progress and support the assignee.';
  }

  return 'Track the latest task updates.';
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
    cancelTask: () => Promise<void>;
    fetchTask: () => Promise<void>;
  };
} {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { tasks, fetchTaskById, acceptTask, declineTask, submitTaskForReview, acceptTaskCompletion, acceptSubTaskCompletion, submitSubTaskForReview, acceptSubTask, declineSubTask, cancelTask, updateTask } = useTaskStore();
  const { getUserById } = useUserStore();

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
        },
        delegationSummary: {
          id: 'delegation-summary',
          density: 'standard',
          structuralState: 'stale',
          assignedByLabel: '',
          assignedToLabel: '',
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
      },
      actions: {
        acceptTask: async () => {},
        declineTask: async () => {},
        submitForReview: async () => {},
        approveTask: async () => {},
        toggleCriticalThisWeek: async () => {},
        cancelTask: async () => {},
        fetchTask,
      },
    };
  }

  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some((id) => String(id) === String(user.id));
  const isTaskCreator = String(task.assignedBy) === String(user.id);
  const isCriticalThisWeek = hasCriticalThisWeekTag(task);

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

  const activityThread: TaskDetailActivityThreadRow[] = orderedActivities.map((activity) => ({
    id: activity.id,
    density: 'standard',
    structuralState: 'stale',
    actorLabel: getUserById(activity.userId)?.name || 'Unknown User',
    eventLabel: buildTaskDetailEventLabel(activity),
    timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
    detailLabel: buildTaskDetailEventDetail(activity),
    photoUrls: collectActivityPhotoUrls(activity),
    statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
  }));

  const totalEvidencePhotoCount = collectTotalTaskPhotoCount(task, orderedActivities);
  const latestEvidencePhotoUrls = collectLatestTaskPhotoUrls(task, orderedActivities);

  const taskHero: TaskDetailHeroModel = {
    id: 'task-hero',
    density: 'standard',
    structuralState: 'stale',
    title: task.title,
    statusLabel: getStatusLabel(task.status),
    projectLabel: task.projectId || 'Unknown Project',
    completionLabel: `${task.completionPercentage}% complete`,
    dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
    nextStepLabel: buildNextStepLabel(task, isAssignedToMe, isTaskCreator),
    isCritical: isCriticalThisWeek,
    criticalLabel: isCriticalThisWeek ? 'Critical this week' : undefined,
  };

  const primaryOwner = task.primaryAssigneeId
    ? getUserById(task.primaryAssigneeId)
    : assignees[0];

  const delegationSummary: TaskDetailDelegationSummaryModel = {
    id: 'delegation-summary',
    density: 'standard',
    structuralState: 'stale',
    assignedByLabel: assigners.map((assigner) => assigner.name).join(', ') || 'Unassigned',
    assignedToLabel: assignees.map((assignee) => assignee.name).join(', ') || 'Unassigned',
    primaryOwnerLabel: primaryOwner?.name,
    teamSummaryLabel: assignees.length > 1 ? `${assignees.length} assignees` : undefined,
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
      rows: [
        { id: 'row-due', label: t.taskDetail.due, value: dateFormatter.formatDateShort(task.dueDate) },
        { id: 'row-category', label: 'Category', value: task.category || 'General' },
      ],
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

  const wasReassigned = task.status === 'new' && isTaskCreator && (task.activities || []).some((a: any) => a.description?.toLowerCase().includes('reassigned'));
  const canUpdateProgress = isAssignedToMe && !isTaskCreator && (task.status === 'accepted' || task.status === 'in_progress' || (task.status === 'rejected' && task.completionPercentage === 100));
  const canEditTask = isTaskCreator;

  if (canEditTask && !(isTaskCreator && task.status === 'submitted_for_review' && task.completionPercentage === 100)) {
    actionItems.push({ id: 'action-edit', actionId: 'edit_task', density: 'standard', structuralState: 'stale', label: t.taskDetail.editTaskDetails, icon: 'create-outline', isDisabled: false });
  }

  if (isAssignedToMe && isPreAcceptanceTaskStatus(task.status)) {
    actionItems.push({ id: 'action-accept', actionId: 'accept_task', density: 'standard', structuralState: 'stale', label: t.taskDetail.accept, icon: 'checkmark-circle-outline', isDisabled: false });
    actionItems.push({ id: 'action-decline', actionId: 'decline_task', density: 'standard', structuralState: 'stale', label: t.taskDetail.decline, icon: 'close-circle-outline', isDisabled: false });
  } else if (isTaskCreator && task.status === 'submitted_for_review' && task.completionPercentage === 100) {
    actionItems.push({ id: 'action-approve', actionId: 'approve_task', density: 'standard', structuralState: 'stale', label: 'Approve', icon: 'checkmark-circle-outline', isDisabled: false });
    actionItems.push({ id: 'action-reject', actionId: 'reject_task', density: 'standard', structuralState: 'stale', label: 'Reject', icon: 'close-circle-outline', isDisabled: false });
  } else {
    if (isTaskCreator && task.status === 'declined') {
      actionItems.push({ id: 'action-reassign', actionId: 'reassign_task', density: 'standard', structuralState: 'stale', label: 'Reassign', icon: 'people-outline', isDisabled: false });
    }
    if (isTaskCreator && wasReassigned) {
      actionItems.push({ id: 'action-comment', actionId: 'add_comment', density: 'standard', structuralState: 'stale', label: 'Add Comment', icon: 'chatbubble-outline', isDisabled: false });
    }
    if (canUpdateProgress) {
      actionItems.push({ id: 'action-update', actionId: 'update_progress', density: 'standard', structuralState: 'stale', label: t.taskDetail.updateTask, icon: 'trending-up-outline', isDisabled: false });
      actionItems.push({ id: 'action-photos', actionId: 'upload_photos', density: 'standard', structuralState: 'stale', label: t.taskDetail.photosUpdates, icon: 'camera-outline', isDisabled: false });
    }
    if (isTaskCreator && task.status !== 'declined' && !wasReassigned) {
      actionItems.push({ id: 'action-comment', actionId: 'add_comment', density: 'standard', structuralState: 'stale', label: 'Add Comment', icon: 'chatbubble-outline', isDisabled: false });
    }
  }

  if (
    isAssignedToMe &&
    !isTaskCreator &&
    task.completionPercentage === 100 &&
    task.status !== 'submitted_for_review' &&
    !isApprovedTaskStatus(task.status)
  ) {
    actionItems.push({ id: 'action-submit-review', actionId: 'submit_review', density: 'standard', structuralState: 'stale', label: 'Completed - Review Submission', icon: 'send', isDisabled: false });
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
      cancelTask: async () => {
        await cancelTask(task.id, user.id);
        await fetchTask();
      },
      fetchTask,
    },
  };
}
