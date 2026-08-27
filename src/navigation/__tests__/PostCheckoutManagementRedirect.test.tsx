import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import PostCheckoutManagementRedirect from "../PostCheckoutManagementRedirect";

const mockNavigateToCompanyManagementFromRoot = jest.fn(() => true);
const mockClearLand = jest.fn();

let mockLandOnCompanyManagementAfterCheckout = false;

jest.mock("@/navigation/rootNavigationHelpers", () => ({
  navigateToCompanyManagementFromRoot: (...args: unknown[]) =>
    mockNavigateToCompanyManagementFromRoot(...args),
}));

jest.mock("@/state/authStore", () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({
      landOnCompanyManagementAfterCheckout: mockLandOnCompanyManagementAfterCheckout,
      clearLandOnCompanyManagementAfterCheckout: mockClearLand,
    }),
}));

describe("PostCheckoutManagementRedirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLandOnCompanyManagementAfterCheckout = false;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("navigates to company management when the one-shot flag is set", () => {
    mockLandOnCompanyManagementAfterCheckout = true;

    act(() => {
      TestRenderer.create(<PostCheckoutManagementRedirect />);
    });

    expect(mockNavigateToCompanyManagementFromRoot).toHaveBeenCalledTimes(1);
    expect(mockClearLand).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the flag is false", () => {
    act(() => {
      TestRenderer.create(<PostCheckoutManagementRedirect />);
    });

    expect(mockNavigateToCompanyManagementFromRoot).not.toHaveBeenCalled();
    expect(mockClearLand).not.toHaveBeenCalled();
  });
});
