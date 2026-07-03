import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/screens/LoginScreen", () => "LoginScreen");
jest.mock("@/screens/CreateTaskScreen", () => "CreateTaskScreen");
jest.mock("@/screens/ProfileScreen", () => "ProfileScreen");
jest.mock("@/screens/TaskDetailScreen", () => "TaskDetailScreen");
jest.mock("@/screens/ReportsScreen", () => "ReportsScreen");
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

jest.mock("@/navigation/uiModeRoutes", () => ({
  DashboardRoute: "DashboardRoute",
  TasksRoute: "TasksRoute",
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: (selector?: (state: { getUnreadTaskCount: () => number }) => unknown) => {
    const state = {
      getUnreadTaskCount: () => 0,
    };

    return selector ? selector(state) : state;
  },
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

const mockAuthState = {
  isAuthenticated: true,
  isLoading: false,
  user: { id: "user-1", role: "worker" },
};

jest.mock("@/state/authStore", () => ({
  useAuthStore: () => mockAuthState,
}));

const mockInitializeWorkspaceProject = jest.fn().mockResolvedValue(undefined);
const mockProjectFilterState = {
  workspaceReady: false,
  workspaceReadyUserId: null as string | null,
  initializeWorkspaceProject: mockInitializeWorkspaceProject,
};

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: (selector?: (state: unknown) => unknown) => {
    return selector ? selector(mockProjectFilterState) : mockProjectFilterState;
  },
}));

const { WorkspaceBootstrapGate } = require("@/navigation/AppNavigator");

describe("WorkspaceBootstrapGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.isLoading = false;
    mockAuthState.user = { id: "user-1", role: "worker" };
    mockProjectFilterState.workspaceReady = false;
    mockProjectFilterState.workspaceReadyUserId = null;
  });

  it("initializes the authenticated user's workspace before rendering the app shell", async () => {
    const screen = render(
      <WorkspaceBootstrapGate>
        <Text>workspace shell</Text>
      </WorkspaceBootstrapGate>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();

    await waitFor(() => {
      expect(mockInitializeWorkspaceProject).toHaveBeenCalledWith("user-1");
    });
  });

  it("keeps the bootstrap gate closed when readiness belongs to a different user", async () => {
    mockProjectFilterState.workspaceReady = true;
    mockProjectFilterState.workspaceReadyUserId = "user-2";

    const screen = render(
      <WorkspaceBootstrapGate>
        <Text>workspace shell</Text>
      </WorkspaceBootstrapGate>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.queryByText("workspace shell")).toBeNull();

    await waitFor(() => {
      expect(mockInitializeWorkspaceProject).toHaveBeenCalledWith("user-1");
    });
  });

  it("renders the workspace shell once readiness belongs to the authenticated user", () => {
    mockProjectFilterState.workspaceReady = true;
    mockProjectFilterState.workspaceReadyUserId = "user-1";

    const screen = render(
      <WorkspaceBootstrapGate>
        <Text>workspace shell</Text>
      </WorkspaceBootstrapGate>,
    );

    expect(screen.getByText("workspace shell")).toBeTruthy();
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("keeps the gate closed while auth is true but the user id is not ready yet", () => {
    mockAuthState.user = null as unknown as { id: string; role: string };
    mockProjectFilterState.workspaceReady = true;
    mockProjectFilterState.workspaceReadyUserId = "user-1";

    const screen = render(
      <WorkspaceBootstrapGate>
        <Text>workspace shell</Text>
      </WorkspaceBootstrapGate>,
    );

    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.queryByText("workspace shell")).toBeNull();
    expect(mockInitializeWorkspaceProject).not.toHaveBeenCalled();
  });
});
