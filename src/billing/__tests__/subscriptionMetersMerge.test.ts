import {
  assertPaidPlanMetersComplete,
  metersFromEntitlementsRpcResult,
} from "../webhookMetersGuard";
import {
  computeMergedMetersForSubscription,
  mergeSubscriptionItemMeters,
  stripePriceIdsFromItems,
} from "../subscriptionMetersMerge";

const growthMeters = {
  pm_seats: 1,
  worker_seats: 5,
  projects: 3,
  entries_monthly: 300,
  storage_bytes: 10 * 1024 * 1024 * 1024,
};

const complimentaryMeters = {
  pm_seats: 3,
  worker_seats: 15,
  projects: 12,
  entries_monthly: 800,
  storage_bytes: 30 * 1024 * 1024 * 1024,
};

describe("subscriptionMetersMerge", () => {
  it("extracts stripe price ids from items", () => {
    expect(
      stripePriceIdsFromItems([
        { price: "price_a", quantity: 1 },
        { price: { id: "price_b" }, quantity: 2 },
      ]),
    ).toEqual(["price_a", "price_b"]);
  });

  it("merges base + addon quantity like webhook", async () => {
    const planPriceByStripe = {
      price_growth: { planPriceId: "pp_growth", kind: "base" },
      price_worker: { planPriceId: "pp_worker", kind: "addon" },
    };
    const fetch = jest.fn(async (id: string) => {
      if (id === "pp_growth") return { ...growthMeters };
      if (id === "pp_worker") return { worker_seats: 1 };
      return {};
    });
    const merged = await mergeSubscriptionItemMeters(
      [
        { price: { id: "price_growth" }, quantity: 1 },
        { price: { id: "price_worker" }, quantity: 3 },
      ],
      planPriceByStripe,
      fetch,
    );
    expect(merged.worker_seats).toBe(5 + 3);
    expect(merged.pm_seats).toBe(1);
    expect(merged.projects).toBe(3);
  });

  it("computeMergedMetersForSubscription asserts complete meters (incl. complimentary)", async () => {
    const { meters } = await computeMergedMetersForSubscription({
      subscriptionId: "sub_comp",
      items: [{ price: { id: "price_comp" }, quantity: 1 }],
      planPriceByStripe: {
        price_comp: { planPriceId: "pp_comp", kind: "base" },
      },
      fetchMetersForPlanPrice: async () => ({ ...complimentaryMeters }),
    });
    expect(meters).toEqual(complimentaryMeters);
    expect(() =>
      assertPaidPlanMetersComplete(meters, "sub_comp", "pp_comp"),
    ).not.toThrow();
  });

  it("refuses empty meters from mis-read RPC shape (pre-v13 root cause)", () => {
    // Bug: `const data = await admin.rpc(...); return data.meters ?? {}`
    // when rpc() already returns { data, error } → .meters is undefined → {}.
    const rpcResponse = { data: { meters: growthMeters }, error: null };
    const forgottenDestructure = (rpcResponse as { meters?: unknown }).meters ??
      {};
    expect(forgottenDestructure).toEqual({});
    expect(() =>
      assertPaidPlanMetersComplete(
        forgottenDestructure as Record<string, number | null>,
        "sub_x",
        "pp_x",
      ),
    ).toThrow(/merged meters empty/);
  });

  it("reads meters when RPC is destructured correctly", () => {
    expect(
      metersFromEntitlementsRpcResult(
        { data: { meters: growthMeters }, error: null },
        "pp_growth",
      ),
    ).toEqual(growthMeters);
  });
});
