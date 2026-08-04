import type { SupabaseClient } from '@supabase/supabase-js';

const CORE_TABLES = [
  'companies',
  'users',
  'projects',
  'user_project_assignments',
  'tasks',
  'task_activities',
] as const;

export async function probeTableExists(
  service: SupabaseClient,
  table: string,
): Promise<boolean> {
  const { error } = await service.from(table).select('*').limit(1);
  if (!error) {
    return true;
  }
  const message = String(error.message || error.code || '').toLowerCase();
  if (message.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST205') {
    return false;
  }
  // Permission errors still mean table exists
  return true;
}

export async function probeCoreTables(
  service: SupabaseClient,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const table of CORE_TABLES) {
    result[table] = await probeTableExists(service, table);
  }
  return result;
}

export async function probeTaskColumns(
  service: SupabaseClient,
): Promise<{
  hasAssignedToArray: boolean;
  hasPrimaryAssignee: boolean;
  hasCurrentStatus: boolean;
  hasStatus: boolean;
  hasLocationOnSite: boolean;
  hasTags: boolean;
}> {
  const { data, error } = await service.from('tasks').select('*').limit(1);
  if (error) {
    return {
      hasAssignedToArray: false,
      hasPrimaryAssignee: false,
      hasCurrentStatus: false,
      hasStatus: false,
      hasLocationOnSite: false,
      hasTags: false,
    };
  }

  const row = (data?.[0] || {}) as Record<string, unknown>;
  // If empty table, probe via optional selects
  if (!data?.length) {
    const probes = await Promise.all(
      [
        'assigned_to',
        'primary_assignee_id',
        'current_status',
        'status',
        'location_on_site',
        'tags',
      ].map(async (col) => {
        const res = await service.from('tasks').select(col).limit(1);
        return [col, !res.error] as const;
      }),
    );
    const map = Object.fromEntries(probes);
    return {
      hasAssignedToArray: Boolean(map.assigned_to),
      hasPrimaryAssignee: Boolean(map.primary_assignee_id),
      hasCurrentStatus: Boolean(map.current_status),
      hasStatus: Boolean(map.status),
      hasLocationOnSite: Boolean(map.location_on_site),
      hasTags: Boolean(map.tags),
    };
  }

  return {
    hasAssignedToArray: 'assigned_to' in row,
    hasPrimaryAssignee: 'primary_assignee_id' in row,
    hasCurrentStatus: 'current_status' in row,
    hasStatus: 'status' in row,
    hasLocationOnSite: 'location_on_site' in row,
    hasTags: 'tags' in row,
  };
}

export async function probeAnonSelectTasks(
  anon: SupabaseClient,
): Promise<{ allowed: boolean; errorMessage?: string }> {
  const { error } = await anon.from('tasks').select('id').limit(1);
  if (!error) {
    return { allowed: true };
  }
  return { allowed: false, errorMessage: error.message };
}

export async function probeTaskAssignmentsTable(
  service: SupabaseClient,
): Promise<boolean> {
  return probeTableExists(service, 'task_assignments');
}

export { CORE_TABLES };
