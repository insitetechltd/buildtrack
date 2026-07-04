import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("@react-navigation/native", () => ({
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

            if (typeof options.tabBarButton === "function" && customButton == null) {
              return null;
            }

            return React.createElement(
              View,
              { key: tabScreen.props.name },
              React.createElement(Text, { testID: "mock-tab-label" }, label),
              customButton,
            );
          }),
        ),
      Screen: () => null,
    };
  },
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
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
jest.mock("../../screens/PhotoAnnotationScreen", () => "PhotoAnnotationScreen");
jest.mock("../../screens/PhotoSelectionScreen", () => "PhotoSelectionScreen");
jest.mock("../../screens/UpdateProgressScreen", () => "UpdateProgressScreen");
jest.mock("../../screens/AddCommentScreen", () => "AddCommentScreen");
jest.mock("../../screens/RejectTaskScreen", () => "RejectTaskScreen");
jest.mock("../../screens/ReassignTaskScreen", () => "ReassignTaskScreen");

const {
  default: AppNavigator,
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
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

  it("shows Activity, Camera, and Tasks in the worker bottom bar and hides Profile from the tab bar", () => {
    const screen = render(<AppNavigator />);

    expect(
      screen.getAllByTestId("mock-tab-label").map((node) => node.props.children),
    ).toEqual(["Activity", "Camera", "Tasks"]);
    expect(screen.queryByText("Profile")).toBeNull();
  });

  it("renders the worker camera tab as a dedicated center action button", () => {
    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("root-tab__camera_button")).toBeTruthy();
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
