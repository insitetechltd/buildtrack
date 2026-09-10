// M-BILL-01 BILL-C — Stripe webhook → company_subscriptions + entitlements sync
// Deploy: scripts/supabase/deploy-stripe-webhook.sh
// Secrets (Dashboard → Edge Functions): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// Checkout/subscription metadata: company_id, plan_price_id, livemode (optional override)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

type AdminClient = ReturnType<typeof createClient>;

type MeterMap = Record<string, number | null>;

type EntitlementsSnapshot = {
  locked_plan_price_id: string;
  billing_phase: string;
  trial_discount_model?: string;
  meters: MeterMap;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "paused":
      return "paused";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "unpaid":
      return "unpaid";
    default:
      return "active";
  }
}

function billingPhaseFromStatus(status: string): "trial" | "active" | "override" {
  return status === "trialing" ? "trial" : "active";
}

function buildTrialSnapshotFromPrice(
  paidSnapshot: EntitlementsSnapshot,
): EntitlementsSnapshot {
  return {
    ...paidSnapshot,
    billing_phase: "trial",
    trial_discount_model: "stripe_native_trial",
  };
}

function entriesLimitKindFromMeters(meters: MeterMap): string {
  if (meters.entries_trial_total != null) return "trial_total";
  if (meters.entries_monthly == null) return "unlimited";
  return "monthly";
}

function entitlementsRowFromSnapshot(
  snapshot: EntitlementsSnapshot,
  subscriptionStatus: string,
  billingPhase: "trial" | "active" | "override",
  sourcePlanPriceId: string,
) {
  const meters = snapshot.meters ?? {};
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
    subscription_status: subscriptionStatus,
    billing_phase: billingPhase,
    source_plan_price_id: sourcePlanPriceId,
    entitlements_snapshot: snapshot,
    snapshot_locked_at: new Date().toISOString(),
  };
}

async function resolvePlanPriceId(
  admin: AdminClient,
  stripePriceId: string,
  livemode: boolean,
  metadataPlanPriceId?: string | null,
): Promise<string | null> {
  if (metadataPlanPriceId) {
    const { data } = await admin
      .from("plan_prices")
      .select("id")
      .eq("id", metadataPlanPriceId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data } = await admin
    .from("plan_prices")
    .select("id")
    .eq("stripe_price_id", stripePriceId)
    .eq("livemode", livemode)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
}

async function buildPaidSnapshot(
  admin: AdminClient,
  planPriceId: string,
): Promise<EntitlementsSnapshot> {
  const { data, error } = await admin.rpc("build_entitlements_snapshot_from_price", {
    p_plan_price_id: planPriceId,
    p_billing_phase: "active",
  });
  if (error) throw error;
  return data as EntitlementsSnapshot;
}

async function claimWebhookEvent(
  admin: AdminClient,
  event: Stripe.Event,
): Promise<boolean> {
  const { error } = await admin.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload_hash: null,
  });
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

/** Allow Stripe retries after mid-handler failure (claim-before-work otherwise deadlocks). */
async function releaseWebhookEvent(
  admin: AdminClient,
  stripeEventId: string,
): Promise<void> {
  await admin
    .from("billing_webhook_events")
    .delete()
    .eq("stripe_event_id", stripeEventId);
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** DEV may have `role`; PROD may have `system_permission` — never write missing cols. */
async function detectUserAdminColumns(
  admin: AdminClient,
): Promise<{ hasRole: boolean; hasSystemPermission: boolean }> {
  const roleProbe = await admin.from("users").select("role").limit(1);
  const sysProbe = await admin.from("users").select("system_permission").limit(1);
  return {
    hasRole: !roleProbe.error,
    hasSystemPermission: !sysProbe.error,
  };
}

async function promoteFoundingAdminProfile(
  admin: AdminClient,
  params: {
    userId: string;
    email: string;
    name: string;
    companyId?: string | null;
  },
): Promise<void> {
  const cols = await detectUserAdminColumns(admin);
  const patch: Record<string, unknown> = {
    email: params.email,
    name: params.name,
    is_pending: false,
    must_set_password: true,
  };
  if (params.companyId) {
    patch.company_id = params.companyId;
  }
  if (cols.hasSystemPermission) {
    patch.system_permission = "admin";
  }
  if (cols.hasRole) {
    patch.role = "admin";
  }

  const { error } = await admin.from("users").update(patch).eq("id", params.userId);
  if (error) {
    throw new Error(error.message || "founder_profile_update_failed");
  }
}

async function mintInviteOpenLink(
  admin: AdminClient,
  supabaseUrl: string,
  email: string,
  userId: string,
): Promise<string> {
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    throw new Error(linkError?.message || "invite_link_failed");
  }
  const origin = supabaseUrl.replace(/\/$/, "");
  const signInLink =
    `${origin}/functions/v1/invite-open?token_hash=${encodeURIComponent(hashedToken)}`;
  await admin
    .from("users")
    .update({ invite_sign_in_link: signInLink })
    .eq("id", userId);
  return signInLink;
}

