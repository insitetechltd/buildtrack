/**
 * Meter merge for Stripe subscription items — SoT shared with stripe-webhook
 * (`handleSubscriptionLifecycle` buildMetersSnapshotFromPrice loop).
 * Edge Deno cannot import this file; keep Edge in sync (see comment there).
 */

import {
  assertPaidPlanMetersComplete,
  metersFromEntitlementsRpcResult,
  type MeterMap,
} from "./webhookMetersGuard";

export type PlanPriceByStripe = Record<
  string,
  { planPriceId: string; kind: string }
>;

export type SubscriptionItemLike = {
  quantity?: number | null;
  price?: string | { id?: string } | null;
};

/** Extract Stripe price ids from subscription.items.data (webhook-shaped). */
export function stripePriceIdsFromItems(
  items: SubscriptionItemLike[],
): string[] {
  const ids: string[] = [];
  for (const it of items) {
    const price = it?.price;
    if (!price) continue;
    if (typeof price === "string") {
      ids.push(price);
      continue;
    }
    if (typeof price === "object" && typeof price.id === "string") {
      ids.push(price.id);
    }
  }
  return ids;
}

export function basePlanPriceIdFromMap(
  planPriceByStripe: PlanPriceByStripe,
): string | null {
  return (
    Object.values(planPriceByStripe).find((p) => p.kind === "base")
      ?.planPriceId ?? null
  );
}

/**
 * Merge meters across subscription items × quantity.
 * `fetchMetersForPlanPrice` must call RPC build_entitlements_snapshot_from_price
 * with destructured { data, error } (see metersFromEntitlementsRpcResult).
 */
export async function mergeSubscriptionItemMeters(
  items: SubscriptionItemLike[],
  planPriceByStripe: PlanPriceByStripe,
  fetchMetersForPlanPrice: (planPriceId: string) => Promise<MeterMap>,
): Promise<MeterMap> {
  const mergedMeters: MeterMap = {};
  for (const it of items) {
    const price = it?.price;
    const stripePriceId =
      typeof price === "string"
        ? price
        : typeof price?.id === "string"
          ? price.id
          : null;
    if (!stripePriceId) continue;
    const plan = planPriceByStripe[stripePriceId];
    if (!plan) continue;

    const quantity =
      typeof it?.quantity === "number" && Number.isFinite(it.quantity)
        ? Math.max(0, Math.floor(it.quantity))
        : 1;

    const metersForItem = await fetchMetersForPlanPrice(plan.planPriceId);
    for (const [meterSlug, meterValue] of Object.entries(metersForItem)) {
      if (meterValue == null) {
        mergedMeters[meterSlug] = null;
        continue;
      }

      const current = mergedMeters[meterSlug];
      if (typeof current === "undefined") {
        mergedMeters[meterSlug] = Number(meterValue) * quantity;
        continue;
      }

      if (current === null) {
        continue;
      }

      if (typeof current === "number") {
        mergedMeters[meterSlug] = current + Number(meterValue) * quantity;
      }
    }
  }
  return mergedMeters;
}

/** RPC result → meters (fail-closed on error). */
export function metersFromRpcResult(
  rpc: { data: unknown; error: { message?: string } | null },
  planPriceId: string,
): MeterMap {
  return metersFromEntitlementsRpcResult(rpc, planPriceId);
}

/**
 * Full webhook-equivalent meter computation after plan_prices are resolved.
 * Throws on empty/partial paid meters (v14 guard).
 */
export async function computeMergedMetersForSubscription(params: {
  subscriptionId: string;
  items: SubscriptionItemLike[];
  planPriceByStripe: PlanPriceByStripe;
  fetchMetersForPlanPrice: (planPriceId: string) => Promise<MeterMap>;
}): Promise<{ lockedPlanPriceId: string; meters: MeterMap }> {
  const lockedPlanPriceId = basePlanPriceIdFromMap(params.planPriceByStripe);
  if (!lockedPlanPriceId) {
    throw new Error(
      `subscription ${params.subscriptionId} has no base plan_prices row`,
    );
  }
  const meters = await mergeSubscriptionItemMeters(
    params.items,
    params.planPriceByStripe,
    params.fetchMetersForPlanPrice,
  );
  assertPaidPlanMetersComplete(
    meters,
    params.subscriptionId,
    lockedPlanPriceId,
  );
  return { lockedPlanPriceId, meters };
}
