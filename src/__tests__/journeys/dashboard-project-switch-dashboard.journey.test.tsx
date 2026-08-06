import React from "react";
import { screen, fireEvent, act } from "@testing-library/react-native";
import AppNavigator from "@/navigation/AppNavigator";
import { useProjectFilterStore } from "@/state/projectFilterStore";

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
        const override = (globalThis as any).__mockOverrideStackComponent;
        const screens = React.Children.toArray(children).filter(React.isValidElement);
        const firstScreen = screens[0] as
          | React.ReactElement<{
              component?: React.ComponentType<unknown>;
              name: string;
            }>
          | undefined;

        let Comp: any;
        let Params: Record<string, unknown> | undefined;
        let NavScreenName = firstScreen?.props.name || "Unknown";
        if (override) {
          Comp = override;
          Params = (globalThis as any).__mockOverrideStackParams;
          NavScreenName = "__override__";
        } else if (firstScreen?.props.component) {
          Comp = firstScreen.props.component;
        } else {
          return null;
        }
        const mockNavigate = jest.fn((name: string, params?: Record<string, unknown>) => {
          const target = screens.find(
            (s) =>
              React.isValidElement(s) &&
              (s as React.ReactElement<{ name: string }>).props.name === name,
          ) as React.ReactElement<{
            component?: React.ComponentType<unknown>;
          }> | undefined;
          if (target?.props.component) {
            (globalThis as any).__mockActiveStackComponent = target.props.component;
            (globalThis as any).__mockActiveStackParams = params;
          }
        });
        const mockGoBack = jest.fn(() => {
          (globalThis as any).__mockActiveStackComponent = Comp;
          (globalThis as any).__mockActiveStackParams = undefined;
        });

        const ActiveComp =
          (globalThis as any).__mockActiveStackComponent || Comp;
        const ActiveParams = (globalThis as any).__mockActiveStackParams ?? Params;

        return React.createElement(
          View,
          { testID: "mock-stack-navigator" },
          React.createElement(ActiveComp, {
            navigation: {
              addListener: () => jest.fn(),
              canGoBack: () => ActiveComp !== Comp,
              getParent: () => undefined,
              getState: () => ({
                index: 0,
                routeNames: screens.map((sc) =>
                  React.isValidElement(sc)
                    ? (sc as React.ReactElement<{ name: string }>).props.name
                    : undefined,
                ),
                routes: [{ key: firstScreen?.props.name ?? NavScreenName }],
              }),
              goBack: mockGoBack,
              navigate: mockNavigate,
              pop: jest.fn(),
              setParams: jest.fn(),
            },
            route: {
              key: firstScreen?.props.name ?? NavScreenName,
              name: NavScreenName,
              params: ActiveParams,
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
jest.mock("@/screens/DeveloperSettingsScreen", () => "DeveloperSettingsScreen");
jest.mock("@/screens/PendingUsersScreen", () => "PendingUsersScreen");
jest.mock("@/screens/PhotoViewerScreen", () => "PhotoViewerScreen");
jest.mock("@/screens/PhotoAnnotationScreen", () => "PhotoAnnotationScreen");
jest.mock("@/screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("@/screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("@/screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("@/screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("@/screens/ReassignTaskScreen", () => "ReassignTaskScreen");
jest.mock("@/screens/TasksScreen", () => "TasksScreen");

jest.mock("@/screens/DashboardScreen", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const Comp = function MockDashboardScreen() {
    return React.createElement(
      View,
      { testID: "dashboard-screen__root" },
      React.createElement(
        Pressable,
        {
          testID: "dashboard__trigger_project_picker",
          onPress: () => {
            if ((globalThis as any).__journeySwapToPicker) {
              (globalThis as any).__journeySwapToPicker();
            }
          },
        },
      ),
    );
  };
  (globalThis as any).__J_DASH = Comp;
  return {
    __esModule: true,
    default: Comp,
  };
});

jest.mock("@/screens/ProjectPickerScreen", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const Comp = function MockProjectPickerScreen() {
    const selectProject = (projectId: string) => {
      const { useProjectFilterStore } = jest.requireActual("@/state/projectFilterStore");
      useProjectFilterStore.setState({ selectedProjectId: projectId });
      if ((globalThis as any).__journeySwapToDashboard) {
        (globalThis as any).__journeySwapToDashboard();
      }
    };
    const projectItems = [
      { id: "project-picker:project-a", projectId: "project-a", title: "Project A" },
      { id: "project-picker:project-b", projectId: "project-b", title: "Project B" },
    ];
    return React.createElement(
      View,
      { testID: "project-picker__root" },
      projectItems.map((item) =>
        React.createElement(
          Pressable,
          {
            key: item.id,
            testID: `projectPicker-project-${item.projectId}`,
            onPress: () => selectProject(item.projectId),
          },
        ),
      ),
    );
  };
  (globalThis as any).__J_PICKER = Comp;
  return {
    __esModule: true,
    default: Comp,
  };
});

import { renderAppShellJourney } from "@/test-utils/journeys/renderAppShellJourney";
import { seedJourneyState } from "@/test-utils/journeys/seedJourneyState";
import "@/screens/DashboardScreen";
import "@/screens/ProjectPickerScreen";

describe("dashboard project switch dashboard journey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__mockActiveStackComponent = undefined;
    (globalThis as any).__mockActiveStackParams = undefined;
    (globalThis as any).__mockOverrideStackComponent = undefined;
    (globalThis as any).__mockOverrideStackParams = undefined;
    seedJourneyState({
      authUser: { id: "user-1", role: "worker" },
      selectedProjectId: "project-a",
    });
  });

  it("starts with projectA selected, switches to projectB via picker row, returns to dashboard with updated selectedProjectId", async () => {
    (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_DASH;
    expect(useProjectFilterStore.getState().selectedProjectId).toBe("project-a");

    let latestRerender: any;
    (globalThis as any).__journeySwapToPicker = () => {
      (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_PICKER;
      if (latestRerender) latestRerender(<AppNavigator />);
    };
    (globalThis as any).__journeySwapToDashboard = () => {
      (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_DASH;
      if (latestRerender) latestRerender(<AppNavigator />);
    };

    const { rerender } = renderAppShellJourney();
    latestRerender = rerender;

    expect(await screen.findByTestId("dashboard-screen__root")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("dashboard__trigger_project_picker"));
    });

    expect(await screen.findByTestId("project-picker__root")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("projectPicker-project-project-b"));
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBe("project-b");
    expect(await screen.findByTestId("dashboard-screen__root")).toBeTruthy();
  });
});