/**
 * Checkout-first signup: pay → provision founding CA + company, then entitlements.
 * Idempotent on email / stripe_subscription_id. Does not RPC create_company_for_self.
 */
async function provisionCheckoutFirstSignup(
  admin: AdminClient,
  stripe: Stripe,
  supabaseUrl: string,
  session: Stripe.Checkout.Session,
): Promise<{ companyId: string }> {
  const meta = session.metadata ?? {};
  const email = (meta.admin_email || session.customer_email || "")
    .trim()
    .toLowerCase();
  const companyName = (meta.company_name || "").trim();
  const adminName = (meta.admin_name || "").trim() || "Company Admin";
  const planPriceId = (meta.plan_price_id || "").trim();
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  if (!email || !companyName || !planPriceId || !subscriptionId) {
    throw new Error("checkout_first_missing_metadata");
  }

  // Already provisioned for this subscription?
  const { data: existingSub } = await admin
    .from("company_subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (existingSub?.company_id) {
    const companyId = existingSub.company_id as string;
    // Ensure invite link exists for status poll / recovery.
    const { data: founder } = await admin
      .from("users")
      .select("id, email, invite_sign_in_link")
      .eq("company_id", companyId)
      .ilike("email", email)
      .maybeSingle();
    if (founder?.id && !founder.invite_sign_in_link) {
      await mintInviteOpenLink(admin, supabaseUrl, email, founder.id as string);
    }
    return { companyId };
  }

  const { data: existingProfile } = await admin
    .from("users")
    .select("id, company_id, email")
    .ilike("email", email)
    .maybeSingle();

  if (existingProfile?.company_id) {
    // Email already owns a company — attach this subscription; do not create a second.
    const companyId = existingProfile.company_id as string;
    await admin.from("company_subscriptions").upsert({
      company_id: companyId,
      stripe_customer_id: typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
      stripe_subscription_id: subscriptionId,
      status: "trialing",
      livemode: session.livemode,
      locked_plan_price_id: planPriceId,
    }, { onConflict: "company_id" });

    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        ...meta,
        company_id: companyId,
        signup_flow: "checkout_first",
        plan_price_id: planPriceId,
        livemode: String(session.livemode),
      },
    });

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionLifecycle(
      admin,
      stripe,
      {
        id: `local_replay_${subscriptionId}`,
        type: "customer.subscription.updated",
      } as Stripe.Event,
      subscription,
    );

    if (existingProfile.id) {
      await mintInviteOpenLink(
        admin,
        supabaseUrl,
        email,
        existingProfile.id as string,
      );
    }
    return { companyId };
  }

  let userId = existingProfile?.id as string | undefined;
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: {
        name: adminName,
        system_permission: "admin",
        role: "admin",
        is_pending: false,
        must_set_password: true,
      },
    });
    if (created.error || !created.data.user?.id) {
      // Race: user created between lookup and create
      const { data: raced } = await admin
        .from("users")
        .select("id, company_id")
        .ilike("email", email)
        .maybeSingle();
      if (raced?.company_id) {
        return provisionCheckoutFirstSignup(admin, stripe, supabaseUrl, session);
      }
      if (raced?.id) {
        userId = raced.id as string;
      } else {
        throw new Error(created.error?.message || "create_user_failed");
      }
    } else {
      userId = created.data.user.id;
    }
  }

  // Promote founding CA without writing columns that don't exist on this tenant.
  await promoteFoundingAdminProfile(admin, {
    userId,
    email,
    name: adminName,
  });

  // Reuse orphan company from a prior partial provision (same founder).
  let companyId: string | null = null;
  {
    const { data: orphan } = await admin
      .from("companies")
      .select("id")
      .eq("created_by", userId)
      .eq("name", companyName)
      .limit(1)
      .maybeSingle();
    if (orphan?.id) {
      companyId = orphan.id as string;
    }
  }

  if (!companyId) {
    const { data: companyRows, error: companyError } = await admin
      .from("companies")
      .insert({
        name: companyName,
        type: "general_contractor",
        created_by: userId,
        is_active: true,
      })
      .select("id")
      .limit(1);

    if (companyError || !companyRows?.[0]?.id) {
      throw new Error(companyError?.message || "company_create_failed");
    }
    companyId = companyRows[0].id as string;
  }

  await promoteFoundingAdminProfile(admin, {
    userId,
    email,
    name: adminName,
    companyId,
  });

  const { error: subUpsertError } = await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    stripe_customer_id: typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null,
    stripe_subscription_id: subscriptionId,
    status: "trialing",
    livemode: session.livemode,
    locked_plan_price_id: planPriceId,
  }, { onConflict: "company_id" });
  if (subUpsertError) {
    throw new Error(subUpsertError.message || "subscription_upsert_failed");
  }

  // Patch Checkout + Subscription metadata so later lifecycle events resolve company_id.
  try {
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...meta,
        company_id: companyId,
        signup_flow: "checkout_first",
        plan_price_id: planPriceId,
        livemode: String(session.livemode),
      },
    });
  } catch (err) {
    console.warn("stripe-webhook: could not patch checkout session metadata", err);
  }

  await stripe.subscriptions.update(subscriptionId, {
    metadata: {
      ...meta,
      company_id: companyId,
      signup_flow: "checkout_first",
      plan_price_id: planPriceId,
      livemode: String(session.livemode),
    },
  });

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionLifecycle(
    admin,
    stripe,
    {
      id: `local_replay_${subscriptionId}`,
      type: "customer.subscription.updated",
    } as Stripe.Event,
    subscription,
  );

  await mintInviteOpenLink(admin, supabaseUrl, email, userId);

  return { companyId };
}

