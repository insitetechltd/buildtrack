import {
  entriesLimitKindFromMeters,
  legacyColumnsFromMeters,
  metersFromLegacyEntitlementRow,
} from "../entitlementMeters";

describe("entitlementMeters", () => {
  it("prefers entitlements_snapshot meters over legacy columns", () => {
    const meters = metersFromLegacyEntitlementRow({
      pm_seat_limit: 1,
      worker_seat_limit: 5,
      project_limit: 3,
      entries_limit: 300,
      entries_limit_kind: "monthly",
      storage_limit_bytes: null,
      entitlements_snapshot: {
        meters: {
          pm_seats: 2,
          worker_seats: 10,
          ai_tokens_monthly: 50000,
        },
      },
    });

    expect(meters.pm_seats).toBe(2);
    expect(meters.worker_seats).toBe(10);
    expect(meters.ai_tokens_monthly).toBe(50000);
  });

  it("maps snapshot meters to legacy columns for SQL denormalization", () => {
    const columns = legacyColumnsFromMeters({
      pm_seats: 2,
      worker_seats: 8,
      projects: 5,
      entries_monthly: 400,
      storage_bytes: 1024,
    });

    expect(columns.pm_seat_limit).toBe(2);
    expect(columns.worker_seat_limit).toBe(8);
    expect(columns.project_limit).toBe(5);
    expect(columns.entries_limit).toBe(400);
    expect(columns.entries_limit_kind).toBe("monthly");
  });

  it("detects trial entry meters", () => {
    expect(
      entriesLimitKindFromMeters({ entries_trial_total: 100 }),
    ).toBe("trial_total");
  });
});
