import React from "react";
import { render } from "@testing-library/react-native";

const mockAuthState = {
  isAuthenticated: true,
  isInitialized: true,
  isLoading: false,
  user: { id: "user-1", role: "worker", mustSetPassword: true },
};

jest.mock("../../state/authStore", () => ({
  useAuthStore: (selector?: (state: typeof mockAuthState) => unknown) =>
    selector ? selector(mockAuthState) : mockAuthState,
}));

jest.mock("../../state/projectFilterStore", () => ({
  useProjectFilterStore: () => ({
    initializeWorkspaceProject: jest.fn(),
    workspaceReady: true,
    workspaceReadyUserId: "user-1",
  }),
}));

jest.mock("../../state/taskStore.supabase", () => ({
  useTaskStore: (selector: (state: { getUnreadTaskCount: () => number }) => unknown) =>
    selector({ getUnreadTaskCount: () => 0 }),
}));

jest.mock("../../types/buildtrack", () => ({
  isAdmin: () => false,
}));

jest.mock("../../utils/DataRefreshManager", () => ({
  DataRefreshManager: () => null,
}));

jest.mock("../../utils/NetworkSyncManager", () => {
  const R = require("react");
  const RN = require("react-native");
  return {
    NetworkSyncManager: () => R.createElement(RN.View, { testID: "network-sync" }),
  };
});
jest.mock("../../utils/RealtimeSyncManager", () => {
  const R = require("react");
  const RN = require("react-native");
  return {
    RealtimeSyncManager: () => R.createElement(RN.View, { testID: "realtime-sync" }),
  };
});

jest.mock("../../screens/SetPasswordScreen", () => {
  const R = require("react");
  const RN = require("react-native");
  return {
    __esModule: true,
    default: () => R.createElement(RN.Text, { testID: "set-password-screen" }, "Set password"),
  };
});

jest.mock("../../screens/LoginScreen", () => "LoginScreen");
jest.mock("../../screens/CreateCompanyScreen", () => "CreateCompanyScreen");

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

jest.mock("../uiModeRoutes", () => ({
  DashboardRoute: "DashboardRoute",
  TasksRoute: "TasksRoute",
}));

const { default: AppNavigator } = require("../AppNavigator");

describe("AppNavigator set-password gate", () => {
  it("renders SetPassword outside MainTabs and does not mount realtime", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("set-password-screen")).toBeTruthy();
    expect(screen.queryByTestId("root-tab-bar")).toBeNull();
    expect(screen.queryByTestId("network-sync")).toBeNull();
    expect(screen.queryByTestId("realtime-sync")).toBeNull();
  });
});
