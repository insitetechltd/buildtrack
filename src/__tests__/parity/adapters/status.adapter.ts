/**
 * Normalize DB status fields across OLD (current_status) and NEW (status).
 */
export function readTaskStatus(row: Record<string, unknown>): string {
  const status = row.status ?? row.current_status ?? 'new';
  return String(status);
}

export function writeTaskStatusPayload(
  status: string,
  target: 'old' | 'new',
): Record<string, string> {
  if (target === 'new') {
    return { status };
  }
  // OLD stores typically use current_status; also set status when present
  return {
    current_status: status,
    status,
  };
}

export function readDeclineReason(row: Record<string, unknown>): string | undefined {
  const value = row.declined_reason ?? row.decline_reason;
  return value == null ? undefined : String(value);
}

export function writeDeclineReasonPayload(reason: string): Record<string, string> {
  return {
    decline_reason: reason,
    declined_reason: reason,
  };
}
