import type { CompanyEntitlementView } from "../companyEntitlementSummary";
import type { SellablePlanCatalog } from "../planCatalog";
import {
  __resetPendingAddonHoldForTests,
  addonExtraQtyFromTotals,
  clearPendingAddonHold,
  computeServerAddonBaseline,
  getPendingAddonHold,
  overlayPendingAddonSeatsOnView,
  resolveDraftSeatQty,
  setPendingAddonHold,
  shouldResetAddonDraftsOnTierChange,
} from "../serverAddonBaseline";

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
      planPriceId: "base-growth",
      livemode: false,
      sortOrder: 1,
      meters: {
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
      planPriceId: "base-pro",
      livemode: false,
      sortOrder: 2,
      meters: {
        pm_seats: 3,
        worker_seats: 15,
      },
    },
  ],
  addonTiers: [
    {
      slug: "addon_worker_pack",
      kind: "addon",
      displayName: "Worker pack (+5)", // stale catalog label/meters
      amountCents: 2000,
      currency: "hkd",
      planPriceId: "addon-worker",
      livemode: false,
      sortOrder: 3,
      // Stale pack size — product law is still 1 seat / unit.
      meters: { worker_seats: 5 },
    },
    {
      slug: "addon_pm_seat",
      kind: "addon",
      displayName: "PM seat",
      amountCents: 10000,
      currency: "hkd",
      planPriceId: "addon-pm",
      livemode: false,
      sortOrder: 4,
      meters: { pm_seats: 1 },
    },
  ],
  metersBySlug: {},
};

function entitlement(overrides: Partial<CompanyEntitlementView> = {}): CompanyEntitlementView {
  return {
    tierSlug: "growth",
    tierDisplayName: "Starter",
    subscriptionStatus: "active",
    billingPhase: "active",
    hasStripeSubscription: true,
    meterLimits: { worker_seats: 5, pm_seats: 1 },
    trialEndsAt: null,
    ...overrides,
  };
}

describe("serverAddonBaseline", () => {
  afterEach(() => {
    __resetPendingAddonHoldForTests();
  });

  it("forces 1 seat per add-on unit even when catalog still says pack of 5", () => {
    const baseline = computeServerAddonBaseline(
      catalog,
      entitlement({
        meterLimits: { worker_seats: 6, pm_seats: 1 },
      }),
    );
    expect(baseline).not.toBeNull();
    // +1 worker over base 5 → qty 1 (not floor(1/5)=0)
    expect(baseline?.workerSeatQty).toBe(1);
    expect(baseline?.workerSeatsPerUnit).toBe(1);
    expect(addonExtraQtyFromTotals(6, 5)).toBe(1);
  });

  it("holds pending draft at 1 while server still reports 0 (0→1→0 regression)", () => {
    // Simulate post-success lag: draft was 1, server still 0, pending holds 1.
    expect(
      resolveDraftSeatQty({
        prev: 1,
        serverQty: 0,
        pendingQty: 1,
      }),
    ).toBe(1);

    // Old broken sync: when busy clears, effect re-runs with server 0.
    // With pending, must not snap to 0.
    expect(
      resolveDraftSeatQty({
        prev: 1,
        serverQty: 0,
        pendingQty: 1,
      }),
    ).not.toBe(0);

    // After entitlement catches up, follow server.
    expect(
      resolveDraftSeatQty({
        prev: 1,
        serverQty: 1,
        pendingQty: 1,
      }),
    ).toBe(1);

    // Without pending, seed from server.
    expect(
      resolveDraftSeatQty({
        prev: null,
        serverQty: 0,
        pendingQty: null,
      }),
    ).toBe(0);
  });

  it("does not treat undefined→tier as a plan change that resets drafts", () => {
    expect(shouldResetAddonDraftsOnTierChange(null, "growth")).toBe(false);
    expect(shouldResetAddonDraftsOnTierChange("growth", "growth")).toBe(false);
    expect(shouldResetAddonDraftsOnTierChange("growth", "unlimited")).toBe(
      true,
    );
  });

  it("keeps module pending hold across remount until cleared", () => {
    setPendingAddonHold({
      companyId: "co-1",
      workerSeatQty: 2,
      pmSeatQty: 0,
      expectedWorkerTotal: 7,
      expectedPmTotal: 1,
    });
    expect(getPendingAddonHold("co-1")?.workerSeatQty).toBe(2);
    expect(getPendingAddonHold("other")).toBeNull();
    clearPendingAddonHold("co-1");
    expect(getPendingAddonHold("co-1")).toBeNull();
  });

  it("overlays pending seat totals onto allocated resources view", () => {
    const hold = {
      companyId: "co-1",
      workerSeatQty: 1,
      pmSeatQty: 0,
      expectedWorkerTotal: 6,
      expectedPmTotal: 1,
    };
    const view = {
      tierSlug: "growth" as const,
      tierDisplayName: "Starter",
      subscriptionStatus: "active",
      billingPhase: "active",
      hasStripeSubscription: true,
      meterLimits: { worker_seats: 5, pm_seats: 1, projects: 1 },
      trialEndsAt: null,
    };
    expect(overlayPendingAddonSeatsOnView(view, hold)?.meterLimits).toEqual({
      worker_seats: 6,
      pm_seats: 1,
      projects: 1,
    });
    expect(overlayPendingAddonSeatsOnView(view, null)).toBe(view);
  });
});
