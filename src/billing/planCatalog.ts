/** Any sellable base or add-on tier slug from `plan_tiers.slug`. */
export type PlanTierSlug = string;

/** @deprecated Prefer PlanTierSlug — alias kept for existing imports. */
export type OrgCheckoutPlanTierSlug = PlanTierSlug;

export type PlanCatalogMeterMap = Record<string, number | null>;

export type MeterDefinition = {
  slug: string;
  displayName: string;
  aggregation: string;
  enforcement: string;
  unit: string;
};

export type PlanCatalogTier = {
  slug: string;
  kind: "base" | "addon";
  displayName: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  planPriceId: string;
  livemode: boolean;
  sortOrder: number;
  meters: PlanCatalogMeterMap;
};

export type SellablePlanCatalog = {
  currency: string;
  livemode: boolean | null;
  baseTiers: PlanCatalogTier[];
  addonTiers: PlanCatalogTier[];
  metersBySlug: Record<string, MeterDefinition>;
};

const DEFAULT_DISPLAY_CURRENCY = "hkd";

/** Display/charge currency for catalog fetch — override via env without app rebuild for ops. */
export function resolveBillingDisplayCurrency(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BILLING_DISPLAY_CURRENCY?.trim();
  if (fromEnv) {
    return fromEnv.toLowerCase();
  }
  return DEFAULT_DISPLAY_CURRENCY;
}

export function resolvePreferredLivemode(): boolean | null {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  if (key.startsWith("pk_live_")) {
    return true;
  }
  if (key.startsWith("pk_test_")) {
    return false;
  }
  return null;
}

