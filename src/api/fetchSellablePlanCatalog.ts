import { supabase } from "./supabase";
import {
  listBaseTiers,
  resolveBillingDisplayCurrency,
  resolvePreferredLivemode,
  selectSellableCatalogRows,
  type MeterDefinition,
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
    description: string | null;
    sort_order: number | null;
    is_active: boolean;
  } | null;
  plan_price_meters: Array<{
    meter_slug: string;
    limit_value: number | null;
  }> | null;
};

type MeterDefinitionRow = {
  slug: string;
  display_name: string;
  aggregation: string;
  enforcement: string;
  unit: string;
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

function toMeterDefinition(row: MeterDefinitionRow): MeterDefinition {
  return {
    slug: row.slug,
    displayName: row.display_name,
    aggregation: row.aggregation,
    enforcement: row.enforcement,
    unit: row.unit,
  };
}

function toTier(row: PlanPriceQueryRow): PlanCatalogTier | null {
  const tier = row.plan_tiers;
  if (!tier?.slug || tier.is_active === false) {
    return null;
  }
  return {
    slug: tier.slug,
    kind: tier.kind === "addon" ? "addon" : "base",
    displayName: tier.display_name || tier.slug,
    description: tier.description,
    amountCents: row.amount_cents,
    currency: (row.currency || resolveBillingDisplayCurrency()).toLowerCase(),
    planPriceId: row.id,
    livemode: row.livemode,
    sortOrder: tier.sort_order ?? 0,
    meters: metersFromRows(row.plan_price_meters),
  };
}

function sortTiers(tiers: PlanCatalogTier[]): PlanCatalogTier[] {
  return [...tiers].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

async function fetchMeterDefinitions(): Promise<Record<string, MeterDefinition>> {
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase
    .from("meter_definitions")
    .select("slug, display_name, aggregation, enforcement, unit")
    .order("display_name", { ascending: true });

  if (error || !data) {
    return {};
  }

  const metersBySlug: Record<string, MeterDefinition> = {};
  for (const row of data as MeterDefinitionRow[]) {
    metersBySlug[row.slug] = toMeterDefinition(row);
  }
  return metersBySlug;
}

/**
 * Loads sellable catalog: active tiers, prices, meters, and meter definitions.
 * Currency defaults to EXPO_PUBLIC_BILLING_DISPLAY_CURRENCY or HKD.
 */
export async function fetchSellablePlanCatalog(options?: {
  currency?: string;
}): Promise<SellablePlanCatalog | null> {
  if (!supabase) {
    return null;
  }

  const currency = (options?.currency ?? resolveBillingDisplayCurrency()).toLowerCase();

  const [meterDefinitions, pricesResult] = await Promise.all([
    fetchMeterDefinitions(),
    supabase
      .from("plan_prices")
      .select(
        [
          "id",
          "amount_cents",
          "currency",
          "livemode",
          "effective_from",
          "plan_tiers:plan_tier_id ( slug, kind, display_name, description, sort_order, is_active )",
          "plan_price_meters ( meter_slug, limit_value )",
        ].join(", "),
      )
      .eq("is_sellable", true)
      .eq("currency", currency)
      .order("effective_from", { ascending: false }),
  ]);

  const { data, error } = pricesResult;
  if (error || !data) {
    return null;
  }

  const preferredLivemode = resolvePreferredLivemode();
  const selected = selectSellableCatalogRows(
    data as unknown as PlanPriceQueryRow[],
    preferredLivemode,
  );

  const baseTiers: PlanCatalogTier[] = [];
  const addonTiers: PlanCatalogTier[] = [];

  for (const row of selected) {
    const tier = toTier(row);
    if (!tier) {
      continue;
    }
    if (tier.kind === "base") {
      baseTiers.push(tier);
      continue;
    }
    addonTiers.push(tier);
  }

  if (baseTiers.length === 0 && addonTiers.length === 0) {
    return null;
  }

  return {
    currency,
    livemode: preferredLivemode,
    baseTiers: sortTiers(baseTiers),
    addonTiers: sortTiers(addonTiers),
    metersBySlug: meterDefinitions,
  };
}

/** Convenience for UI that only needs sellable base plan cards. */
export function catalogHasBaseTiers(
  catalog: SellablePlanCatalog | null | undefined,
): boolean {
  return listBaseTiers(catalog).length > 0;
}
