import type { SupabaseClient } from '@supabase/supabase-js';
import { approvePendingUser, rejectPendingUser } from './auth.ops';

export async function listUsersByCompany(
  service: SupabaseClient,
  companyId: string,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await service
    .from('users')
    .select('*')
    .eq('company_id', companyId);

  if (error) {
    throw error;
  }

  return (data || []) as Record<string, unknown>[];
}

export { approvePendingUser, rejectPendingUser };
