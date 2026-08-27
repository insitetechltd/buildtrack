import { renderHook } from "@testing-library/react-native";

import {
  countAdminDashboardTeamHeadcount,
  useAdminDashboardViewAdapter,
} from "../useAdminDashboardViewAdapter";

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

const PROJECT_STAGE_IDS = ["planning", "active", "completed", "cancelled"];

function mockAdminStores(options?: {
  projects?: Array<{ id: string; createdBy: string; status: string }>;
  users?: Array<{
    id: string;
    name: string;
    companyId: string;
    role: string;
    systemPermission?: string;
  }>;
  assignments?: Array<{ userId: string; projectId: string; isActive: boolean }>;
}) {
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
    getCompanyById: jest.fn().mockReturnValue({
      id: "company-1",
      name: "Acme Contracting",
    }),
    getCompanyBanner: jest.fn().mockReturnValue(undefined),
    updateCompanyBanner: jest.fn(),
    ensureCompanyLoaded: jest.fn().mockResolvedValue(null),
  });

  useProjectStoreWithCompanyInit.mockReturnValue({
    userAssignments: options?.assignments ?? [],
    fetchProjects: jest.fn().mockResolvedValue(undefined),
    getProjectsByCompany: jest.fn().mockReturnValue(
      options?.projects ?? [
        {
          id: "project-1",
          createdBy: "admin-1",
          status: "active",
        },
      ],
    ),
  });

  useUserStoreWithInit.mockReturnValue({
    fetchUsers: jest.fn().mockResolvedValue(undefined),
    getUsersByCompany: jest.fn().mockReturnValue(
      options?.users ?? [
        {
          id: "admin-1",
          name: "Ada Admin",
          companyId: "company-1",
          role: "admin",
          systemPermission: "admin",
        },
      ],
    ),
  });

  useTaskStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({
      tasks: [],
      fetchTasks: jest.fn().mockResolvedValue(undefined),
    }),
  );
}

describe("countAdminDashboardTeamHeadcount", () => {
  it("counts default CA as Worker; CA with deployableSeat=pm as PM; managers as PM; members as Worker", () => {
    const result = countAdminDashboardTeamHeadcount(
      [
        { id: "ca-default", role: "admin", systemPermission: "admin", isActive: true },
        {
          id: "ca-pm",
          role: "admin",
          systemPermission: "admin",
          deployableSeat: "pm",
          isActive: true,
        },
        { id: "pm-1", role: "manager", systemPermission: "manager", isActive: true },
        { id: "worker-1", role: "member", systemPermission: "member", isActive: true },
      ],
      // Place-on-a-job must not change seat class
      [{ userId: "ca-default", isActive: true }],
    );

    expect(result).toEqual({ pmCount: 2, workerCount: 2 });
  });
});

