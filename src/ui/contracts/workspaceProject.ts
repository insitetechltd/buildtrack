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
      // Do not trust a leftover selection while membership is unknown/empty —
      // that reopens cross-user / cross-tenant Activity bleeds.
      return null;
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

/**
 * Whether login must block the field shell until the user picks a project.
 * Sole membership is auto-resolved — only multi-project / empty needs the picker.
 */
export function needsForcedProjectPicker(
  selectedProjectId: string | null | undefined,
  availableProjectIds: readonly string[],
): boolean {
  return resolveWorkspaceProjectId(selectedProjectId, availableProjectIds) == null;
}