export function normalizePlanTierSlug(
  slug: string | null | undefined,
): PlanTierSlug | null {
  if (!slug) {
    return null;
  }
  const normalized = slug.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function listBaseTiers(
  catalog: SellablePlanCatalog | null | undefined,
): PlanCatalogTier[] {
  return catalog?.baseTiers ?? [];
}

export function findBaseTier(
  catalog: SellablePlanCatalog | null | undefined,
  slug: string,
): PlanCatalogTier | undefined {
  const normalized = normalizePlanTierSlug(slug);
  if (!normalized || !catalog) {
    return undefined;
  }
  return catalog.baseTiers.find((tier) => tier.slug === normalized);
}

export function findAddonTier(
  catalog: SellablePlanCatalog | null | undefined,
  slug: string,
): PlanCatalogTier | undefined {
  const normalized = normalizePlanTierSlug(slug);
  if (!normalized || !catalog) {
    return undefined;
  }
  return catalog.addonTiers.find((tier) => tier.slug === normalized);
}

export function tierSortRank(
  catalog: SellablePlanCatalog | null | undefined,
  slug: string | null | undefined,
): number | null {
  const tier = findBaseTier(catalog, slug ?? "");
  return tier?.sortOrder ?? null;
}

export function selectSellableCatalogRows<
  T extends { livemode: boolean; plan_tiers: { slug: string } | null },
>(rows: T[], preferredLivemode: boolean | null): T[] {
  const bySlug = new Map<string, T>();
  const ordered =
    preferredLivemode == null
      ? rows
      : [
          ...rows.filter((row) => row.livemode === preferredLivemode),
          ...rows.filter((row) => row.livemode !== preferredLivemode),
        ];

  for (const row of ordered) {
    const slug = row.plan_tiers?.slug;
    if (!slug || bySlug.has(slug)) {
      continue;
    }
    bySlug.set(slug, row);
  }
  return [...bySlug.values()];
}

export function formatCatalogMoneyMonthly(
  amountCents: number,
  currency: string,
): string {
  const major = amountCents / 100;
  const rounded =
    Number.isInteger(major) ? String(major) : major.toFixed(2).replace(/\.00$/, "");
  const code = currency.toLowerCase();
  if (code === "hkd") {
    return `HK$${rounded}/mo`;
  }
  if (code === "usd") {
    return `$${rounded}/mo`;
  }
  if (code === "eur") {
    return `€${rounded}/mo`;
  }
  if (code === "gbp") {
    return `£${rounded}/mo`;
  }
  return `${rounded} ${code.toUpperCase()}/mo`;
}

function formatStorageBytes(bytes: number | null | undefined): string | null {
  if (bytes == null) {
    return null;
  }
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(0)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function formatMeterLimitValue(
  slug: string,
  value: number | null | undefined,
  definition?: MeterDefinition,
): string {
  if (value == null) {
    return "Unlimited";
  }

  const unit = definition?.unit ?? "count";
  if (unit === "bytes") {
    return formatStorageBytes(value) ?? String(value);
  }

  const label = definition?.displayName ?? slug.replace(/_/g, " ");
  const aggregation = definition?.aggregation ?? "";
  const unitLabel = formatCountUnitLabel(value, label);

  if (aggregation === "counter_monthly") {
    return `${unitLabel}/mo`;
  }
  if (aggregation === "counter_lifetime") {
    // displayName may already include "(lifetime)" — don't append twice
    const withoutLifetime = unitLabel.replace(/\s*\(lifetime\)\s*$/i, "").trim();
    return `${withoutLifetime} (lifetime)`;
  }

  return unitLabel;
}

/** `1 pm seat` / `5 worker seats` — avoid "1 pm seats". */
function formatCountUnitLabel(value: number, label: string): string {
  let unit = label.trim().toLowerCase();
  if (value === 1) {
    unit = unit
      .replace(/\bseats\b/g, "seat")
      .replace(/\bprojects\b/g, "project")
      .replace(/\bentries\b/g, "entry");
  }
  return `${value} ${unit}`;
}

export function formatTierCapsLineFromMeters(
  meters: PlanCatalogMeterMap,
  metersBySlug?: Record<string, MeterDefinition>,
): string | null {
  const slugs = Object.keys(meters).sort((a, b) => {
    const rankA = metersBySlug?.[a]?.displayName ?? a;
    const rankB = metersBySlug?.[b]?.displayName ?? b;
    return rankA.localeCompare(rankB);
  });

  const parts: string[] = [];
  for (const slug of slugs) {
    const formatted = formatMeterLimitValue(
      slug,
      meters[slug],
      metersBySlug?.[slug],
    );
    if (formatted !== "Unlimited") {
      parts.push(formatted);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function resolveTierDisplay(
  slug: PlanTierSlug,
  catalog: SellablePlanCatalog | null | undefined,
): { displayName: string; priceLabel: string; capsLine: string } {
  const fromCatalog = findBaseTier(catalog, slug);
  if (fromCatalog) {
    const capsLine =
      formatTierCapsLineFromMeters(fromCatalog.meters, catalog?.metersBySlug) ??
      fromCatalog.description?.trim() ??
      "See plan details";
    return {
      displayName: fromCatalog.displayName,
      priceLabel: formatCatalogMoneyMonthly(
        fromCatalog.amountCents,
        fromCatalog.currency,
      ),
      capsLine,
    };
  }

  return {
    displayName: slug,
    priceLabel: "—",
    capsLine: "Plan details unavailable",
  };
}

/** @deprecated Use resolveTierDisplay */
export function resolveBaseTierDisplay(
  slug: PlanTierSlug,
  catalog: SellablePlanCatalog | null | undefined,
): { displayName: string; priceLabel: string; capsLine: string } {
  return resolveTierDisplay(slug, catalog);
}

export function resolveAddonPriceLabels(
  catalog: SellablePlanCatalog | null | undefined,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const addon of catalog?.addonTiers ?? []) {
    labels[addon.slug] = formatCatalogMoneyMonthly(
      addon.amountCents,
      addon.currency,
    );
  }
  return labels;
}

export function buildOfferedPlanNamesLabel(
  catalog: SellablePlanCatalog | null | undefined,
): string {
  const names = listBaseTiers(catalog).map((tier) => tier.displayName);
  if (names.length === 0) {
    return "a company plan";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} or ${names[1]}`;
  }
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}