async function appendRevision(
  admin: AdminClient,
  companyId: string,
  source:
    | "signup"
    | "trial_end"
    | "webhook"
    | "addon_change"
    | "price_migration"
    | "manual_override",
  billingPhase: string,
  lockedPlanPriceId: string,
  snapshot: EntitlementsSnapshot,
  stripeEventId: string,
) {
  const { error } = await admin.from("company_entitlement_revisions").insert({
    company_id: companyId,
    billing_phase: billingPhase,
    source,
    locked_plan_price_id: lockedPlanPriceId,
    entitlements_snapshot: snapshot,
    stripe_event_id: stripeEventId,
  });
  if (error) throw error;
}

async function upsertEntitlements(
  admin: AdminClient,
  companyId: string,
  snapshot: EntitlementsSnapshot,
  subscriptionStatus: string,
  billingPhase: "trial" | "active" | "override",
  lockedPlanPriceId: string,
) {
  const row = entitlementsRowFromSnapshot(
    snapshot,
    subscriptionStatus,
    billingPhase,
    lockedPlanPriceId,
  );
  const { error } = await admin.from("company_entitlements").upsert({
    company_id: companyId,
    ...row,
  });
  if (error) throw error;
}

async function syncSubscriptionRecord(
  admin: AdminClient,
  companyId: string,
  subscription: Stripe.Subscription,
  lockedPlanPriceId: string,
) {
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const periodStartUnix =
    typeof subscription.current_period_start === "number"
      ? subscription.current_period_start
      : subscription.items?.data
          ?.map((item) =>
            typeof (item as { current_period_start?: number }).current_period_start ===
              "number"
              ? (item as { current_period_start: number }).current_period_start
              : null,
          )
          .filter((v): v is number => v != null)
          .sort((a, b) => a - b)[0] ??
        null;

  const periodEndUnix =
    typeof subscription.current_period_end === "number"
      ? subscription.current_period_end
      : subscription.items?.data
          ?.map((item) =>
            typeof (item as { current_period_end?: number }).current_period_end ===
              "number"
              ? (item as { current_period_end: number }).current_period_end
              : null,
          )
          .filter((v): v is number => v != null)
          .sort((a, b) => b - a)[0] ??
        null;

  const { error } = await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    stripe_customer_id:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    status: mapStripeStatus(subscription.status),
    trial_ends_at: trialEndsAt,
    current_period_start: periodStartUnix
      ? new Date(periodStartUnix * 1000).toISOString()
      : null,
    current_period_end: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString()
      : null,
    locked_plan_price_id: lockedPlanPriceId,
    livemode: subscription.livemode,
  }, { onConflict: "company_id" });

  if (error) throw error;
}

