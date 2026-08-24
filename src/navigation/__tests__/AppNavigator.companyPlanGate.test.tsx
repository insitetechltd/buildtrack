import React from "react";
import { render } from "@testing-library/react-native";

const mockAuthState = {
  isAuthenticated: true,
  isInitialized: true,
  isLoading: false,
  user: { id: "user-1", role: "admin", companyId: "co-1" },
  mustSetPassword: false,
  requiresCompanyPlanSelection: true,
  clearRequiresCompanyPlanSelection: jest.fn(),
};

jest.mock("../../state/authStore", () => ({
  useAuthStore: (selector?: (state: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
}));

jest.mock("../../api/fetchCompanyEntitlements", () => ({
  fetchCompanyEntitlementView: jest.fn().mockResolvedValue({
    tierSlug: "pilot",
    tierDisplayName: "Pilot",
    hasStripeSubscription: false,
    subscriptionStatus: "trialing",
    billingPhase: "trial",
    meterLimits: {
      pm_seats: 1,
      worker_seats: 5,
      projects: 1,
      entries_trial_total: 100,
      storage_bytes: 5368709120,
    },
    trialEndsAt: null,
  }),
}));

jest.mock("../../screens/CompanyPlanScreen", () => {
  const R = require("react");
  const RN = require("react-native");
  return {
    __esModule: true,
    default: (props: { forceSelection?: boolean }) =>
      R.createElement(
        RN.Text,
        { testID: "company-plan-screen" },
        props.forceSelection ? "forced" : "optional",
      ),
  };
});

jest.mock("../../screens/LoginScreen", () => "LoginScreen");
jest.mock("../../screens/SetPasswordScreen", () => "SetPasswordScreen");

import AppNavigator from "../AppNavigator";

describe("AppNavigator company plan gate", () => {
  it("blocks MainTabs until a paid plan is chosen", async () => {
    const { findByTestId, queryByTestId } = render(<AppNavigator />);
    const screen = await findByTestId("company-plan-screen");
    expect(screen.props.children).toBe("forced");
    expect(queryByTestId("network-sync")).toBeNull();
    expect(queryByTestId("realtime-sync")).toBeNull();
  });
});
