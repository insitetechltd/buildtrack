import {
  buildOfferedPlanNamesLabel,
  formatCatalogMoneyMonthly,
  formatTierCapsLineFromMeters,
  listBaseTiers,
  resolveTierDisplay,
  resolvePreferredLivemode,
  selectSellableCatalogRows,
  type MeterDefinition,
  type SellablePlanCatalog,
} from "../planCatalog";

const meterDefinitions: Record<string, MeterDefinition> = {
  projects: {
    slug: "projects",
    displayName: "Active projects",
    aggregation: "gauge",
    enforcement: "soft",
    unit: "count",
  },
  entries_monthly: {
    slug: "entries_monthly",
    displayName: "Entries per billing period",
    aggregation: "counter_monthly",
    enforcement: "soft",
    unit: "count",
  },
  storage_bytes: {
    slug: "storage_bytes",
    displayName: "Hot storage",
    aggregation: "gauge",
    enforcement: "soft",
    unit: "bytes",
  },
  pm_seats: {
    slug: "pm_seats",
    displayName: "PM seats",
    aggregation: "gauge",
    enforcement: "hard",
    unit: "count",
  },
  worker_seats: {
    slug: "worker_seats",
    displayName: "Worker seats",
    aggregation: "gauge",
    enforcement: "hard",
    unit: "count",
  },
};

describe("planCatalog", () => {
  it("formats monthly list prices from cents for common currencies", () => {
    expect(formatCatalogMoneyMonthly(16000, "hkd")).toBe("HK$160/mo");
    expect(formatCatalogMoneyMonthly(40000, "hkd")).toBe("HK$400/mo");
    expect(formatCatalogMoneyMonthly(9900, "usd")).toBe("$99/mo");
    expect(formatCatalogMoneyMonthly(9900, "eur")).toBe("€99/mo");
  });

  it("builds caps lines from meters and definitions", () => {
    expect(
      formatTierCapsLineFromMeters(
        {
          projects: 3,
          entries_monthly: 300,
          storage_bytes: 10 * 1024 * 1024 * 1024,
          pm_seats: 1,
          worker_seats: 5,
        },
        meterDefinitions,
      ),
    ).toContain("3 active projects");
    expect(
      formatTierCapsLineFromMeters(
        {
          projects: 3,
          entries_monthly: 300,
          storage_bytes: 10 * 1024 * 1024 * 1024,
          pm_seats: 1,
          worker_seats: 5,
        },
        meterDefinitions,
      ),
    ).toContain("10 GB");
  });

  it("prefers matching livemode rows when selecting catalog", () => {
    const rows = [
      {
        livemode: true,
        plan_tiers: { slug: "growth" },
        id: "live",
      },
      {
        livemode: false,
        plan_tiers: { slug: "growth" },
        id: "test",
      },
    ];
    expect(selectSellableCatalogRows(rows, false)[0].id).toBe("test");
    expect(selectSellableCatalogRows(rows, true)[0].id).toBe("live");
  });

  it("uses catalog display + price when present", () => {
    const catalog: SellablePlanCatalog = {
      currency: "hkd",
      livemode: false,
      baseTiers: [
        {
          slug: "growth",
          kind: "base",
          displayName: "Starter",
          amountCents: 16000,
          currency: "hkd",
          planPriceId: "pp-1",
          livemode: false,
          sortOrder: 1,
          meters: {
            projects: 3,
            entries_monthly: 300,
            storage_bytes: 10 * 1024 * 1024 * 1024,
            pm_seats: 1,
            worker_seats: 5,
          },
        },
      ],
      addonTiers: [],
      metersBySlug: meterDefinitions,
    };
    const resolved = resolveTierDisplay("growth", catalog);
    expect(resolved.displayName).toBe("Starter");
    expect(resolved.priceLabel).toBe("HK$160/mo");
    expect(resolved.capsLine).toContain("3");
  });

  it("lists all base tiers dynamically", () => {
    const catalog: SellablePlanCatalog = {
      currency: "hkd",
      livemode: false,
      baseTiers: [
        {
          slug: "growth",
          kind: "base",
          displayName: "Starter",
          amountCents: 16000,
          currency: "hkd",
          planPriceId: "pp-1",
          livemode: false,
          sortOrder: 1,
          meters: {},
        },
        {
          slug: "unlimited",
          kind: "base",
          displayName: "Pro",
          amountCents: 40000,
          currency: "hkd",
          planPriceId: "pp-2",
          livemode: false,
          sortOrder: 2,
          meters: {},
        },
        {
          slug: "enterprise",
          kind: "base",
          displayName: "Enterprise",
          amountCents: 120000,
          currency: "hkd",
          planPriceId: "pp-3",
          livemode: false,
          sortOrder: 3,
          meters: {},
        },
      ],
      addonTiers: [],
      metersBySlug: {},
    };
    expect(listBaseTiers(catalog)).toHaveLength(3);
    expect(buildOfferedPlanNamesLabel(catalog)).toBe(
      "Starter, Pro, or Enterprise",
    );
  });

  it("derives livemode from publishable key when set", () => {
    const original = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_abc";
    expect(resolvePreferredLivemode()).toBe(false);
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_abc";
    expect(resolvePreferredLivemode()).toBe(true);
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    } else {
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = original;
    }
  });
});
