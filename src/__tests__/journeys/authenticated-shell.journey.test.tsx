import React from "react";
import { screen } from "@testing-library/react-native";

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

jest.mock("@/navigation/uiModeRoutes", () => ({
  DashboardRoute: () => null,
  TasksRoute: () => null,
}));

jest.mock("@/types/buildtrack", () => ({
  isAdmin: () => false,
}));

jest.mock("@/utils/DataRefreshManager", () => ({
  DataRefreshManager: () => null,
}));

jest.mock("@/utils/NetworkSyncManager", () => ({
  NetworkSyncManager: () => null,
}));

jest.mock("@/utils/RealtimeSyncManager", () => ({
  RealtimeSyncManager: () => null,
}));

jest.mock("@/screens/LoginScreen", () => "LoginScreen");
jest.mock("@/screens/CreateTaskScreen", () => "CreateTaskScreen");
jest.mock("@/screens/ProfileScreen", () => "ProfileScreen");
jest.mock("@/screens/TaskDetailScreen", () => "TaskDetailScreen");
jest.mock("@/screens/ProjectsScreen", () => "ProjectsScreen");
jest.mock("@/screens/CreateProjectScreen", () => "CreateProjectScreen");
jest.mock("@/screens/UserManagementScreen", () => "UserManagementScreen");
jest.mock("@/screens/AdminDashboardScreen", () => "AdminDashboardScreen");
jest.mock("@/screens/ProjectDetailScreen", () => "ProjectDetailScreen");
jest.mock("@/screens/DevAdminScreen", () => "DevAdminScreen");
jest.mock("@/screens/ProjectPickerScreen", () => "ProjectPickerScreen");
jest.mock("@/screens/DeveloperSettingsScreen", () => "DeveloperSettingsScreen");
jest.mock("@/screens/PendingUsersScreen", () => "PendingUsersScreen");
jest.mock("@/screens/PhotoViewerScreen", () => "PhotoViewerScreen");
jest.mock("@/screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("@/screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("@/screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("@/screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("@/screens/ReassignTaskScreen", () => "ReassignTaskScreen");

import { renderAppShellJourney } from "@/test-utils/journeys/renderAppShellJourney";
import { seedJourneyState } from "@/test-utils/journeys/seedJourneyState";

describe("authenticated shell journey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    seedJourneyState({
      authUser: null,
      selectedProjectId: null,
    });
  });

  it("renders the authenticated root tabs when a seeded user exists", async () => {
    seedJourneyState({
      authUser: { id: "user-1", role: "worker" },
      selectedProjectId: "project-1",
    });

    renderAppShellJourney();

    expect(await screen.findByTestId("root-tab__activity")).toBeTruthy();
    expect(screen.getByTestId("root-tab__tasks")).toBeTruthy();
  });
});
