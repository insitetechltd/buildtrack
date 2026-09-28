/**
 * Extract Supabase project host/ref from a URL for headed identity asserts.
 * Maestro Stage C asserts this matches PROD ref (no clearState; AsyncStorage may be stale).
 */
export function supabaseProjectRefFromUrl(
  url: string | null | undefined,
): string | null {
  const raw = String(url ?? "").trim();
  if (!raw) {
    return null;
  }
  try {
    const host = new URL(raw).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/);
    return m?.[1] ?? (host || null);
  } catch {
    return null;
  }
}
