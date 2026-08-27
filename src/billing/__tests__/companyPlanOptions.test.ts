import {
  buildCompanyPlanLimitRows,
  buildCompanyPlanOptions,
  buildCompanyPlanTrialEndsLabel,
  buildPlansSectionSubtitle,
} from "../companyPlanOptions";
import {
  buildCompanyEntitlementView,
  resolveCheckoutTierAvailability,
  type CompanyEntitlementRow,
  type CompanySubscriptionRow,
} from "../companyEntitlementSummary";
import type { MeterDefinition, SellablePlanCatalog } from "../planCatalog";

const meterDefinitions: Record<string, MeterDefinition> = {
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
};

describe("companyPlanOptions", () => {
  const trialEntitlements: CompanyEntitlementRow = {
    pm_seat_limit: 1,
    worker_seat_limit: 5,
    project_limit: 1,
    entries_limit: 100,
    entries_limit_kind: "trial_total",
    storage_limit_bytes: 5368709120,
    subscription_status: "trialing",
    billing_phase: "trial",
    source_plan_price_id: null,
  };

  const growthSubscription: CompanySubscriptionRow = {
    stripe_subscription_id: "sub_growth",
    status: "trialing",
    trial_ends_at: "2026-09-23T00:00:00.000Z",
    locked_plan_price_id: "price-growth",
    plan_prices: {
      plan_tiers: {
        slug: "growth",
        display_name: "Starter",
        kind: "base",
        sort_order: 1,
      },
    },
  };

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
        planPriceId: "pp-g",
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
        planPriceId: "pp-u",
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
    addonTiers: [],
    metersBySlug: meterDefinitions,
  };

  it("marks Pro as current after upgrade", () => {
    const unlimitedSubscription: CompanySubscriptionRow = {
      ...growthSubscription,
      stripe_subscription_id: "sub_unlimited",
      plan_prices: {
        plan_tiers: {
          slug: "unlimited",
          display_name: "Pro",
          kind: "base",
          sort_order: 2,
        },
      },
    };
    const view = buildCompanyEntitlementView(trialEntitlements, unlimitedSubscription);
    const options = buildCompanyPlanOptions(view, catalog);

    expect(resolveCheckoutTierAvailability(view, "unlimited", catalog)).toBe("current");
    expect(options.find((option) => option.id === "unlimited")?.state).toBe("current");
    expect(options.find((option) => option.id === "growth")?.state).toBe(
      "downgrade_blocked",
    );
  });

  it("formats trial end date for trialing subscriptions", () => {
    const view = buildCompanyEntitlementView(trialEntitlements, growthSubscription);
    expect(buildCompanyPlanTrialEndsLabel(view!)).toMatch(/2026/);
  });

  it("offers upgrade CTA from Starter to Pro", () => {
    const view = buildCompanyEntitlementView(trialEntitlements, growthSubscription);
    const unlimited = buildCompanyPlanOptions(view, catalog).find(
      (option) => option.id === "unlimited",
    );

    expect(unlimited?.priceLabel).toBe("HK$400/mo");
    expect(unlimited?.planPriceId).toBe("pp-u");
    expect(unlimited?.actionLabel).toBe("Upgrade to Pro");
    expect(unlimited?.disabled).toBe(false);
  });

  it("renders allocated resource totals as quantity-only values", () => {
    const view = buildCompanyEntitlementView(
      {
        ...trialEntitlements,
        entitlements_snapshot: {
          meters: {
            pm_seats: 3,
            worker_seats: 15,
            projects: 1,
            storage_bytes: 5368709120,
            entries_trial_total: 100,
          },
        },
      },
      growthSubscription,
    );
    const rows = buildCompanyPlanLimitRows(view!, catalog);
    expect(rows.find((row) => row.id === "pm_seats")).toEqual({
      id: "pm_seats",
      label: "PM seats",
      value: "3",
    });
    expect(rows.find((row) => row.id === "worker_seats")).toEqual({
      id: "worker_seats",
      label: "Worker seats",
      value: "15",
    });
    expect(rows.find((row) => row.id === "storage_bytes")?.value).toBe("5 GB");
  });

  it("renders limit rows and subtitle when catalog has not loaded yet", () => {
    const view = buildCompanyEntitlementView(trialEntitlements, growthSubscription);
    expect(view).not.toBeNull();
    expect(() => buildCompanyPlanLimitRows(view!, null)).not.toThrow();
    expect(buildCompanyPlanLimitRows(view!, null).length).toBeGreaterThan(0);
    expect(() => buildPlansSectionSubtitle(null)).not.toThrow();
    expect(buildCompanyPlanOptions(view, null)).toEqual([]);
  });

  it("renders one card per sellable base tier in catalog", () => {
    const view = buildCompanyEntitlementView(trialEntitlements, null);
    const threeTierCatalog: SellablePlanCatalog = {
      ...catalog,
      baseTiers: [
        ...catalog.baseTiers,
        {
          slug: "enterprise",
          kind: "base",
          displayName: "Enterprise",
          amountCents: 120000,
          currency: "hkd",
          planPriceId: "pp-e",
          livemode: false,
          sortOrder: 3,
          meters: { ai_tokens_monthly: 1000000 },
        },
      ],
    };
    expect(buildCompanyPlanOptions(view, threeTierCatalog)).toHaveLength(3);
  });
});
