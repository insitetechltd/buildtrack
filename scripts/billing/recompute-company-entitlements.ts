#!/usr/bin/env npx tsx
/**
 * One-off allowlisted entitlement recompute (empty snapshot meters repair).
 *
 * Uses the same meter path as stripe-webhook v14:
 *   Stripe GET subscription → plan_prices lookup → RPC
 *   build_entitlements_snapshot_from_price (p_billing_phase=migration) →
 *   src/billing/subscriptionMetersMerge.ts → assertPaidPlanMetersComplete.
 *
 * Dry-run by DEFAULT. No names/emails printed.
 *
 * Env (from --env-file or process env):
 *   EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY   (live or test; GET only — never printed)
 *
 * Typical PROD dry-run (Tristan's Mac — load Supabase + Stripe env; never print secrets):
 *   npx tsx scripts/billing/recompute-company-entitlements.ts \
 *     --project-ref jcnzjigxgkzhjsaekoqz \
 *     --env-file .cache/env-cutover/insite-prod.env.local \
 *     --env-file .cache/env-cutover/insite-prod-stripe.env.local
 *
 * Apply (explicit confirm of project ref required):
 *   npx tsx scripts/billing/recompute-company-entitlements.ts \
 *     --project-ref jcnzjigxgkzhjsaekoqz \
 *     --env-file .cache/env-cutover/insite-prod.env.local \
 *     --env-file .cache/env-cutover/insite-prod-stripe.env.local \
 *     --apply --confirm-ref jcnzjigxgkzhjsaekoqz
 *
 * Optional: --company-id <uuid> (repeatable; must be subset of allowlist).
 * --env-file may be repeated (later files fill missing keys only).
 *
 * Expected caps (verify vs plan_price_meters / HK pricing lock — NOT ENTITLEMENT_PRODUCT_LAW.md,
 * which is fail-open/fail-closed gate law only):
 *   growth (Starter): 1 PM / 5 workers / 3 projects / 300 entries / 10 GB
 *   internal_complimentary: Pro-shaped 3 / 15 / 12 / 800 / 30 GB (see provision script METERS)
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  PROD_EMPTY_METERS_ALLOWLIST,
  assertAllowlistSubset,
  buildRecomputePlan,
  formatRecomputeDryRun,
  mapStripeStatusToBillingPhase,
  type RecomputeCompanyInput,
} from "../../src/billing/recomputeCompanyEntitlements";
import {
  computeMergedMetersForSubscription,
  metersFromRpcResult,
  stripePriceIdsFromItems,
  type PlanPriceByStripe,
  type SubscriptionItemLike,
} from "../../src/billing/subscriptionMetersMerge";
import { legacyColumnsFromMeters } from "../../src/billing/entitlementMeters";

const ROOT = path.resolve(__dirname, "../..");

function loadEnvFile(filePath: string): void {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`env file not found: ${abs}`);
  }
  for (const line of fs.readFileSync(abs, "utf8").split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env) || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

function parseArgs(argv: string[]) {
  let projectRef = "";
  const envFiles: string[] = [];
  let apply = false;
  let confirmRef = "";
  const companyIds: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--project-ref") projectRef = argv[++i] || "";
    else if (a === "--env-file") envFiles.push(argv[++i] || "");
    else if (a === "--apply") apply = true;
    else if (a === "--confirm-ref") confirmRef = argv[++i] || "";
    else if (a === "--company-id") companyIds.push(argv[++i] || "");
    else if (a === "-h" || a === "--help") {
      console.log(`See header comment in ${__filename}`);
      process.exit(0);
    }
  }
  return { projectRef, envFiles, apply, confirmRef, companyIds };
}

type StripeSubJson = {
  id: string;
  status: string;
  livemode: boolean;
  items?: { data?: SubscriptionItemLike[] };
};

async function stripeGetSubscription(
  secret: string,
  subscriptionId: string,
): Promise<StripeSubJson> {
  const url = `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`stripe GET ${subscriptionId}: non-json ${res.status}`);
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error?: { message?: string } }).error?.message === "string"
        ? (body as { error: { message: string } }).error.message
        : `http ${res.status}`;
    throw new Error(`stripe GET ${subscriptionId}: ${msg}`);
  }
  return body as StripeSubJson;
}

function mapStripeStatus(status: string): string {
  const known = [
    "trialing",
    "active",
    "past_due",
    "canceled",
    "paused",
    "incomplete",
    "incomplete_expired",
    "unpaid",
  ];
  return known.includes(status) ? status : "active";
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectRef) {
    console.error("FAIL: --project-ref <ref> is required");
    return 1;
  }
  for (const f of args.envFiles) loadEnvFile(f);

  const url = (
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";

  if (!url || !service || !stripeKey) {
    console.error(
      "FAIL: need EXPO_PUBLIC_SUPABASE_URL|SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY",
    );
    return 1;
  }
  if (!url.includes(args.projectRef)) {
    console.error(
      `FAIL: URL host does not contain --project-ref ${args.projectRef}`,
    );
    return 1;
  }

  console.log(`projectRef=${args.projectRef}`);
  console.log(`mode=${args.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`supabaseHost=${new URL(url).host}`);
  console.log(`stripeKeyPrefix=${stripeKey.slice(0, 7)}…`);

  if (args.apply) {
    if (args.confirmRef !== args.projectRef) {
      console.error(
        "FAIL: --apply requires --confirm-ref <same as --project-ref>",
      );
      return 1;
    }
  }

  const targets =
    args.companyIds.length > 0
      ? args.companyIds
      : [...PROD_EMPTY_METERS_ALLOWLIST];
  assertAllowlistSubset(targets, PROD_EMPTY_METERS_ALLOWLIST);

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let wrote = 0;
  let noops = 0;

  for (const companyId of targets) {
    const { data: subRow, error: subErr } = await admin
      .from("company_subscriptions")
      .select(
        "stripe_subscription_id, status, locked_plan_price_id, livemode, last_webhook_event_created_at",
      )
      .eq("company_id", companyId)
      .maybeSingle();
    if (subErr) throw new Error(`sub_lookup ${companyId}: ${subErr.message}`);
    if (!subRow?.stripe_subscription_id) {
      console.error(`FAIL: no stripe_subscription_id for ${companyId}`);
      return 1;
    }

    const { data: entRow, error: entErr } = await admin
      .from("company_entitlements")
      .select(
        "pm_seat_limit, worker_seat_limit, project_limit, entries_limit, entries_limit_kind, storage_limit_bytes, subscription_status, entitlements_snapshot, source_plan_price_id, billing_phase",
      )
      .eq("company_id", companyId)
      .maybeSingle();
    if (entErr) throw new Error(`ent_lookup ${companyId}: ${entErr.message}`);

    const { data: tierRow } = await admin
      .from("plan_prices")
      .select("id, plan_tiers:plan_tier_id(slug)")
      .eq("id", subRow.locked_plan_price_id)
      .maybeSingle();
    const tierSlug =
      (tierRow as { plan_tiers?: { slug?: string } | null } | null)?.plan_tiers
        ?.slug ?? null;

    // GET only — never create/update/delete Stripe objects
    const subscription = await stripeGetSubscription(
      stripeKey,
      subRow.stripe_subscription_id as string,
    );
    const items = (subscription.items?.data ?? []) as SubscriptionItemLike[];
    const stripePriceIds = stripePriceIdsFromItems(items);
    if (stripePriceIds.length === 0) {
      throw new Error(`no price ids on ${subscription.id}`);
    }

    const { data: planPriceRows, error: ppErr } = await admin
      .from("plan_prices")
      .select("id, stripe_price_id, plan_tiers:plan_tier_id(kind)")
      .in("stripe_price_id", stripePriceIds)
      .eq("livemode", subscription.livemode);
    if (ppErr || !planPriceRows?.length) {
      throw new Error(
        `plan_prices lookup failed for ${subscription.id}: ${ppErr?.message || "empty"}`,
      );
    }

    const planPriceByStripe: PlanPriceByStripe = {};
    for (const row of planPriceRows as Array<{
      id: string;
      stripe_price_id: string;
      plan_tiers?: { kind?: string } | null;
    }>) {
      const kind = row.plan_tiers?.kind;
      if (!row.stripe_price_id || !row.id || !kind) continue;
      planPriceByStripe[row.stripe_price_id] = {
        planPriceId: row.id,
        kind,
      };
    }

    const { lockedPlanPriceId, meters } = await computeMergedMetersForSubscription(
      {
        subscriptionId: subscription.id,
        items,
        planPriceByStripe,
        fetchMetersForPlanPrice: async (planPriceId) => {
          const rpc = await admin.rpc("build_entitlements_snapshot_from_price", {
            p_plan_price_id: planPriceId,
            p_billing_phase: "migration",
          });
          return metersFromRpcResult(rpc, planPriceId);
        },
      },
    );

    const stripeStatus = mapStripeStatus(subscription.status);
    const input: RecomputeCompanyInput = {
      companyId,
      stripeSubscriptionId: subscription.id,
      lockedPlanPriceId: subRow.locked_plan_price_id as string,
      tierSlug,
      subscriptionStatus:
        (entRow?.subscription_status as string) || stripeStatus,
      billingPhase: mapStripeStatusToBillingPhase(stripeStatus),
      current: {
        pm_seat_limit: entRow?.pm_seat_limit ?? null,
        worker_seat_limit: entRow?.worker_seat_limit ?? null,
        project_limit: entRow?.project_limit ?? null,
        entries_limit: entRow?.entries_limit ?? null,
        entries_limit_kind: entRow?.entries_limit_kind ?? null,
        storage_limit_bytes: entRow?.storage_limit_bytes ?? null,
        subscription_status: entRow?.subscription_status ?? null,
        entitlements_snapshot:
          (entRow?.entitlements_snapshot as {
            meters?: Record<string, number | null>;
          }) ?? null,
        last_webhook_event_created_at:
          (subRow as { last_webhook_event_created_at?: string | null })
            .last_webhook_event_created_at ?? null,
      },
      recomputedMeters: meters,
      recomputedLockedPlanPriceId: lockedPlanPriceId,
      stripeStatus,
      eventCreatedUnix: Math.floor(Date.now() / 1000),
    };

    const plan = buildRecomputePlan(input);
    for (const line of formatRecomputeDryRun(plan)) {
      console.log(line);
    }

    if (plan.noop) {
      noops += 1;
      continue;
    }
    if (!args.apply) continue;

    const columns = legacyColumnsFromMeters(meters);
    const billingPhase = mapStripeStatusToBillingPhase(stripeStatus);
    const snapshot = {
      locked_plan_price_id: lockedPlanPriceId,
      billing_phase: billingPhase,
      trial_discount_model:
        billingPhase === "trial" ? "stripe_native_trial" : undefined,
      meters,
    };
    const nowIso = new Date().toISOString();

    const { error: entUpsertErr } = await admin
      .from("company_entitlements")
      .upsert(
        {
          company_id: companyId,
          ...columns,
          subscription_status: stripeStatus,
          billing_phase: billingPhase,
          source_plan_price_id: lockedPlanPriceId,
          entitlements_snapshot: snapshot,
          snapshot_locked_at: nowIso,
        },
        { onConflict: "company_id" },
      );
    if (entUpsertErr) {
      throw new Error(`entitlements_upsert: ${entUpsertErr.message}`);
    }

    const revId = `recompute_allowlist_${companyId}`;
    const { data: existingRev } = await admin
      .from("company_entitlement_revisions")
      .select("id")
      .eq("stripe_event_id", revId)
      .maybeSingle();
    if (!existingRev?.id) {
      const { error: revErr } = await admin
        .from("company_entitlement_revisions")
        .insert({
          company_id: companyId,
          billing_phase: billingPhase,
          source: "manual_override",
          locked_plan_price_id: lockedPlanPriceId,
          entitlements_snapshot: snapshot,
          stripe_event_id: revId,
        });
      if (revErr) throw new Error(`revision_insert: ${revErr.message}`);
    }

    const { error: auditErr } = await admin.from("billing_audit_log").insert({
      company_id: companyId,
      action: "recompute_allowlist",
      after_snapshot: snapshot,
      reason: `allowlist recompute ${subscription.id} status=${stripeStatus}`,
    });
    if (auditErr) throw new Error(`audit_insert: ${auditErr.message}`);

    if (plan.wouldWrite.company_subscriptions_patch) {
      const patch = { ...plan.wouldWrite.company_subscriptions_patch };
      delete patch.company_id;
      const { error: subPatchErr } = await admin
        .from("company_subscriptions")
        .update(patch)
        .eq("company_id", companyId);
      if (subPatchErr) {
        throw new Error(`subscriptions_patch: ${subPatchErr.message}`);
      }
    }

    wrote += 1;
    console.log(`  APPLIED company=${companyId}`);
  }

  console.log(
    `done mode=${args.apply ? "APPLY" : "DRY-RUN"} companies=${targets.length} wrote=${wrote} noop=${noops}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
