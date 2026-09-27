/**
 * Contract for stripe-webhook meter merge + event ordering (M-BILL-01 harden).
 * Edge `supabase/functions/stripe-webhook/index.ts` must match these guards.
 */

export type MeterMap = Record<string, number | null>;

type RpcError = { message?: string } | null;

/** Seat meters required on every paid/base plan snapshot. */
export const REQUIRED_PAID_SEAT_METERS = ["pm_seats", "worker_seats"] as const;

/** Limit meters that must be present as keys (null = unlimited is OK). */
export const REQUIRED_PAID_LIMIT_METERS = ["projects", "storage_bytes"] as const;

/**
 * Interpret admin.rpc('build_entitlements_snapshot_from_price') result.
 * Must destructure { data, error } — awaiting rpc and reading .meters on the
 * whole response yields {} and wipes seat caps on subscription.updated.
 */
export function metersFromEntitlementsRpcResult(
  rpc: { data: unknown; error: RpcError },
  planPriceId: string,
): MeterMap {
  if (rpc.error) {
    throw new Error(
      `build_entitlements_snapshot_from_price failed for ${planPriceId}: ${
        rpc.error.message || "unknown"
      }`,
    );
  }
  return (rpc.data as { meters?: MeterMap } | null)?.meters ?? {};
}

/** Refuse empty merged meters when a base plan price resolved. */
export function assertMergedMetersNonEmpty(
  mergedMeters: MeterMap,
  subscriptionId: string,
  lockedPlanPriceId: string,
): void {
  if (Object.keys(mergedMeters).length === 0) {
    throw new Error(
      `subscription ${subscriptionId} merged meters empty (base=${lockedPlanPriceId})`,
    );
  }
}

/**
 * Refuse partly missing meter maps for a paid/base plan.
 * Silent defaults (`pm_seats ?? 1`) must not paper over RPC/merge gaps.
 */
export function assertPaidPlanMetersComplete(
  mergedMeters: MeterMap,
  subscriptionId: string,
  lockedPlanPriceId: string,
): void {
  assertMergedMetersNonEmpty(mergedMeters, subscriptionId, lockedPlanPriceId);
  const missing: string[] = [];
  for (const key of REQUIRED_PAID_SEAT_METERS) {
    if (!(key in mergedMeters)) missing.push(key);
  }
  for (const key of REQUIRED_PAID_LIMIT_METERS) {
    if (!(key in mergedMeters)) missing.push(key);
  }
  if (
    !("entries_monthly" in mergedMeters) &&
    !("entries_trial_total" in mergedMeters)
  ) {
    missing.push("entries_monthly|entries_trial_total");
  }
  if (missing.length > 0) {
    throw new Error(
      `subscription ${subscriptionId} partial meters missing [${missing.join(",")}] (base=${lockedPlanPriceId})`,
    );
  }
}

/**
 * Stale-event gate: never apply an older Stripe event after a newer one.
 * `lastAppliedUnix` is `company_subscriptions.last_webhook_event_created_at`
 * (unix seconds). Null/undefined = no prior apply (allow).
 */
export function shouldSkipStaleWebhookEvent(
  eventCreatedUnix: number,
  lastAppliedUnix: number | null | undefined,
): boolean {
  if (lastAppliedUnix == null || !Number.isFinite(lastAppliedUnix)) {
    return false;
  }
  if (!Number.isFinite(eventCreatedUnix)) return false;
  return eventCreatedUnix < lastAppliedUnix;
}

/**
 * Never resurrect a canceled subscription from a stale updated/created payload.
 * Prefer live Stripe retrieve (status === canceled) over trusting the event body.
 */
export function shouldTreatAsCanceled(
  liveStripeStatus: string,
  priorDbStatus: string | null | undefined,
): boolean {
  const live = (liveStripeStatus || "").toLowerCase();
  if (live === "canceled") return true;
  // Defense in depth: if DB is canceled and live retrieve failed to load, keep canceled.
  const prior = (priorDbStatus || "").toLowerCase();
  return prior === "canceled" && live !== "active" && live !== "trialing";
}

/**
 * Cancelled subscription seat policy (product law):
 * - Founder unlock gates on subscription_status (canceled = blocked).
 * - Task access for existing field users stays fail-open.
 * - Seat invites use meter math — zero seat meters so invites fail-closed after cancel.
 * Other meters kept for audit of last paid limits.
 */
export function metersAfterSubscriptionCanceled(prior: MeterMap): MeterMap {
  return {
    ...prior,
    pm_seats: 0,
    worker_seats: 0,
  };
}

/** Propagate Postgrest-style errors from cancel/delete handler paths. */
export function assertNoDbError(
  error: { message?: string } | null | undefined,
  context: string,
): void {
  if (error) {
    throw new Error(`${context}: ${error.message || "db_error"}`);
  }
}