describe("useAdminDashboardViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes project stage tiles (not task totals) on Projects", () => {
    mockAdminStores({
      projects: [
        { id: "p-active", createdBy: "admin-1", status: "active" },
        { id: "p-plan", createdBy: "admin-1", status: "planning" },
        { id: "p-legacy-hold", createdBy: "admin-1", status: "on_hold" as "active" },
      ],
    });

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects: jest.fn(),
        onNavigateToUserManagement: jest.fn(),
        onNavigateToProfile: jest.fn(),
      }),
    );

    const sectionIds = result.current.output.topLevelStats.map((card) => card.statId);
    expect(sectionIds).toEqual(["company_plan", "projects", "team"]);
    expect(sectionIds).not.toContain("completed_tasks");
    expect(sectionIds).not.toContain("admins");

    const projectsCard = result.current.output.topLevelStats.find(
      (card) => card.statId === "projects",
    );
    expect(projectsCard?.value).toBe(3);
    expect(projectsCard?.hidePrimaryValue).toBe(true);
    expect(projectsCard?.subtitle).toBeUndefined();
    expect(projectsCard?.ctaLabel).toBe("View all");
    expect(projectsCard?.secondaryLayout).toBe("stage_tiles");
    expect(projectsCard?.secondaryStats?.map((stat) => stat.id)).toEqual(PROJECT_STAGE_IDS);
    expect(projectsCard?.secondaryStats).toEqual(
      expect.arrayContaining([
        { id: "planning", label: "Planning", value: 1 },
        { id: "active", label: "On-going", value: 2 },
        { id: "completed", label: "Completed", value: 0 },
        { id: "cancelled", label: "Cancelled", value: 0 },
      ]),
    );
    expect(projectsCard?.secondaryStats?.some((stat) => stat.id === "on_hold")).toBe(false);
    expect(projectsCard?.secondaryStats?.some((stat) => stat.id === "completed_tasks")).toBe(
      false,
    );
  });

  it("counts default CA under Workers on Team Members tiles", () => {
    mockAdminStores({
      users: [
        {
          id: "admin-1",
          name: "Ada Admin",
          companyId: "company-1",
          role: "admin",
          systemPermission: "admin",
        },
        {
          id: "pm-1",
          name: "Pat Manager",
          companyId: "company-1",
          role: "manager",
          systemPermission: "manager",
        },
        {
          id: "worker-1",
          name: "Wes Worker",
          companyId: "company-1",
          role: "member",
          systemPermission: "member",
        },
      ],
      assignments: [],
    });

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects: jest.fn(),
        onNavigateToUserManagement: jest.fn(),
        onNavigateToProfile: jest.fn(),
      }),
    );

    const teamCard = result.current.output.topLevelStats.find((card) => card.statId === "team");
    expect(teamCard).toMatchObject({
      value: 3,
      hidePrimaryValue: true,
      secondaryLayout: "stage_tiles",
      secondaryStats: [
        { id: "pm", label: "PMs", value: 1 },
        { id: "worker", label: "Workers", value: 2 },
      ],
    });
    expect(teamCard?.subtitle).toBeUndefined();
  });

  it("still counts CA as Worker after project assignment (Place ≠ seat)", () => {
    mockAdminStores({
      users: [
        {
          id: "admin-1",
          name: "Ada Admin",
          companyId: "company-1",
          role: "admin",
          systemPermission: "admin",
        },
        {
          id: "worker-1",
          name: "Wes Worker",
          companyId: "company-1",
          role: "member",
          systemPermission: "member",
        },
      ],
      assignments: [{ userId: "admin-1", projectId: "project-1", isActive: true }],
    });

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects: jest.fn(),
        onNavigateToUserManagement: jest.fn(),
        onNavigateToProfile: jest.fn(),
      }),
    );

    const teamCard = result.current.output.topLevelStats.find((card) => card.statId === "team");
    expect(teamCard?.secondaryStats).toEqual([
      { id: "pm", label: "PMs", value: 0 },
      { id: "worker", label: "Workers", value: 2 },
    ]);
  });

  it("counts CA with deployableSeat=pm under PMs on Team Members tiles", () => {
    mockAdminStores({
      users: [
        {
          id: "admin-1",
          name: "Ada Admin",
          companyId: "company-1",
          role: "admin",
          systemPermission: "admin",
          deployableSeat: "pm",
        },
        {
          id: "worker-1",
          name: "Wes Worker",
          companyId: "company-1",
          role: "member",
          systemPermission: "member",
        },
      ],
      assignments: [],
    });

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects: jest.fn(),
        onNavigateToUserManagement: jest.fn(),
        onNavigateToProfile: jest.fn(),
      }),
    );

    const teamCard = result.current.output.topLevelStats.find((card) => card.statId === "team");
    expect(teamCard?.secondaryStats).toEqual([
      { id: "pm", label: "PMs", value: 1 },
      { id: "worker", label: "Workers", value: 1 },
    ]);
  });

  it("wires overview taps and keeps only Dev Admin in quickActions", () => {
    mockAdminStores({ projects: [], users: [], assignments: [] });

    const { useCompanyStore } = require("@/state/companyStore");
    useCompanyStore.mockReturnValue({
      getCompanyById: jest.fn().mockReturnValue({ id: "company-1", name: "Acme" }),
      getCompanyBanner: jest.fn(),
      updateCompanyBanner: jest.fn(),
      ensureCompanyLoaded: jest.fn().mockResolvedValue(null),
    });

    const onNavigateToProjects = jest.fn();
    const onNavigateToUserManagement = jest.fn();
    const onNavigateToCompanyPlan = jest.fn();
    const onNavigateToDevAdmin = jest.fn();

    const { result } = renderHook(() =>
      useAdminDashboardViewAdapter({
        onNavigateToProjects,
        onNavigateToUserManagement,
        onNavigateToProfile: jest.fn(),
        onNavigateToCompanyPlan,
        onNavigateToDevAdmin,
      }),
    );

    expect(result.current.output.topLevelStats.find((c) => c.statId === "company_plan")).toMatchObject({
      label: "Company Plan",
      value: "Acme",
      subtitle: "Plan & seats",
      actionId: "company_plan",
      ctaLabel: "Manage",
      icon: "business-outline",
    });
    expect(result.current.output.topLevelStats.find((c) => c.statId === "projects")).toMatchObject({
      actionId: "projects",
      ctaLabel: "View all",
      hidePrimaryValue: true,
      secondaryLayout: "stage_tiles",
      icon: "folder-open-outline",
    });
    expect(result.current.output.topLevelStats.find((c) => c.statId === "team")).toMatchObject({
      actionId: "user_management",
      ctaLabel: "Manage",
      secondaryLayout: "stage_tiles",
      icon: "people-outline",
    });
    expect(result.current.output.topLevelStats.map((c) => c.statId)).toEqual([
      "company_plan",
      "projects",
      "team",
    ]);
    expect(result.current.output.topLevelStats.some((c) => c.statId === "completed_tasks")).toBe(
      false,
    );
    expect(result.current.output.topLevelStats.some((c) => c.statId === "admins")).toBe(false);
    expect(result.current.output.quickActions.map((a) => a.actionId)).toEqual(["dev_admin"]);
    expect(result.current.output.quickActions[0]?.isVisible).toBe(true);

    result.current.actions.pressQuickAction("company_plan");
    result.current.actions.pressQuickAction("projects");
    result.current.actions.pressQuickAction("user_management");
    expect(onNavigateToCompanyPlan).toHaveBeenCalled();
    expect(onNavigateToProjects).toHaveBeenCalled();
    expect(onNavigateToUserManagement).toHaveBeenCalled();
  });
});