function primaryStripePriceId(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  if (!price) return null;
  return typeof price === "string" ? price : price.id;
}

const PENDING_WORKER_META = "insite_pending_worker_addon_qty";
const PENDING_PM_META = "insite_pending_pm_addon_qty";
const PENDING_AT_META = "insite_pending_addons_at";

function parsePendingQty(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

/**
 * HK lock: mid-cycle remove schedules qty via metadata; apply with no credit
 * when the billing period rolls (current_period_start >= pending_at).
 * Returns updated subscription when applied so entitlements use new qty.
 */
async function maybeApplyPendingAddonDecreases(
  stripe: Stripe,
  admin: AdminClient,
  subscription: Stripe.Subscription,
): Promise<{ subscription: Stripe.Subscription; applied: boolean }> {
  const metadata = subscription.metadata ?? {};
  // pending_at is a unix timestamp, not a qty
  const pendingAtRaw = metadata[PENDING_AT_META];
  const pendingAtUnix =
    pendingAtRaw && pendingAtRaw !== ""
      ? Number(pendingAtRaw)
      : Number.NaN;

  if (!Number.isFinite(pendingAtUnix)) {
    return { subscription, applied: false };
  }

  const periodStartUnix =
    typeof subscription.current_period_start === "number"
      ? subscription.current_period_start
      : subscription.items?.data
          ?.map((item) =>
            typeof (item as { current_period_start?: number }).current_period_start ===
              "number"
              ? (item as { current_period_start: number }).current_period_start
              : null,
          )
          .filter((v): v is number => v != null)
          .sort((a, b) => a - b)[0] ??
        null;

  // Not yet at period boundary — keep seats until roll.
  if (periodStartUnix == null || periodStartUnix < pendingAtUnix) {
    return { subscription, applied: false };
  }

  const pendingWorker = parsePendingQty(metadata[PENDING_WORKER_META]);
  const pendingPm = parsePendingQty(metadata[PENDING_PM_META]);
  if (pendingWorker == null && pendingPm == null) {
    // Stale timestamp only — clear it
    await stripe.subscriptions.update(subscription.id, {
      proration_behavior: "none",
      metadata: {
        [PENDING_AT_META]: "",
      },
    });
    return { subscription, applied: false };
  }

  const { data: addonPriceRows } = await admin
    .from("plan_prices")
    .select(
      "stripe_price_id, plan_tiers:plan_tier_id ( slug, kind )",
    )
    .eq("livemode", subscription.livemode);

  const workerPriceIds = new Set<string>();
  const pmPriceIds = new Set<string>();
  for (const row of (addonPriceRows ?? []) as Array<{
    stripe_price_id: string;
    plan_tiers?: { slug?: string; kind?: string } | null;
  }>) {
    if (row.plan_tiers?.kind !== "addon" || !row.stripe_price_id) continue;
    if (row.plan_tiers.slug === "addon_worker_pack") {
      workerPriceIds.add(row.stripe_price_id);
    }
    if (row.plan_tiers.slug === "addon_pm_seat") {
      pmPriceIds.add(row.stripe_price_id);
    }
  }

  const items = subscription.items?.data ?? [];
  const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];

  for (const item of items) {
    const priceId =
      typeof item.price === "string" ? item.price : item.price?.id;
    if (!priceId) continue;

    if (pendingWorker != null && workerPriceIds.has(priceId)) {
      if (pendingWorker === 0) {
        updateItems.push({ id: item.id, deleted: true });
      } else if (item.quantity !== pendingWorker) {
        updateItems.push({ id: item.id, quantity: pendingWorker });
      }
    }

    if (pendingPm != null && pmPriceIds.has(priceId)) {
      if (pendingPm === 0) {
        updateItems.push({ id: item.id, deleted: true });
      } else if (item.quantity !== pendingPm) {
        updateItems.push({ id: item.id, quantity: pendingPm });
      }
    }
  }

  const updated = await stripe.subscriptions.update(subscription.id, {
    proration_behavior: "none",
    items: updateItems.length > 0 ? updateItems : undefined,
    metadata: {
      [PENDING_WORKER_META]: "",
      [PENDING_PM_META]: "",
      [PENDING_AT_META]: "",
    },
  });

  console.log("stripe-webhook: applied pending addon decrease at period end", {
    subscriptionId: subscription.id,
    pendingWorker,
    pendingPm,
    pendingAtUnix,
  });

  return { subscription: updated, applied: true };
}

