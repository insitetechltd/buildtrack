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

  // Seat defaults removed — caller must assertPaidPlanMetersComplete (or cancel zeros).
  if (typeof meters.pm_seats === "undefined" || typeof meters.worker_seats === "undefined") {
    throw new Error("entitlementsRowFromSnapshot: missing seat meters");
  }
  return {
    pm_seat_limit: meters.pm_seats ?? 0,
    worker_seat_limit: meters.worker_seats ?? 0,
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

function assertNoDbError(
  error: { message?: string } | null | undefined,
  context: string,
): void {
  if (error) {
    throw new Error(`${context}: ${error.message || "db_error"}`);
  }
}

function shouldSkipStaleWebhookEvent(
  eventCreatedUnix: number,
  lastAppliedIso: string | null | undefined,
): boolean {
  if (!lastAppliedIso) return false;
  if (!Number.isFinite(eventCreatedUnix) || eventCreatedUnix <= 0) return false;
  const lastUnix = Math.floor(new Date(lastAppliedIso).getTime() / 1000);
  if (!Number.isFinite(lastUnix)) return false;
  return eventCreatedUnix < lastUnix;
}

function normalizeWebhookEventCreatedUnix(
  created: number | null | undefined,
): number | null {
  if (typeof created !== "number" || !Number.isFinite(created) || created <= 0) {
    return null;
  }
  return Math.floor(created);
}

/** null = do not write / do not regress last_webhook_event_created_at. */
function nextLastWebhookEventCreatedAtIso(
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

type WebhookClaimDecision = "proceed" | "duplicate" | "in_flight";
const WEBHOOK_CLAIM_LEASE_MS = 5 * 60 * 1000;

function decideWebhookClaimAction(
  existing: { status: string; claimed_at: string } | null,
  nowMs: number,
): WebhookClaimDecision {
  if (!existing) return "proceed";
  if (existing.status === "done") return "duplicate";
  if (existing.status === "failed") return "proceed";
  const claimedMs = new Date(existing.claimed_at).getTime();
  if (!Number.isFinite(claimedMs) || nowMs - claimedMs >= WEBHOOK_CLAIM_LEASE_MS) {
    return "proceed";
  }
  return "in_flight";
}

function assertPaidPlanMetersComplete(
  mergedMeters: MeterMap,
  subscriptionId: string,
  lockedPlanPriceId: string,
): void {
  if (Object.keys(mergedMeters).length === 0) {
    throw new Error(
      `subscription ${subscriptionId} merged meters empty (base=${lockedPlanPriceId})`,
    );
  }
  const missing: string[] = [];
  for (const key of ["pm_seats", "worker_seats", "projects", "storage_bytes"]) {
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
 * Mutable claim lease (billing_webhook_claims). Append-only billing_webhook_events
 * is written only after success — never DELETE that audit table.
 * Requires migration 20260928000200 (HUMAN GATE).
 */
async function acquireWebhookClaim(
  admin: AdminClient,
  event: Stripe.Event,
): Promise<WebhookClaimDecision> {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data: existing, error: lookupError } = await admin
    .from("billing_webhook_claims")
    .select("status, claimed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`webhook_claim_lookup: ${lookupError.message}`);
  }

  const decision = decideWebhookClaimAction(
    existing as { status: string; claimed_at: string } | null,
    nowMs,
  );
  if (decision === "duplicate" || decision === "in_flight") {
    return decision;
  }

  if (!existing) {
    const { error: insertError } = await admin.from("billing_webhook_claims").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      status: "processing",
      claimed_at: nowIso,
      last_error: null,
    });
    if (insertError?.code === "23505") {
      // Concurrent first delivery — re-evaluate.
      return acquireWebhookClaim(admin, event);
    }
    if (insertError) {
      throw new Error(`webhook_claim_insert: ${insertError.message}`);
    }
    return "proceed";
  }

  // Reclaim failed or stale processing (status-gated update avoids racing a fresh lease).
  const patch = {
    status: "processing" as const,
    claimed_at: nowIso,
    last_error: null as string | null,
    event_type: event.type,
    livemode: event.livemode,
  };
  let reclaimQuery = admin
    .from("billing_webhook_claims")
    .update(patch)
    .eq("stripe_event_id", event.id);
  if (existing.status === "failed") {
    reclaimQuery = reclaimQuery.eq("status", "failed");
  } else {
    const leaseCutoffIso = new Date(nowMs - WEBHOOK_CLAIM_LEASE_MS).toISOString();
    reclaimQuery = reclaimQuery
      .eq("status", "processing")
      .lt("claimed_at", leaseCutoffIso);
  }
  const { data: reclaimed, error: reclaimError } = await reclaimQuery.select(
    "stripe_event_id",
  );
  if (reclaimError) {
    throw new Error(`webhook_claim_reclaim: ${reclaimError.message}`);
  }
  if (!reclaimed || reclaimed.length === 0) {
    // Lost race — re-read once (avoid recursive reclaim loops).
    const { data: again, error: againError } = await admin
      .from("billing_webhook_claims")
      .select("status, claimed_at")
      .eq("stripe_event_id", event.id)
      .maybeSingle();
    if (againError) {
      throw new Error(`webhook_claim_reread: ${againError.message}`);
    }
    return decideWebhookClaimAction(
      again as { status: string; claimed_at: string } | null,
      Date.now(),
    );
  }
  return "proceed";
}

async function markWebhookClaimFailed(
  admin: AdminClient,
  stripeEventId: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const { error } = await admin
    .from("billing_webhook_claims")
    .update({
      status: "failed",
      last_error: message.slice(0, 2000),
    })
    .eq("stripe_event_id", stripeEventId);
  if (error) {
    console.error("stripe-webhook: markWebhookClaimFailed", {
      stripeEventId,
      message: error.message,
    });
  }
}

/** Success: mark claim done + append-only audit insert (idempotent). */
async function markWebhookClaimDone(
  admin: AdminClient,
  event: Stripe.Event,
): Promise<void> {
  const { error: doneError } = await admin
    .from("billing_webhook_claims")
    .update({ status: "done", last_error: null })
    .eq("stripe_event_id", event.id);
  if (doneError) {
    throw new Error(`webhook_claim_done: ${doneError.message}`);
  }

  const { error: auditError } = await admin.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload_hash: null,
  });
  if (auditError && auditError.code !== "23505") {
    throw new Error(`webhook_events_audit_insert: ${auditError.message}`);
  }
}

