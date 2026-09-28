import {
  companyHasPaidStripePlan,
  isFounderBillingBlockedStatus,
} from "../companyPlanGate";
import type { CompanyEntitlementView } from "../companyEntitlementSummary";

describe("companyPlanGate", () => {
  const pilotView: CompanyEntitlementView = {
    tierSlug: "pilot",
    tierDisplayName: "Pilot",
    subscriptionStatus: "trialing",
    billingPhase: "trial",
    hasStripeSubscription: false,
    meterLimits: {
      pm_seats: 1,
      worker_seats: 5,
      projects: 1,
      entries_trial_total: 100,
      storage_bytes: 5368709120,
    },
    trialEndsAt: null,
  };

  it("requires an active or trialing Stripe subscription to unlock the app", () => {
    expect(companyHasPaidStripePlan(pilotView)).toBe(false);
    expect(
      companyHasPaidStripePlan({
        ...pilotView,
        tierSlug: "growth",
        subscriptionStatus: "active",
        hasStripeSubscription: true,
      }),
    ).toBe(true);
    expect(
      companyHasPaidStripePlan({
        ...pilotView,
        subscriptionStatus: "trialing",
        hasStripeSubscription: true,
      }),
    ).toBe(true);
    expect(
      companyHasPaidStripePlan({
        ...pilotView,
        subscriptionStatus: "past_due",
        hasStripeSubscription: true,
      }),
    ).toBe(false);
    expect(
      companyHasPaidStripePlan({
        ...pilotView,
        subscriptionStatus: "canceled",
        hasStripeSubscription: true,
      }),
    ).toBe(false);
  });

  it("treats null/undefined entitlement as locked (founder fail-closed)", () => {
    expect(companyHasPaidStripePlan(null)).toBe(false);
    expect(companyHasPaidStripePlan(undefined)).toBe(false);
  });

  it("documents founder blocked statuses for past_due/canceled/empty", () => {
    expect(isFounderBillingBlockedStatus("active")).toBe(false);
    expect(isFounderBillingBlockedStatus("trialing")).toBe(false);
    expect(isFounderBillingBlockedStatus("past_due")).toBe(true);
    expect(isFounderBillingBlockedStatus("canceled")).toBe(true);
    expect(isFounderBillingBlockedStatus("")).toBe(true);
    expect(isFounderBillingBlockedStatus(null)).toBe(true);
  });
});
