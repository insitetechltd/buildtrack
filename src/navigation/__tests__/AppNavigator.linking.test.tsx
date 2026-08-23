import React from "react";
import { render } from "@testing-library/react-native";

let mockNavigationContainerProps: Record<string, unknown> | null = null;

jest.mock("@react-navigation/native", () => ({
  getFocusedRouteNameFromRoute: () => undefined,
  NavigationContainer: (props: Record<string, unknown>) => {
    mockNavigationContainerProps = props;
    return props.children;
  },
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

jest.mock("../../state/authStore", () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
    isLoading: false,
    user: { id: "user-1", role: "worker" },
  }),
}));

jest.mock("../../state/projectFilterStore", () => ({
  useProjectFilterStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      initializeWorkspaceProject: jest.fn().mockResolvedValue(undefined),
      workspaceReady: true,
      workspaceReadyUserId: "user-1",
    };

    return selector ? selector(state) : state;
  },
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

const { default: AppNavigator, appLinking } = require("../AppNavigator");

describe("AppNavigator linking", () => {
  beforeEach(() => {
    mockNavigationContainerProps = null;
  });

  it("registers the taskr verification route on the real Task Detail destination", () => {
    render(<AppNavigator />);

    const linking = mockNavigationContainerProps?.linking as
      | {
          prefixes?: string[];
          config?: {
            screens?: {
              MainTabs?: {
                screens?: {
                  Tasks?: {
                    screens?: {
                      TaskDetail?: {
                        path?: string;
                      };
                    };
                  };
                };
              };
            };
          };
        }
      | undefined;

    expect(linking?.prefixes).toContain("taskr://");
    expect(
      linking?.config?.screens?.MainTabs?.screens?.Tasks?.screens?.TaskDetail?.path,
    ).toBe("verify/task/:taskId");
  });

  it("routes checkout success deep links to Company Plan", () => {
    const state = appLinking.getStateFromPath?.("profile?checkout=success", {
      screens: appLinking.config?.screens,
    });

    expect(state?.routes?.[0]?.name).toBe("Profile");
    expect(state?.routes?.[0]?.state?.routes?.[0]?.name).toBe("CompanyPlan");
    expect(state?.routes?.[0]?.state?.routes?.[0]?.params).toEqual({
      checkoutResult: "success",
    });
  });
});
