/** M-SUPABASE-04a / M-DATA-04 — exponential backoff + reconnect-storm guards. */

export const REALTIME_RECONNECT_BASE_MS = 1_000;
export const REALTIME_RECONNECT_MAX_MS = 30_000;
/** After this many failed reconnect attempts, wait for AppState foreground. */
export const REALTIME_RECONNECT_PAUSE_AFTER_ATTEMPTS = 8;
/** Coalesce simulator/Maestro AppState flicker before tearing channels down. */
export const REALTIME_APPSTATE_RESUBSCRIBE_DEBOUNCE_MS = 2_500;

/**
 * Delay before attempt N (0-based). Caps at REALTIME_RECONNECT_MAX_MS.
 * attempt 0 → 1s, 1 → 2s, 2 → 4s, … then 30s.
 */
export function nextRealtimeReconnectDelayMs(attempt: number): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const raw = REALTIME_RECONNECT_BASE_MS * 2 ** safeAttempt;
  return Math.min(REALTIME_RECONNECT_MAX_MS, raw);
}

export function shouldScheduleRealtimeReconnect(
  status: string,
  intentionalTeardown: boolean,
): boolean {
  if (intentionalTeardown) return false;
  return status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT';
}

export function shouldPauseRealtimeReconnect(attempt: number): boolean {
  return Math.max(0, Math.floor(attempt)) >= REALTIME_RECONNECT_PAUSE_AFTER_ATTEMPTS;
}

/** postgres_changes `filter` for company-scoped tables (users, projects). */
export function companyEqFilter(companyId: string | null | undefined): string | null {
  const id = typeof companyId === 'string' ? companyId.trim() : '';
  if (!id) return null;
  return `company_id=eq.${id}`;
}
