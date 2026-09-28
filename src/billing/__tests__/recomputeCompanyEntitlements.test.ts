import {
  PROD_EMPTY_METERS_ALLOWLIST,
  assertAllowlistSubset,
  assertCompanyAllowlisted,
  buildRecomputePlan,
  formatRecomputeDryRun,
  type RecomputeCompanyInput,
} from "../recomputeCompanyEntitlements";

const growthMeters = {
  pm_seats: 1,
  worker_seats: 5,
  projects: 3,
  entries_monthly: 300,
  storage_bytes: 10 * 1024 * 1024 * 1024,
};

const companyA = PROD_EMPTY_METERS_ALLOWLIST[0];

function baseInput(
  overrides: Partial<RecomputeCompanyInput> = {},
): RecomputeCompanyInput {
  return {
    companyId: companyA,
    stripeSubscriptionId: "sub_1UEPT6DH5K85GHQioBd5Q8FP",
    lockedPlanPriceId: "pp_growth",
    tierSlug: "growth",
    subscriptionStatus: "active",
    billingPhase: "active",
    current: {
      pm_seat_limit: 1,
      worker_seat_limit: 5,
      project_limit: null,
      entries_limit: null,
      entries_limit_kind: "unlimited",
      storage_limit_bytes: null,
      subscription_status: "active",
      entitlements_snapshot: { meters: {} },
      last_webhook_event_created_at: "2026-09-12T00:00:00.000Z",
    },
    recomputedMeters: { ...growthMeters },
    recomputedLockedPlanPriceId: "pp_growth",
    stripeStatus: "active",
    eventCreatedUnix: 1_800_000_000,
    ...overrides,
  };
}

describe("recomputeCompanyEntitlements", () => {
  it("enforces allowlist", () => {
    expect(() =>
      assertCompanyAllowlisted("00000000-0000-0000-0000-000000000000", [
        companyA,
      ]),
    ).toThrow(/not on the recompute allowlist/);
    expect(() =>
      assertAllowlistSubset(
        ["00000000-0000-0000-0000-000000000000"],
        PROD_EMPTY_METERS_ALLOWLIST,
      ),
    ).toThrow(/not on the recompute allowlist/);
  });

  it("buildRecomputePlan refuses non-allowlisted company", () => {
    expect(() =>
      buildRecomputePlan(
        baseInput({ companyId: "00000000-0000-0000-0000-000000000000" }),
      ),
    ).toThrow(/not on the recompute allowlist/);
  });

  it("dry-run output shows current empty meters vs recomputed growth caps", () => {
    const plan = buildRecomputePlan(baseInput());
    expect(plan.noop).toBe(false);
    expect(plan.recomputed.pm).toBe(1);
    expect(plan.recomputed.workers).toBe(5);
    expect(plan.recomputed.projects).toBe(3);
    expect(plan.recomputed.entries).toBe(300);
    expect(plan.recomputed.storageBytes).toBe(10 * 1024 * 1024 * 1024);
    expect(plan.current.snapshotMeters).toEqual({});

    const lines = formatRecomputeDryRun(plan).join("\n");
    expect(lines).toContain(`company=${companyA}`);
    expect(lines).toContain('current.snapshot.meters={}');
    expect(lines).toContain("WOULD upsert company_entitlements");
    expect(lines).not.toMatch(/@/);
    expect(lines).not.toMatch(/sara|insitetest|email/i);
  });

  it("is idempotent when stored already matches recomputed", () => {
    const plan = buildRecomputePlan(
      baseInput({
        current: {
          pm_seat_limit: 1,
          worker_seat_limit: 5,
          project_limit: 3,
          entries_limit: 300,
          entries_limit_kind: "monthly",
          storage_limit_bytes: 10 * 1024 * 1024 * 1024,
          subscription_status: "active",
          entitlements_snapshot: { meters: { ...growthMeters } },
          last_webhook_event_created_at: "2026-09-12T00:00:00.000Z",
        },
      }),
    );
    expect(plan.noop).toBe(true);
    expect(plan.wouldWrite.company_subscriptions_patch).toBeNull();
    const lines = formatRecomputeDryRun(plan).join("\n");
    expect(lines).toContain("already matches");
  });

  it("never moves last_webhook_event_created_at backwards", () => {
    const plan = buildRecomputePlan(
      baseInput({
        eventCreatedUnix: 1_000, // older than stored 2026-09-12
      }),
    );
    const patch = plan.wouldWrite.company_subscriptions_patch;
    expect(patch).not.toBeNull();
    // Older synthetic event → omit column (leave prior timestamp untouched)
    expect(patch!.last_webhook_event_created_at).toBeUndefined();
  });

  it("allowlist includes the three PROD audit company ids", () => {
    expect(PROD_EMPTY_METERS_ALLOWLIST).toEqual([
      "4cf35a70-f82f-4650-b745-d7f87ad0bc41",
      "27c0612d-fb8e-4444-bcf4-545228a763a8",
      "00877ca4-db52-4b2b-b0af-848f6f535015",
    ]);
  });
});
