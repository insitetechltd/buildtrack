import {
  buildOrgPlanSummary,
  getOrgCheckoutMailtoUrl,
  getStripeCheckoutUrl,
  resolveOrgCheckoutUrl,
} from "../orgPlans";
import type { SellablePlanCatalog } from "../planCatalog";

describe("orgPlans R7 hook", () => {
  const original = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;

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
        planPriceId: "a",
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
      {
        slug: "unlimited",
        kind: "base",
        displayName: "Pro",
        amountCents: 40000,
        currency: "hkd",
        planPriceId: "b",
        livemode: false,
        sortOrder: 2,
        meters: {
          projects: 12,
          entries_monthly: 800,
          storage_bytes: 30 * 1024 * 1024 * 1024,
          pm_seats: 3,
          worker_seats: 15,
        },
      },
    ],
    addonTiers: [
      {
        slug: "addon_worker_pack",
        kind: "addon",
        displayName: "Worker seat",
        amountCents: 2000,
        currency: "hkd",
        planPriceId: "c",
        livemode: false,
        sortOrder: 3,
        meters: { worker_seats: 1 },
      },
      {
        slug: "addon_pm_seat",
        kind: "addon",
        displayName: "PM seat (+1)",
        amountCents: 10000,
        currency: "hkd",
        planPriceId: "d",
        livemode: false,
        sortOrder: 4,
        meters: { pm_seats: 1 },
      },
    ],
    metersBySlug: {},
  };

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;
    } else {
      process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL = original;
    }
  });

  it("summarizes company SKUs from catalog", () => {
    const summary = buildOrgPlanSummary(catalog);
    expect(summary).toContain("HK$160/mo");
    expect(summary).toContain("HK$400/mo");
    expect(summary).toContain("HK$20/mo");
    expect(summary).toContain("HK$100/mo");
    expect(summary).toContain("promotion code");
    expect(summary).toContain("Starter HK$160/mo");
    expect(summary).toContain("Pro HK$400/mo");
  });

  it("returns minimal summary when catalog is unloaded", () => {
    const summary = buildOrgPlanSummary(null);
    expect(summary).toContain("Company subscription");
    expect(summary).not.toContain("HK$160/mo");
  });

  it("uses the Stripe env URL when set", () => {
    process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL = "https://buy.stripe.com/test_growth";
    expect(getStripeCheckoutUrl()).toBe("https://buy.stripe.com/test_growth");
    expect(resolveOrgCheckoutUrl()).toBe("https://buy.stripe.com/test_growth");
  });

  it("falls back to a SKU-specific mailto when checkout URL is unset", () => {
    delete process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;
    expect(getStripeCheckoutUrl()).toBeUndefined();
    expect(getOrgCheckoutMailtoUrl(catalog)).toContain("mailto:");
    expect(getOrgCheckoutMailtoUrl(catalog)).toContain("subscription");
    expect(resolveOrgCheckoutUrl(catalog)).toBe(getOrgCheckoutMailtoUrl(catalog));
  });
});
