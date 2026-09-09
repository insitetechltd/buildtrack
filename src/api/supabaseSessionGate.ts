import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "./supabase";

/**
 * Return the process Supabase client only when a JWT session is present.
 * Post M-SUPABASE-02a, anon has REVOKE'd table SELECT — querying without a
 * session always yields SQLSTATE 42501 and LogBox spam.
 */
export async function getSessionScopedSupabase(): Promise<SupabaseClient | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
      return null;
    }
    return supabase;
  } catch {
    return null;
  }
}

/**
 * Brief poll for a JWT after login / cold start. Callers that would otherwise
 * skip fetches (and leave UI gates spinning forever) should wait, then settle
 * query meta even if still null.
 */
export async function waitForSessionScopedSupabase(
  timeoutMs = 8000,
  pollMs = 200,
): Promise<SupabaseClient | null> {
  let client = await getSessionScopedSupabase();
  if (client) {
    return client;
  }
  const started = Date.now();
  while (!client && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    client = await getSessionScopedSupabase();
  }
  return client;
}
