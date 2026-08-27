import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";

const mockFetchCompanyEntitlementView = jest.fn().mockResolvedValue(null);
const mockFetchSellablePlanCatalog = jest.fn().mockResolvedValue({
  currency: "hkd",
  baseTiers: [],
  addonTiers: [],
});

jest.mock("@/api/fetchCompanyEntitlements", () => ({
  fetchCompanyEntitlementView: (...args: unknown[]) =>
    mockFetchCompanyEntitlementView(...args),
}));

jest.mock("@/api/fetchSellablePlanCatalog", () => ({
  fetchSellablePlanCatalog: (...args: unknown[]) =>
    mockFetchSellablePlanCatalog(...args),
}));

jest.mock("@/api/createCheckoutSession", () => ({
  createCompanyCheckoutSession: jest.fn(),
}));

jest.mock("@/api/updateCompanyAddons", () => ({
  updateCompanyAddons: jest.fn(),
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      user: { id: "u1", companyId: "co-1", role: "admin" },
      clearRequiresCompanyPlanSelection: jest.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    profile: {
      companyPlan: "Company plan",
    },
    companyPlan: {
      title: "Company plan",
      choosePlan: "Choose a plan",
    },
  }),
}));

import CompanyPlanScreen from "@/screens/CompanyPlanScreen";

describe("CompanyPlanScreen outside NavigationContainer", () => {
  it("loads without useFocusEffect / navigation object crash (create-company gate)", async () => {
    const screen = render(<CompanyPlanScreen forceSelection />);

    await waitFor(() => {
      expect(mockFetchSellablePlanCatalog).toHaveBeenCalled();
    });

    expect(screen.toJSON()).toBeTruthy();
  });
});
