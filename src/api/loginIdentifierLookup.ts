import { supabase } from "@/api/supabase";

/**
 * Whether a login identifier (email or phone) already has a public.users row.
 * Uses SECURITY DEFINER RPC — anon cannot SELECT users directly.
 */
export async function loginIdentifierIsRegistered(
  identifier: string,
): Promise<boolean> {
  const trimmed = identifier.trim();
  if (!trimmed || !supabase) {
    return false;
  }

  const { data, error } = await supabase.rpc("login_identifier_is_registered", {
    p_identifier: trimmed,
  });

  if (error) {
    console.warn("login_identifier_is_registered failed:", error.message);
    throw error;
  }

  return data === true;
}