async function handleSubscriptionLifecycle(
  admin: AdminClient,
  stripe: Stripe,
  event: Stripe.Event,
  subscription: Stripe.Subscription,
) {
  // Apply deferred remove-seat qty before merging entitlements.
  const pendingApply = await maybeApplyPendingAddonDecreases(
    stripe,
    admin,
    subscription,
  );
  subscription = pendingApply.subscription;

  const metadata = subscription.metadata ?? {};
  let companyId = metadata.company_id as string | undefined;

  if (!companyId) {
    const { data: existing } = await admin
      .from("company_subscriptions")
      .select("company_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    companyId = existing?.company_id as string | undefined;
  }

  if (!companyId) {
    console.warn("stripe-webhook: subscription missing company_id metadata", {
      subscriptionId: subscription.id,
      eventId: event.id,
    });
    return;
  }

  // Merge base + add-on meters from all subscription items.
  const items = subscription.items?.data ?? [];
  const stripePriceIds: string[] = items
    .map((it: any) => {
      const price = it?.price as any;
      if (!price) return null;
      if (typeof price === "string") return price;
      if (typeof price === "object" && price && typeof price.id === "string") {
        return price.id;
      }
      return null;
    })
    .filter((v): v is string => Boolean(v));

  if (stripePriceIds.length === 0) {
    throw new Error(
      `subscription ${subscription.id} has no Stripe price ids`,
    );
  }

  const { data: planPriceRows, error: planPriceRowsError } = await admin
    .from("plan_prices")
    .select("id, stripe_price_id, plan_tiers:plan_tier_id ( kind )")
    .in("stripe_price_id", stripePriceIds)
    .eq("livemode", subscription.livemode);

  if (planPriceRowsError || !planPriceRows || planPriceRows.length === 0) {
    throw new Error(
      `no plan_prices rows for subscription items (livemode=${subscription.livemode})`,
    );
  }

  const planPriceByStripe: Record<
    string,
    { planPriceId: string; kind: string }
  > = {};
  for (const row of planPriceRows as Array<{
    id: string;
    stripe_price_id: string;
    plan_tiers?: { kind?: string } | null;
  }>) {
    const kind = row.plan_tiers?.kind;
    if (!row.stripe_price_id || !row.id || !kind) continue;
    planPriceByStripe[row.stripe_price_id] = {
      planPriceId: row.id,
      kind: kind as string,
    };
  }

  const baseLockedPlanPriceId = Object.values(planPriceByStripe).find(
    (p) => p.kind === "base",
  )?.planPriceId;

  if (!baseLockedPlanPriceId) {
    throw new Error(
      `subscription ${subscription.id} has no base plan_prices row`,
    );
  }

  const billingPhase = billingPhaseFromStatus(mapStripeStatus(subscription.status));

  // Helper: build meters for a given plan_price_id without enforcing base-vs-addon.
  async function buildMetersSnapshotFromPrice(
    planPriceId: string,
  ): Promise<MeterMap> {
    const data = await admin.rpc("build_entitlements_snapshot_from_price", {
      p_plan_price_id: planPriceId,
      // Use a non-(trial|active) billing phase so addons don't fail validation.
      p_billing_phase: "migration",
    });
    return (data as { meters?: MeterMap }).meters ?? {};
  }

  const mergedMeters: MeterMap = {};
  for (const it of items as any[]) {
    const price = it?.price as any;
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

    const metersForItem = await buildMetersSnapshotFromPrice(plan.planPriceId);
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

      // "null" means unlimited. Unlimited + anything stays unlimited.
      if (current === null) {
        continue;
      }

      if (typeof current === "number") {
        mergedMeters[meterSlug] = current + Number(meterValue) * quantity;
      }
    }
  }

  const lockedPlanPriceId = baseLockedPlanPriceId;

  const { data: priorSub } = await admin
    .from("company_subscriptions")
    .select("status, locked_plan_price_id")
    .eq("company_id", companyId)
    .maybeSingle();

  const priorStatus = priorSub?.status as string | undefined;
  const mappedStatus = mapStripeStatus(subscription.status);

  await syncSubscriptionRecord(
    admin,
    companyId,
    subscription,
    lockedPlanPriceId,
  );

  let snapshot: EntitlementsSnapshot;
  let revisionSource:
    | "signup"
    | "trial_end"
    | "webhook"
    | "addon_change" = "webhook";

  snapshot = {
    locked_plan_price_id: lockedPlanPriceId,
    billing_phase: billingPhase,
    trial_discount_model: billingPhase === "trial" ? "stripe_native_trial" : undefined,
    meters: mergedMeters,
  } as EntitlementsSnapshot;

  const isTrialEnd =
    priorStatus === "trialing" && mappedStatus === "active";
  const isSignup =
    event.type === "customer.subscription.created" && !priorSub;

  if (isTrialEnd) {
    revisionSource = "trial_end";
  } else if (isSignup) {
    revisionSource = "signup";
  } else if (pendingApply.applied) {
    revisionSource = "addon_change";
  }

  const priceChanged = priorSub?.locked_plan_price_id &&
    priorSub.locked_plan_price_id !== lockedPlanPriceId;
  const statusChanged = priorStatus && priorStatus !== mappedStatus;

  if (
    isSignup ||
    isTrialEnd ||
    priceChanged ||
    statusChanged ||
    pendingApply.applied
  ) {
    await appendRevision(
      admin,
      companyId,
      revisionSource,
      isTrialEnd ? "active" : billingPhase,
      lockedPlanPriceId,
      snapshot,
      event.id,
    );
  }

  await upsertEntitlements(
    admin,
    companyId,
    snapshot,
    mappedStatus,
    isTrialEnd ? "active" : billingPhase,
    lockedPlanPriceId,
  );

  await admin.from("billing_audit_log").insert({
    company_id: companyId,
    action: "webhook_sync",
    after_snapshot: snapshot,
    reason: `${event.type} ${subscription.id} status=${mappedStatus}`,
  });
}

