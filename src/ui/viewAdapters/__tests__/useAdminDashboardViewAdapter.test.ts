import { renderHook } from "@testing-library/react-native";

import { useAdminDashboardViewAdapter } from "../useAdminDashboardViewAdapter";

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/companyStore", () => ({
  useCompanyStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: jest.fn(),
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: jest.fn(),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: jest.fn(),
}));

describe("useAdminDashboardViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("counts approved tasks as completed-equivalent from status instead of legacy currentStatus", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useCompanyStore } = require("@/state/companyStore");
    const { useProjectStoreWithCompanyInit } = require("@/state/projectStore.supabase");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUserStoreWithInit } = require("@/state/userStore.supabase");

    const fetchTasks = jest.fn().mockResolvedValue(undefined);

    useAuthStore.mockReturnValue({
      user: {
        id: "admin-1",
        name: "Ada Admin",
        companyId: "company-1",
        role: "admin",
        systemPermission: "admin",
      },
      logout: jest.fn(),
    });

    useCompanyStore.mockReturnValue({
      getCompanyById: jest.fn().mockReturnValue({
        id: "company-1",
        name: "Acme Contracting",
      }),
      getCompanyBanner: jest.fn().mockReturnValue(undefined),
      updateCompanyBanner: jest.fn(),
    });

    useProjectStoreWithCompanyInit.mockReturnValue({
      userAssignments: [],
      fetchProjects: jest.fn().mockResolvedValue(undefined),
      getProjectsByCompany: jest.fn().mockReturnValue([
        {
          id: "project-1",
          createdBy: "admin-1",
          status: "active",
        },
      ]),
    });

    useUserStoreWithInit.mockReturnValue({
      fetchUsers: jest.fn().mockResolvedValue(undefined),
      getUsersByCompany: jest.fn().mockReturnValue([
        {
          id: "admin-1",
          name: "Ada Admin",
          companyId: "company-1",
          role: "admin",
          systemPermission: "admin",
        },
      ]),
    });

    useTaskStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        tasks: [
          {
            id: "task-1",
            projectId: "project-1",
            title: "Close punch list",
            status: "approved",
            currentStatus: "in_progress",
            completionPercentage: 100,
          },
        ],
        fetchTasks,
      }),
    );

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects: jest.fn(),
        onNavigateToUserManagement: jest.fn(),
        onNavigateToProfile: jest.fn(),
      }),
    );

    const completedTasksCard = result.current.output.topLevelStats.find(
      (card) => card.statId === "completed_tasks",
    );

    expect(completedTasksCard?.value).toBe(1);
  });

  it("wires overview taps and keeps only Dev Admin in quickActions", () => {
    const { useAuthStore } = require("@/state/authStore");
    const { useCompanyStore } = require("@/state/companyStore");
    const { useProjectStoreWithCompanyInit } = require("@/state/projectStore.supabase");
    const { useTaskStore } = require("@/state/taskStore.supabase");
    const { useUserStoreWithInit } = require("@/state/userStore.supabase");

    useAuthStore.mockReturnValue({
      user: {
        id: "admin-1",
        name: "Ada Admin",
        companyId: "company-1",
        role: "admin",
        systemPermission: "admin",
      },
      logout: jest.fn(),
    });
    useCompanyStore.mockReturnValue({
      getCompanyById: jest.fn().mockReturnValue({ id: "company-1", name: "Acme" }),
      getCompanyBanner: jest.fn(),
      updateCompanyBanner: jest.fn(),
    });
    useProjectStoreWithCompanyInit.mockReturnValue({
      userAssignments: [],
      fetchProjects: jest.fn(),
      getProjectsByCompany: jest.fn().mockReturnValue([]),
    });
    useUserStoreWithInit.mockReturnValue({
      fetchUsers: jest.fn(),
      getUsersByCompany: jest.fn().mockReturnValue([]),
    });
    useTaskStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ tasks: [], fetchTasks: jest.fn() }),
    );

    const onNavigateToProjects = jest.fn();
    const onNavigateToUserManagement = jest.fn();
    const onNavigateToDevAdmin = jest.fn();

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects,
        onNavigateToUserManagement,
        onNavigateToProfile: jest.fn(),
        onNavigateToDevAdmin,
      }),
    );

    expect(result.current.output.topLevelStats.find((c) => c.statId === "projects")?.actionId).toBe(
      "projects",
    );
    expect(result.current.output.topLevelStats.find((c) => c.statId === "team")?.actionId).toBe(
      "user_management",
    );
    expect(result.current.output.quickActions.map((a) => a.actionId)).toEqual(["dev_admin"]);
    expect(result.current.output.quickActions[0]?.isVisible).toBe(true);

    result.current.actions.pressQuickAction("projects");
    result.current.actions.pressQuickAction("user_management");
    expect(onNavigateToProjects).toHaveBeenCalled();
    expect(onNavigateToUserManagement).toHaveBeenCalled();
  });
});
