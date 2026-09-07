/**
 * Local calendar week helpers (Monday–Sunday).
 * Shared by Dashboard "This Week's Critical Tasks" and Task Detail red due date.
 */

export function startOfLocalWeek(date: Date): Date {
  const start = new Date(date);
  const currentDay = start.getDay();
  const daysFromMonday = (currentDay + 6) % 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysFromMonday);
  return start;
}

export function endOfLocalWeek(date: Date): Date {
  const end = startOfLocalWeek(date);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * True when dueDate falls in the same local Mon–Sun week as `now`.
 * Matches Dashboard `criticalDates` membership (due-week filter only).
 */
export function isDueThisLocalWeek(
  dueDate: string | Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueDate) {
    return false;
  }
  const parsed = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const weekStart = startOfLocalWeek(now);
  const weekEnd = endOfLocalWeek(now);
  return parsed >= weekStart && parsed <= weekEnd;
}
