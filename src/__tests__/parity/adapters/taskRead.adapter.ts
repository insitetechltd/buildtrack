import type { Task, TaskActivity, TaskStatus } from '@/types/buildtrack';
import { readAssignees } from './taskWrite.adapter';
import { readDeclineReason, readTaskStatus } from './status.adapter';
import type { ParityTarget } from '../harness/parityEnv';

function mapActivity(row: Record<string, unknown>): TaskActivity {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    activityType: row.activity_type as TaskActivity['activityType'],
    timestamp: String(row.timestamp || row.created_at),
    data: (row.data as Record<string, unknown>) || {},
    description: String(row.description || ''),
    completionPercentage:
      row.completion_percentage == null
        ? undefined
        : Number(row.completion_percentage),
    status: row.status ? (String(row.status) as TaskStatus) : undefined,
    notificationsSent: Boolean(row.notifications_sent),
    notifiedAt: row.notified_at ? String(row.notified_at) : undefined,
    createdAt: String(row.created_at || row.timestamp),
  };
}

/**
 * Normalize a tasks row (+ optional activities) into the app Task domain shape.
 */
export async function mapTaskRowToDomain(
  service: { from: (table: string) => any },
  row: Record<string, unknown>,
  options: {
    target: ParityTarget;
    activities?: Record<string, unknown>[];
  },
): Promise<Task> {
  const assignedTo = await readAssignees(service, String(row.id), row, options.target);
  const activities = (options.activities || []).map(mapActivity);

  return {
    id: String(row.id),
    projectId: String(row.project_id),
    parentTaskId: row.parent_task_id ? String(row.parent_task_id) : null,
    nestingLevel: Number(row.nesting_level || 0),
    rootTaskId: row.root_task_id ? String(row.root_task_id) : null,
    title: String(row.title || ''),
    description: String(row.description || ''),
    taskReference: row.task_reference ? String(row.task_reference) : undefined,
    billingStatus: (row.billing_status as Task['billingStatus']) || 'non_billable',
    priority: (row.priority as Task['priority']) || 'medium',
    category: (row.category as Task['category']) || 'general',
    dueDate: String(row.due_date || new Date().toISOString()),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(String) : [],
    locationOnSite: row.location_on_site ? String(row.location_on_site) : undefined,
    assignedTo,
    primaryAssigneeId: row.primary_assignee_id
      ? String(row.primary_assignee_id)
      : undefined,
    delegatedUserIds: Array.isArray(row.delegated_user_ids)
      ? row.delegated_user_ids.map(String)
      : undefined,
    assignedBy: String(row.assigned_by || ''),
    originalAssignedBy: row.original_assigned_by
      ? String(row.original_assigned_by)
      : undefined,
    containerId: row.container_id ? String(row.container_id) : undefined,
    subContainerId: row.sub_container_id ? String(row.sub_container_id) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    updates: [],
    status: readTaskStatus(row) as TaskStatus,
    currentStatus: readTaskStatus(row) as TaskStatus,
    completionPercentage: Number(row.completion_percentage || 0),
    declinedReason: readDeclineReason(row),
    rejectedReason: row.rejected_reason ? String(row.rejected_reason) : undefined,
    activities,
    acceptedBy: row.accepted_by ? String(row.accepted_by) : undefined,
    accepted: Boolean(row.accepted),
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    starredByUsers: Array.isArray(row.starred_by_users)
      ? row.starred_by_users.map(String)
      : [],
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    cancelledBy: row.cancelled_by ? String(row.cancelled_by) : undefined,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    deletedBy: row.deleted_by ? String(row.deleted_by) : undefined,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    archivedBy: row.archived_by ? String(row.archived_by) : undefined,
    hasUnreadChanges: Boolean(row.has_unread_changes),
  };
}
