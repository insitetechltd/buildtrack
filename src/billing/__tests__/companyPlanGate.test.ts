import { companyHasPaidStripePlan } from "../companyPlanGate";
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

  it("requires a Stripe subscription to unlock the app", () => {
    expect(companyHasPaidStripePlan(pilotView)).toBe(false);
    expect(
      companyHasPaidStripePlan({
        ...pilotView,
        tierSlug: "growth",
        hasStripeSubscription: true,
      }),
    ).toBe(true);
  });
});
