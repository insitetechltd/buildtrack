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
 * Legacy DB value `on_hold` (pre-migration) normalizes to `active`.
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

/** Remap legacy `on_hold` → `active` until DB migration is applied. */
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
