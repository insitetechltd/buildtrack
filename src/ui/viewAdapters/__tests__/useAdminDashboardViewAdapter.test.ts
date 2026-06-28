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
});
