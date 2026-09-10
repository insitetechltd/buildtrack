// Public status poll after Stripe Checkout success (checkout-first signup).
// Client passes Checkout session id; returns invite-open link when webhook finished.
// Deploy: supabase functions deploy signup-checkout-status --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeSecret || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    let sessionId = "";
    if (req.method === "GET") {
      const url = new URL(req.url);
      sessionId = (url.searchParams.get("session_id") || "").trim();
    } else {
      const body = await req.json().catch(() => ({}));
      sessionId =
        typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    }

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return jsonResponse({ error: "invalid_session_id" }, 400);
    }

    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeSecret}` } },
    );
    const session = await stripeRes.json().catch(() => ({}));
    if (!stripeRes.ok) {
      return jsonResponse({ error: "session_lookup_failed" }, 404);
    }

    const meta = (session.metadata || {}) as Record<string, string>;
    if (meta.signup_flow !== "checkout_first") {
      return jsonResponse({ error: "not_signup_checkout" }, 400);
    }

    const paymentStatus = String(session.payment_status || "");
    const status = String(session.status || "");
    if (status === "open") {
      return jsonResponse({ status: "open" });
    }
    if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
      return jsonResponse({
        status: "unpaid",
        paymentStatus,
      });
    }

    const adminEmail = (meta.admin_email || "").trim().toLowerCase();
    const companyIdMeta = (meta.company_id || "").trim();
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let profileQuery = admin
      .from("users")
      .select("id, email, company_id, invite_sign_in_link, must_set_password");
    if (companyIdMeta) {
      profileQuery = profileQuery.eq("company_id", companyIdMeta);
    } else if (adminEmail) {
      profileQuery = profileQuery.ilike("email", adminEmail);
    } else {
      return jsonResponse({ status: "pending" });
    }

    const { data: profile } = await profileQuery.maybeSingle();
    if (!profile?.company_id || !profile.invite_sign_in_link) {
      return jsonResponse({ status: "pending" });
    }

    return jsonResponse({
      status: "ready",
      inviteLink: profile.invite_sign_in_link,
      email: profile.email,
      mustSetPassword: profile.must_set_password !== false,
      companyId: profile.company_id,
    });
  } catch (err) {
    console.error("signup-checkout-status failed", err);
    return jsonResponse({ error: "internal_error" }, 500);
  }
});
