import {
  buildCompanyEntitlementView,
  buildCompanyPlanDialogMessage,
  formatEntitlementLimitsLabel,
  formatEntitlementStatusLabel,
  resolveCheckoutTierAvailability,
  type CompanyEntitlementRow,
  type CompanySubscriptionRow,
} from "../companyEntitlementSummary";
import { buildOrgPlanSummary } from "../orgPlans";

describe("companyEntitlementSummary", () => {
  const pilotEntitlements: CompanyEntitlementRow = {
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

  it("labels pilot companies without a Stripe subscription", () => {
    const view = buildCompanyEntitlementView(pilotEntitlements, null);
    expect(view?.tierDisplayName).toBe("Pilot");
    expect(view?.hasStripeSubscription).toBe(false);
    expect(formatEntitlementStatusLabel(view!)).toContain("Pilot");
  });

  it("shows the locked Growth plan after checkout", () => {
    const subscription: CompanySubscriptionRow = {
      stripe_subscription_id: "sub_123",
      status: "trialing",
      trial_ends_at: "2026-09-23T00:00:00.000Z",
      locked_plan_price_id: "price-row",
      plan_prices: {
        plan_tiers: {
          slug: "growth",
          display_name: "Growth",
          kind: "base",
        },
      },
    };
    const view = buildCompanyEntitlementView(pilotEntitlements, subscription);
    expect(formatEntitlementStatusLabel(view!)).toContain("Growth");
    expect(resolveCheckoutTierAvailability(view, "growth")).toBe("current");
    expect(resolveCheckoutTierAvailability(view, "unlimited")).toBe("upgrade");
  });

  it("blocks downgrade and repeat checkout for Unlimited", () => {
    const subscription: CompanySubscriptionRow = {
      stripe_subscription_id: "sub_456",
      status: "active",
      trial_ends_at: null,
      locked_plan_price_id: "price-row",
      plan_prices: {
        plan_tiers: {
          slug: "unlimited",
          display_name: "Unlimited",
          kind: "base",
        },
      },
    };
    const view = buildCompanyEntitlementView(pilotEntitlements, subscription);
    expect(resolveCheckoutTierAvailability(view, "unlimited")).toBe("current");
    expect(resolveCheckoutTierAvailability(view, "growth")).toBe(
      "downgrade_blocked",
    );
  });

  it("includes current plan details in the dialog message", () => {
    const subscription: CompanySubscriptionRow = {
      stripe_subscription_id: "sub_123",
      status: "trialing",
      trial_ends_at: null,
      locked_plan_price_id: "price-row",
      plan_prices: {
        plan_tiers: {
          slug: "growth",
          display_name: "Growth",
          kind: "base",
        },
      },
    };
    const view = buildCompanyEntitlementView(pilotEntitlements, subscription);
    const message = buildCompanyPlanDialogMessage(view, buildOrgPlanSummary());
    expect(message).toContain("Current: Growth");
    expect(formatEntitlementLimitsLabel(view!)).toContain("1 PM");
  });
});
