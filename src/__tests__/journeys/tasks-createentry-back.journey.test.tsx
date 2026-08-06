import React from "react";
import { screen, fireEvent, act } from "@testing-library/react-native";
import AppNavigator from "@/navigation/AppNavigator";

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  return {
    createBottomTabNavigator: () => {
      return {
        Navigator: ({ children }: { children: React.ReactNode }) =>
          React.createElement(
            View,
            { testID: "mock-tab-navigator" },
            React.createElement(
              Pressable,
              {
                testID: "root-tab__camera_button",
                onPress: () => {
                  if ((globalThis as any).__journeySwapToCreate) {
                    (globalThis as any).__journeySwapToCreate();
                  }
                },
              },
            ),
            React.Children.toArray(children).map(() => null),
          ),
        Screen: () => null,
      };
    },
  };
});

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
jest.mock("@/screens/PhotoAnnotationScreen", () => "PhotoAnnotationScreen");
jest.mock("@/screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("@/screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("@/screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("@/screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("@/screens/ReassignTaskScreen", () => "ReassignTaskScreen");
jest.mock("@/screens/DashboardScreen", () => "DashboardScreen");

jest.mock("@/screens/TasksScreen", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const Comp = function MockTasksScreen() {
    return React.createElement(
      View,
      { testID: "tasks-screen__root" },
      React.createElement(View, { testID: "tasks-screen__task_list" }),
      React.createElement(
        Pressable,
        {
          testID: "root-tab__camera_button",
          onPress: () => {
            if ((globalThis as any).__journeySwapToCreate) {
              (globalThis as any).__journeySwapToCreate();
            }
          },
        },
      ),
    );
  };
  (globalThis as any).__J_TASKS = Comp;
  return {
    __esModule: true,
    default: Comp,
  };
});

jest.mock("@/screens/CreateTaskScreen", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");
  const Comp = function MockCreateTaskScreen() {
    return React.createElement(
      View,
      { testID: "create-task__root" },
      React.createElement(
        Pressable,
        {
          testID: "create-task__back_button",
          onPress: () => {
            if ((globalThis as any).__journeySwapToTasks) {
              (globalThis as any).__journeySwapToTasks();
            }
          },
        },
      ),
    );
  };
  (globalThis as any).__J_CREATE = Comp;
  return {
    __esModule: true,
    default: Comp,
  };
});

import { renderAppShellJourney } from "@/test-utils/journeys/renderAppShellJourney";
import { seedJourneyState } from "@/test-utils/journeys/seedJourneyState";
import "@/screens/TasksScreen";
import "@/screens/CreateTaskScreen";

describe("tasks create-entry back journey", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__mockActiveStackComponent = undefined;
    (globalThis as any).__mockActiveStackParams = undefined;
    (globalThis as any).__mockOverrideStackComponent = undefined;
    (globalThis as any).__mockOverrideStackParams = undefined;
    seedJourneyState({
      authUser: { id: "user-1", role: "worker" },
      selectedProjectId: "project-1",
    });
  });

  it("starts on Tasks tab, opens Create via FAB navigates to CreateTaskScreen, Back returns to Tasks tab without form submit", async () => {
    (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_TASKS;
    let latestRerender: any;
    (globalThis as any).__journeySwapToCreate = () => {
      (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_CREATE;
      if (latestRerender) latestRerender(<AppNavigator />);
    };
    (globalThis as any).__journeySwapToTasks = () => {
      (globalThis as any).__mockOverrideStackComponent = (globalThis as any).__J_TASKS;
      if (latestRerender) latestRerender(<AppNavigator />);
    };

    const { rerender } = renderAppShellJourney();
    latestRerender = rerender;

    expect(await screen.findByTestId("tasks-screen__root")).toBeTruthy();
    expect(screen.getByTestId("tasks-screen__task_list")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("root-tab__camera_button"));
    });

    expect(screen.getByTestId("create-task__root")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId("create-task__back_button"));
    });

    expect(await screen.findByTestId("tasks-screen__root")).toBeTruthy();
    expect(screen.queryByTestId("create-task__root")).toBeNull();
  });
});
