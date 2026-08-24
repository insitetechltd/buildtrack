import type { PlanCatalogMeterMap } from "./planCatalog";

/** Denormalized legacy columns on company_entitlements — kept in sync from snapshot meters. */
export const LEGACY_METER_COLUMN_SLUGS = {
  pm_seats: "pm_seat_limit",
  worker_seats: "worker_seat_limit",
  projects: "project_limit",
  storage_bytes: "storage_limit_bytes",
  entries_monthly: "entries_limit",
  entries_trial_total: "entries_limit",
} as const;

export type LegacyEntitlementColumns = {
  pm_seat_limit: number;
  worker_seat_limit: number;
  project_limit: number | null;
  entries_limit: number | null;
  entries_limit_kind: string;
  storage_limit_bytes: number | null;
};

export function entriesLimitKindFromMeters(
  meters: PlanCatalogMeterMap,
): string {
  if (meters.entries_trial_total != null) {
    return "trial_total";
  }
  if (meters.entries_monthly == null) {
    return "unlimited";
  }
  return "monthly";
}

export function legacyColumnsFromMeters(
  meters: PlanCatalogMeterMap,
): LegacyEntitlementColumns {
  const entriesKind = entriesLimitKindFromMeters(meters);
  let entriesLimit: number | null = null;
  if (entriesKind === "trial_total") {
    entriesLimit = meters.entries_trial_total ?? null;
  } else if (entriesKind === "monthly") {
    entriesLimit = meters.entries_monthly ?? null;
  }

  return {
    pm_seat_limit: meters.pm_seats ?? 1,
    worker_seat_limit: meters.worker_seats ?? 5,
    project_limit: meters.projects ?? null,
    entries_limit: entriesLimit,
    entries_limit_kind: entriesKind,
    storage_limit_bytes: meters.storage_bytes ?? null,
  };
}

export function metersFromLegacyEntitlementRow(row: {
  pm_seat_limit: number;
  worker_seat_limit: number;
  project_limit: number | null;
  entries_limit: number | null;
  entries_limit_kind: string;
  storage_limit_bytes: number | null;
  entitlements_snapshot?: Record<string, unknown> | null;
}): PlanCatalogMeterMap {
  const snapshot = row.entitlements_snapshot;
  const rawMeters =
    snapshot &&
    typeof snapshot === "object" &&
    snapshot.meters &&
    typeof snapshot.meters === "object"
      ? (snapshot.meters as PlanCatalogMeterMap)
      : null;

  if (rawMeters && Object.keys(rawMeters).length > 0) {
    return { ...rawMeters };
  }

  const legacy: PlanCatalogMeterMap = {
    pm_seats: row.pm_seat_limit,
    worker_seats: row.worker_seat_limit,
    projects: row.project_limit,
    storage_bytes: row.storage_limit_bytes,
  };

  if (row.entries_limit_kind === "trial_total") {
    legacy.entries_trial_total = row.entries_limit;
  } else {
    legacy.entries_monthly = row.entries_limit;
  }

  return legacy;
}

export function meterLimitFromEntitlements(
  row: {
    pm_seat_limit: number;
    worker_seat_limit: number;
    entitlements_snapshot?: Record<string, unknown> | null;
  },
  meterSlug: string,
  legacyFallback: number,
): number {
  const meters = metersFromLegacyEntitlementRow({
    ...row,
    project_limit: null,
    entries_limit: null,
    entries_limit_kind: "monthly",
    storage_limit_bytes: null,
  });
  const value = meters[meterSlug];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return legacyFallback;
}
