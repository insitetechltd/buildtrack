import type { SupabaseClient } from '@supabase/supabase-js';

export async function markTaskAsRead(
  service: SupabaseClient,
  input: { userId: string; taskId: string },
): Promise<void> {
  const { error } = await service.from('task_read_status').upsert({
    user_id: input.userId,
    task_id: input.taskId,
    read_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export async function fetchReadStatuses(
  service: SupabaseClient,
  userId: string,
): Promise<Array<{ taskId: string; readAt: string }>> {
  const { data, error } = await service
    .from('task_read_status')
    .select('task_id, read_at')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data || []).map((row: { task_id: string; read_at: string }) => ({
    taskId: row.task_id,
    readAt: row.read_at,
  }));
}

export async function toggleTaskStar(
  service: SupabaseClient,
  input: { taskId: string; userId: string },
): Promise<string[]> {
  const { data, error } = await service
    .from('tasks')
    .select('starred_by_users')
    .eq('id', input.taskId)
    .single();

  if (error) {
    throw error;
  }

  const current: string[] = Array.isArray(data?.starred_by_users)
    ? data.starred_by_users.map(String)
    : [];

  const next = current.includes(input.userId)
    ? current.filter((id) => id !== input.userId)
    : [...current, input.userId];

  const updated = await service
    .from('tasks')
    .update({ starred_by_users: next })
    .eq('id', input.taskId);

  if (updated.error) {
    throw updated.error;
  }

  return next;
}

export function computeUnreadCount(
  taskIds: string[],
  readTaskIds: string[],
): number {
  const read = new Set(readTaskIds);
  return taskIds.filter((id) => !read.has(id)).length;
}
