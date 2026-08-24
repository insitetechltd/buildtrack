import { render } from "@testing-library/react-native";
import React from "react";
import { Dimensions } from "react-native";

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  createNavigationContainerRef: () => ({
    isReady: () => false,
    navigate: jest.fn(),
  }),
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
jest.mock("../../screens/SetPasswordScreen", () => "SetPasswordScreen");
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
jest.mock("../../screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("../../screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("../../screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("../../screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("../../screens/ReassignTaskScreen", () => "ReassignTaskScreen");

const {
  default: AppNavigator,
  shouldHideTabBarOnCreateTaskRoute,
  shouldCollapseRootSideTabsOnTaskDetailRoute,
  shouldHideRootSideTabsForTabState,
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

  it("shifts side tab centers to the quarter-width positions", () => {
    const screen = render(<AppNavigator />);
    const sideCenterOffset = Dimensions.get("window").width / 12;

    expect(screen.getByTestId("root-tab__activity")).toHaveStyle({
      flex: 1,
      width: "100%",
      alignItems: "center",
      transform: [{ translateX: sideCenterOffset }],
    });
    expect(screen.getByTestId("root-tab__tasks")).toHaveStyle({
      flex: 1,
      width: "100%",
      alignItems: "center",
      transform: [{ translateX: -sideCenterOffset }],
    });
    expect(screen.getByTestId("root-tab__activity_pressable")).toHaveStyle({
      alignSelf: "stretch",
      flex: 1,
    });
    expect(screen.getByTestId("root-tab__tasks_pressable")).toHaveStyle({
      alignSelf: "stretch",
      flex: 1,
    });
  });

  it("keeps the camera affordance on the original centered vertical track", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera")).toHaveStyle({
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    });
    expect(screen.getByTestId("root-tab__camera_slot")).toHaveStyle({
      alignItems: "center",
      alignSelf: "stretch",
      flex: 1,
      justifyContent: "center",
    });
    expect(screen.getByTestId("root-tab__camera_button")).toHaveStyle({
      alignSelf: "center",
      height: 64,
      top: -16,
      width: 64,
    });
    expect(React.Children.toArray(screen.getByTestId("root-tab__camera_slot").props.children)).toHaveLength(
      1,
    );
  });

  it("keeps the root tab bar on Task Detail and collapses the side tabs", () => {
    expect(shouldCollapseRootSideTabsOnTaskDetailRoute("TaskDetail")).toBe(true);
    expect(shouldCollapseRootSideTabsOnTaskDetailRoute("TaskDetailFromDashboard")).toBe(true);
    expect(shouldCollapseRootSideTabsOnTaskDetailRoute("TasksList")).toBe(false);
    expect(shouldCollapseRootSideTabsOnTaskDetailRoute(undefined)).toBe(false);
    expect(
      shouldHideRootSideTabsForTabState({
        index: 2,
        routes: [
          { name: "Activity" },
          { name: "Camera" },
          {
            name: "Tasks",
            state: {
              index: 1,
              routes: [
                { name: "TasksList" },
                { name: "TaskDetail", params: { taskId: "task-1" } },
              ],
            },
          },
        ],
      }),
    ).toBe(true);
    expect(
      shouldHideRootSideTabsForTabState({
        index: 0,
        routes: [
          {
            name: "Activity",
            state: { index: 0, routes: [{ name: "DashboardMain" }] },
          },
          { name: "Camera" },
          { name: "Tasks" },
        ],
      }),
    ).toBe(false);
  });

  it("hides the root tab bar on Create Task, Update Progress, Select Photos, and in-app library routes", () => {
    expect(shouldHideTabBarOnCreateTaskRoute("CreateTaskMain")).toBe(true);
    expect(shouldHideTabBarOnCreateTaskRoute("UpdateProgress")).toBe(true);
    expect(shouldHideTabBarOnCreateTaskRoute("PhotoSelection")).toBe(true);
    expect(shouldHideTabBarOnCreateTaskRoute("InAppLibraryPicker")).toBe(true);
    expect(shouldHideTabBarOnCreateTaskRoute("PhotoViewer")).toBe(false);
    expect(shouldHideTabBarOnCreateTaskRoute(undefined)).toBe(false);
  });
});
