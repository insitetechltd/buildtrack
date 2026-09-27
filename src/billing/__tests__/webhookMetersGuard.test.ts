import {
  assertMergedMetersNonEmpty,
  assertNoDbError,
  assertPaidPlanMetersComplete,
  metersAfterSubscriptionCanceled,
  metersFromEntitlementsRpcResult,
  shouldSkipStaleWebhookEvent,
  shouldTreatAsCanceled,
} from "../webhookMetersGuard";

const completeMeters = {
  pm_seats: 1,
  worker_seats: 5,
  projects: 3,
  entries_monthly: 300,
  storage_bytes: 10_000,
};

describe("webhookMetersGuard", () => {
  it("throws when RPC returns error (must not treat Postgrest response as meters)", () => {
    expect(() =>
      metersFromEntitlementsRpcResult(
        { data: null, error: { message: "function missing" } },
        "price-uuid",
      ),
    ).toThrow(/build_entitlements_snapshot_from_price failed for price-uuid/);
  });

  it("reads meters from data when RPC succeeds", () => {
    const meters = metersFromEntitlementsRpcResult(
      {
        data: { meters: { worker_seats: 5, pm_seats: 1 } },
        error: null,
      },
      "price-uuid",
    );
    expect(meters).toEqual({ worker_seats: 5, pm_seats: 1 });
  });

  it("throws when merged meters are empty after a base plan resolved", () => {
    expect(() =>
      assertMergedMetersNonEmpty({}, "sub_123", "base-price-id"),
    ).toThrow(/subscription sub_123 merged meters empty \(base=base-price-id\)/);
  });

  it("throws when paid plan meters are only partly present", () => {
    expect(() =>
      assertPaidPlanMetersComplete(
        { worker_seats: 5, projects: 3 },
        "sub_partial",
        "base",
      ),
    ).toThrow(/partial meters missing \[pm_seats,storage_bytes,entries_monthly\|entries_trial_total\]/);
  });

  it("allows a complete paid meter map (null unlimited OK)", () => {
    expect(() =>
      assertPaidPlanMetersComplete(
        {
          ...completeMeters,
          storage_bytes: null,
        },
        "sub_ok",
        "base",
      ),
    ).not.toThrow();
  });

  it("skips stale events older than last applied", () => {
    expect(shouldSkipStaleWebhookEvent(100, 200)).toBe(true);
    expect(shouldSkipStaleWebhookEvent(200, 200)).toBe(false);
    expect(shouldSkipStaleWebhookEvent(201, 200)).toBe(false);
    expect(shouldSkipStaleWebhookEvent(100, null)).toBe(false);
  });

  it("never treats canceled live Stripe as active; blocks resurrect from canceled DB", () => {
    expect(shouldTreatAsCanceled("canceled", "trialing")).toBe(true);
    expect(shouldTreatAsCanceled("trialing", "canceled")).toBe(false);
    expect(shouldTreatAsCanceled("active", "canceled")).toBe(false);
    expect(shouldTreatAsCanceled("past_due", "canceled")).toBe(true);
  });

  it("zeros seat meters on cancel while keeping other limits", () => {
    expect(metersAfterSubscriptionCanceled(completeMeters)).toEqual({
      ...completeMeters,
      pm_seats: 0,
      worker_seats: 0,
    });
  });

  it("propagates deleted-handler DB errors", () => {
    expect(() =>
      assertNoDbError({ message: "connection reset" }, "cancel_sub_update"),
    ).toThrow(/cancel_sub_update: connection reset/);
    expect(() => assertNoDbError(null, "ok")).not.toThrow();
  });
});
