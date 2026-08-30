// Shared platform-owner allowlist for hq Edge functions (M-OPS-03 Phase 1b).
// SoT = public.platform_owners via is_platform_owner RPC.
// Fallbacks: committed Tristan UUID + PLATFORM_OWNER_IDS env (fail-closed).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const COMMITTED_OWNER_IDS: readonly string[] = [
  "006fe339-c4c6-456f-965a-2a9ff47d35de",
];

export function parseEnvOwnerAllowlist(): Set<string> {
  const ids = new Set(COMMITTED_OWNER_IDS);
  const raw = Deno.env.get("PLATFORM_OWNER_IDS") ?? "";
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * True if caller is a platform owner.
 * Prefer DB `is_platform_owner(p_uid)`; on missing table/RPC fall back to env ∪ committed IDs.
 */
export async function isCallerPlatformOwner(
  admin: SupabaseClient,
  callerId: string,
): Promise<boolean> {
  if (!callerId) return false;

  try {
    const { data, error } = await admin.rpc("is_platform_owner", {
      p_uid: callerId,
    });
    if (!error && typeof data === "boolean") {
      // DB is SoT when RPC is available — do not OR with env (removal must 403).
      return data;
    }
    const msg = error?.message ?? "non-boolean is_platform_owner";
    // Only fall back when the migration is missing — operational errors fail closed.
    if (/does not exist|42703|PGRST202|Could not find the function/i.test(msg)) {
      console.error("ownerAllowlist rpc missing → env fallback", msg);
      return parseEnvOwnerAllowlist().has(callerId);
    }
    console.error("ownerAllowlist rpc fail-closed", msg);
    return false;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/does not exist|42703|PGRST202|Could not find the function/i.test(msg)) {
      console.error("ownerAllowlist rpc throw missing → env fallback", msg);
      return parseEnvOwnerAllowlist().has(callerId);
    }
    console.error("ownerAllowlist rpc throw fail-closed", msg);
    return false;
  }
}
