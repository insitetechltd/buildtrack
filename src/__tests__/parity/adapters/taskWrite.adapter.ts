import type { ParityTarget } from '../harness/parityEnv';

/**
 * Read assignee list from OLD (assigned_to uuid[]) or NEW (task_assignments).
 */
export async function readAssignees(
  service: {
    from: (table: string) => any;
  },
  taskId: string,
  taskRow: Record<string, unknown>,
  target: ParityTarget,
): Promise<string[]> {
  if (target === 'old') {
    const assigned = taskRow.assigned_to;
    if (Array.isArray(assigned)) {
      return assigned.map(String);
    }
    return [];
  }

  const { data, error } = await service
    .from('task_assignments')
    .select('user_id')
    .eq('task_id', taskId)
    .eq('is_active', true);

  if (error) {
    // NEW schema may not exist yet — fall back to assigned_to if present
    const assigned = taskRow.assigned_to;
    if (Array.isArray(assigned)) {
      return assigned.map(String);
    }
    throw error;
  }

  return (data || []).map((row: { user_id: string }) => String(row.user_id));
}

/**
 * Write assignees for OLD (array column) or NEW (task_assignments rows).
 */
export async function writeAssignees(
  service: {
    from: (table: string) => any;
  },
  input: {
    taskId: string;
    assigneeIds: string[];
    primaryAssigneeId?: string;
    createdBy: string;
    target: ParityTarget;
  },
): Promise<void> {
  if (input.target === 'old') {
    const { error } = await service
      .from('tasks')
      .update({ assigned_to: input.assigneeIds })
      .eq('id', input.taskId);
    if (error) {
      throw error;
    }
    return;
  }

  // Soft-deactivate existing, then insert active rows
  await service
    .from('task_assignments')
    .update({ is_active: false })
    .eq('task_id', input.taskId);

  const rows = input.assigneeIds.map((userId) => ({
    task_id: input.taskId,
    user_id: userId,
    assignment_kind:
      input.primaryAssigneeId && userId === input.primaryAssigneeId
        ? 'primary'
        : 'delegated',
    is_active: true,
    created_by: input.createdBy,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await service.from('task_assignments').insert(rows);
  if (error) {
    // Compatibility: if table missing, write assigned_to
    const fallback = await service
      .from('tasks')
      .update({ assigned_to: input.assigneeIds })
      .eq('id', input.taskId);
    if (fallback.error) {
      throw error;
    }
  }
}
