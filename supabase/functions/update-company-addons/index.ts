// M-BILL-01 BILL-F — Update company add-ons (PM seat / worker)
// Deploy: scripts/supabase/deploy-billing-edge.sh
// Secrets: STRIPE_SECRET_KEY
// Auth: user JWT required (Authorization header)
//
// Product law (HK pricing lock):
// - Add mid-cycle → apply immediately + create_prorations (charge remainder)
// - Remove mid-cycle → NO pro-rata refund; keep Stripe qty + entitlements
//   until current_period_end; schedule desired qty via subscription metadata
// - Re-add same period before period end → cancel pending decrease (no 2nd charge
//   if Stripe qty never dropped)
//
// Webhook applies pending decreases when the billing period rolls.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Stripe subscription.metadata keys for deferred add-on decreases. */
export const PENDING_WORKER_META = "insite_pending_worker_addon_qty";
export const PENDING_PM_META = "insite_pending_pm_addon_qty";
export const PENDING_AT_META = "insite_pending_addons_at";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripeLivemodeFromSecret(secret: string): boolean {
  return secret.startsWith("sk_live_");
}

async function stripeGet(
  stripeSecret: string,
  path: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeSecret}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof (payload as { error?: { message?: string } })?.error?.message ===
        "string"
        ? (payload as { error?: { message?: string } }).error?.message
        : `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as Record<string, unknown>;
}

/** Customer-facing Stripe receipt details after an addon change lands. */
type StripeAddonConfirmation = {
  subscriptionStatus: string;
  subscriptionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  invoiceStatus: string | null;
  amountDueCents: number | null;
  amountPaidCents: number | null;
  currency: string | null;
  paid: boolean;
  hostedInvoiceUrl: string | null;
  workerAddonQty: number;
  pmAddonQty: number;
  deferredDecrease: boolean;
  effectiveAt: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asFiniteInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  return null;
}

async function buildStripeAddonConfirmation(args: {
  stripeSecret: string;
  subscription: Record<string, unknown>;
  workerAddonQty: number;
  pmAddonQty: number;
  deferredDecrease: boolean;
  effectiveAt: string | null;
}): Promise<StripeAddonConfirmation> {
  const subscriptionId = asString(args.subscription.id) ?? "";
  const subscriptionStatus = asString(args.subscription.status) ?? "unknown";

  let invoice: Record<string, unknown> | null = null;
  const latestInvoice = args.subscription.latest_invoice;
  const latestInvoiceId =
    typeof latestInvoice === "string"
      ? latestInvoice
      : latestInvoice && typeof latestInvoice === "object"
        ? asString((latestInvoice as { id?: unknown }).id)
        : null;

  try {
    if (latestInvoiceId) {
      invoice = await stripeGet(
        args.stripeSecret,
        `/invoices/${encodeURIComponent(latestInvoiceId)}`,
      );
    } else if (subscriptionId) {
      const list = await stripeGet(
        args.stripeSecret,
        `/invoices?subscription=${encodeURIComponent(subscriptionId)}&limit=1`,
      );
      const data = (list.data as Array<Record<string, unknown>> | undefined) ??
        [];
      invoice = data[0] ?? null;
    }
  } catch {
    invoice = null;
  }

  const invoiceStatus = asString(invoice?.status);
  const amountDue = asFiniteInt(invoice?.amount_due);
  const amountPaid = asFiniteInt(invoice?.amount_paid);
  const paid =
    invoiceStatus === "paid" ||
    (typeof invoice?.paid === "boolean" && invoice.paid === true) ||
    (amountDue === 0 &&
      (invoiceStatus === "paid" ||
        invoiceStatus === "void" ||
        subscriptionStatus === "trialing"));

  return {
    subscriptionStatus,
    subscriptionId,
    invoiceId: asString(invoice?.id),
    invoiceNumber: asString(invoice?.number),
    invoiceStatus,
    amountDueCents: amountDue,
    amountPaidCents: amountPaid,
    currency: asString(invoice?.currency)?.toUpperCase() ?? null,
    paid,
    hostedInvoiceUrl: asString(invoice?.hosted_invoice_url),
    workerAddonQty: args.workerAddonQty,
    pmAddonQty: args.pmAddonQty,
    deferredDecrease: args.deferredDecrease,
    effectiveAt: args.effectiveAt,
  };
}

async function stripeUpdateSubscription(
  stripeSecret: string,
  subscriptionId: string,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof (payload as { error?: { message?: string } })?.error?.message ===
        "string"
        ? (payload as { error?: { message?: string } }).error?.message
        : `Stripe upgrade failed (${response.status})`;
    throw new Error(message);
  }

  return payload as Record<string, unknown>;
}

type CompanyAddonsInput = {
  companyId: string;
  /** Quantity of `addon_worker_pack` units (+1 worker each). */
  addonWorkerPacks: number;
  /** Quantity of `addon_pm_seat` units (+1 PM each). */
  addonPmSeats: number;
};

const ADDON_TIER_SLUGS = {
  worker: "addon_worker_pack",
  pm: "addon_pm_seat",
} as const;

const NON_NEGATIVE_INT_ERR = { error: "invalid_payload" };

function parseMetaQty(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

type MeterMap = Record<string, number | null>;
type AdminClient = ReturnType<typeof createClient>;

/**
 * Product law: HK$20 = +1 worker, HK$100 = +1 PM per unit.
 * Prefer plan_price_meters when present; never trust stale pack=5 for UX wait.
 */
const ADDON_SEATS_PER_UNIT = 1;

async function metersFromPlanPrice(
  admin: AdminClient,
  planPriceId: string,
): Promise<MeterMap> {
  const { data, error } = await admin.rpc(
    "build_entitlements_snapshot_from_price",
    {
      p_plan_price_id: planPriceId,
      p_billing_phase: "migration",
    },
  );
  if (error) {
    throw new Error(`snapshot_rpc_failed:${error.message}`);
  }
  return ((data as { meters?: MeterMap } | null)?.meters ?? {}) as MeterMap;
}

function entriesLimitKindFromMeters(meters: MeterMap): string {
  if (meters.entries_trial_total != null) return "trial_total";
  if (meters.entries_monthly == null) return "unlimited";
  return "monthly";
}

function parseTrialDaysFromEnv(): number | null {
  const trialDaysRaw = Deno.env.get("STRIPE_TRIAL_PERIOD_DAYS");
  if (trialDaysRaw == null || trialDaysRaw === "") return null;
  const trialDays = Number.parseInt(trialDaysRaw, 10);
  if (!Number.isFinite(trialDays) || trialDays <= 0) return null;
  return trialDays;
}

/**
 * Current test Stripe ops stay on native trial (trialing).
 * Addon prorations can clear trial_end — re-apply when configured.
 */
async function ensureTestModeNativeTrial(args: {
  stripeSecret: string;
  subscriptionId: string;
  subscription: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  if (stripeLivemodeFromSecret(args.stripeSecret)) {
    return args.subscription;
  }
  const trialDays = parseTrialDaysFromEnv();
  if (trialDays == null) {
    return args.subscription;
  }

  const now = Math.floor(Date.now() / 1000);
  const desiredEnd = now + trialDays * 24 * 60 * 60;
  const status =
    typeof args.subscription.status === "string" ? args.subscription.status : "";
  const existingEnd =
    typeof args.subscription.trial_end === "number" &&
      Number.isFinite(args.subscription.trial_end)
      ? Math.floor(args.subscription.trial_end)
      : null;

  if (status === "trialing" && existingEnd != null && existingEnd >= desiredEnd - 120) {
    return args.subscription;
  }

  const body = new URLSearchParams();
  body.set("trial_end", String(desiredEnd));
  body.set("proration_behavior", "none");
  return await stripeUpdateSubscription(
    args.stripeSecret,
    args.subscriptionId,
    body,
  );
}

/**
 * Merge base plan meters + purchased addon qty into company_entitlements.
 * Webhook remains eventual SoT; this removes Allocated-resources lag on add.
 */
async function syncSeatEntitlementsFromAddons(args: {
  admin: AdminClient;
  companyId: string;
  requestedWorker: number;
  requestedPm: number;
  preferTrialing?: boolean;
}): Promise<void> {
  const { data: subRow, error: subError } = await args.admin
    .from("company_subscriptions")
    .select("locked_plan_price_id, status")
    .eq("company_id", args.companyId)
    .maybeSingle();
  if (subError || !subRow?.locked_plan_price_id) {
    throw new Error("subscription_locked_price_missing");
  }

  const { data: entRow, error: entError } = await args.admin
    .from("company_entitlements")
    .select(
      "billing_phase, subscription_status, entitlements_snapshot, source_plan_price_id",
    )
    .eq("company_id", args.companyId)
    .maybeSingle();
  if (entError || !entRow) {
    throw new Error("entitlements_missing");
  }

  const baseMeters = await metersFromPlanPrice(
    args.admin,
    subRow.locked_plan_price_id as string,
  );
  // Product law: +1 seat per purchased unit (slug may still be *_pack).
  // Catalog pack sizes (e.g. stale 5) must not inflate Allocated resources.
  const workerPerUnit = ADDON_SEATS_PER_UNIT;
  const pmPerUnit = ADDON_SEATS_PER_UNIT;

  const baseWorker =
    typeof baseMeters.worker_seats === "number" ? baseMeters.worker_seats : 5;
  const basePm =
    typeof baseMeters.pm_seats === "number" ? baseMeters.pm_seats : 1;

  const priorSnapshot =
    entRow.entitlements_snapshot &&
      typeof entRow.entitlements_snapshot === "object"
      ? (entRow.entitlements_snapshot as Record<string, unknown>)
      : {};
  const priorMeters =
    priorSnapshot.meters && typeof priorSnapshot.meters === "object"
      ? (priorSnapshot.meters as MeterMap)
      : { ...baseMeters };

  const nextMeters: MeterMap = {
    ...priorMeters,
    ...baseMeters,
    worker_seats: baseWorker + args.requestedWorker * workerPerUnit,
    pm_seats: basePm + args.requestedPm * pmPerUnit,
  };

  const billingPhase = args.preferTrialing
    ? "trial"
    : entRow.billing_phase === "trial" ||
        entRow.billing_phase === "active" ||
        entRow.billing_phase === "override"
      ? (entRow.billing_phase as "trial" | "active" | "override")
      : "active";
  const subscriptionStatus = args.preferTrialing
    ? "trialing"
    : typeof entRow.subscription_status === "string" &&
        entRow.subscription_status.length > 0
      ? entRow.subscription_status
      : typeof subRow.status === "string"
        ? subRow.status
        : "active";

  const entriesKind = entriesLimitKindFromMeters(nextMeters);
  let entriesLimit: number | null = null;
  if (entriesKind === "trial_total") {
    entriesLimit = nextMeters.entries_trial_total ?? null;
  } else if (entriesKind === "monthly") {
    entriesLimit = nextMeters.entries_monthly ?? null;
  }

  const snapshot = {
    ...priorSnapshot,
    locked_plan_price_id: subRow.locked_plan_price_id,
    billing_phase: billingPhase,
    meters: nextMeters,
  };

  const { error: upsertError } = await args.admin
    .from("company_entitlements")
    .upsert({
      company_id: args.companyId,
      pm_seat_limit: nextMeters.pm_seats ?? 1,
      worker_seat_limit: nextMeters.worker_seats ?? 5,
      project_limit: nextMeters.projects ?? null,
      entries_limit: entriesLimit,
      entries_limit_kind: entriesKind,
      storage_limit_bytes: nextMeters.storage_bytes ?? null,
      subscription_status: subscriptionStatus,
      billing_phase: billingPhase,
      source_plan_price_id:
        (entRow.source_plan_price_id as string | null) ??
        (subRow.locked_plan_price_id as string),
      entitlements_snapshot: snapshot,
      snapshot_locked_at: new Date().toISOString(),
    });
  if (upsertError) {
    throw new Error(`entitlements_upsert_failed:${upsertError.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecret) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as Partial<
      CompanyAddonsInput
    > & { reconcileOnly?: boolean };
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
    const reconcileOnly = body.reconcileOnly === true;

    const addonWorkerPacksRaw =
      typeof body.addonWorkerPacks === "number"
        ? body.addonWorkerPacks
        : Number.NaN;
    const addonPmSeatsRaw =
      typeof body.addonPmSeats === "number" ? body.addonPmSeats : Number.NaN;

    if (!companyId) {
      return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
    }
    if (!reconcileOnly) {
      if (
        !Number.isFinite(addonWorkerPacksRaw) ||
        addonWorkerPacksRaw < 0 ||
        !Number.isInteger(addonWorkerPacksRaw)
      ) {
        return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
      }
      if (
        !Number.isFinite(addonPmSeatsRaw) ||
        addonPmSeatsRaw < 0 ||
        !Number.isInteger(addonPmSeatsRaw)
      ) {
        return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
      }
    }

    const requestedWorker = reconcileOnly ? 0 : addonWorkerPacksRaw;
    const requestedPm = reconcileOnly ? 0 : addonPmSeatsRaw;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    // Live tenants use `role`; greenfield may use `system_permission`.
    let profile: {
      company_id: string | null;
      role?: string | null;
      system_permission?: string | null;
      is_pending?: boolean | null;
    } | null = null;

    {
      const rolePath = await adminClient
        .from("users")
        .select("id, company_id, role, is_pending")
        .eq("id", caller.id)
        .maybeSingle();
      if (!rolePath.error && rolePath.data) {
        profile = rolePath.data;
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, company_id, system_permission, is_pending")
          .eq("id", caller.id)
          .maybeSingle();
        if (sysPath.error || !sysPath.data) {
          return jsonResponse({ error: "caller_profile_not_found" }, 403);
        }
        profile = sysPath.data;
      }
    }

    if (profile.is_pending) {
      return jsonResponse({ error: "caller_pending" }, 403);
    }
    if (profile.company_id !== companyId) {
      return jsonResponse({ error: "company_mismatch" }, 403);
    }

    const permission = (profile.system_permission || "").toLowerCase();
    const role = (profile.role || "").toLowerCase();
    const isAdmin =
      permission === "admin" ||
      role === "admin" ||
      role === "company_admin";
    if (!isAdmin) {
      return jsonResponse({ error: "not_company_admin" }, 403);
    }

    const livemode = stripeLivemodeFromSecret(stripeSecret);
    const billingCurrency = (
      Deno.env.get("BILLING_CURRENCY") ?? "hkd"
    ).toLowerCase();

    const { data: companySubRow } = await adminClient
      .from("company_subscriptions")
      .select("stripe_subscription_id")
      .eq("company_id", companyId)
      .maybeSingle();

    const stripeSubscriptionId = (companySubRow as
      | { stripe_subscription_id?: string | null }
      | null)?.stripe_subscription_id;

    if (!stripeSubscriptionId) {
      return jsonResponse({ error: "subscription_missing" }, 404);
    }

    async function findAddonPlanPrice(slug: string) {
      const { data: tier, error: tierError } = await adminClient
        .from("plan_tiers")
        .select("id")
        .eq("slug", slug)
        .eq("kind", "addon")
        .eq("is_active", true)
        .maybeSingle();
      if (tierError || !tier?.id) {
        throw new Error(`addon_tier_not_found:${slug}`);
      }

      const { data: planPrice, error: planError } = await adminClient
        .from("plan_prices")
        .select("id, stripe_price_id")
        .eq("plan_tier_id", tier.id)
        .eq("livemode", livemode)
        .eq("currency", billingCurrency)
        .eq("is_sellable", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (planError || !planPrice?.id || !planPrice.stripe_price_id) {
        throw new Error(`addon_price_not_found:${slug}`);
      }
      return planPrice as { id: string; stripe_price_id: string };
    }

    const addonWorkerPlanPrice = await findAddonPlanPrice(ADDON_TIER_SLUGS.worker);
    const addonPmPlanPrice = await findAddonPlanPrice(ADDON_TIER_SLUGS.pm);

    const stripeSub = await stripeGet(
      stripeSecret,
      `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}?expand[]=items.data.price`,
    );

    const items = (stripeSub.items as { data?: Array<Record<string, unknown>> } | undefined)
      ?.data ?? [];
    const metadata = (stripeSub.metadata as Record<string, string> | undefined) ??
      {};

    /** Stripe classic: subscription.current_period_end. Flexible/newer: item.current_period_end. */
    function coerceUnixSeconds(value: unknown): number | null {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
      }
      return null;
    }

    function resolvePeriodEndUnix(): number | null {
      const nowSec = Math.floor(Date.now() / 1000);
      const fromSub = coerceUnixSeconds(stripeSub.current_period_end);
      if (fromSub != null && fromSub > nowSec) return fromSub;

      let maxItemEnd: number | null = null;
      for (const item of items) {
        const itemEnd = coerceUnixSeconds(item.current_period_end);
        if (
          itemEnd != null &&
          itemEnd > nowSec &&
          (maxItemEnd == null || itemEnd > maxItemEnd)
        ) {
          maxItemEnd = itemEnd;
        }
      }
      if (maxItemEnd != null) return maxItemEnd;

      const trialEnd = coerceUnixSeconds(stripeSub.trial_end);
      if (trialEnd != null && trialEnd > nowSec) return trialEnd;

      return null;
    }

    // Prefer live Stripe; fall back to last webhook sync in company_subscriptions.
    let periodEnd = resolvePeriodEndUnix();
    if (periodEnd == null) {
      const { data: periodRow } = await adminClient
        .from("company_subscriptions")
        .select("current_period_end")
        .eq("company_id", companyId)
        .maybeSingle();
      const dbEnd = (periodRow as { current_period_end?: string | null } | null)
        ?.current_period_end;
      if (dbEnd) {
        const ms = Date.parse(dbEnd);
        if (Number.isFinite(ms) && ms > Date.now()) {
          periodEnd = Math.floor(ms / 1000);
        }
      }
    }

    function extractStripePriceId(item: Record<string, unknown>): string | null {
      const price = item.price as unknown;
      if (!price) return null;
      if (typeof price === "string") return price;
      if (typeof price === "object" && price && "id" in price) {
        return typeof (price as { id?: unknown }).id === "string"
          ? (price as { id: string }).id
          : null;
      }
      return null;
    }

    function extractItemId(item: Record<string, unknown>): string | null {
      const id = item.id;
      return typeof id === "string" ? id : null;
    }

    function extractQuantity(item: Record<string, unknown> | undefined): number {
      if (!item) return 0;
      const q = item.quantity;
      return typeof q === "number" && Number.isFinite(q)
        ? Math.max(0, Math.floor(q))
        : 1;
    }

    const workerExistingItem = items.find((it) => {
      const stripePriceId = extractStripePriceId(it);
      return stripePriceId === addonWorkerPlanPrice.stripe_price_id;
    });
    const pmExistingItem = items.find((it) => {
      const stripePriceId = extractStripePriceId(it);
      return stripePriceId === addonPmPlanPrice.stripe_price_id;
    });

    const workerExistingItemId = workerExistingItem
      ? extractItemId(workerExistingItem)
      : null;
    const pmExistingItemId = pmExistingItem ? extractItemId(pmExistingItem) : null;

    const currentWorker = extractQuantity(workerExistingItem);
    const currentPm = extractQuantity(pmExistingItem);

    // Pull-to-refresh / drift repair: rewrite seat meters from live Stripe qty.
    // Respects deferred removes (Stripe qty stays high until period end).
    if (reconcileOnly) {
      await syncSeatEntitlementsFromAddons({
        admin: adminClient,
        companyId,
        requestedWorker: currentWorker,
        requestedPm: currentPm,
      });
      return jsonResponse({
        success: true,
        changed: false,
        deferredDecrease: false,
        reconciledWorkerQty: currentWorker,
        reconciledPmQty: currentPm,
      });
    }

    // Immediate increases only (qty going above live Stripe qty).
    const workerIncrease = requestedWorker > currentWorker;
    const pmIncrease = requestedPm > currentPm;
    const workerDecrease = requestedWorker < currentWorker;
    const pmDecrease = requestedPm < currentPm;

    // Cancel pending decrease when requesting back up to (or above) live qty.
    let nextPendingWorker: number | null = parseMetaQty(
      metadata[PENDING_WORKER_META],
    );
    let nextPendingPm: number | null = parseMetaQty(metadata[PENDING_PM_META]);

    if (workerDecrease) {
      nextPendingWorker = requestedWorker;
    } else if (requestedWorker >= currentWorker) {
      nextPendingWorker = null;
    }

    if (pmDecrease) {
      nextPendingPm = requestedPm;
    } else if (requestedPm >= currentPm) {
      nextPendingPm = null;
    }

    const hasImmediateIncrease = workerIncrease || pmIncrease;
    const hasDeferredDecrease = workerDecrease || pmDecrease;
    const pendingChanged =
      nextPendingWorker !== parseMetaQty(metadata[PENDING_WORKER_META]) ||
      nextPendingPm !== parseMetaQty(metadata[PENDING_PM_META]);
    const needsPendingSchedule =
      nextPendingWorker != null || nextPendingPm != null;

    if (!hasImmediateIncrease && !hasDeferredDecrease && !pendingChanged) {
      return jsonResponse({
        success: true,
        changed: false,
        deferredDecrease: false,
      });
    }

    // Period end is only required when scheduling a deferred remove.
    // Newer Stripe APIs may omit subscription.current_period_end (item-level only).
    if (needsPendingSchedule && periodEnd == null) {
      return jsonResponse(
        {
          error: "subscription_missing_period_end",
          message:
            "Could not determine your billing period end. Try again, or email support.",
        },
        500,
      );
    }

    function setPendingMetadata(body: URLSearchParams) {
      body.set(
        `metadata[${PENDING_WORKER_META}]`,
        nextPendingWorker == null ? "" : String(nextPendingWorker),
      );
      body.set(
        `metadata[${PENDING_PM_META}]`,
        nextPendingPm == null ? "" : String(nextPendingPm),
      );
      if (!needsPendingSchedule) {
        body.set(`metadata[${PENDING_AT_META}]`, "");
      } else {
        body.set(`metadata[${PENDING_AT_META}]`, String(periodEnd));
      }
    }

    let confirmationSub: Record<string, unknown> = stripeSub;

    // --- Immediate increases: charge remainder of period ---
    if (hasImmediateIncrease) {
      const increaseBody = new URLSearchParams();
      increaseBody.set("proration_behavior", "create_prorations");
      increaseBody.set("payment_behavior", "pending_if_incomplete");

      let itemIndex = 0;
      function addIncreaseItem(opts: {
        id?: string | null;
        price?: string | null;
        quantity: number;
      }) {
        if (opts.id) {
          increaseBody.set(`items[${itemIndex}][id]`, opts.id);
          increaseBody.set(
            `items[${itemIndex}][quantity]`,
            String(opts.quantity),
          );
        } else if (opts.price) {
          increaseBody.set(`items[${itemIndex}][price]`, opts.price);
          increaseBody.set(
            `items[${itemIndex}][quantity]`,
            String(opts.quantity),
          );
        } else {
          throw new Error("invalid_item_update");
        }
        itemIndex += 1;
      }

      if (workerIncrease) {
        if (workerExistingItemId) {
          addIncreaseItem({
            id: workerExistingItemId,
            quantity: requestedWorker,
          });
        } else {
          addIncreaseItem({
            price: addonWorkerPlanPrice.stripe_price_id,
            quantity: requestedWorker,
          });
        }
      }

      if (pmIncrease) {
        if (pmExistingItemId) {
          addIncreaseItem({ id: pmExistingItemId, quantity: requestedPm });
        } else {
          addIncreaseItem({
            price: addonPmPlanPrice.stripe_price_id,
            quantity: requestedPm,
          });
        }
      }

      setPendingMetadata(increaseBody);

      let updatedSub = await stripeUpdateSubscription(
        stripeSecret,
        stripeSubscriptionId,
        increaseBody,
      );

      updatedSub = await ensureTestModeNativeTrial({
        stripeSecret,
        subscriptionId: stripeSubscriptionId,
        subscription: updatedSub,
      });
      confirmationSub = updatedSub;

      // Confirm Stripe applied the new qty (pending_if_incomplete can leave
      // prior qty until payment succeeds — do not claim success then).
      const updatedItems =
        (updatedSub.items as { data?: Array<Record<string, unknown>> } | undefined)
          ?.data ?? [];
      const liveWorker = extractQuantity(
        updatedItems.find((it) => {
          const stripePriceId = extractStripePriceId(it);
          return stripePriceId === addonWorkerPlanPrice.stripe_price_id;
        }),
      );
      const livePm = extractQuantity(
        updatedItems.find((it) => {
          const stripePriceId = extractStripePriceId(it);
          return stripePriceId === addonPmPlanPrice.stripe_price_id;
        }),
      );
      if (
        (workerIncrease && liveWorker < requestedWorker) ||
        (pmIncrease && livePm < requestedPm)
      ) {
        return jsonResponse(
          {
            error: "addon_payment_incomplete",
            message:
              "Stripe needs payment before extra seats activate. Complete the open invoice in Stripe, then pull to refresh.",
          },
          402,
        );
      }

      const preferTrialing =
        !livemode && parseTrialDaysFromEnv() != null;

      // Write entitlements immediately so Allocated resources updates without
      // waiting on stripe-webhook (webhook remains SoT for later sync).
      await syncSeatEntitlementsFromAddons({
        admin: adminClient,
        companyId,
        requestedWorker,
        requestedPm,
        preferTrialing,
      });

      if (preferTrialing) {
        await adminClient
          .from("company_subscriptions")
          .update({ status: "trialing" })
          .eq("company_id", companyId);
      }
    }

    // --- Deferred decreases: metadata only (no qty change, no credit) ---
    if (hasDeferredDecrease || (!hasImmediateIncrease && pendingChanged)) {
      const metaBody = new URLSearchParams();
      metaBody.set("proration_behavior", "none");
      setPendingMetadata(metaBody);

      let metaUpdated = await stripeUpdateSubscription(
        stripeSecret,
        stripeSubscriptionId,
        metaBody,
      );
      metaUpdated = await ensureTestModeNativeTrial({
        stripeSecret,
        subscriptionId: stripeSubscriptionId,
        subscription: metaUpdated,
      });
      confirmationSub = metaUpdated;
    }

    const effectiveAt =
      hasDeferredDecrease && periodEnd != null
        ? new Date(periodEnd * 1000).toISOString()
        : null;

    // Fresh read so confirmation includes latest_invoice after the write.
    try {
      confirmationSub = await stripeGet(
        stripeSecret,
        `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}?expand[]=latest_invoice`,
      );
    } catch {
      // Keep last in-memory subscription snapshot.
    }

    const stripeConfirmation = await buildStripeAddonConfirmation({
      stripeSecret,
      subscription: confirmationSub,
      workerAddonQty: requestedWorker,
      pmAddonQty: requestedPm,
      deferredDecrease: hasDeferredDecrease,
      effectiveAt,
    });

    await adminClient.from("billing_audit_log").insert({
      company_id: companyId,
      action: hasDeferredDecrease ? "addon_decrease_scheduled" : "addon_change",
      after_snapshot: {
        requested_worker: requestedWorker,
        requested_pm: requestedPm,
        stripe_worker: currentWorker,
        stripe_pm: currentPm,
        pending_worker: nextPendingWorker,
        pending_pm: nextPendingPm,
        pending_at: needsPendingSchedule ? periodEnd : null,
        immediate_increase: hasImmediateIncrease,
        stripe_confirmation: stripeConfirmation,
      },
      reason: hasDeferredDecrease
        ? "addon_remove_no_refund_until_period_end"
        : "addon_quantity_update",
    });

    return jsonResponse({
      success: true,
      changed: true,
      deferredDecrease: hasDeferredDecrease,
      effectiveAt,
      pendingWorkerQty: nextPendingWorker,
      pendingPmQty: nextPendingPm,
      stripeConfirmation,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