function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** NEW SoT (DEV≡PROD): `system_permission` only. */
async function detectUserAdminColumns(
  _admin: AdminClient,
): Promise<{ hasRole: boolean; hasSystemPermission: boolean }> {
  return { hasRole: false, hasSystemPermission: true };
}

/**
 * Resolve auth.users id by email when createUser fails with already-registered.
 * Uses generateLink (admin) which returns the existing user without requiring a
 * public.users row — the exact orphan case insert-if-missing closes.
 */
async function resolveAuthUserIdByEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return null;
  const id = data?.user?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
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

  // Auth createUser may not have a public.users row (missing on_auth_user_created
  // trigger after restore). UPDATE-only left orphan companies with no profile —
  // signup-checkout-status then stays pending forever. Upsert closes that gap.
  const { data: existing, error: lookupError } = await admin
    .from("users")
    .select("id")
    .eq("id", params.userId)
    .maybeSingle();
  if (lookupError) {
    throw new Error(lookupError.message || "founder_profile_lookup_failed");
  }

  if (!existing?.id) {
    const { error: insertError } = await admin.from("users").insert({
      id: params.userId,
      ...patch,
    });
    if (insertError) {
      throw new Error(insertError.message || "founder_profile_insert_failed");
    }
    return;
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
  const hashedToken =
    linkData?.properties?.hashed_token ||
    // Some Auth API shapes return hashed_token on the payload root.
    (linkData as { hashed_token?: string } | null)?.hashed_token;
  if (linkError || !hashedToken) {
    throw new Error(linkError?.message || "invite_link_failed");
  }
  const origin = supabaseUrl.replace(/\/$/, "");
  const signInLink =
    `${origin}/functions/v1/invite-open?token_hash=${encodeURIComponent(hashedToken)}`;
  const { error: inviteUpdateError } = await admin
    .from("users")
    .update({ invite_sign_in_link: signInLink })
    .eq("id", userId);
  assertNoDbError(inviteUpdateError, "invite_sign_in_link_update");
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
  const { data: existingSub, error: existingSubError } = await admin
    .from("company_subscriptions")
    .select("company_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  assertNoDbError(existingSubError, "signup_existing_sub_lookup");
  if (existingSub?.company_id) {
    const companyId = existingSub.company_id as string;
    // Ensure invite link exists for status poll / recovery.
    const { data: founder, error: founderError } = await admin
      .from("users")
      .select("id, email, invite_sign_in_link")
      .eq("company_id", companyId)
      .ilike("email", email)
      .maybeSingle();
    assertNoDbError(founderError, "signup_founder_lookup");
    if (founder?.id && !founder.invite_sign_in_link) {
      await mintInviteOpenLink(admin, supabaseUrl, email, founder.id as string);
    }
    return { companyId };
  }

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("users")
    .select("id, company_id, email")
    .ilike("email", email)
    .maybeSingle();
  assertNoDbError(existingProfileError, "signup_profile_lookup");

  if (existingProfile?.company_id) {
    // Email already owns a company — attach this subscription; do not create a second.
    const companyId = existingProfile.company_id as string;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const { error: attachSubError } = await admin.from("company_subscriptions").upsert({
      company_id: companyId,
      stripe_customer_id: typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
      stripe_subscription_id: subscriptionId,
      status: mapStripeStatus(subscription.status),
      livemode: session.livemode,
      locked_plan_price_id: planPriceId,
    }, { onConflict: "company_id" });
    assertNoDbError(attachSubError, "signup_attach_subscription_upsert");

    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        ...meta,
        company_id: companyId,
        signup_flow: "checkout_first",
        plan_price_id: planPriceId,
        livemode: String(session.livemode),
      },
    });

    await handleSubscriptionLifecycle(
      admin,
      stripe,
      {
        id: `local_replay_${subscriptionId}`,
        type: "customer.subscription.updated",
        created: Math.floor(Date.now() / 1000),
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
      const { data: raced, error: racedError } = await admin
        .from("users")
        .select("id, company_id")
        .ilike("email", email)
        .maybeSingle();
      assertNoDbError(racedError, "signup_raced_profile_lookup");
      if (raced?.company_id) {
        return provisionCheckoutFirstSignup(admin, stripe, supabaseUrl, session);
      }
      if (raced?.id) {
        userId = raced.id as string;
      } else {
        // Auth user may exist while public.users is missing (restore / missing
        // on_auth_user_created). Resolve auth id so promoteFoundingAdminProfile
        // can insert-if-missing — do not fail closed on "already registered".
        const msg = created.error?.message || "";
        const alreadyRegistered = /already|registered|exists/i.test(msg);
        if (alreadyRegistered) {
          const authId = await resolveAuthUserIdByEmail(admin, email);
          if (authId) {
            userId = authId;
          } else {
            throw new Error(msg || "create_user_failed");
          }
        } else {
          throw new Error(msg || "create_user_failed");
        }
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
      created: Math.floor(Date.now() / 1000),
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
  eventCreatedUnix?: number | null,
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

  const row: Record<string, unknown> = {
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
  };
  // Requires migration 20260928000100 (HUMAN GATE). Never write 0/epoch; never regress.
  const priorForTs = await admin
    .from("company_subscriptions")
    .select("last_webhook_event_created_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (
    !priorForTs.error ||
    !/last_webhook_event_created_at|PGRST204|42703/i.test(
      priorForTs.error.message || "",
    )
  ) {
    const nextTs = nextLastWebhookEventCreatedAtIso(
      normalizeWebhookEventCreatedUnix(eventCreatedUnix),
      (priorForTs.data as { last_webhook_event_created_at?: string | null } | null)
        ?.last_webhook_event_created_at,
    );
    if (nextTs) {
      row.last_webhook_event_created_at = nextTs;
    }
  }

  let { error } = await admin.from("company_subscriptions").upsert(row, {
    onConflict: "company_id",
  });
  // Column lands with HUMAN GATE migration 20260928000100 — retry without it.
  if (
    error &&
    row.last_webhook_event_created_at != null &&
    /last_webhook_event_created_at|PGRST204|42703/i.test(error.message || "")
  ) {
    delete row.last_webhook_event_created_at;
    ({ error } = await admin.from("company_subscriptions").upsert(row, {
      onConflict: "company_id",
    }));
  }

  if (error) throw error;
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

  const { data: addonPriceRows, error: addonPriceError } = await admin
    .from("plan_prices")
    .select(
      "stripe_price_id, plan_tiers:plan_tier_id ( slug, kind )",
    )
    .eq("livemode", subscription.livemode);
  assertNoDbError(addonPriceError, "pending_addon_price_lookup");

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

  // Idempotent on retry: if items already match pending qty (or deleted),
  // updateItems may be empty — still clear pending metadata.
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

/**
 * Cancel path: status → canceled; seat meters → 0 (invite fail-closed).
 * Founder unlock already fails on status; field task access stays fail-open.
 * See documentation/ENTITLEMENT_PRODUCT_LAW.md.
 */
async function applyCanceledSubscription(
  admin: AdminClient,
  companyId: string,
  subscription: Stripe.Subscription,
  event: Stripe.Event,
) {
  const { data: priorEnt, error: priorEntError } = await admin
    .from("company_entitlements")
    .select("entitlements_snapshot, source_plan_price_id, billing_phase")
    .eq("company_id", companyId)
    .maybeSingle();
  assertNoDbError(priorEntError, "cancel_entitlements_lookup");

  const priorSnap = (priorEnt?.entitlements_snapshot ?? {}) as EntitlementsSnapshot;
  const priorMeters = (priorSnap.meters ?? {}) as MeterMap;
  const meters: MeterMap = {
    ...priorMeters,
    pm_seats: 0,
    worker_seats: 0,
  };
  const lockedPlanPriceId =
    (priorEnt?.source_plan_price_id as string | undefined) ||
    (priorSnap.locked_plan_price_id as string | undefined);
  if (!lockedPlanPriceId) {
    throw new Error(
      `cancel missing locked_plan_price_id for company ${companyId}`,
    );
  }

  const snapshot: EntitlementsSnapshot = {
    locked_plan_price_id: lockedPlanPriceId,
    billing_phase: "active",
    meters,
  };

  // Entitlements + revision first (order-safe), then subscription status.
  const { data: existingRev, error: revLookupError } = await admin
    .from("company_entitlement_revisions")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  assertNoDbError(revLookupError, "cancel_revision_lookup");
  if (!existingRev?.id) {
    await appendRevision(
      admin,
      companyId,
      "webhook",
      "active",
      lockedPlanPriceId,
      snapshot,
      event.id,
    );
  }

  await upsertEntitlements(
    admin,
    companyId,
    snapshot,
    "canceled",
    "active",
    lockedPlanPriceId,
  );

  await syncSubscriptionRecord(
    admin,
    companyId,
    { ...subscription, status: "canceled" } as Stripe.Subscription,
    lockedPlanPriceId,
    normalizeWebhookEventCreatedUnix(event.created) ?? undefined,
  );

  const { error: auditError } = await admin.from("billing_audit_log").insert({
    company_id: companyId,
    action: "webhook_sync",
    after_snapshot: snapshot,
    reason: `${event.type} ${subscription.id} status=canceled seats_zeroed`,
  });
  assertNoDbError(auditError, "cancel_audit_insert");
}

async function resolveCompanyIdForSubscription(
  admin: AdminClient,
  subscription: Stripe.Subscription,
  eventId: string,
): Promise<string | null> {
  const metadata = subscription.metadata ?? {};
  let companyId = metadata.company_id as string | undefined;

  if (!companyId) {
    const { data: existing, error } = await admin
      .from("company_subscriptions")
      .select("company_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();
    assertNoDbError(error, "subscription_company_lookup");
    companyId = existing?.company_id as string | undefined;
  }

  if (!companyId) {
    console.warn("stripe-webhook: subscription missing company_id metadata", {
      subscriptionId: subscription.id,
      eventId,
    });
    return null;
  }
  return companyId;
}

async function loadPriorSubscriptionRow(
  admin: AdminClient,
  companyId: string,
): Promise<{
  status?: string;
  locked_plan_price_id?: string;
  last_webhook_event_created_at?: string | null;
} | null> {
  const withCol = await admin
    .from("company_subscriptions")
    .select("status, locked_plan_price_id, last_webhook_event_created_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (
    withCol.error &&
    /last_webhook_event_created_at|PGRST204|42703/i.test(
      withCol.error.message || "",
    )
  ) {
    const fallback = await admin
      .from("company_subscriptions")
      .select("status, locked_plan_price_id")
      .eq("company_id", companyId)
      .maybeSingle();
    assertNoDbError(fallback.error, "prior_subscription_lookup");
    return fallback.data as {
      status?: string;
      locked_plan_price_id?: string;
    } | null;
  }
  assertNoDbError(withCol.error, "prior_subscription_lookup");
  return withCol.data as {
    status?: string;
    locked_plan_price_id?: string;
    last_webhook_event_created_at?: string | null;
  } | null;
}

async function handleSubscriptionLifecycle(
  admin: AdminClient,
  stripe: Stripe,
  event: Stripe.Event,
  eventSubscription: Stripe.Subscription,
) {
  // Live Stripe retrieve is SoT — never trust a stale event-embedded object alone.
  let subscription = await stripe.subscriptions.retrieve(eventSubscription.id);

  const companyId = await resolveCompanyIdForSubscription(
    admin,
    subscription,
    event.id,
  );
  if (!companyId) return;

  const priorSub = await loadPriorSubscriptionRow(admin, companyId);
  const eventCreated = normalizeWebhookEventCreatedUnix(event.created);

  if (
    eventCreated != null &&
    shouldSkipStaleWebhookEvent(
      eventCreated,
      priorSub?.last_webhook_event_created_at,
    )
  ) {
    console.warn("stripe-webhook: skipping stale event", {
      eventId: event.id,
      eventCreated,
      lastApplied: priorSub?.last_webhook_event_created_at,
      subscriptionId: subscription.id,
    });
    return;
  }

  // Never un-cancel from a late updated/created when Stripe still says canceled.
  if (subscription.status === "canceled") {
    await applyCanceledSubscription(admin, companyId, subscription, event);
    return;
  }

  // Apply deferred remove-seat qty before merging entitlements.
  // Retry-safe: if Stripe items already match, updateItems may be empty.
  const pendingApply = await maybeApplyPendingAddonDecreases(
    stripe,
    admin,
    subscription,
  );
  subscription = pendingApply.subscription;

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
  // Contract: src/billing/webhookMetersGuard.ts (Jest). Must destructure { data, error }.
  async function buildMetersSnapshotFromPrice(
    planPriceId: string,
  ): Promise<MeterMap> {
    const { data, error } = await admin.rpc(
      "build_entitlements_snapshot_from_price",
      {
        p_plan_price_id: planPriceId,
        // Use a non-(trial|active) billing phase so addons don't fail validation.
        p_billing_phase: "migration",
      },
    );
    if (error) {
      throw new Error(
        `build_entitlements_snapshot_from_price failed for ${planPriceId}: ${error.message}`,
      );
    }
    return (data as { meters?: MeterMap } | null)?.meters ?? {};
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

  // Never persist empty/partial meters when a base plan resolved (before any DB write).
  assertPaidPlanMetersComplete(
    mergedMeters,
    subscription.id,
    lockedPlanPriceId,
  );

  const priorStatus = priorSub?.status as string | undefined;
  const mappedStatus = mapStripeStatus(subscription.status);

  // Hard rule: never resurrect canceled DB from a non-canceled path if live
  // retrieve somehow raced; live canceled already returned above.
  if (priorStatus === "canceled" && mappedStatus !== "canceled") {
    // Allow genuine reactivation (customer resubscribes → new active). Live SoT wins.
    console.log("stripe-webhook: reactivation from canceled", {
      companyId,
      subscriptionId: subscription.id,
      mappedStatus,
    });
  }

  const snapshot: EntitlementsSnapshot = {
    locked_plan_price_id: lockedPlanPriceId,
    billing_phase: billingPhase,
    trial_discount_model: billingPhase === "trial" ? "stripe_native_trial" : undefined,
    meters: mergedMeters,
  };

  let revisionSource:
    | "signup"
    | "trial_end"
    | "webhook"
    | "addon_change" = "webhook";

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

  // Order-safe: revision + entitlements before subscription status write.
  // Idempotent: skip revision insert if this event id already recorded.
  const { data: existingRev, error: revLookupError } = await admin
    .from("company_entitlement_revisions")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle();
  assertNoDbError(revLookupError, "revision_lookup");

  const shouldRevise =
    !existingRev?.id &&
    (isSignup ||
      isTrialEnd ||
      priceChanged ||
      statusChanged ||
      pendingApply.applied);

  if (shouldRevise) {
    await appendRevision(
      admin,
      companyId,
      revisionSource,
      isTrialEnd ? "active" : billingPhase,
      lockedPlanPriceId,
      snapshot,
      event.id,
    );
  } else if (
    !existingRev?.id &&
    pendingApply.applied === false &&
    // Addon qty change without status/price change still needs a revision.
    event.type === "customer.subscription.updated"
  ) {
    // Detect meter delta vs prior entitlements for mid-cycle addon +1.
    const { data: priorEnt, error: priorEntError } = await admin
      .from("company_entitlements")
      .select("entitlements_snapshot")
      .eq("company_id", companyId)
      .maybeSingle();
    assertNoDbError(priorEntError, "prior_entitlements_for_addon_rev");
    const priorMeters = ((priorEnt?.entitlements_snapshot as EntitlementsSnapshot)
      ?.meters ?? {}) as MeterMap;
    const metersChanged =
      JSON.stringify(priorMeters) !== JSON.stringify(mergedMeters);
    if (metersChanged) {
      await appendRevision(
        admin,
        companyId,
        "addon_change",
        billingPhase,
        lockedPlanPriceId,
        snapshot,
        event.id,
      );
    }
  }

  await upsertEntitlements(
    admin,
    companyId,
    snapshot,
    mappedStatus,
    isTrialEnd ? "active" : billingPhase,
    lockedPlanPriceId,
  );

  await syncSubscriptionRecord(
    admin,
    companyId,
    subscription,
    lockedPlanPriceId,
    eventCreated,
  );

  const { error: auditError } = await admin.from("billing_audit_log").insert({
    company_id: companyId,
    action: "webhook_sync",
    after_snapshot: snapshot,
    reason: `${event.type} ${subscription.id} status=${mappedStatus}`,
  });
  assertNoDbError(auditError, "webhook_audit_insert");
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

  const liveSub = await stripe.subscriptions.retrieve(subscriptionId);
  const { error } = await admin.from("company_subscriptions").upsert({
    company_id: companyId,
    stripe_customer_id: typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null,
    stripe_subscription_id: subscriptionId,
    status: mapStripeStatus(liveSub.status),
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
    const claim = await acquireWebhookClaim(admin, event);
    if (claim === "duplicate") {
      return jsonResponse({ received: true, duplicate: true });
    }
    if (claim === "in_flight") {
      // Non-2xx so Stripe retries; concurrent delivery must not be ack'd as done.
      return jsonResponse({ error: "in_flight" }, 409);
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
          const eventSub = event.data.object as Stripe.Subscription;
          // Prefer live retrieve (deleted subs still return status=canceled).
          let subscription: Stripe.Subscription;
          try {
            subscription = await stripe.subscriptions.retrieve(eventSub.id);
          } catch {
            subscription = eventSub;
          }
          const companyId = await resolveCompanyIdForSubscription(
            admin,
            subscription,
            event.id,
          );
          if (companyId) {
            await applyCanceledSubscription(
              admin,
              companyId,
              subscription,
              event,
            );
          }
          break;
        }

        default:
          console.log("stripe-webhook: ignored event type", event.type);
      }
      await markWebhookClaimDone(admin, event);
    } catch (handlerErr) {
      await markWebhookClaimFailed(admin, event.id, handlerErr);
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
