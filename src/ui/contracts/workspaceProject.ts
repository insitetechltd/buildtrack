/**
 * Resolve the active workspace project for Activity / Create Task / Filters.
 * Prefer an explicit selection; if none, use the only available project
 * (same rule Dashboard already used for display).
 */
export function resolveWorkspaceProjectId(
  selectedProjectId: string | null | undefined,
  availableProjectIds: readonly string[],
): string | null {
  const selected =
    selectedProjectId == null ? "" : String(selectedProjectId).trim();

  if (selected) {
    if (availableProjectIds.length === 0) {
      // Projects not loaded yet — keep selection so Create Task can still bind.
      return selected;
    }
    if (availableProjectIds.includes(selected)) {
      return selected;
    }
  }

  if (availableProjectIds.length === 1) {
    return availableProjectIds[0] ?? null;
  }

  return null;
}
