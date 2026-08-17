import {
  buildOrgPlanSummary,
  getOrgCheckoutMailtoUrl,
  getStripeCheckoutUrl,
  resolveOrgCheckoutUrl,
} from "../orgPlans";

describe("orgPlans R7 hook", () => {
  const original = process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;
    } else {
      process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL = original;
    }
  });

  it("summarizes locked R6 company SKUs", () => {
    const summary = buildOrgPlanSummary();
    expect(summary).toContain("US$19.99/mo");
    expect(summary).toContain("US$199.99/mo");
    expect(summary).toContain("US$4.99/mo");
    expect(summary).toContain("US$9.99/mo");
    expect(summary).toContain("Card on file");
  });

  it("uses the Stripe env URL when set", () => {
    process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL = "https://buy.stripe.com/test_growth";
    expect(getStripeCheckoutUrl()).toBe("https://buy.stripe.com/test_growth");
    expect(resolveOrgCheckoutUrl()).toBe("https://buy.stripe.com/test_growth");
  });

  it("falls back to a SKU-specific mailto when checkout URL is unset", () => {
    delete process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL;
    expect(getStripeCheckoutUrl()).toBeUndefined();
    expect(getOrgCheckoutMailtoUrl()).toContain("mailto:");
    expect(getOrgCheckoutMailtoUrl()).toContain("subscription");
    expect(resolveOrgCheckoutUrl()).toBe(getOrgCheckoutMailtoUrl());
  });
});