async function handleCheckoutSessionCompleted(
  admin: AdminClient,
  stripe: Stripe,
  supabaseUrl: string,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
) {
  const signupFlow = session.metadata?.signup_flow;
  if (signupFlow === "checkout_first") {
    await provisionCheckoutFirstSignup(admin, stripe, supabaseUrl, session);
    return;
  }

  const companyId = session.metadata?.company_id;
  const planPriceId = session.metadata?.plan_price_id;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  if (!companyId || !subscriptionId) {
    console.warn("checkout.session.completed missing company_id or subscription", {
      eventId: event.id,
      sessionId: session.id,
    });
    return;
  }

  // Full entitlements sync happens on customer.subscription.created|updated.
  if (!planPriceId) return;

  const { error } = await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    stripe_customer_id: typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null,
    stripe_subscription_id: subscriptionId,
    status: "trialing",
    livemode: session.livemode,
    locked_plan_price_id: planPriceId,
  }, { onConflict: "company_id" });

  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return jsonResponse({ error: "missing_stripe_signature" }, 400);
  }

  const body = await req.text();
  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2024-11-20.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid_signature";
    return jsonResponse({ error: message }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const claimed = await claimWebhookEvent(admin, event);
    if (!claimed) {
      return jsonResponse({ received: true, duplicate: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(
            admin,
            stripe,
            supabaseUrl,
            event,
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionLifecycle(
            admin,
            stripe,
            event,
            event.data.object as Stripe.Subscription,
          );
          break;

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const { data: row } = await admin
            .from("company_subscriptions")
            .select("company_id")
            .eq("stripe_subscription_id", subscription.id)
            .maybeSingle();
          if (row?.company_id) {
            await admin.from("company_subscriptions").update({
              status: "canceled",
            }).eq("company_id", row.company_id);
            await admin.from("company_entitlements").update({
              subscription_status: "canceled",
            }).eq("company_id", row.company_id);
          }
          break;
        }

        default:
          console.log("stripe-webhook: ignored event type", event.type);
      }
    } catch (handlerErr) {
      await releaseWebhookEvent(admin, event.id);
      throw handlerErr;
    }

    return jsonResponse({ received: true });
  } catch (err) {
    console.error("stripe-webhook handler error", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
