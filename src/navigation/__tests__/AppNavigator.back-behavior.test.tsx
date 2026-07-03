import {
  handleDashboardTaskDetailBack,
  handleTasksTaskDetailBack,
} from "../AppNavigator";

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

jest.mock("../../state/taskStore.supabase", () => ({
  useTaskStore: (selector: (state: { getUnreadTaskCount: () => number }) => unknown) =>
    selector({ getUnreadTaskCount: () => 0 }),
}));

jest.mock("../../types/buildtrack", () => ({
  isAdmin: () => false,
}));

jest.mock("../../utils/DataRefreshManager", () => ({
  DataRefreshManager: "DataRefreshManager",
}));

jest.mock("../../utils/NetworkSyncManager", () => ({
  NetworkSyncManager: "NetworkSyncManager",
}));

jest.mock("../../utils/RealtimeSyncManager", () => ({
  RealtimeSyncManager: "RealtimeSyncManager",
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

describe("AppNavigator back helpers", () => {
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

  it("redirects to the dashboard tab when the current dashboard stack has no history", () => {
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
    expect(navigate).toHaveBeenCalledWith("Dashboard");
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
