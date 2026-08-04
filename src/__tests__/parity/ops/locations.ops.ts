import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureProjectLocation(
  service: SupabaseClient,
  input: { projectId: string; label: string; createdBy: string },
): Promise<string> {
  const existing = await service
    .from('project_locations')
    .select('id')
    .eq('project_id', input.projectId)
    .ilike('label', input.label)
    .limit(1);

  if (!existing.error && existing.data?.[0]?.id) {
    return existing.data[0].id as string;
  }

  const { data, error } = await service
    .from('project_locations')
    .insert({
      project_id: input.projectId,
      label: input.label.trim(),
      created_by: input.createdBy,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function fetchProjectLocations(
  service: SupabaseClient,
  projectId: string,
): Promise<Array<{ id: string; label: string }>> {
  const { data, error } = await service
    .from('project_locations')
    .select('id, label')
    .eq('project_id', projectId)
    .order('label', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row: { id: string; label: string }) => ({
    id: row.id,
    label: row.label,
  }));
}
