import {
  assertMergedMetersNonEmpty,
  metersFromEntitlementsRpcResult,
} from "../webhookMetersGuard";

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

  it("returns {} when data has no meters key (caller must still refuse empty merge)", () => {
    expect(
      metersFromEntitlementsRpcResult({ data: { ok: true }, error: null }, "p"),
    ).toEqual({});
  });

  it("throws when merged meters are empty after a base plan resolved", () => {
    expect(() =>
      assertMergedMetersNonEmpty({}, "sub_123", "base-price-id"),
    ).toThrow(/subscription sub_123 merged meters empty \(base=base-price-id\)/);
  });

  it("allows non-empty merged meters", () => {
    expect(() =>
      assertMergedMetersNonEmpty({ worker_seats: 6 }, "sub_123", "base"),
    ).not.toThrow();
  });
});
