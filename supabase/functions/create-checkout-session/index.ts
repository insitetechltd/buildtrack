// M-BILL-01 BILL-E — Stripe Checkout Session with native trial + company metadata
// Deploy: scripts/supabase/deploy-create-checkout-session.sh
// Secrets: STRIPE_SECRET_KEY, STRIPE_CHECKOUT_SUCCESS_URL, STRIPE_CHECKOUT_CANCEL_URL (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

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

    const metadata = {
      company_id: companyId,
      plan_price_id: planPrice.id as string,
      livemode: String(livemode),
    };

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-11-20.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: existingSub } = await adminClient
      .from("company_subscriptions")
      .select("stripe_customer_id")
      .eq("company_id", companyId)
      .maybeSingle();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: planPrice.stripe_price_id as string, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: companyId,
      metadata,
      subscription_data: {
        trial_period_days: Number.isFinite(trialDays) && trialDays > 0
          ? trialDays
          : DEFAULT_TRIAL_DAYS,
        metadata,
      },
    };

    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id as string;
    } else if (caller.email) {
      sessionParams.customer_email = caller.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return jsonResponse({ error: "checkout_url_missing" }, 500);
    }

    return jsonResponse({
      url: session.url,
      sessionId: session.id,
      planPriceId: planPrice.id,
      planTierSlug,
      livemode,
    });
  } catch (err) {
    console.error("create-checkout-session handler error", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
