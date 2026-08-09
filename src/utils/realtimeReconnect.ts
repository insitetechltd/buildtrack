/** M-SUPABASE-04a — exponential backoff for Realtime channel resubscribe. */

export const REALTIME_RECONNECT_BASE_MS = 1_000;
export const REALTIME_RECONNECT_MAX_MS = 30_000;

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
