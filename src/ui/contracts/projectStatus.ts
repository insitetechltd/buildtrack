import type { ProjectStatus } from "@/types/buildtrack";

/** Canonical project stages — storage slugs (DB CHECK / app pickers). */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "planning",
  "active",
  "completed",
  "cancelled",
];

/**
 * User-facing labels. Storage keeps `active`; display is "On-going".
 *
 * DB CHECK still allows dormant slug `on_hold` (reserved status slot — do not
 * drop via `20260825000600` unless product reclaims or retires the slot).
 * Any legacy `on_hold` rows normalize to `active` / "On-going" in the UI.
 */
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "On-going",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUS_ORDER as string[]).includes(value);
}

/**
 * Remap dormant DB slug `on_hold` → `active` (UI does not offer On Hold).
 * Slot kept in DB CHECK for possible future status revive — see migration
 * `20260825000600_projects_drop_on_hold.sql` (DORMANT — do not apply).
 */
export function normalizeProjectStatus(status: string): ProjectStatus {
  if (status === "on_hold") {
    return "active";
  }
  if (isProjectStatus(status)) {
    return status;
  }
  return "planning";
}

export function formatProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[normalizeProjectStatus(status)];
}
