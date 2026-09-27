/**
 * Allowlisted entitlement recompute (one-off repair for empty snapshot meters).
 * CLI: scripts/billing/recompute-company-entitlements.ts
 */

import { legacyColumnsFromMeters } from "./entitlementMeters";
import type { MeterMap } from "./webhookMetersGuard";
import {
  nextLastWebhookEventCreatedAtIso,
  normalizeWebhookEventCreatedUnix,
} from "./webhookMetersGuard";

export const PROD_EMPTY_METERS_ALLOWLIST = [
  "4cf35a70-f82f-4650-b745-d7f87ad0bc41",
  "27c0612d-fb8e-4444-bcf4-545228a763a8",
  "00877ca4-db52-4b2b-b0af-848f6f535015",
] as const;

export type RecomputeCompanyInput = {
  companyId: string;
  stripeSubscriptionId: string;
  lockedPlanPriceId: string;
  tierSlug: string | null;
  subscriptionStatus: string;
  billingPhase: "trial" | "active" | "override";
  current: {
    pm_seat_limit: number | null;
    worker_seat_limit: number | null;
    project_limit: number | null;
    entries_limit: number | null;
    entries_limit_kind: string | null;
    storage_limit_bytes: number | null;
    subscription_status: string | null;
    entitlements_snapshot: { meters?: MeterMap } | null;
    last_webhook_event_created_at?: string | null;
  };
  recomputedMeters: MeterMap;
  recomputedLockedPlanPriceId: string;
  stripeStatus: string;
  /** Stripe subscription.created or now — for last_webhook_event_created_at only. */
  eventCreatedUnix: number | null;
};

export type RecomputePlanRow = {
  companyId: string;
  tierSlug: string | null;
  stripeSubscriptionId: string;
  noop: boolean;
  current: {
    pm: number | null;
    workers: number | null;
    projects: number | null;
    entries: number | null;
    storageBytes: number | null;
    status: string | null;
    planPriceId: string;
    snapshotMeters: MeterMap;
  };
  recomputed: {
    pm: number | null;
    workers: number | null;
    projects: number | null;
    entries: number | null;
    storageBytes: number | null;
    status: string;
    planPriceId: string;
    snapshotMeters: MeterMap;
    billingPhase: "trial" | "active" | "override";
  };
  wouldWrite: {
    company_entitlements: Record<string, unknown>;
    company_entitlement_revisions: Record<string, unknown>;
    billing_audit_log: Record<string, unknown>;
    company_subscriptions_patch: Record<string, unknown> | null;
  };
};

export function assertCompanyAllowlisted(
  companyId: string,
  allowlist: readonly string[],
): void {
  if (!allowlist.includes(companyId)) {
    throw new Error(
      `company ${companyId} is not on the recompute allowlist — refusing`,
    );
  }
}

export function assertAllowlistSubset(
  requested: readonly string[],
  allowlist: readonly string[],
): void {
  for (const id of requested) {
    assertCompanyAllowlisted(id, allowlist);
  }
}

export function mapStripeStatusToBillingPhase(
  status: string,
): "trial" | "active" | "override" {
  return status === "trialing" ? "trial" : "active";
}

