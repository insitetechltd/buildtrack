import { supabase } from "../supabase";
import { createCompanyCheckoutSession } from "../createCheckoutSession";

jest.mock("../supabase", () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe("createCompanyCheckoutSession", () => {
  const invoke = supabase!.functions.invoke as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns checkout url on success with pinned planPriceId", async () => {
    invoke.mockResolvedValue({
      data: {
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
        sessionId: "cs_test_123",
        planPriceId: "price-uuid",
      },
      error: null,
    });

    const result = await createCompanyCheckoutSession({
      companyId: "company-1",
      planTierSlug: "growth",
      planPriceId: "price-uuid",
    });

    expect(invoke).toHaveBeenCalledWith("create-checkout-session", {
      body: {
        companyId: "company-1",
        planTierSlug: "growth",
        planPriceId: "price-uuid",
      },
    });
    expect(result).toEqual({
      success: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
      sessionId: "cs_test_123",
      planPriceId: "price-uuid",
    });
  });

  it("maps edge function error codes", async () => {
    invoke.mockResolvedValue({
      data: { error: "not_company_admin" },
      error: null,
    });

    const result = await createCompanyCheckoutSession({
      companyId: "company-1",
      planTierSlug: "unlimited",
      planPriceId: "price-uuid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Only a company admin can start checkout");
  });
});
