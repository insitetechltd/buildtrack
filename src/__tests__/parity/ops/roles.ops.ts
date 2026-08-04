import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchRoles(
  service: SupabaseClient,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await service.from('roles').select('*');
  if (error) {
    // Table may be absent
    if (String(error.message || '').toLowerCase().includes('does not exist')) {
      return [];
    }
    throw error;
  }
  return (data || []) as Record<string, unknown>[];
}

export async function createRole(
  service: SupabaseClient,
  input: { name: string; description?: string },
): Promise<string | null> {
  const { data, error } = await service
    .from('roles')
    .insert({
      name: input.name,
      description: input.description || 'Parity role',
    })
    .select('id')
    .single();

  if (error) {
    return null;
  }

  return data?.id ? String(data.id) : null;
}

export async function deleteRole(
  service: SupabaseClient,
  roleId: string,
): Promise<boolean> {
  const { error } = await service.from('roles').delete().eq('id', roleId);
  return !error;
}
