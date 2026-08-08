/** Helpers for primary + delegated assignees (live text / text[] columns). */

export function uniqueUserIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = raw == null ? "" : String(raw).trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Delegates are helpers excluding the primary owner.
 * Empty / missing primary → all assigned ids (callers usually pass resolvePrimary first).
 */
export function normalizeDelegatedUserIds(
  candidateIds: Array<string | null | undefined> | null | undefined,
  primaryAssigneeId?: string | null,
): string[] {
  const primary = primaryAssigneeId == null ? "" : String(primaryAssigneeId).trim();
  return uniqueUserIds(candidateIds ?? []).filter((id) => id !== primary);
}

/** Union used for legacy assigned_to / list membership. */
export function mergeAssignedToIds(args: {
  primaryAssigneeId?: string | null;
  delegatedUserIds?: Array<string | null | undefined> | null;
  assignedTo?: Array<string | null | undefined> | null;
}): string[] {
  return uniqueUserIds([
    ...(args.assignedTo ?? []),
    args.primaryAssigneeId,
    ...(args.delegatedUserIds ?? []),
  ]);
}
