import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParitySeedUser } from '../harness/paritySeed';

export async function signInAs(
  anon: SupabaseClient,
  user: Pick<ParitySeedUser, 'email' | 'password'>,
): Promise<{ userId: string; accessToken: string }> {
  const { data, error } = await anon.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (error) {
    throw error;
  }

  if (!data.user || !data.session) {
    throw new Error('signInAs: missing user or session');
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
  };
}

export async function signOut(anon: SupabaseClient): Promise<void> {
  await anon.auth.signOut();
}

export async function fetchPublicUser(
  client: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data as Record<string, unknown> | null;
}

export async function updatePublicUserName(
  client: SupabaseClient,
  userId: string,
  name: string,
): Promise<void> {
  const { error } = await client.from('users').update({ name }).eq('id', userId);
  if (error) {
    throw error;
  }
}

export async function changePassword(
  anon: SupabaseClient,
  email: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const verify = await anon.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verify.error) {
    throw verify.error;
  }

  const updated = await anon.auth.updateUser({ password: nextPassword });
  if (updated.error) {
    throw updated.error;
  }
}

export async function approvePendingUser(
  service: SupabaseClient,
  pendingUserId: string,
  approvedBy: string,
): Promise<void> {
  const { error } = await service
    .from('users')
    .update({
      is_pending: false,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', pendingUserId);

  if (error) {
    throw error;
  }
}

export async function rejectPendingUser(
  service: SupabaseClient,
  pendingUserId: string,
): Promise<void> {
  await service.from('users').delete().eq('id', pendingUserId);
  const { error } = await (service.auth.admin as any).deleteUser(pendingUserId);
  if (error) {
    throw error;
  }
}

export async function findAuthOrphans(
  service: SupabaseClient,
): Promise<{ authMissingProfile: string[]; profileMissingAuth: string[] }> {
  const authList = await (service.auth.admin as any).listUsers({ perPage: 1000 });
  if (authList.error) {
    throw authList.error;
  }

  const authIds = new Set(
    (authList.data?.users || []).map((u: { id: string }) => u.id),
  );

  const { data: profiles, error } = await service.from('users').select('id');
  if (error) {
    throw error;
  }

  const profileIds = new Set((profiles || []).map((p: { id: string }) => p.id));

  const authMissingProfile = [...authIds].filter((id) => !profileIds.has(id));
  const profileMissingAuth = [...profileIds].filter((id) => !authIds.has(id));

  return { authMissingProfile, profileMissingAuth };
}
