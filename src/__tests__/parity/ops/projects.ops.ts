import type { SupabaseClient } from '@supabase/supabase-js';

export async function createCompany(
  service: SupabaseClient,
  name: string,
): Promise<string> {
  const { data, error } = await service
    .from('companies')
    .insert({
      name,
      type: 'general_contractor',
      is_active: true,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function createProject(
  service: SupabaseClient,
  input: {
    name: string;
    createdBy: string;
    companyId: string;
  },
): Promise<string> {
  const { data, error } = await service
    .from('projects')
    .insert({
      name: input.name,
      description: 'Parity project',
      status: 'active',
      start_date: new Date().toISOString(),
      location: '',
      created_by: input.createdBy,
      company_id: input.companyId,
      client_info: {},
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }
  return data.id as string;
}

export async function assignUserToProject(
  service: SupabaseClient,
  input: {
    userId: string;
    projectId: string;
    category: string;
    assignedBy: string;
  },
): Promise<void> {
  const { error } = await service.from('user_project_assignments').insert({
    user_id: input.userId,
    project_id: input.projectId,
    category: input.category,
    assigned_by: input.assignedBy,
    is_active: true,
  });
  if (error) {
    throw error;
  }
}

export async function removeUserFromProject(
  service: SupabaseClient,
  input: { userId: string; projectId: string },
): Promise<void> {
  const soft = await service
    .from('user_project_assignments')
    .update({ is_active: false })
    .eq('user_id', input.userId)
    .eq('project_id', input.projectId);

  if (soft.error) {
    const hard = await service
      .from('user_project_assignments')
      .delete()
      .eq('user_id', input.userId)
      .eq('project_id', input.projectId);
    if (hard.error) {
      throw soft.error;
    }
  }
}

export async function updateAssignmentCategory(
  service: SupabaseClient,
  input: { userId: string; projectId: string; category: string },
): Promise<void> {
  const { error } = await service
    .from('user_project_assignments')
    .update({ category: input.category })
    .eq('user_id', input.userId)
    .eq('project_id', input.projectId)
    .eq('is_active', true);

  if (error) {
    throw error;
  }
}

export async function fetchProjectIdsForUser(
  service: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await service
    .from('user_project_assignments')
    .select('project_id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return (data || []).map((row: { project_id: string }) => row.project_id);
}

export async function setLastSelectedProject(
  client: SupabaseClient,
  userId: string,
  projectId: string | null,
): Promise<void> {
  const { error } = await client
    .from('users')
    .update({ last_selected_project_id: projectId })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export async function getLastSelectedProject(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('users')
    .select('last_selected_project_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.last_selected_project_id
    ? String(data.last_selected_project_id)
    : null;
}
