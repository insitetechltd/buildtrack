// Live Stripe + local billing status for company admins (web billing page).
// Deploy: scripts/supabase/deploy-billing-subscription-status.sh
// Secrets: STRIPE_SECRET_KEY (+ auto SUPABASE_*)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AdminClient = ReturnType<typeof createClient>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unixToIso(unix: number | null | undefined): string | null {
  if (typeof unix !== "number" || !Number.isFinite(unix) || unix <= 0) {
    return null;
  }
  return new Date(unix * 1000).toISOString();
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
        ? (payload as { error: { message: string } }).error.message
        : `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as Record<string, unknown>;
}

async function loadCallerAdminProfile(
  adminClient: AdminClient,
  callerId: string,
): Promise<{
  company_id: string | null;
  role?: string | null;
  system_permission?: string | null;
  is_pending?: boolean | null;
} | null> {
  // Prefer both columns when present (PROD may be system_permission-only admin).
  const both = await adminClient
    .from("users")
    .select("id, company_id, role, system_permission, is_pending")
    .eq("id", callerId)
    .maybeSingle();
  if (!both.error && both.data) {
    return both.data;
  }
  const rolePath = await adminClient
    .from("users")
    .select("id, company_id, role, is_pending")
    .eq("id", callerId)
    .maybeSingle();
  if (!rolePath.error && rolePath.data) {
    return rolePath.data;
  }
  const sysPath = await adminClient
    .from("users")
    .select("id, company_id, system_permission, is_pending")
    .eq("id", callerId)
    .maybeSingle();
  if (sysPath.error || !sysPath.data) return null;
  return sysPath.data;
}

function isCompanyAdmin(profile: {
  role?: string | null;
  system_permission?: string | null;
}): boolean {
  const permission = (profile.system_permission || "").toLowerCase();
  const role = (profile.role || "").toLowerCase();
  return (
    permission === "admin" ||
    role === "admin" ||
    role === "company_admin"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
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

    const profile = await loadCallerAdminProfile(adminClient, caller.id);
    if (!profile) {
      return jsonResponse({ error: "caller_profile_not_found" }, 403);
    }
    if (profile.is_pending) {
      return jsonResponse({ error: "caller_pending" }, 403);
    }
    if (!profile.company_id) {
      return jsonResponse({ error: "no_company" }, 403);
    }

    const admin = isCompanyAdmin(profile);
    if (!admin) {
      return jsonResponse({
        ok: true,
        isCompanyAdmin: false,
        companyId: profile.company_id,
        message:
          "Only a company admin can manage or cancel the subscription. Ask your company admin.",
      });
    }

    const companyId = profile.company_id;

    const { data: company } = await adminClient
      .from("companies")
      .select("id, name")
      .eq("id", companyId)
      .maybeSingle();

    const { data: subRow } = await adminClient
      .from("company_subscriptions")
      .select(
        "status, trial_ends_at, current_period_end, stripe_subscription_id, stripe_customer_id, locked_plan_price_id, plan_prices:locked_plan_price_id ( plan_tiers:plan_tier_id ( slug, display_name ) )",
      )
      .eq("company_id", companyId)
      .maybeSingle();

    if (!subRow?.stripe_subscription_id) {
      return jsonResponse({
        ok: true,
        isCompanyAdmin: true,
        companyId,
        companyName: company?.name ?? null,
        email: caller.email ?? null,
        localStatus: subRow?.status ?? null,
        subscriptionMissing: true,
        message: "No Stripe subscription is linked to this company.",
      });
    }

    const subscription = await stripeGet(
      stripeSecret,
      `/subscriptions/${encodeURIComponent(String(subRow.stripe_subscription_id))}`,
    );

    const status =
      typeof subscription.status === "string" ? subscription.status : "unknown";
    const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
    const trialEnd =
      typeof subscription.trial_end === "number"
        ? subscription.trial_end
        : null;
    const cancelAt =
      typeof subscription.cancel_at === "number"
        ? subscription.cancel_at
        : null;
    const periodEnd =
      typeof subscription.current_period_end === "number"
        ? subscription.current_period_end
        : null;
    const accessUntilUnix =
      cancelAt ??
      (cancelAtPeriodEnd
        ? status === "trialing"
          ? trialEnd
          : periodEnd
        : null) ??
      (status === "trialing" ? trialEnd : periodEnd);

    const planJoin = subRow.plan_prices as
      | { plan_tiers?: { slug?: string; display_name?: string } | null }
      | null
      | undefined;
    const planTier = planJoin?.plan_tiers;

    const canCancel =
      status !== "canceled" &&
      status !== "incomplete_expired" &&
      !cancelAtPeriodEnd &&
      !(typeof cancelAt === "number" && cancelAt > 0);

    return jsonResponse({
      ok: true,
      isCompanyAdmin: true,
      companyId,
      companyName: company?.name ?? null,
      email: caller.email ?? null,
      planSlug: planTier?.slug ?? null,
      planDisplayName: planTier?.display_name ?? null,
      localStatus: subRow.status ?? null,
      stripeStatus: status,
      cancelAtPeriodEnd,
      cancelAt: unixToIso(cancelAt),
      trialEndsAt: unixToIso(trialEnd) ?? subRow.trial_ends_at ?? null,
      currentPeriodEnd:
        unixToIso(periodEnd) ?? subRow.current_period_end ?? null,
      accessUntil: unixToIso(accessUntilUnix),
      willBeCharged:
        status === "trialing"
          ? false
          : status === "canceled"
          ? false
          : !(cancelAtPeriodEnd || (typeof cancelAt === "number" && cancelAt > 0)),
      canCancel,
      cancellationScheduled: cancelAtPeriodEnd ||
        (typeof cancelAt === "number" && cancelAt > 0),
      subscriptionMissing: false,
    });
  } catch (err) {
    console.error("billing-subscription-status handler error", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
