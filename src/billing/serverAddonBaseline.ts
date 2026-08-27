import type { CompanyEntitlementView } from "@/billing/companyEntitlementSummary";
import {
  findAddonTier,
  findBaseTier,
  resolveAddonPriceLabels,
  type SellablePlanCatalog,
} from "@/billing/planCatalog";
import { SEAT_ADDON_FALLBACK_PRICE } from "@/billing/seatAddonCopy";

/**
 * Product law (HKD lock): HK$20 = +1 worker, HK$100 = +1 PM.
 * Slug may still be `addon_worker_pack`; never trust stale catalog pack sizes (e.g. 5).
 */
export const ADDON_SEATS_PER_UNIT = 1 as const;

export type ServerAddonBaseline = {
  workerSeatQty: number;
  pmSeatQty: number;
  workerUnitPrice: string;
  pmUnitPrice: string;
  workerSeatsPerUnit: typeof ADDON_SEATS_PER_UNIT;
  pmSeatsPerUnit: typeof ADDON_SEATS_PER_UNIT;
  tierSlug: string;
  baseWorkerTotal: number;
  basePmTotal: number;
};

export type PendingAddonHold = {
  companyId: string;
  workerSeatQty: number;
  pmSeatQty: number;
  expectedWorkerTotal: number;
  expectedPmTotal: number;
};

let pendingAddonHold: PendingAddonHold | null = null;

/** Test / remount seam — reset module hold between Jest cases. */
export function __resetPendingAddonHoldForTests(): void {
  pendingAddonHold = null;
}

export function getPendingAddonHold(
  companyId: string | null | undefined,
): PendingAddonHold | null {
  if (!companyId || !pendingAddonHold) {
    return null;
  }
  if (pendingAddonHold.companyId !== companyId) {
    return null;
  }
  return pendingAddonHold;
}

export function setPendingAddonHold(next: PendingAddonHold): void {
  pendingAddonHold = next;
}

export function clearPendingAddonHold(
  companyId?: string | null,
): void {
  if (!pendingAddonHold) {
    return;
  }
  if (companyId && pendingAddonHold.companyId !== companyId) {
    return;
  }
  pendingAddonHold = null;
}

export function clearPendingAddonHoldIfMatched(args: {
  companyId: string;
  workerTotal: number | null | undefined;
  pmTotal: number | null | undefined;
}): boolean {
  const hold = getPendingAddonHold(args.companyId);
  if (!hold) {
    return false;
  }
  if (
    args.workerTotal === hold.expectedWorkerTotal &&
    args.pmTotal === hold.expectedPmTotal
  ) {
    pendingAddonHold = null;
    return true;
  }
  return false;
}

export function addonExtraQtyFromTotals(
  currentTotal: number,
  baseTotal: number,
): number {
  return Math.max(
    0,
    Math.floor((currentTotal - baseTotal) / ADDON_SEATS_PER_UNIT),
  );
}

/**
 * Draft qty after a server baseline tick.
 * Hold pending post-success target while webhook/entitlement lag; never snap to 0.
 */
export function resolveDraftSeatQty(args: {
  prev: number | null;
  serverQty: number;
  pendingQty: number | null;
}): number {
  if (args.pendingQty !== null && args.pendingQty !== args.serverQty) {
    return args.pendingQty;
  }
  if (args.pendingQty !== null && args.pendingQty === args.serverQty) {
    return args.serverQty;
  }
  // No pending: seed from server (includes first load when prev is null).
  if (args.prev === null) {
    return args.serverQty;
  }
  // Without a pending hold, follow server (authoritative after sync cleared hold).
  return args.serverQty;
}

/**
 * Only reset drafts on a real plan switch (growth→unlimited), not on
 * undefined→tier when baseline briefly goes null then returns (webhook lag).
 */
export function shouldResetAddonDraftsOnTierChange(
  previousTierSlug: string | null,
  nextTierSlug: string | null,
): boolean {
  if (!previousTierSlug || !nextTierSlug) {
    return false;
  }
  return previousTierSlug !== nextTierSlug;
}

export function computeServerAddonBaseline(
  catalog: SellablePlanCatalog | null | undefined,
  entitlement: CompanyEntitlementView | null | undefined,
): ServerAddonBaseline | null {
  if (!catalog || !entitlement) {
    return null;
  }
  if (!entitlement.hasStripeSubscription) {
    return null;
  }
  if (!entitlement.tierSlug || entitlement.tierSlug === "pilot") {
    return null;
  }

  const baseTier = findBaseTier(catalog, entitlement.tierSlug);
  const workerAddon = findAddonTier(catalog, "addon_worker_pack");
  const pmAddon = findAddonTier(catalog, "addon_pm_seat");
  if (!baseTier || !workerAddon || !pmAddon) {
    return null;
  }

  const currentWorkerTotal = entitlement.meterLimits?.worker_seats;
  const currentPmTotal = entitlement.meterLimits?.pm_seats;
  if (
    typeof currentWorkerTotal !== "number" ||
    typeof currentPmTotal !== "number"
  ) {
    return null;
  }

  const baseWorkerTotal = baseTier.meters.worker_seats ?? 0;
  const basePmTotal = baseTier.meters.pm_seats ?? 0;
  const priceLabels = resolveAddonPriceLabels(catalog);

  return {
    workerSeatQty: addonExtraQtyFromTotals(currentWorkerTotal, baseWorkerTotal),
    pmSeatQty: addonExtraQtyFromTotals(currentPmTotal, basePmTotal),
    workerUnitPrice:
      priceLabels["addon_worker_pack"] ?? SEAT_ADDON_FALLBACK_PRICE.worker,
    pmUnitPrice: priceLabels["addon_pm_seat"] ?? SEAT_ADDON_FALLBACK_PRICE.pm,
    workerSeatsPerUnit: ADDON_SEATS_PER_UNIT,
    pmSeatsPerUnit: ADDON_SEATS_PER_UNIT,
    tierSlug: entitlement.tierSlug,
    baseWorkerTotal,
    basePmTotal,
  };
}

export function expectedSeatTotalsFromAddonQty(args: {
  baseWorkerTotal: number;
  basePmTotal: number;
  workerSeatQty: number;
  pmSeatQty: number;
}): { expectedWorkerTotal: number; expectedPmTotal: number } {
  return {
    expectedWorkerTotal:
      args.baseWorkerTotal + args.workerSeatQty * ADDON_SEATS_PER_UNIT,
    expectedPmTotal: args.basePmTotal + args.pmSeatQty * ADDON_SEATS_PER_UNIT,
  };
}

/**
 * Allocated resources must reflect purchased seats immediately while
 * company_entitlements catches up (or when edge write + client poll race).
 */
export function overlayPendingAddonSeatsOnView(
  view: CompanyEntitlementView | null,
  hold: PendingAddonHold | null,
): CompanyEntitlementView | null {
  if (!view || !hold) {
    return view;
  }

  return {
    ...view,
    meterLimits: {
      ...view.meterLimits,
      worker_seats: hold.expectedWorkerTotal,
      pm_seats: hold.expectedPmTotal,
    },
  };
}
