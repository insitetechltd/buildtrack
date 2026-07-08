import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => {
    const React = require("react");
    const { View } = require("react-native");

    return {
      Navigator: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          View,
          { testID: "mock-tab-navigator" },
          React.Children.toArray(children).map((child) => {
            if (!React.isValidElement(child)) {
              return null;
            }

            const tabScreen = child as React.ReactElement<{
              name: string;
              options?:
                | Record<string, unknown>
                | ((props: Record<string, unknown>) => Record<string, unknown>);
            }>;
            const options =
              typeof tabScreen.props.options === "function"
                ? tabScreen.props.options({})
                : tabScreen.props.options ?? {};

            if (typeof options.tabBarButton === "function") {
              return React.createElement(
                React.Fragment,
                { key: tabScreen.props.name },
                options.tabBarButton({
                  accessibilityLabel: `${tabScreen.props.name} tab`,
                  accessibilityState: { selected: false },
                  children: null,
                  onLongPress: () => {},
                  onPress: () => {},
                  style: undefined,
                }),
              );
            }

            return React.createElement(View, { key: tabScreen.props.name });
          }),
        ),
      Screen: () => null,
    };
  },
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => {
    const React = require("react");
    const { View } = require("react-native");

    return {
      Navigator: ({ children }: { children: React.ReactNode }) => {
        const screens = React.Children.toArray(children).filter(React.isValidElement);
        const firstScreen = screens[0] as
          | React.ReactElement<{
              component?: React.ComponentType<unknown>;
              name: string;
            }>
          | undefined;

        if (!firstScreen?.props.component) {
          return null;
        }

        const Component = firstScreen.props.component;

        return React.createElement(
          View,
          { testID: "mock-stack-navigator" },
          React.createElement(Component, {
            navigation: {
              addListener: () => jest.fn(),
              canGoBack: () => false,
              getParent: () => undefined,
              getState: () => ({
                index: 0,
                routeNames: screens.map((screen) =>
                  React.isValidElement(screen)
                    ? (screen as React.ReactElement<{ name: string }>).props.name
                    : undefined,
                ),
                routes: [{ key: firstScreen.props.name }],
              }),
              goBack: jest.fn(),
              navigate: jest.fn(),
              pop: jest.fn(),
              setParams: jest.fn(),
            },
            route: {
              key: firstScreen.props.name,
              name: firstScreen.props.name,
              params: undefined,
            },
          }),
        );
      },
      Screen: () => null,
    };
  },
}));

jest.mock("../uiModeRoutes", () => ({
  DashboardRoute: "DashboardRoute",
  TasksRoute: "TasksRoute",
}));

const mockAuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: { id: "user-1", role: "worker" },
};

jest.mock("../../state/authStore", () => ({
  useAuthStore: () => mockAuthState,
}));

const mockProjectFilterState = {
  initializeWorkspaceProject: jest.fn().mockResolvedValue(undefined),
  workspaceReady: true,
  workspaceReadyUserId: "user-1",
};

jest.mock("../../state/projectFilterStore", () => ({
  useProjectFilterStore: (selector?: (state: typeof mockProjectFilterState) => unknown) =>
    selector ? selector(mockProjectFilterState) : mockProjectFilterState,
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

jest.mock("../../utils/NetworkSyncManager", () => ({
  NetworkSyncManager: () => null,
}));

jest.mock("../../utils/RealtimeSyncManager", () => ({
  RealtimeSyncManager: () => null,
}));

jest.mock("../../screens/LoginScreen", () => "LoginScreen");
jest.mock("../../screens/CreateTaskScreen", () => "CreateTaskScreen");
jest.mock("../../screens/ProfileScreen", () => "ProfileScreen");
jest.mock("../../screens/TaskDetailScreen", () => "TaskDetailScreen");
jest.mock("../../screens/ProjectsScreen", () => "ProjectsScreen");
jest.mock("../../screens/CreateProjectScreen", () => "CreateProjectScreen");
jest.mock("../../screens/UserManagementScreen", () => "UserManagementScreen");
jest.mock("../../screens/AdminDashboardScreen", () => "AdminDashboardScreen");
jest.mock("../../screens/ProjectDetailScreen", () => "ProjectDetailScreen");
jest.mock("../../screens/DevAdminScreen", () => "DevAdminScreen");
jest.mock("../../screens/ProjectPickerScreen", () => "ProjectPickerScreen");
jest.mock("../../screens/DeveloperSettingsScreen", () => "DeveloperSettingsScreen");
jest.mock("../../screens/PendingUsersScreen", () => "PendingUsersScreen");
jest.mock("../../screens/PhotoViewerScreen", () => "PhotoViewerScreen");
jest.mock("../../screens/PhotoAnnotationScreen", () => "PhotoAnnotationScreen");
jest.mock("../../screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("../../screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("../../screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("../../screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("../../screens/ReassignTaskScreen", () => "ReassignTaskScreen");

const {
  default: AppNavigator,
  shouldHideTabBarOnTaskDetailRoute,
} = require("../AppNavigator");

describe("AppNavigator bottom-tab spacing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.isLoading = false;
    mockAuthState.user = { id: "user-1", role: "worker" };
    mockProjectFilterState.workspaceReady = true;
    mockProjectFilterState.workspaceReadyUserId = "user-1";
  });

  it("uses equal visual slot sizing for Activity, Camera, and Tasks tabs", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__activity")).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId("root-tab__camera")).toHaveStyle({ flex: 1 });
    expect(screen.getByTestId("root-tab__tasks")).toHaveStyle({ flex: 1 });
  });

  it("keeps the camera affordance centered inside a full-width middle slot", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera_slot")).toHaveStyle({
      alignItems: "center",
      alignSelf: "stretch",
      flex: 1,
      justifyContent: "center",
    });
    expect(screen.getByTestId("root-tab__camera_button")).toHaveStyle({
      alignSelf: "center",
      height: 64,
      width: 64,
    });
  });

  it("hides the root tab bar only on Task Detail routes", () => {
    expect(shouldHideTabBarOnTaskDetailRoute("TaskDetail")).toBe(true);
    expect(shouldHideTabBarOnTaskDetailRoute("TaskDetailFromDashboard")).toBe(true);
    expect(shouldHideTabBarOnTaskDetailRoute("TasksList")).toBe(false);
    expect(shouldHideTabBarOnTaskDetailRoute(undefined)).toBe(false);
  });
});
