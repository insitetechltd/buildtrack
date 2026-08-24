import {
  appendCheckoutPlanToSuccessUrl,
  rememberCheckoutPlan,
  resolveCheckoutReturnPlan,
} from "../checkoutReturnPlan";

describe("checkoutReturnPlan", () => {
  afterEach(() => {
    rememberCheckoutPlan(null);
  });

  it("appends plan to the checkout success URL", () => {
    expect(
      appendCheckoutPlanToSuccessUrl("taskr://profile?checkout=success", "growth"),
    ).toBe("taskr://profile?checkout=success&plan=growth");
  });

  it("resolves the remembered plan after Stripe return", async () => {
    rememberCheckoutPlan("growth");
    await expect(resolveCheckoutReturnPlan(undefined)).resolves.toBe("growth");
  });

  it("prefers the deep-link plan over a remembered plan", async () => {
    rememberCheckoutPlan("unlimited");
    await expect(resolveCheckoutReturnPlan("growth")).resolves.toBe("growth");
  });
});
