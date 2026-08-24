import {
  appendCheckoutPlanToSuccessUrl,
  rememberCheckoutPlan,
  resolveCheckoutReturnPlan,
} from "../checkoutReturnPlan";

describe("checkoutReturnPlan", () => {
  afterEach(() => {
    rememberCheckoutPlan(null);
  });

  it("appends plan and planPriceId to the checkout success URL", () => {
    expect(
      appendCheckoutPlanToSuccessUrl(
        "taskr://profile?checkout=success",
        "growth",
        "pp-123",
      ),
    ).toBe("taskr://profile?checkout=success&plan=growth&planPriceId=pp-123");
  });

  it("resolves the remembered plan after Stripe return", async () => {
    rememberCheckoutPlan("growth", "pp-123");
    await expect(resolveCheckoutReturnPlan(undefined)).resolves.toBe("growth");
  });

  it("prefers the deep-link plan over a remembered plan", async () => {
    rememberCheckoutPlan("unlimited", "pp-u");
    await expect(resolveCheckoutReturnPlan("growth")).resolves.toBe("growth");
  });
});
