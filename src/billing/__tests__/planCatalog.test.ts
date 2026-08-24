import {
  formatCatalogMoneyMonthly,
  formatTierCapsLineFromMeters,
  resolveBaseTierDisplay,
  resolvePreferredLivemode,
  selectSellableCatalogRows,
  type SellablePlanCatalog,
} from "../planCatalog";

describe("planCatalog", () => {
  it("formats HKD monthly list prices from cents", () => {
    expect(formatCatalogMoneyMonthly(16000, "hkd")).toBe("HK$160/mo");
    expect(formatCatalogMoneyMonthly(40000, "hkd")).toBe("HK$400/mo");
  });

  it("builds caps lines from meters", () => {
    expect(
      formatTierCapsLineFromMeters({
        projects: 3,
        entries_monthly: 300,
        storage_bytes: 10 * 1024 * 1024 * 1024,
        pm_seats: 1,
        worker_seats: 5,
      }),
    ).toBe("3 projects · 300 entries/mo · 10 GB · 1 PM + 5 workers");
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
      baseBySlug: {
        growth: {
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
      },
      addonsBySlug: {},
    };
    const resolved = resolveBaseTierDisplay("growth", catalog);
    expect(resolved.displayName).toBe("Starter");
    expect(resolved.priceLabel).toBe("HK$160/mo");
    expect(resolved.capsLine).toContain("3 projects");
  });

  it("falls back when catalog is missing", () => {
    const resolved = resolveBaseTierDisplay("unlimited", null);
    expect(resolved.displayName).toBe("Pro");
    expect(resolved.priceLabel).toBe("HK$400/mo");
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
