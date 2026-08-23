// M-BILL-01 BILL-E — Stripe Checkout Session with native trial + company metadata
// Deploy: scripts/supabase/deploy-create-checkout-session.sh
// Secrets: STRIPE_SECRET_KEY, STRIPE_CHECKOUT_SUCCESS_URL, STRIPE_CHECKOUT_CANCEL_URL (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_TIER_SLUGS = new Set(["growth", "unlimited"]);
const DEFAULT_TRIAL_DAYS = 30;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripeLivemodeFromSecret(secret: string): boolean {
  return secret.startsWith("sk_live_");
}

function defaultCheckoutUrls() {
  return {
    success: "taskr://profile?checkout=success",
    cancel: "taskr://profile?checkout=cancel",
  };
}

async function createStripeCheckoutSession(
  stripeSecret: string,
  params: {
    priceId: string;
    companyId: string;
    planPriceId: string;
    livemode: boolean;
    trialDays: number;
    successUrl: string;
    cancelUrl: string;
    customerId?: string | null;
    customerEmail?: string | null;
  },
): Promise<{ id: string; url: string }> {
  const metadata = {
    company_id: params.companyId,
    plan_price_id: params.planPriceId,
    livemode: String(params.livemode),
  };

  const body = new URLSearchParams();
  body.set("mode", "subscription");
  body.set("line_items[0][price]", params.priceId);
  body.set("line_items[0][quantity]", "1");
  body.set("success_url", params.successUrl);
  body.set("cancel_url", params.cancelUrl);
  body.set("client_reference_id", params.companyId);
  body.set(
    "subscription_data[trial_period_days]",
    String(
      Number.isFinite(params.trialDays) && params.trialDays > 0
        ? params.trialDays
        : DEFAULT_TRIAL_DAYS,
    ),
  );
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, value);
    body.set(`subscription_data[metadata][${key}]`, value);
  }
  if (params.customerId) {
    body.set("customer", params.customerId);
  } else if (params.customerEmail) {
    body.set("customer_email", params.customerEmail);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Stripe checkout failed (${response.status})`;
    throw new Error(message);
  }

  if (typeof payload?.url !== "string" || !payload.url) {
    throw new Error("checkout_url_missing");
  }

  return {
    id: String(payload.id || ""),
    url: payload.url,
  };
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
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Stripe request failed (${response.status})`;
    throw new Error(message);
  }
  return payload as Record<string, unknown>;
}

