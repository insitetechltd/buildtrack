// Public checkout-first company signup → Stripe Checkout (no auth session yet).
// Deploy: supabase functions deploy start-signup-checkout --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, BILLING_CURRENCY (optional), STRIPE_TRIAL_PERIOD_DAYS (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BILLING_CURRENCY = "hkd";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripeLivemodeFromSecret(secret: string): boolean {
  return secret.startsWith("sk_live_");
}

function isAllowedCheckoutReturnUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (value.startsWith("taskr://")) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
    if (
      url.hostname === "insitetechltd.github.io" &&
      (url.pathname.startsWith("/buildtrack/") ||
        url.pathname.startsWith("/buildtrack/taskr/"))
    ) {
      return true;
    }
    if (
      url.hostname === "insiteworks.co" ||
      url.hostname === "www.insiteworks.co"
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function truncateMeta(value: string, max = 450): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const companyName =
      typeof body.companyName === "string" ? body.companyName.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const planTierSlug =
      typeof body.planTierSlug === "string"
        ? body.planTierSlug.trim().toLowerCase()
        : "";
    const planPriceId =
      typeof body.planPriceId === "string" ? body.planPriceId.trim() : "";
    const successUrl =
      typeof body.successUrl === "string" ? body.successUrl.trim() : "";
    const cancelUrl =
      typeof body.cancelUrl === "string" ? body.cancelUrl.trim() : "";

    if (!companyName || !name || !email || !planTierSlug || !planPriceId) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return jsonResponse({ error: "invalid_email" }, 400);
    }
    if (!successUrl || !isAllowedCheckoutReturnUrl(successUrl)) {
      return jsonResponse({ error: "invalid_success_url" }, 400);
    }
    if (!cancelUrl || !isAllowedCheckoutReturnUrl(cancelUrl)) {
      return jsonResponse({ error: "invalid_cancel_url" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Reject before charge if this email already owns a company.
    const { data: existingProfile } = await admin
      .from("users")
      .select("id, company_id, email")
      .ilike("email", email)
      .maybeSingle();

    if (existingProfile?.company_id) {
      return jsonResponse(
        {
          error: "email_already_registered",
          message:
            "This email already has a company. Open Taskr and sign in, or contact support.",
        },
        409,
      );
    }

    const livemode = stripeLivemodeFromSecret(stripeSecret);
    const billingCurrency = (
      Deno.env.get("BILLING_CURRENCY") ?? DEFAULT_BILLING_CURRENCY
    ).toLowerCase();
    const trialDaysRaw = Deno.env.get("STRIPE_TRIAL_PERIOD_DAYS");
    const trialDays =
      trialDaysRaw == null || trialDaysRaw === ""
        ? null
        : Number.parseInt(trialDaysRaw, 10);

    const { data: tier, error: tierError } = await admin
      .from("plan_tiers")
      .select("id")
      .eq("slug", planTierSlug)
      .eq("kind", "base")
      .eq("is_active", true)
      .maybeSingle();

    if (tierError || !tier?.id) {
      return jsonResponse({ error: "plan_not_found" }, 404);
    }

    const { data: planPrice, error: planError } = await admin
      .from("plan_prices")
      .select("id, stripe_price_id, plan_tier_id")
      .eq("id", planPriceId)
      .eq("livemode", livemode)
      .eq("currency", billingCurrency)
      .eq("is_sellable", true)
      .maybeSingle();

    if (planError) {
      return jsonResponse({ error: "plan_lookup_failed" }, 500);
    }
    if (
      !planPrice?.id ||
      !planPrice.stripe_price_id ||
      planPrice.plan_tier_id !== tier.id
    ) {
      return jsonResponse({ error: "plan_price_mismatch" }, 404);
    }

    const metadata = {
      signup_flow: "checkout_first",
      company_name: truncateMeta(companyName),
      admin_name: truncateMeta(name, 200),
      admin_email: truncateMeta(email, 200),
      plan_price_id: planPrice.id as string,
      plan_tier_slug: planTierSlug,
      livemode: String(livemode),
    };

    // Ensure success URL carries the session id for status polling.
    let finalSuccess = successUrl;
    if (!finalSuccess.includes("{CHECKOUT_SESSION_ID}")) {
      const joiner = finalSuccess.includes("?") ? "&" : "?";
      finalSuccess = `${finalSuccess}${joiner}session_id={CHECKOUT_SESSION_ID}`;
    }

    const form = new URLSearchParams();
    form.set("mode", "subscription");
    form.set("line_items[0][price]", planPrice.stripe_price_id as string);
    form.set("line_items[0][quantity]", "1");
    form.set("success_url", finalSuccess);
    form.set("cancel_url", cancelUrl);
    form.set("customer_email", email);
    form.set("allow_promotion_codes", "true");
    form.set("client_reference_id", truncateMeta(`${email}:${planPrice.id}`, 200));
    if (
      trialDays != null &&
      Number.isFinite(trialDays) &&
      trialDays > 0
    ) {
      form.set("subscription_data[trial_period_days]", String(trialDays));
    }
    for (const [key, value] of Object.entries(metadata)) {
      form.set(`metadata[${key}]`, value);
      form.set(`subscription_data[metadata][${key}]`, value);
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const payload = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      const message =
        typeof payload?.error?.message === "string"
          ? payload.error.message
          : `Stripe checkout failed (${stripeRes.status})`;
      return jsonResponse({ error: "stripe_checkout_failed", message }, 502);
    }
    if (typeof payload?.url !== "string" || !payload.url) {
      return jsonResponse({ error: "checkout_url_missing" }, 502);
    }

    return jsonResponse({
      url: payload.url,
      sessionId: payload.id ?? null,
      planPriceId: planPrice.id,
      planTierSlug,
      livemode,
    });
  } catch (err) {
    console.error("start-signup-checkout failed", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
