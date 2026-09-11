// Self-serve company subscription cancel (ASC: web callers with JWT).
// Deploy: scripts/supabase/deploy-cancel-subscription.sh
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

async function stripeRequest(
  stripeSecret: string,
  method: string,
  path: string,
  form?: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeSecret}`,
      ...(form
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: form,
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

function summarizeSubscription(sub: Record<string, unknown>) {
  const status = typeof sub.status === "string" ? sub.status : "unknown";
  const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
  const trialEnd =
    typeof sub.trial_end === "number" ? sub.trial_end : null;
  const cancelAt =
    typeof sub.cancel_at === "number" ? sub.cancel_at : null;
  const periodEnd =
    typeof sub.current_period_end === "number"
      ? sub.current_period_end
      : null;
  const accessUntilUnix =
    cancelAt ??
    (cancelAtPeriodEnd
      ? (status === "trialing" ? trialEnd : periodEnd)
      : null) ??
    (status === "trialing" ? trialEnd : periodEnd);
  const willBeCharged =
    status === "trialing"
      ? false
      : status === "canceled" || status === "incomplete_expired"
      ? false
      : !(cancelAtPeriodEnd || cancelAt != null);
  return {
    stripeStatus: status,
    cancelAtPeriodEnd,
    cancelAt: unixToIso(cancelAt),
    trialEndsAt: unixToIso(trialEnd),
    currentPeriodEnd: unixToIso(periodEnd),
    accessUntil: unixToIso(accessUntilUnix),
    willBeCharged,
  };
}

async function voidOpenSubscriptionInvoices(
  stripeSecret: string,
  subscriptionId: string,
): Promise<{ voidedInvoiceIds: string[]; voidFailedInvoiceIds: string[] }> {
  const voidedInvoiceIds: string[] = [];
  const voidFailedInvoiceIds: string[] = [];
  // Open invoices near trial_end can still charge a card on file.
  for (const status of ["open", "draft"] as const) {
    const listed = await stripeRequest(
      stripeSecret,
      "GET",
      `/invoices?subscription=${encodeURIComponent(subscriptionId)}&status=${status}&limit=20`,
    );
    const data = Array.isArray(listed.data) ? listed.data : [];
    for (const raw of data) {
      const invoice = raw as { id?: string; status?: string };
      if (!invoice.id) continue;
      if (invoice.status !== "open" && invoice.status !== "draft") continue;
      try {
        if (invoice.status === "draft") {
          await stripeRequest(
            stripeSecret,
            "DELETE",
            `/invoices/${encodeURIComponent(invoice.id)}`,
          );
        } else {
          await stripeRequest(
            stripeSecret,
            "POST",
            `/invoices/${encodeURIComponent(invoice.id)}/void`,
          );
        }
        voidedInvoiceIds.push(invoice.id);
      } catch (err) {
        console.warn("cancel-subscription: void/delete invoice failed", {
          invoiceId: invoice.id,
          err: err instanceof Error ? err.message : String(err),
        });
        voidFailedInvoiceIds.push(invoice.id);
      }
    }
  }
  return { voidedInvoiceIds, voidFailedInvoiceIds };
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
    if (!isCompanyAdmin(profile)) {
      return jsonResponse({ error: "not_company_admin" }, 403);
    }

    const companyId = profile.company_id;

    const { data: subRow, error: subError } = await adminClient
      .from("company_subscriptions")
      .select(
        "stripe_subscription_id, stripe_customer_id, status, trial_ends_at, current_period_end",
      )
      .eq("company_id", companyId)
      .maybeSingle();

    if (subError) {
      console.error("cancel-subscription: sub lookup failed", subError);
      return jsonResponse({ error: "subscription_lookup_failed" }, 500);
    }

    const stripeSubscriptionId =
      typeof subRow?.stripe_subscription_id === "string"
        ? subRow.stripe_subscription_id
        : "";
    if (!stripeSubscriptionId) {
      return jsonResponse({ error: "subscription_missing" }, 404);
    }

    if (subRow?.status === "canceled") {
      return jsonResponse({
        ok: true,
        mode: "already_canceled",
        companyId,
        localStatus: "canceled",
        stripeStatus: "canceled",
        cancelAtPeriodEnd: false,
        accessUntil: null,
        willBeCharged: false,
        message: "Subscription is already canceled.",
      });
    }

    let subscription = await stripeRequest(
      stripeSecret,
      "GET",
      `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
    );

    const status =
      typeof subscription.status === "string" ? subscription.status : "";

    if (status === "canceled") {
      await adminClient
        .from("company_subscriptions")
        .update({ status: "canceled" })
        .eq("company_id", companyId);
      await adminClient
        .from("company_entitlements")
        .update({ subscription_status: "canceled" })
        .eq("company_id", companyId);
      return jsonResponse({
        ok: true,
        mode: "already_canceled",
        companyId,
        ...summarizeSubscription(subscription),
        message: "Subscription is already canceled.",
      });
    }

    if (subscription.cancel_at_period_end === true ||
      (typeof subscription.cancel_at === "number" &&
        subscription.cancel_at > 0)
    ) {
      return jsonResponse({
        ok: true,
        mode: "already_scheduled",
        companyId,
        ...summarizeSubscription(subscription),
        message:
          "Cancellation is already scheduled. You will not be charged after access ends.",
      });
    }

    let mode: "scheduled" | "immediate" = "scheduled";
    let voidedInvoiceIds: string[] = [];
    let voidFailedInvoiceIds: string[] = [];

    if (status === "incomplete" || status === "incomplete_expired") {
      mode = "immediate";
      subscription = await stripeRequest(
        stripeSecret,
        "DELETE",
        `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
      );
      await adminClient
        .from("company_subscriptions")
        .update({ status: "canceled" })
        .eq("company_id", companyId);
      await adminClient
        .from("company_entitlements")
        .update({ subscription_status: "canceled" })
        .eq("company_id", companyId);
    } else if (
      status === "trialing" ||
      status === "active" ||
      status === "past_due" ||
      status === "unpaid" ||
      status === "paused"
    ) {
      // Do NOT flip local status to canceled — keep access until Stripe deletes.
      const form = new URLSearchParams();
      const trialEndUnix =
        typeof subscription.trial_end === "number"
          ? subscription.trial_end
          : null;
      if (status === "trialing" && trialEndUnix != null && trialEndUnix > 0) {
        // Gate A: explicit cancel_at=trial_end (stronger than cancel_at_period_end alone).
        form.set("cancel_at", String(trialEndUnix));
      } else {
        form.set("cancel_at_period_end", "true");
      }
      subscription = await stripeRequest(
        stripeSecret,
        "POST",
        `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
        form,
      );
      if (status === "trialing") {
        const voids = await voidOpenSubscriptionInvoices(
          stripeSecret,
          stripeSubscriptionId,
        );
        voidedInvoiceIds = voids.voidedInvoiceIds;
        voidFailedInvoiceIds = voids.voidFailedInvoiceIds;
        // Re-fetch after voids so response matches Stripe.
        subscription = await stripeRequest(
          stripeSecret,
          "GET",
          `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
        );
      }
    } else {
      return jsonResponse(
        {
          error: "unsupported_subscription_status",
          stripeStatus: status,
        },
        409,
      );
    }

    const summary = summarizeSubscription(subscription);
    let message =
      mode === "immediate"
        ? "Subscription canceled."
        : summary.stripeStatus === "trialing"
        ? "Trial cancellation scheduled. Keep using Taskr until your trial ends — you will not be charged."
        : "Cancellation scheduled for the end of the current billing period.";
    if (voidFailedInvoiceIds.length > 0) {
      message +=
        " Warning: one or more open invoices could not be voided automatically — check Stripe or email support@insiteworks.co.";
    }
    return jsonResponse({
      ok: true,
      mode,
      companyId,
      voidedInvoiceIds,
      voidFailedInvoiceIds,
      ...summary,
      message,
    });
  } catch (err) {
    console.error("cancel-subscription handler error", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});
