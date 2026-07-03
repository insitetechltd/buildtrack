import { useMemo, useEffect, useCallback } from 'react';
import { useTaskStore } from '../../state/taskStore.supabase';
import { useAuthStore } from '../../state/authStore';
import { useUserStore } from '../../state/userStore.supabase';
import { useDateFormatter } from '../../utils/dateFormatter';
import { useTranslation } from '../../utils/useTranslation';
import { getResponsibilityToken } from '../../utils/accountabilityEngine';
import type {
  TaskDetailScreenViewAdapterOutput,
  TaskDetailBannerModel,
  TaskDetailActivityModel,
  TaskDetailAssigneeModel,
  TasksScreenRowItem,
  TaskDetailActionItem,
  TaskDetailSectionModel,
} from '../contracts/viewAdapters';
import type { Task, TaskStatus } from '../../types/buildtrack';
import type { StatusSemanticToken } from '../contracts/primitives';

export interface UseTaskDetailViewAdapterProps {
  taskId: string;
  subTaskId?: string;
}

function isPreAcceptanceTaskStatus(status: TaskStatus): boolean {
  return status === 'new' || status === 'not_started';
}

function isApprovedTaskStatus(status: TaskStatus): boolean {
  return status === 'approved' || status === 'completed' || status === 'done';
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
    cancelTask: () => Promise<void>;
    fetchTask: () => Promise<void>;
  };
} {
  const t = useTranslation();
  const dateFormatter = useDateFormatter();
  const { user } = useAuthStore();
  const { tasks, fetchTaskById, acceptTask, declineTask, submitTaskForReview, acceptTaskCompletion, acceptSubTaskCompletion, submitSubTaskForReview, acceptSubTask, declineSubTask, cancelTask } = useTaskStore();
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
        cancelTask: async () => {},
        fetchTask,
      },
    };
  }

  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some((id) => String(id) === String(user.id));
  const isTaskCreator = String(task.assignedBy) === String(user.id);

  const getStatusToken = (status: TaskStatus): StatusSemanticToken => {
    switch (status) {
      case 'new': return 'task_new';
      case 'not_started': return 'task_new';
      case 'accepted': return 'task_accepted';
      case 'in_progress': return 'task_in_progress';
      case 'submitted_for_review': return 'task_submitted_for_review';
      case 'approved': return 'task_approved';
      case 'completed': return 'task_approved';
      case 'done': return 'task_approved';
      case 'rejected': return 'task_rejected';
      case 'cancelled': return 'task_cancelled';
      case 'declined': return 'task_rejected';
      default: return 'custom';
    }
  };

  const getStatusLabel = (status: TaskStatus) => status?.replace(/_/g, ' ') || 'new';

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

  const allTaskFiles = new Set<string>();
  if (task.attachments) task.attachments.forEach(a => allTaskFiles.add(a));
  activities.forEach(a => a.photos.forEach(p => allTaskFiles.add(p)));

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
      detailSections,
      actionItems,
      scalarMetrics: {
        attachmentCount: allTaskFiles.size,
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
      cancelTask: async () => {
        await cancelTask(task.id, user.id);
        await fetchTask();
      },
      fetchTask,
    },
  };
}