function metersEqual(a: MeterMap, b: MeterMap): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function buildRecomputePlan(
  input: RecomputeCompanyInput,
  allowlist: readonly string[] = PROD_EMPTY_METERS_ALLOWLIST,
): RecomputePlanRow {
  assertCompanyAllowlisted(input.companyId, allowlist);

  const columns = legacyColumnsFromMeters(input.recomputedMeters);
  const billingPhase = mapStripeStatusToBillingPhase(input.stripeStatus);
  const snapshot = {
    locked_plan_price_id: input.recomputedLockedPlanPriceId,
    billing_phase: billingPhase,
    trial_discount_model:
      billingPhase === "trial" ? "stripe_native_trial" : undefined,
    meters: input.recomputedMeters,
  };

  const currentMeters = (input.current.entitlements_snapshot?.meters ??
    {}) as MeterMap;
  const statusMatch =
    (input.current.subscription_status || "").toLowerCase() ===
    input.stripeStatus.toLowerCase();
  const noop =
    metersEqual(currentMeters, input.recomputedMeters) &&
    statusMatch &&
    input.lockedPlanPriceId === input.recomputedLockedPlanPriceId &&
    input.current.pm_seat_limit === columns.pm_seat_limit &&
    input.current.worker_seat_limit === columns.worker_seat_limit &&
    input.current.project_limit === columns.project_limit &&
    input.current.entries_limit === columns.entries_limit &&
    input.current.storage_limit_bytes === columns.storage_limit_bytes;

  const revisionEventId = `recompute_allowlist_${input.companyId}`;
  const entitlementsRow = {
    company_id: input.companyId,
    ...columns,
    subscription_status: input.stripeStatus,
    billing_phase: billingPhase,
    source_plan_price_id: input.recomputedLockedPlanPriceId,
    entitlements_snapshot: snapshot,
    snapshot_locked_at: "<now>",
  };

  const nextTs = nextLastWebhookEventCreatedAtIso(
    normalizeWebhookEventCreatedUnix(input.eventCreatedUnix ?? undefined),
    input.current.last_webhook_event_created_at,
  );

  const subscriptionsPatch: Record<string, unknown> = {
    company_id: input.companyId,
    status: input.stripeStatus,
    locked_plan_price_id: input.recomputedLockedPlanPriceId,
  };
  if (nextTs) {
    subscriptionsPatch.last_webhook_event_created_at = nextTs;
  }

  return {
    companyId: input.companyId,
    tierSlug: input.tierSlug,
    stripeSubscriptionId: input.stripeSubscriptionId,
    noop,
    current: {
      pm: input.current.pm_seat_limit,
      workers: input.current.worker_seat_limit,
      projects: input.current.project_limit,
      entries: input.current.entries_limit,
      storageBytes: input.current.storage_limit_bytes,
      status: input.current.subscription_status,
      planPriceId: input.lockedPlanPriceId,
      snapshotMeters: currentMeters,
    },
    recomputed: {
      pm: columns.pm_seat_limit,
      workers: columns.worker_seat_limit,
      projects: columns.project_limit,
      entries: columns.entries_limit,
      storageBytes: columns.storage_limit_bytes,
      status: input.stripeStatus,
      planPriceId: input.recomputedLockedPlanPriceId,
      snapshotMeters: input.recomputedMeters,
      billingPhase,
    },
    wouldWrite: {
      company_entitlements: entitlementsRow,
      company_entitlement_revisions: {
        company_id: input.companyId,
        billing_phase: billingPhase,
        source: "manual_override",
        locked_plan_price_id: input.recomputedLockedPlanPriceId,
        entitlements_snapshot: snapshot,
        stripe_event_id: revisionEventId,
      },
      billing_audit_log: {
        company_id: input.companyId,
        action: "recompute_allowlist",
        after_snapshot: snapshot,
        reason: `allowlist recompute ${input.stripeSubscriptionId} status=${input.stripeStatus}`,
      },
      company_subscriptions_patch: noop ? null : subscriptionsPatch,
    },
  };
}

/** Format dry-run lines — company UUID only, no names/emails. */
export function formatRecomputeDryRun(plan: RecomputePlanRow): string[] {
  const lines: string[] = [];
  lines.push(`--- company=${plan.companyId} noop=${plan.noop} ---`);
  lines.push(
    `  tier=${plan.tierSlug ?? "?"} sub=${plan.stripeSubscriptionId}`,
  );
  lines.push(
    `  current:  pm=${plan.current.pm} workers=${plan.current.workers} projects=${plan.current.projects} entries=${plan.current.entries} storage=${plan.current.storageBytes} status=${plan.current.status} planPrice=${plan.current.planPriceId}`,
  );
  lines.push(
    `  current.snapshot.meters=${JSON.stringify(plan.current.snapshotMeters)}`,
  );
  lines.push(
    `  recompute: pm=${plan.recomputed.pm} workers=${plan.recomputed.workers} projects=${plan.recomputed.projects} entries=${plan.recomputed.entries} storage=${plan.recomputed.storageBytes} status=${plan.recomputed.status} planPrice=${plan.recomputed.planPriceId} phase=${plan.recomputed.billingPhase}`,
  );
  lines.push(
    `  recompute.snapshot.meters=${JSON.stringify(plan.recomputed.snapshotMeters)}`,
  );
  if (!plan.noop) {
    lines.push(
      `  WOULD upsert company_entitlements: ${JSON.stringify(plan.wouldWrite.company_entitlements)}`,
    );
    lines.push(
      `  WOULD insert company_entitlement_revisions: ${JSON.stringify(plan.wouldWrite.company_entitlement_revisions)}`,
    );
    lines.push(
      `  WOULD insert billing_audit_log: ${JSON.stringify(plan.wouldWrite.billing_audit_log)}`,
    );
    if (plan.wouldWrite.company_subscriptions_patch) {
      lines.push(
        `  WOULD patch company_subscriptions: ${JSON.stringify(plan.wouldWrite.company_subscriptions_patch)}`,
      );
    }
  } else {
    lines.push("  WOULD write: (none — already matches)");
  }
  return lines;
}
