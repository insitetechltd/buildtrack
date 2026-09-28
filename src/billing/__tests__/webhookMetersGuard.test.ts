import {
  assertMergedMetersNonEmpty,
  assertNoDbError,
  assertPaidPlanMetersComplete,
  decideWebhookClaimAction,
  metersAfterSubscriptionCanceled,
  metersFromEntitlementsRpcResult,
  nextLastWebhookEventCreatedAtIso,
  normalizeWebhookEventCreatedUnix,
  shouldSkipStaleWebhookEvent,
  shouldTreatAsCanceled,
  WEBHOOK_CLAIM_LEASE_MS,
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

  it("skips stale events older than last applied; ignores zero created", () => {
    expect(shouldSkipStaleWebhookEvent(100, 200)).toBe(true);
    expect(shouldSkipStaleWebhookEvent(200, 200)).toBe(false);
    expect(shouldSkipStaleWebhookEvent(201, 200)).toBe(false);
    expect(shouldSkipStaleWebhookEvent(100, null)).toBe(false);
    expect(shouldSkipStaleWebhookEvent(0, 200)).toBe(false);
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

  describe("claim/retry semantics", () => {
    const now = Date.parse("2026-09-28T00:00:00.000Z");

    it("proceeds when no claim exists (first delivery)", () => {
      expect(decideWebhookClaimAction(null, now)).toBe("proceed");
    });

    it("duplicate when claim is done (success dedupe)", () => {
      expect(
        decideWebhookClaimAction(
          { status: "done", claimed_at: "2026-09-27T00:00:00.000Z" },
          now,
        ),
      ).toBe("duplicate");
    });

    it("proceeds when prior claim failed (re-claimable)", () => {
      expect(
        decideWebhookClaimAction(
          { status: "failed", claimed_at: "2026-09-27T23:59:00.000Z" },
          now,
        ),
      ).toBe("proceed");
    });

    it("in_flight when processing inside lease (non-2xx for Stripe)", () => {
      expect(
        decideWebhookClaimAction(
          {
            status: "processing",
            claimed_at: new Date(now - 60_000).toISOString(),
          },
          now,
        ),
      ).toBe("in_flight");
    });

    it("proceeds when processing lease expired (stale reclaim)", () => {
      expect(
        decideWebhookClaimAction(
          {
            status: "processing",
            claimed_at: new Date(now - WEBHOOK_CLAIM_LEASE_MS - 1).toISOString(),
          },
          now,
        ),
      ).toBe("proceed");
    });
  });

  describe("last_webhook_event_created_at monotonicity", () => {
    it("rejects missing/zero created", () => {
      expect(normalizeWebhookEventCreatedUnix(undefined)).toBeNull();
      expect(normalizeWebhookEventCreatedUnix(0)).toBeNull();
      expect(normalizeWebhookEventCreatedUnix(-1)).toBeNull();
      expect(normalizeWebhookEventCreatedUnix(1_700_000_000)).toBe(1_700_000_000);
    });

    it("never writes epoch and never moves timestamp backwards", () => {
      expect(nextLastWebhookEventCreatedAtIso(null, "2026-09-01T00:00:00.000Z")).toBeNull();
      const prior = "2026-09-28T00:00:00.000Z";
      const priorUnix = Math.floor(Date.parse(prior) / 1000);
      expect(nextLastWebhookEventCreatedAtIso(priorUnix - 10, prior)).toBeNull();
      expect(nextLastWebhookEventCreatedAtIso(priorUnix + 10, prior)).toBe(
        new Date((priorUnix + 10) * 1000).toISOString(),
      );
      expect(nextLastWebhookEventCreatedAtIso(priorUnix + 10, null)).toBe(
        new Date((priorUnix + 10) * 1000).toISOString(),
      );
    });
  });
});
