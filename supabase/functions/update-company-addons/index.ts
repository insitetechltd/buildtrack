// M-BILL-01 BILL-F — Update company add-ons (PM seat / worker pack)
// Deploy: scripts/supabase/deploy-billing-edge.sh
// Secrets: STRIPE_SECRET_KEY
// Auth: user JWT required (Authorization header)
//
// This endpoint updates the existing Stripe subscription items quantity (or deletes them)
// for known add-on tiers, then relies on `stripe-webhook` to merge meters and refresh
// `company_entitlements`.

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
  /** Quantity of `addon_worker_pack` units. */
  addonWorkerPacks: number;
  /** Quantity of `addon_pm_seat` units. */
  addonPmSeats: number;
};

const ADDON_TIER_SLUGS = {
  worker: "addon_worker_pack",
  pm: "addon_pm_seat",
} as const;

const NON_NEGATIVE_INT_ERR = { error: "invalid_payload" };

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
    >;
    const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";

    const addonWorkerPacksRaw =
      typeof body.addonWorkerPacks === "number"
        ? body.addonWorkerPacks
        : Number.NaN;
    const addonPmSeatsRaw =
      typeof body.addonPmSeats === "number" ? body.addonPmSeats : Number.NaN;

    if (!companyId) {
      return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
    }
    if (!Number.isFinite(addonWorkerPacksRaw) || addonWorkerPacksRaw < 0 || !Number.isInteger(addonWorkerPacksRaw)) {
      return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
    }
    if (!Number.isFinite(addonPmSeatsRaw) || addonPmSeatsRaw < 0 || !Number.isInteger(addonPmSeatsRaw)) {
      return jsonResponse(NON_NEGATIVE_INT_ERR, 400);
    }

    const addonWorkerPacks = addonWorkerPacksRaw;
    const addonPmSeats = addonPmSeatsRaw;

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

    const callerProfile = await adminClient
      .from("users")
      .select("id, company_id, role, system_permission, is_pending")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfile.error || !callerProfile.data) {
      return jsonResponse({ error: "caller_profile_not_found" }, 403);
    }

    const profile = callerProfile.data as {
      company_id: string | null;
      role?: string | null;
      system_permission?: string | null;
      is_pending?: boolean | null;
    };

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

    // Find sellable add-on Stripe prices for current currency/livemode.
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
      `/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`,
    );

    const items = (stripeSub.items as { data?: Array<Record<string, unknown>> } | undefined)
      ?.data ?? [];

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

    function extractQuantity(item: Record<string, unknown>): number {
      const q = item.quantity;
      return typeof q === "number" && Number.isFinite(q) ? Math.max(0, Math.floor(q)) : 1;
    }

    const workerExistingItem = items.find((it) => {
      const stripePriceId = extractStripePriceId(it);
      return stripePriceId === addonWorkerPlanPrice.stripe_price_id;
    });
    const pmExistingItem = items.find((it) => {
      const stripePriceId = extractStripePriceId(it);
      return stripePriceId === addonPmPlanPrice.stripe_price_id;
    });

    const workerExistingItemId = workerExistingItem ? extractItemId(workerExistingItem) : null;
    const pmExistingItemId = pmExistingItem ? extractItemId(pmExistingItem) : null;

    const nextBody = new URLSearchParams();
    nextBody.set("proration_behavior", "create_prorations");
    nextBody.set("payment_behavior", "pending_if_incomplete");

    let itemIndex = 0;
    function addUpdateForItem(opts: {
      id?: string | null;
      price?: string | null;
      quantity?: number;
      delete?: boolean;
    }) {
      if (opts.delete) {
        if (!opts.id) {
          throw new Error("delete_requires_item_id");
        }
        nextBody.set(`items[${itemIndex}][id]`, opts.id);
        nextBody.set(`items[${itemIndex}][_delete]`, "true");
      } else if (opts.id) {
        nextBody.set(`items[${itemIndex}][id]`, opts.id);
        nextBody.set(`items[${itemIndex}][quantity]`, String(opts.quantity ?? 1));
      } else if (opts.price) {
        nextBody.set(`items[${itemIndex}][price]`, opts.price);
        nextBody.set(`items[${itemIndex}][quantity]`, String(opts.quantity ?? 1));
      } else {
        throw new Error("invalid_item_update");
      }
      itemIndex += 1;
    }

    // Worker pack
    if (addonWorkerPacks === 0) {
      if (workerExistingItemId) {
        addUpdateForItem({ id: workerExistingItemId, delete: true });
      }
    } else {
      if (workerExistingItemId) {
        addUpdateForItem({
          id: workerExistingItemId,
          quantity: addonWorkerPacks,
        });
      } else {
        addUpdateForItem({
          price: addonWorkerPlanPrice.stripe_price_id,
          quantity: addonWorkerPacks,
        });
      }
    }

    // PM seat add-on
    if (addonPmSeats === 0) {
      if (pmExistingItemId) {
        addUpdateForItem({ id: pmExistingItemId, delete: true });
      }
    } else {
      if (pmExistingItemId) {
        addUpdateForItem({ id: pmExistingItemId, quantity: addonPmSeats });
      } else {
        addUpdateForItem({
          price: addonPmPlanPrice.stripe_price_id,
          quantity: addonPmSeats,
        });
      }
    }

    if (itemIndex === 0) {
      return jsonResponse({ success: true, changed: false });
    }

    await stripeUpdateSubscription(
      stripeSecret,
      stripeSubscriptionId,
      nextBody,
    );

    return jsonResponse({ success: true, changed: true });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "handler_failed" },
      500,
    );
  }
});

