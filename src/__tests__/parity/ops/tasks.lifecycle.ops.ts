import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParityTarget } from '../harness/parityEnv';
import { mapTaskRowToDomain } from '../adapters/taskRead.adapter';
import { writeAssignees } from '../adapters/taskWrite.adapter';
import {
  writeDeclineReasonPayload,
  writeTaskStatusPayload,
} from '../adapters/status.adapter';
import type { Task } from '@/types/buildtrack';

async function insertActivity(
  service: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    activityType: string;
    description: string;
    status?: string;
    completionPercentage?: number;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await service.from('task_activities').insert({
    task_id: input.taskId,
    user_id: input.userId,
    activity_type: input.activityType,
    description: input.description,
    status: input.status ?? null,
    completion_percentage: input.completionPercentage ?? null,
    data: input.data || {},
    timestamp: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function createTask(
  service: SupabaseClient,
  input: {
    projectId: string;
    title: string;
    assignedBy: string;
    assigneeIds: string[];
    target: ParityTarget;
    locationOnSite?: string;
    dueDate?: string;
  },
): Promise<string> {
  const statusPayload = writeTaskStatusPayload('new', input.target);
  const insertPayload: Record<string, unknown> = {
    project_id: input.projectId,
    title: input.title,
    description: 'Parity lifecycle task',
    priority: 'medium',
    category: 'general',
    billing_status: 'non_billable',
    completion_percentage: 0,
    assigned_by: input.assignedBy,
    assigned_to: input.assigneeIds,
    due_date: input.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    location_on_site: input.locationOnSite || null,
    attachments: [],
    starred_by_users: [],
    ...statusPayload,
  };

  const { data, error } = await service
    .from('tasks')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    // Retry without optional redesign columns if schema lags
    delete insertPayload.location_on_site;
    const retry = await service.from('tasks').insert(insertPayload).select('id').single();
    if (retry.error) {
      throw error;
    }
    await writeAssignees(service, {
      taskId: retry.data.id,
      assigneeIds: input.assigneeIds,
      primaryAssigneeId: input.assigneeIds[0],
      createdBy: input.assignedBy,
      target: input.target,
    });
    await insertActivity(service, {
      taskId: retry.data.id,
      userId: input.assignedBy,
      activityType: 'creation',
      description: 'Task created',
      status: 'new',
    });
    return retry.data.id as string;
  }

  const taskId = data.id as string;
  await writeAssignees(service, {
    taskId,
    assigneeIds: input.assigneeIds,
    primaryAssigneeId: input.assigneeIds[0],
    createdBy: input.assignedBy,
    target: input.target,
  });

  await insertActivity(service, {
    taskId,
    userId: input.assignedBy,
    activityType: 'creation',
    description: 'Task created',
    status: 'new',
  });

  return taskId;
}

export async function fetchTaskById(
  service: SupabaseClient,
  taskId: string,
  target: ParityTarget,
): Promise<Task> {
  const { data, error } = await service
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    throw error;
  }

  const activities = await service
    .from('task_activities')
    .select('*')
    .eq('task_id', taskId)
    .order('timestamp', { ascending: true });

  if (activities.error) {
    throw activities.error;
  }

  return mapTaskRowToDomain(service, data as Record<string, unknown>, {
    target,
    activities: (activities.data || []) as Record<string, unknown>[],
  });
}

export async function fetchTasksByProject(
  service: SupabaseClient,
  projectId: string,
  target: ParityTarget,
): Promise<Task[]> {
  const { data, error } = await service
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .is('cancelled_at', null)
    .is('archived_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const taskIds = (data || []).map((t: { id: string }) => t.id);
  const activities =
    taskIds.length === 0
      ? { data: [], error: null }
      : await service
          .from('task_activities')
          .select('*')
          .in('task_id', taskIds)
          .order('timestamp', { ascending: true });

  if (activities.error) {
    throw activities.error;
  }

  const byTask: Record<string, Record<string, unknown>[]> = {};
  for (const row of activities.data || []) {
    const id = String((row as { task_id: string }).task_id);
    if (!byTask[id]) {
      byTask[id] = [];
    }
    byTask[id].push(row as Record<string, unknown>);
  }

  return Promise.all(
    (data || []).map((row: Record<string, unknown>) =>
      mapTaskRowToDomain(service, row, {
        target,
        activities: byTask[String(row.id)] || [],
      }),
    ),
  );
}

async function updateTaskStatus(
  service: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    status: string;
    target: ParityTarget;
    description: string;
    extra?: Record<string, unknown>;
  },
): Promise<void> {
  const payload = {
    ...writeTaskStatusPayload(input.status, input.target),
    ...(input.extra || {}),
    updated_at: new Date().toISOString(),
  };

  const { error } = await service.from('tasks').update(payload).eq('id', input.taskId);
  if (error) {
    throw error;
  }

  await insertActivity(service, {
    taskId: input.taskId,
    userId: input.userId,
    activityType: 'status_change',
    description: input.description,
    status: input.status,
  });
}

export async function acceptTask(
  service: SupabaseClient,
  input: { taskId: string; userId: string; target: ParityTarget },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'in_progress',
    target: input.target,
    description: 'Task accepted',
    extra: {
      accepted: true,
      accepted_by: input.userId,
      accepted_at: new Date().toISOString(),
    },
  });
}

