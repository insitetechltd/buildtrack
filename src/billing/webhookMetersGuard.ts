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
 * Missing/zero event.created must not skip (and must not write epoch).
 */
export function shouldSkipStaleWebhookEvent(
  eventCreatedUnix: number,
  lastAppliedUnix: number | null | undefined,
): boolean {
  if (lastAppliedUnix == null || !Number.isFinite(lastAppliedUnix)) {
    return false;
  }
  if (!Number.isFinite(eventCreatedUnix) || eventCreatedUnix <= 0) {
    return false;
  }
  return eventCreatedUnix < lastAppliedUnix;
}

/** Stripe event.created for ordering — reject missing/zero/epoch. */
export function normalizeWebhookEventCreatedUnix(
  created: number | null | undefined,
): number | null {
  if (typeof created !== "number" || !Number.isFinite(created) || created <= 0) {
    return null;
  }
  return Math.floor(created);
}

/**
 * Never write a missing timestamp; never move last_webhook_event_created_at
 * backwards. Returns ISO to persist, or null to leave the column unchanged.
 */
export function nextLastWebhookEventCreatedAtIso(
  eventCreatedUnix: number | null,
  priorIso: string | null | undefined,
): string | null {
  if (eventCreatedUnix == null) return null;
  const nextIso = new Date(eventCreatedUnix * 1000).toISOString();
  if (!priorIso) return nextIso;
  const priorUnix = Math.floor(new Date(priorIso).getTime() / 1000);
  if (!Number.isFinite(priorUnix)) return nextIso;
  if (eventCreatedUnix < priorUnix) return null;
  return nextIso;
}

export type WebhookClaimStatus = "processing" | "done" | "failed";
export type WebhookClaimDecision = "proceed" | "duplicate" | "in_flight";

/** Lease for in-flight processing claims (stale → reclaimable). */
export const WEBHOOK_CLAIM_LEASE_MS = 5 * 60 * 1000;

/**
 * Claim/retry semantics (billing_webhook_claims):
 * - no row / failed / stale processing → proceed (re-claim)
 * - done → duplicate (HTTP 200)
 * - fresh processing → in_flight (HTTP non-2xx so Stripe retries)
 */
export function decideWebhookClaimAction(
  existing: { status: WebhookClaimStatus; claimed_at: string } | null,
  nowMs: number,
  leaseMs: number = WEBHOOK_CLAIM_LEASE_MS,
): WebhookClaimDecision {
  if (!existing) return "proceed";
  if (existing.status === "done") return "duplicate";
  if (existing.status === "failed") return "proceed";
  const claimedMs = new Date(existing.claimed_at).getTime();
  if (!Number.isFinite(claimedMs) || nowMs - claimedMs >= leaseMs) {
    return "proceed";
  }
  return "in_flight";
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