async function upgradeStripeSubscription(
  stripeSecret: string,
  params: {
    subscriptionId: string;
    subscriptionItemId: string;
    priceId: string;
    companyId: string;
    planPriceId: string;
    livemode: boolean;
  },
): Promise<{ id: string; status: string }> {
  const metadata = {
    company_id: params.companyId,
    plan_price_id: params.planPriceId,
    livemode: String(params.livemode),
  };

  const body = new URLSearchParams();
  body.set("items[0][id]", params.subscriptionItemId);
  body.set("items[0][price]", params.priceId);
  body.set("proration_behavior", "create_prorations");
  body.set("payment_behavior", "pending_if_incomplete");
  for (const [key, value] of Object.entries(metadata)) {
    body.set(`metadata[${key}]`, value);
  }

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(params.subscriptionId)}`,
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
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : `Stripe upgrade failed (${response.status})`;
    throw new Error(message);
  }

  return {
    id: String(payload.id || params.subscriptionId),
    status: String(payload.status || "active"),
  };
}

async function syncUpgradedPlanLock(
  adminClient: ReturnType<typeof createClient>,
  companyId: string,
  planPriceId: string,
): Promise<void> {
  const { error: subError } = await adminClient
    .from("company_subscriptions")
    .update({ locked_plan_price_id: planPriceId })
    .eq("company_id", companyId);

  if (subError) {
    console.error("syncUpgradedPlanLock subscription update failed", subError);
    throw new Error("upgrade_sync_failed");
  }

  const { error: entError } = await adminClient
    .from("company_entitlements")
    .update({ source_plan_price_id: planPriceId })
    .eq("company_id", companyId);

  if (entError) {
    console.error("syncUpgradedPlanLock entitlements update failed", entError);
    throw new Error("upgrade_sync_failed");
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

    const body = await req.json().catch(() => ({}));
    const companyId =
      typeof body.companyId === "string" ? body.companyId.trim() : "";
    const planTierSlug =
      typeof body.planTierSlug === "string"
        ? body.planTierSlug.trim().toLowerCase()
        : "";

    if (!companyId || !BASE_TIER_SLUGS.has(planTierSlug)) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    let callerProfile: {
      id: string;
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
        callerProfile = rolePath.data;
      } else {
        const sysPath = await adminClient
          .from("users")
          .select("id, company_id, system_permission, is_pending")
          .eq("id", caller.id)
          .maybeSingle();
        if (sysPath.error || !sysPath.data) {
          return jsonResponse({ error: "caller_profile_not_found" }, 403);
        }
        callerProfile = sysPath.data;
      }
    }

    if (callerProfile.is_pending) {
      return jsonResponse({ error: "caller_pending" }, 403);
    }

    if (callerProfile.company_id !== companyId) {
      return jsonResponse({ error: "company_mismatch" }, 403);
    }

    const permission = (callerProfile.system_permission || "").toLowerCase();
    const role = (callerProfile.role || "").toLowerCase();
    const isAdmin =
      permission === "admin" ||
      role === "admin" ||
      role === "company_admin";
    if (!isAdmin) {
      return jsonResponse({ error: "not_company_admin" }, 403);
    }

    const livemode = stripeLivemodeFromSecret(stripeSecret);
    const trialDays = Number.parseInt(
      Deno.env.get("STRIPE_TRIAL_PERIOD_DAYS") ?? String(DEFAULT_TRIAL_DAYS),
      10,
    );

    const { data: tier, error: tierError } = await adminClient
      .from("plan_tiers")
      .select("id")
      .eq("slug", planTierSlug)
      .eq("kind", "base")
      .maybeSingle();

    if (tierError || !tier?.id) {
      return jsonResponse({
        error: "plan_not_found",
        message: `Unknown base tier slug: ${planTierSlug}`,
      }, 404);
    }

    const { data: planPrice, error: planError } = await adminClient
      .from("plan_prices")
      .select("id, stripe_price_id")
      .eq("plan_tier_id", tier.id)
      .eq("livemode", livemode)
      .eq("is_sellable", true)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      console.error("create-checkout-session plan lookup failed", planError);
      return jsonResponse({ error: "plan_lookup_failed" }, 500);
    }

    if (!planPrice?.id || !planPrice.stripe_price_id) {
      return jsonResponse({
        error: "plan_not_found",
        message: `No sellable ${planTierSlug} price for livemode=${livemode}`,
      }, 404);
    }

    const defaults = defaultCheckoutUrls();
    const successUrl = Deno.env.get("STRIPE_CHECKOUT_SUCCESS_URL") ??
      defaults.success;
    const cancelUrl = Deno.env.get("STRIPE_CHECKOUT_CANCEL_URL") ??
      defaults.cancel;

    const { data: existingSub } = await adminClient
      .from("company_subscriptions")
      .select(
        "stripe_customer_id, stripe_subscription_id, status, locked_plan_price_id, plan_prices:locked_plan_price_id ( plan_tiers:plan_tier_id ( slug ) )",
      )
      .eq("company_id", companyId)
      .maybeSingle();

    const activeSubscriptionStatuses = new Set([
      "trialing",
      "active",
      "past_due",
    ]);
    const currentTierSlug =
      (existingSub?.plan_prices as { plan_tiers?: { slug?: string } } | null)
        ?.plan_tiers?.slug ?? null;
    const tierRank: Record<string, number> = { growth: 1, unlimited: 2 };

    if (
      existingSub?.stripe_subscription_id &&
      activeSubscriptionStatuses.has(String(existingSub.status))
    ) {
      if (currentTierSlug === planTierSlug) {
        return jsonResponse(
          {
            error: "already_subscribed",
            message: `Your company is already on ${planTierSlug}.`,
          },
          409,
        );
      }
      if (
        currentTierSlug &&
        tierRank[planTierSlug] != null &&
        tierRank[currentTierSlug] != null &&
        tierRank[planTierSlug] < tierRank[currentTierSlug]
      ) {
        return jsonResponse(
          {
            error: "downgrade_not_supported",
            message:
              "Downgrades are not self-serve yet. Contact support to change plans.",
          },
          409,
        );
      }
      if (
        currentTierSlug &&
        tierRank[planTierSlug] != null &&
        tierRank[currentTierSlug] != null &&
        tierRank[planTierSlug] > tierRank[currentTierSlug]
      ) {
        const subscriptionId = String(existingSub.stripe_subscription_id);
        const stripeSub = await stripeGet(
          stripeSecret,
          `/subscriptions/${encodeURIComponent(subscriptionId)}`,
        );
        const items = stripeSub.items as {
          data?: Array<{ id?: string }>;
        } | undefined;
        const subscriptionItemId = items?.data?.[0]?.id;
        if (!subscriptionItemId) {
          return jsonResponse({ error: "subscription_item_missing" }, 500);
        }

        const upgraded = await upgradeStripeSubscription(stripeSecret, {
          subscriptionId,
          subscriptionItemId,
          priceId: planPrice.stripe_price_id as string,
          companyId,
          planPriceId: planPrice.id as string,
          livemode,
        });

        await syncUpgradedPlanLock(
          adminClient,
          companyId,
          planPrice.id as string,
        );

        return jsonResponse({
          upgraded: true,
          planTierSlug,
          planPriceId: planPrice.id,
          subscriptionId: upgraded.id,
          subscriptionStatus: upgraded.status,
          livemode,
        });
      }
    }

    const metadata = {
      company_id: companyId,
      plan_price_id: planPrice.id as string,
      livemode: String(livemode),
    };

    const session = await createStripeCheckoutSession(stripeSecret, {
      priceId: planPrice.stripe_price_id as string,
      companyId,
      planPriceId: planPrice.id as string,
      livemode,
      trialDays,
      successUrl,
      cancelUrl,
      customerId: existingSub?.stripe_customer_id as string | undefined,
      customerEmail: caller.email ?? null,
    });

    if (!session.url) {
      return jsonResponse({ error: "checkout_url_missing" }, 500);
    }

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      planPriceId: planPrice.id,
      planTierSlug,
      livemode,
      metadata,
    });
  } catch (err) {
    console.error("create-checkout-session handler error", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
