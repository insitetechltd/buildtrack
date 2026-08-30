// M-OPS-03 Economics — subscription / entitlement rollups for hq (DEV).
// Auth: JWT + platform_owners. No invented currency / MRR fields.
// Deploy: bash scripts/supabase/deploy-owner-economics-snapshot.sh --project-ref zusulknbhaumougqckec

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isCallerPlatformOwner } from "../_shared/ownerAllowlist.ts";

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

function bump(map: Record<string, number>, key: string) {
  const k = key || "unknown";
  map[k] = (map[k] ?? 0) + 1;
}

function firstRel<T>(raw: unknown): T | null {
  if (Array.isArray(raw)) return (raw[0] as T) ?? null;
  if (raw && typeof raw === "object") return raw as T;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return jsonResponse({ error: "not_authenticated" }, 401);
    }

    if (!(await isCallerPlatformOwner(admin, caller.id))) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const { count: companyTotal, error: companyErr } = await admin
      .from("companies")
      .select("id", { count: "exact", head: true });
    if (companyErr) throw companyErr;

    // No livemode=true filter — DEV is Stripe testmode (Gate A).
    const { data: subs, error: subErr } = await admin
      .from("company_subscriptions")
      .select(
        "company_id, status, stripe_subscription_id, trial_ends_at, locked_plan_price_id, plan_prices:locked_plan_price_id ( plan_tiers:plan_tier_id ( slug, display_name ) )",
      );
    if (subErr) throw subErr;

    const { data: ents, error: entErr } = await admin
      .from("company_entitlements")
      .select("company_id, subscription_status, billing_phase");
    if (entErr) throw entErr;

    const subscriptionStatusCounts: Record<string, number> = {};
    const entitlementStatusCounts: Record<string, number> = {};
    const billingPhaseCounts: Record<string, number> = {};
    const tierCounts: Record<string, number> = {};
    const companiesWithStripe = new Set<string>();
    const companiesWithSubRow = new Set<string>();
    let trialActive = 0;
    const now = Date.now();

    for (const row of subs ?? []) {
      const r = row as {
        company_id: string;
        status: string | null;
        stripe_subscription_id: string | null;
        trial_ends_at: string | null;
        plan_prices?: unknown;
      };
      companiesWithSubRow.add(r.company_id);
      bump(subscriptionStatusCounts, (r.status || "unknown").toLowerCase());
      if (r.stripe_subscription_id) companiesWithStripe.add(r.company_id);
      if (r.trial_ends_at && new Date(r.trial_ends_at).getTime() > now) {
        trialActive += 1;
      }
      const planPrices = firstRel<{
        plan_tiers?: { slug?: string; display_name?: string } | null;
      }>(r.plan_prices);
      const tiers = planPrices?.plan_tiers;
      const tier = firstRel<{ slug?: string; display_name?: string }>(tiers) ??
        (tiers as { slug?: string; display_name?: string } | null);
      const slug = tier?.slug || tier?.display_name || "unscoped";
      bump(tierCounts, slug);
    }

    for (const row of ents ?? []) {
      const r = row as {
        company_id: string;
        subscription_status: string | null;
        billing_phase: string | null;
      };
      bump(
        entitlementStatusCounts,
        (r.subscription_status || "unknown").toLowerCase(),
      );
      bump(billingPhaseCounts, (r.billing_phase || "unknown").toLowerCase());
    }

    const totalCompanies = companyTotal ?? 0;
    const withSub = companiesWithSubRow.size;
    const withoutSub = Math.max(0, totalCompanies - withSub);

    return jsonResponse({
      generatedAt: new Date().toISOString(),
      currencyNote:
        "Counts only — dollars live in Stripe Dashboard (no invented MRR).",
      stripeDashboardHint: "https://dashboard.stripe.com/test/subscriptions",
      totals: {
        companies: totalCompanies,
        companiesWithSubscriptionRow: withSub,
        companiesWithoutSubscriptionRow: withoutSub,
        companiesWithStripeSubscriptionId: companiesWithStripe.size,
        trialsNotEnded: trialActive,
      },
      // Display SoT for status strip: company_subscriptions.status
      subscriptionStatusCounts,
      // Secondary (may drift vs subscriptions — shown separately)
      entitlementStatusCounts,
      billingPhaseCounts,
      tierCounts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("owner-economics-snapshot", message);
    return jsonResponse({ error: "internal_error", detail: message }, 500);
  }
});
