import {
  buildCompanyPlanOptions,
  buildCompanyPlanTrialEndsLabel,
} from "../companyPlanOptions";
import {
  buildCompanyEntitlementView,
  resolveCheckoutTierAvailability,
  type CompanyEntitlementRow,
  type CompanySubscriptionRow,
} from "../companyEntitlementSummary";

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
      },
    },
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
        },
      },
    };
    const view = buildCompanyEntitlementView(trialEntitlements, unlimitedSubscription);
    const options = buildCompanyPlanOptions(view);

    expect(resolveCheckoutTierAvailability(view, "unlimited")).toBe("current");
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
    const unlimited = buildCompanyPlanOptions(view).find(
      (option) => option.id === "unlimited",
    );

    expect(unlimited?.actionLabel).toBe("Upgrade to Pro");
    expect(unlimited?.disabled).toBe(false);
  });
});
