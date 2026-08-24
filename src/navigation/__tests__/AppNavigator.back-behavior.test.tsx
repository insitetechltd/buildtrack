import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@react-navigation/native", () => ({
  CommonActions: {
    setParams: (params: Record<string, unknown>) => ({
      type: "SET_PARAMS",
      payload: { params },
    }),
  },
  StackActions: {
    pop: (count: number) => ({
      type: "POP",
      payload: { count },
    }),
  },
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
    const { Text, View } = require("react-native");

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
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : tabScreen.props.name;
            const customButton =
              typeof options.tabBarButton === "function"
                ? options.tabBarButton({
                    accessibilityLabel: `${label} tab`,
                    accessibilityState: { selected: false },
                    children: null,
                    onPress: () => {},
                    style: undefined,
                  })
                : null;
            const isHiddenTab =
              typeof options.tabBarButton === "function" && customButton == null;

            return React.createElement(
              View,
              { key: tabScreen.props.name },
              React.createElement(Text, { testID: "mock-tab-route" }, tabScreen.props.name),
              isHiddenTab
                ? null
                : React.createElement(Text, { testID: "mock-tab-label" }, label),
              isHiddenTab ? null : customButton,
            );
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
              dispatch: jest.fn(),
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
  useAuthStore: Object.assign(() => mockAuthState, {
    getState: () => mockAuthState,
  }),
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

jest.mock("../../state/taskStore.supabase", () => {
  const taskStoreState = {
    getUnreadTaskCount: () => 0,
    tasksById: {},
    tasks: [],
  };

  const useTaskStore = Object.assign(
    (selector?: (state: typeof taskStoreState) => unknown) =>
      selector ? selector(taskStoreState) : taskStoreState,
    {
      getState: () => taskStoreState,
    },
  );

  return { useTaskStore };
});

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
jest.mock("../../screens/ReportsScreen", () => "ReportsScreen");
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
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
  handleCameraTabPress,
  returnToCreateTaskRoute,
} = require("../AppNavigator");

