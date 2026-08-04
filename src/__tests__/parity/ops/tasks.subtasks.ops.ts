import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParityTarget } from '../harness/parityEnv';
import { writeTaskStatusPayload } from '../adapters/status.adapter';
import { createTask, fetchTaskById } from './tasks.lifecycle.ops';
import type { Task } from '@/types/buildtrack';

export async function createSubTask(
  service: SupabaseClient,
  input: {
    parentTask: Task;
    title: string;
    assignedBy: string;
    assigneeIds: string[];
    target: ParityTarget;
  },
): Promise<string> {
  const statusPayload = writeTaskStatusPayload('new', input.target);
  const nestingLevel = (input.parentTask.nestingLevel || 0) + 1;
  const rootTaskId = input.parentTask.rootTaskId || input.parentTask.id;

  const { data, error } = await service
    .from('tasks')
    .insert({
      project_id: input.parentTask.projectId,
      parent_task_id: input.parentTask.id,
      nesting_level: nestingLevel,
      root_task_id: rootTaskId,
      title: input.title,
      description: 'Parity subtask',
      priority: 'medium',
      category: 'general',
      billing_status: 'non_billable',
      completion_percentage: 0,
      assigned_by: input.assignedBy,
      assigned_to: input.assigneeIds,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      attachments: [],
      starred_by_users: [],
      ...statusPayload,
    })
    .select('id')
    .single();

  if (error) {
    // Fallback: create as normal task then link parent if columns missing
    const fallbackId = await createTask(service, {
      projectId: input.parentTask.projectId,
      title: input.title,
      assignedBy: input.assignedBy,
      assigneeIds: input.assigneeIds,
      target: input.target,
    });
    await service
      .from('tasks')
      .update({
        parent_task_id: input.parentTask.id,
        nesting_level: nestingLevel,
        root_task_id: rootTaskId,
      })
      .eq('id', fallbackId);
    return fallbackId;
  }

  return data.id as string;
}

export async function updateSubTaskStatus(
  service: SupabaseClient,
  input: {
    taskId: string;
    status: string;
    target: ParityTarget;
  },
): Promise<void> {
  const { error } = await service
    .from('tasks')
    .update({
      ...writeTaskStatusPayload(input.status, input.target),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.taskId);

  if (error) {
    throw error;
  }
}

export async function deleteSubTask(
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

export async function fetchSubTask(
  service: SupabaseClient,
  taskId: string,
  target: ParityTarget,
): Promise<Task> {
  return fetchTaskById(service, taskId, target);
}
