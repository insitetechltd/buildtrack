import {
  getRootStackNavigation,
  getRootTabsNavigation,
  navigateToRootProfile,
  navigateToRootTabScreen,
  navigateToTaskDashboard,
} from "../rootNavigationHelpers";
import { rootNavigationRef } from "../rootNavigationRef";

jest.mock("../rootNavigationRef", () => ({
  rootNavigationRef: {
    isReady: jest.fn(() => false),
    navigate: jest.fn(),
  },
}));

describe("rootNavigationHelpers parent walk", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rootNavigationRef.isReady as jest.Mock).mockReturnValue(false);
  });

  it("finds MainTabs/Profile stack across nested Company Admin depth", () => {
    const rootStack = {
      getState: () => ({ routeNames: ["MainTabs", "Profile"] }),
      navigate: jest.fn(),
      getParent: () => undefined,
    };
    const profileStack = {
      getState: () => ({
        routeNames: ["ProfileMain", "CompanyManagement", "CompanyPlan"],
      }),
      getParent: () => rootStack,
    };
    const adminStack = {
      getState: () => ({
        routeNames: ["AdminDashboardMain", "UserManagement", "CompanyPlan"],
      }),
      getParent: () => profileStack,
    };
    const screenNav = {
      getParent: () => adminStack,
    };

    expect(getRootStackNavigation(screenNav)).toBe(rootStack);
  });

  it("falls back to root stack for Task Dashboard when tabs are not an ancestor", () => {
    const rootNavigate = jest.fn();
    const rootStack = {
      getState: () => ({ routeNames: ["MainTabs", "Profile"] }),
      navigate: rootNavigate,
      getParent: () => undefined,
    };
    const profileStack = {
      getState: () => ({ routeNames: ["ProfileMain", "CompanyManagement"] }),
      getParent: () => rootStack,
    };
    const adminStack = {
      getState: () => ({ routeNames: ["AdminDashboardMain"] }),
      getParent: () => profileStack,
    };
    const screenNav = { getParent: () => adminStack };

    expect(getRootTabsNavigation(screenNav)).toBeUndefined();
    navigateToTaskDashboard(screenNav);
    expect(rootNavigate).toHaveBeenCalledWith("MainTabs", { screen: "Activity" });
  });

  it("navigateToRootTabScreen uses tabs ancestor when present and ref is not ready", () => {
    const tabsNavigate = jest.fn();
    const tabs = {
      getState: () => ({ routeNames: ["Activity", "Camera", "Tasks"] }),
      navigate: tabsNavigate,
      getParent: () => undefined,
    };
    const dashStack = {
      getState: () => ({ routeNames: ["DashboardMain"] }),
      getParent: () => tabs,
    };
    const screenNav = { getParent: () => dashStack };

    navigateToRootTabScreen(screenNav, "Tasks");
    expect(tabsNavigate).toHaveBeenCalledWith("Tasks", undefined);
  });

  it("uses rootNavigationRef for ProfileMain so Company Admin does not swallow Profile", () => {
    (rootNavigationRef.isReady as jest.Mock).mockReturnValue(true);

    navigateToRootProfile({ getParent: () => undefined }, "ProfileMain");
    expect(rootNavigationRef.navigate).toHaveBeenCalledWith("Profile", {
      screen: "ProfileMain",
    });

    navigateToRootProfile({ getParent: () => undefined }, "DeveloperSettings");
    expect(rootNavigationRef.navigate).toHaveBeenCalledWith("Profile", {
      screen: "DeveloperSettings",
    });
  });

  it("navigates ProfileMain on the Profile stack when already nested under Company Admin", () => {
    const profileNavigate = jest.fn();
    const profileStack = {
      getState: () => ({
        routeNames: ["ProfileMain", "CompanyManagement", "DeveloperSettings"],
      }),
      navigate: profileNavigate,
      getParent: () => undefined,
    };
    const adminStack = {
      getState: () => ({ routeNames: ["AdminDashboardMain"] }),
      getParent: () => profileStack,
    };
    const screenNav = { getParent: () => adminStack };

    navigateToRootProfile(screenNav, "ProfileMain");
    expect(profileNavigate).toHaveBeenCalledWith("ProfileMain");
  });
});