describe("AppNavigator back helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.isLoading = false;
    mockAuthState.user = { id: "user-1", role: "worker" };
    mockProjectFilterState.workspaceReady = true;
    mockProjectFilterState.workspaceReadyUserId = "user-1";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registers the worker bottom shell as Activity, Camera, and Tasks only", () => {
    const screen = render(<AppNavigator />);

    expect(
      screen.getAllByTestId("mock-tab-route").map((node) => node.props.children),
    ).toEqual(["Activity", "Camera", "Tasks"]);
    expect(
      screen.getAllByTestId("mock-tab-label").map((node) => node.props.children),
    ).toEqual(["Activity", "Camera", "Tasks"]);
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("renders the worker camera tab as a dedicated center action button", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera_button")).toBeTruthy();
  });

  it("renders the worker camera tab with a dedicated custom icon surface", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera_icon_surface")).toBeTruthy();
    expect(screen.getByTestId("root-tab__camera_icon")).toBeTruthy();
  });

  it("renders the worker camera tab with the expected red circular center treatment", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera_button")).toHaveStyle({
      backgroundColor: "#dc2626",
      borderRadius: 32,
      height: 64,
      width: 64,
    });
    expect(screen.getByTestId("root-tab__camera_slot")).toHaveStyle({
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
    });
  });

  it("pops the dashboard task-detail screen from the current stack when stack history exists", () => {
    const pop = jest.fn();
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleDashboardTaskDetailBack({
      canGoBack: () => true,
      getState: () => ({ index: 1, routes: [{ key: "DashboardMain" }, { key: "TaskDetailFromDashboard" }] }),
      goBack,
      pop,
      getParent: () => ({ navigate }),
    } as any);

    expect(pop).toHaveBeenCalledWith(1);
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects to the Activity tab when the current dashboard stack has no history", () => {
    const pop = jest.fn();
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleDashboardTaskDetailBack({
      canGoBack: () => false,
      getState: () => ({ index: 0, routes: [{ key: "TaskDetailFromDashboard" }] }),
      goBack,
      pop,
      getParent: () => ({ navigate }),
    } as any);

    expect(pop).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("Activity");
  });

  it("pops the tasks task-detail screen from the current stack when stack history exists", () => {
    const pop = jest.fn();
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleTasksTaskDetailBack({
      canGoBack: () => true,
      getState: () => ({ index: 1, routes: [{ key: "TasksList" }, { key: "TaskDetail" }] }),
      goBack,
      pop,
      navigate,
    } as any);

    expect(pop).toHaveBeenCalledWith(1);
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("redirects to the tasks list when the current tasks stack has no history", () => {
    const pop = jest.fn();
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleTasksTaskDetailBack({
      canGoBack: () => false,
      getState: () => ({ index: 0, routes: [{ key: "TaskDetail" }] }),
      goBack,
      pop,
      navigate,
    } as any);

    expect(pop).not.toHaveBeenCalled();
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("TasksList");
  });

  it("returns photo-selection results to the existing create-task route by popping and dispatching params to that route", () => {
    jest.useFakeTimers();
    const goBack = jest.fn();
    const dispatch = jest.fn();
    const navigate = jest.fn();
    const setParams = jest.fn();

    returnToCreateTaskRoute(
      {
        canGoBack: () => true,
        getState: () => ({
          index: 1,
          routeNames: ["CreateTaskMain", "PhotoSelection"],
          routes: [
            { key: "CreateTaskMain-1", name: "CreateTaskMain" },
            { key: "PhotoSelection-1", name: "PhotoSelection" },
          ],
        }),
        dispatch,
        goBack,
        navigate,
        setParams,
      } as any,
      { selectedPhotos: [{ uri: "file:///photo.jpg", fileName: "photo.jpg", isAnnotated: false }] },
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POP",
        payload: expect.objectContaining({ count: 1 }),
      }),
    );
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(setParams).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(dispatch).toHaveBeenCalledWith({
      type: "SET_PARAMS",
      payload: {
        params: {
          selectedPhotos: [{ uri: "file:///photo.jpg", fileName: "photo.jpg", isAnnotated: false }],
        },
      },
      source: "CreateTaskMain-1",
    });
    expect(setParams).not.toHaveBeenCalled();
  });

  it("falls back to setParams when returning to an existing create-task route without dispatch support", () => {
    jest.useFakeTimers();
    const goBack = jest.fn();
    const navigate = jest.fn();
    const setParams = jest.fn();

    returnToCreateTaskRoute(
      {
        canGoBack: () => true,
        getState: () => ({
          index: 1,
          routeNames: ["CreateTaskMain", "PhotoSelection"],
          routes: [
            { key: "CreateTaskMain-1", name: "CreateTaskMain" },
            { key: "PhotoSelection-1", name: "PhotoSelection" },
          ],
        }),
        goBack,
        navigate,
        setParams,
      } as any,
      { uploadedPhotoUrls: ["https://example.com/photo.jpg"] },
    );

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(setParams).not.toHaveBeenCalled();

    jest.runAllTimers();

    expect(setParams).toHaveBeenCalledWith({
      uploadedPhotoUrls: ["https://example.com/photo.jpg"],
    });
  });

  it("falls back to create-task navigation when no existing create-task route can be popped", () => {
    const goBack = jest.fn();
    const navigate = jest.fn();
    const setParams = jest.fn();

    returnToCreateTaskRoute(
      {
        canGoBack: () => false,
        getState: () => ({
          index: 0,
          routeNames: ["CreateTaskMain", "PhotoSelection"],
          routes: [{ key: "CreateTaskMain" }, { key: "PhotoSelection" }],
        }),
        goBack,
        navigate,
        setParams,
      } as any,
      { clearForm: true, _timestamp: 123 },
    );

    expect(goBack).not.toHaveBeenCalled();
    expect(setParams).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("CreateTaskMain", {
      clearForm: true,
      _timestamp: 123,
    });
  });

  it("opens the default camera create-task entry when the current tab is not a task-detail shortcut", () => {
    const navigate = jest.fn();
    const preventDefault = jest.fn();

    handleCameraTabPress({
      event: { preventDefault },
      navigation: {
        getState: () => ({
          index: 0,
          routes: [
            {
              name: "Activity",
              state: {
                index: 0,
                routes: [{ name: "DashboardMain" }],
              },
            },
            { name: "Camera" },
            { name: "Tasks" },
          ],
        }),
        navigate,
      },
    } as any);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("Camera", {
      screen: "CreateTaskMain",
      params: undefined,
    });
  });


  it("pops when the navigator reports back history even if state inspection looks root-like", () => {
    const pop = jest.fn();
    const goBack = jest.fn();
    const navigate = jest.fn();

    handleTasksTaskDetailBack({
      canGoBack: () => true,
      getState: () => ({ index: 0, routes: [{ key: "TaskDetail" }] }),
      goBack,
      pop,
      navigate,
    } as any);

    expect(pop).toHaveBeenCalledWith(1);
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