export async function declineTask(
  service: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    reason: string;
    target: ParityTarget;
  },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'declined',
    target: input.target,
    description: `Task declined: ${input.reason}`,
    extra: writeDeclineReasonPayload(input.reason),
  });
}

export async function addTaskUpdate(
  service: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    description: string;
    completionPercentage: number;
    photos?: string[];
  },
): Promise<void> {
  const { error } = await service
    .from('tasks')
    .update({
      completion_percentage: input.completionPercentage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.taskId);

  if (error) {
    throw error;
  }

  await insertActivity(service, {
    taskId: input.taskId,
    userId: input.userId,
    activityType: 'progress_update',
    description: input.description,
    completionPercentage: input.completionPercentage,
    data: { photos: input.photos || [] },
  });
}

export async function submitTaskForReview(
  service: SupabaseClient,
  input: { taskId: string; userId: string; target: ParityTarget },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'submitted_for_review',
    target: input.target,
    description: 'Submitted for review',
    extra: {
      completion_percentage: 100,
      ready_for_review: true,
    },
  });
}

export async function acceptTaskCompletion(
  service: SupabaseClient,
  input: { taskId: string; userId: string; target: ParityTarget },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'approved',
    target: input.target,
    description: 'Completion approved',
    extra: {
      review_accepted: true,
      reviewed_by: input.userId,
      reviewed_at: new Date().toISOString(),
    },
  });
}

export async function rejectTaskCompletion(
  service: SupabaseClient,
  input: {
    taskId: string;
    userId: string;
    reason: string;
    target: ParityTarget;
  },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'rejected',
    target: input.target,
    description: `Completion rejected: ${input.reason}`,
    extra: {
      rejected_reason: input.reason,
      reviewed_by: input.userId,
      reviewed_at: new Date().toISOString(),
    },
  });
}

export async function assignTask(
  service: SupabaseClient,
  input: {
    taskId: string;
    actorId: string;
    assigneeIds: string[];
    target: ParityTarget;
  },
): Promise<void> {
  await writeAssignees(service, {
    taskId: input.taskId,
    assigneeIds: input.assigneeIds,
    primaryAssigneeId: input.assigneeIds[0],
    createdBy: input.actorId,
    target: input.target,
  });

  if (input.target === 'old') {
    const { error } = await service
      .from('tasks')
      .update({ assigned_to: input.assigneeIds })
      .eq('id', input.taskId);
    if (error) {
      throw error;
    }
  }

  await insertActivity(service, {
    taskId: input.taskId,
    userId: input.actorId,
    activityType: 'assignment',
    description: 'Task reassigned',
    data: { assigneeIds: input.assigneeIds },
  });
}

export async function cancelTask(
  service: SupabaseClient,
  input: { taskId: string; userId: string; target: ParityTarget },
): Promise<void> {
  await updateTaskStatus(service, {
    taskId: input.taskId,
    userId: input.userId,
    status: 'cancelled',
    target: input.target,
    description: 'Task cancelled',
    extra: {
      cancelled_at: new Date().toISOString(),
      cancelled_by: input.userId,
    },
  });
}

export async function archiveTask(
  service: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<void> {
  const { error } = await service
    .from('tasks')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: input.userId,
    })
    .eq('id', input.taskId);

  if (error) {
    throw error;
  }

  await insertActivity(service, {
    taskId: input.taskId,
    userId: input.userId,
    activityType: 'metadata_edit',
    description: 'Task archived',
  });
}

export async function softDeleteTask(
  service: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<void> {
  const { error } = await service
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: input.userId,
    })
    .eq('id', input.taskId);

  if (error) {
    throw error;
  }
}

export async function updateTaskMetadata(
  service: SupabaseClient,
  input: {
    taskId: string;
    title?: string;
    tags?: string[];
    locationOnSite?: string;
    billingStatus?: string;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.title != null) payload.title = input.title;
  if (input.tags != null) payload.tags = input.tags;
  if (input.locationOnSite != null) payload.location_on_site = input.locationOnSite;
  if (input.billingStatus != null) payload.billing_status = input.billingStatus;

  const { error } = await service.from('tasks').update(payload).eq('id', input.taskId);
  if (error) {
    // Retry without optional columns
    delete payload.tags;
    delete payload.location_on_site;
    const retry = await service.from('tasks').update(payload).eq('id', input.taskId);
    if (retry.error) {
      throw error;
    }
  }
}

export async function addAssignerComment(
  service: SupabaseClient,
  input: { taskId: string; userId: string; comment: string },
): Promise<void> {
  await insertActivity(service, {
    taskId: input.taskId,
    userId: input.userId,
    activityType: 'assigner_comment',
    description: input.comment,
  });
}
