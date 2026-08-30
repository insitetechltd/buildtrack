import {
  parseOwnerEconomicsSnapshot,
} from "../fetchOwnerEconomicsSnapshot";

describe("parseOwnerEconomicsSnapshot", () => {
  it("parses totals and count maps without inventing currency fields", () => {
    const snap = parseOwnerEconomicsSnapshot({
      generatedAt: "2026-08-30T00:00:00.000Z",
      currencyNote: "Counts only",
      stripeDashboardHint: "https://dashboard.stripe.com/test/subscriptions",
      totals: {
        companies: 10,
        companiesWithSubscriptionRow: 4,
        companiesWithoutSubscriptionRow: 6,
        companiesWithStripeSubscriptionId: 3,
        trialsNotEnded: 1,
      },
      subscriptionStatusCounts: { active: 2, trialing: 1 },
      entitlementStatusCounts: { active: 2 },
      billingPhaseCounts: { paid: 2, pilot: 6 },
      tierCounts: { starter: 2, growth: 1 },
    });
    expect(snap.totals.companies).toBe(10);
    expect(snap.subscriptionStatusCounts.active).toBe(2);
    expect(snap.tierCounts.growth).toBe(1);
    expect((snap as { mrr?: unknown }).mrr).toBeUndefined();
  });

  it("rejects invalid payload", () => {
    expect(() => parseOwnerEconomicsSnapshot({})).toThrow(/invalid/i);
  });
});
