import { supabase } from "./supabase";
import {
  resolvePreferredLivemode,
  selectSellableCatalogRows,
  type PlanCatalogMeterMap,
  type PlanCatalogTier,
  type SellablePlanCatalog,
} from "@/billing/planCatalog";

type PlanPriceQueryRow = {
  id: string;
  amount_cents: number;
  currency: string;
  livemode: boolean;
  effective_from: string;
  plan_tiers: {
    slug: string;
    kind: string;
    display_name: string;
    sort_order: number | null;
  } | null;
  plan_price_meters: Array<{
    meter_slug: string;
    limit_value: number | null;
  }> | null;
};

function metersFromRows(
  rows: PlanPriceQueryRow["plan_price_meters"],
): PlanCatalogMeterMap {
  const meters: PlanCatalogMeterMap = {};
  for (const row of rows ?? []) {
    meters[row.meter_slug] = row.limit_value;
  }
  return meters;
}

function toTier(row: PlanPriceQueryRow): PlanCatalogTier | null {
  const tier = row.plan_tiers;
  if (!tier?.slug) {
    return null;
  }
  return {
    slug: tier.slug,
    kind: tier.kind === "addon" ? "addon" : "base",
    displayName: tier.display_name || tier.slug,
    amountCents: row.amount_cents,
    currency: (row.currency || "hkd").toLowerCase(),
    planPriceId: row.id,
    livemode: row.livemode,
    sortOrder: tier.sort_order ?? 0,
    meters: metersFromRows(row.plan_price_meters),
  };
}

/**
 * Loads sellable list prices from plan_prices (+ meters).
 * Prefer HKD + livemode matching EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 */
export async function fetchSellablePlanCatalog(options?: {
  currency?: string;
}): Promise<SellablePlanCatalog | null> {
  if (!supabase) {
    return null;
  }

  const currency = (options?.currency ?? "hkd").toLowerCase();
  const { data, error } = await supabase
    .from("plan_prices")
    .select(
      [
        "id",
        "amount_cents",
        "currency",
        "livemode",
        "effective_from",
        "plan_tiers:plan_tier_id ( slug, kind, display_name, sort_order )",
        "plan_price_meters ( meter_slug, limit_value )",
      ].join(", "),
    )
    .eq("is_sellable", true)
    .eq("currency", currency)
    .order("effective_from", { ascending: false });

  if (error || !data) {
    return null;
  }

  const preferredLivemode = resolvePreferredLivemode();
  const selected = selectSellableCatalogRows(
    data as PlanPriceQueryRow[],
    preferredLivemode,
  );

  const catalog: SellablePlanCatalog = {
    currency,
    livemode: preferredLivemode,
    baseBySlug: {},
    addonsBySlug: {},
  };

  for (const row of selected) {
    const tier = toTier(row);
    if (!tier) {
      continue;
    }
    if (tier.kind === "base" && (tier.slug === "growth" || tier.slug === "unlimited")) {
      catalog.baseBySlug[tier.slug] = tier;
      continue;
    }
    if (
      tier.slug === "addon_worker_pack" ||
      tier.slug === "addon_pm_seat"
    ) {
      catalog.addonsBySlug[tier.slug] = tier;
    }
  }

  if (
    Object.keys(catalog.baseBySlug).length === 0 &&
    Object.keys(catalog.addonsBySlug).length === 0
  ) {
    return null;
  }

  return catalog;
}
