export type OrgCheckoutPlanTierSlug = "growth" | "unlimited";

export type PlanCatalogMeterMap = Record<string, number | null>;

export type PlanCatalogTier = {
  slug: string;
  kind: "base" | "addon";
  displayName: string;
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
  baseBySlug: Partial<Record<OrgCheckoutPlanTierSlug, PlanCatalogTier>>;
  addonsBySlug: Partial<
    Record<"addon_worker_pack" | "addon_pm_seat", PlanCatalogTier>
  >;
};

/** Fallback when DB catalog is unavailable — must match locked HK list prices. */
export const FALLBACK_LIST_PRICES_HKD = {
  growth: { displayName: "Starter", amountHkd: "160" },
  unlimited: { displayName: "Pro", amountHkd: "400" },
  addon_worker_pack: { displayName: "Worker pack (+5)", amountHkd: "20" },
  addon_pm_seat: { displayName: "PM seat (+1)", amountHkd: "100" },
} as const;

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

export function formatTierCapsLineFromMeters(
  meters: PlanCatalogMeterMap,
): string | null {
  const projects = meters.projects;
  const entries = meters.entries_monthly;
  const storage = formatStorageBytes(meters.storage_bytes);
  const pm = meters.pm_seats;
  const workers = meters.worker_seats;

  const parts: string[] = [];
  if (projects != null) {
    parts.push(`${projects} projects`);
  }
  if (entries != null) {
    parts.push(`${entries} entries/mo`);
  }
  if (storage) {
    parts.push(storage);
  }
  if (pm != null || workers != null) {
    parts.push(`${pm ?? 0} PM + ${workers ?? 0} workers`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function resolveBaseTierDisplay(
  slug: OrgCheckoutPlanTierSlug,
  catalog: SellablePlanCatalog | null | undefined,
): { displayName: string; priceLabel: string; capsLine: string } {
  const fromCatalog = catalog?.baseBySlug[slug];
  if (fromCatalog) {
    return {
      displayName: fromCatalog.displayName,
      priceLabel: formatCatalogMoneyMonthly(
        fromCatalog.amountCents,
        fromCatalog.currency,
      ),
      capsLine:
        formatTierCapsLineFromMeters(fromCatalog.meters) ??
        (slug === "growth"
          ? "3 projects · 300 entries/mo · 10 GB · 1 PM + 5 workers"
          : "12 projects · 800 entries/mo · 30 GB · 2 PM + 10 workers"),
    };
  }

  const fallback = FALLBACK_LIST_PRICES_HKD[slug];
  return {
    displayName: fallback.displayName,
    priceLabel: `HK$${fallback.amountHkd}/mo`,
    capsLine:
      slug === "growth"
        ? "3 projects · 300 entries/mo · 10 GB · 1 PM + 5 workers"
        : "12 projects · 800 entries/mo · 30 GB · 2 PM + 10 workers",
  };
}

export function resolveAddonPriceLabels(
  catalog: SellablePlanCatalog | null | undefined,
): { workerPack: string; pmSeat: string } {
  const worker = catalog?.addonsBySlug.addon_worker_pack;
  const pm = catalog?.addonsBySlug.addon_pm_seat;
  return {
    workerPack: worker
      ? formatCatalogMoneyMonthly(worker.amountCents, worker.currency)
      : `HK$${FALLBACK_LIST_PRICES_HKD.addon_worker_pack.amountHkd}/mo`,
    pmSeat: pm
      ? formatCatalogMoneyMonthly(pm.amountCents, pm.currency)
      : `HK$${FALLBACK_LIST_PRICES_HKD.addon_pm_seat.amountHkd}/mo`,
  };
}
