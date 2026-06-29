import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { Project, User } from "@/types/buildtrack";
import { useProjectsViewAdapter } from "../useProjectsViewAdapter";

jest.useFakeTimers();

jest.mock("@/state/authStore", () => ({
  useAuthStore: jest.fn(),
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: jest.fn(),
}));

jest.mock("@/state/userStore.supabase", () => ({
  useUserStoreWithInit: jest.fn(),
}));

jest.mock("@/utils/useTranslation", () => ({
  useTranslation: () => ({
    projects: {
      active: "Active",
      planning: "Planning",
      onHold: "On Hold",
      completed: "Completed",
      cancelled: "Cancelled",
      all: "All",
      project: "project",
      projectsPlural: "projects",
      assignedToYou: "assigned to you",
      noLocation: "No location",
      member: "member",
      members: "members",
      budget: "Budget",
      unknown: "Unknown",
      noProjects: "No projects yet",
      noProjectsFound: "No projects found",
      tryAdjustingSearch: "Try adjusting your search or filters",
      createFirstProject: "Create your first project to get started",
      noProjectsMessage: "You haven't been assigned to any projects yet",
      projectUpdated: "Project updated successfully",
    },
    errors: {
      success: "Success",
    },
  }),
}));

jest.mock("@/utils/dateFormatter", () => ({
  useDateFormatter: () => ({
    formatDateShort: (value: string | Date) =>
      value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10),
  }),
}));

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    companyId: "company-1",
    name: "North Tower",
    description: "Core package",
    status: "active",
    location: "Site A",
    createdBy: "user-2",
    clientInfo: { name: "Acme" },
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Alex Builder",
    role: "admin",
    companyId: "company-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isActive: true,
    ...overrides,
  } as User;
}

describe("useProjectsViewAdapter", () => {
  const mockFetchProjects = jest.fn();
  const mockFetchUsers = jest.fn();
  const mockFetchUserProjectAssignments = jest.fn();
  const mockFetchProjectUserAssignments = jest.fn();
  const mockGetProjectsByCompany = jest.fn();
  const mockGetProjectsByUser = jest.fn();
  const mockGetProjectStats = jest.fn();
  const mockGetLeadPMForProject = jest.fn();
  const mockUpdateProject = jest.fn();
  const mockGetUserById = jest.fn();

  function setup({
    user = buildUser(),
    companyProjects = [buildProject()],
    userProjects = [buildProject()],
    users = [
      buildUser({ id: "user-2", name: "Taylor Rivera" }),
      buildUser({ id: "user-3", name: "Jordan Lee" }),
    ],
    fetchProjectsImpl,
    fetchUsersImpl,
    fetchUserProjectAssignmentsImpl,
  }: {
    user?: User | null;
    companyProjects?: Project[];
    userProjects?: Project[];
    users?: User[];
    fetchProjectsImpl?: () => Promise<void>;
    fetchUsersImpl?: () => Promise<void>;
    fetchUserProjectAssignmentsImpl?: () => Promise<void>;
  } = {}) {
    const { useAuthStore } = require("@/state/authStore");
    const { useProjectStoreWithCompanyInit } = require("@/state/projectStore.supabase");
    const { useUserStoreWithInit } = require("@/state/userStore.supabase");

    useAuthStore.mockReturnValue({ user });

    mockFetchProjects.mockImplementation(
      fetchProjectsImpl ?? (() => Promise.resolve(undefined)),
    );
    mockFetchUsers.mockImplementation(fetchUsersImpl ?? (() => Promise.resolve(undefined)));
    mockFetchUserProjectAssignments.mockImplementation(
      fetchUserProjectAssignmentsImpl ?? (() => Promise.resolve(undefined)),
    );
    mockFetchProjectUserAssignments.mockResolvedValue(undefined);
    mockGetProjectsByCompany.mockImplementation(() => companyProjects);
    mockGetProjectsByUser.mockImplementation(() => userProjects);
    mockGetProjectStats.mockReturnValue({
      totalUsers: 3,
      usersByCategory: {
        admin: 0,
        lead_project_manager: 1,
        project_manager: 1,
        team_member: 1,
      },
      isActive: true,
    });
    mockGetLeadPMForProject.mockReturnValue("user-3");
    mockUpdateProject.mockResolvedValue(undefined);
    mockGetUserById.mockImplementation((userId: string) => users.find((candidate) => candidate.id === userId) ?? null);

    useProjectStoreWithCompanyInit.mockImplementation(() => ({
      fetchProjects: mockFetchProjects,
      fetchProjectUserAssignments: mockFetchProjectUserAssignments,
      fetchUserProjectAssignments: mockFetchUserProjectAssignments,
      getProjectsByCompany: mockGetProjectsByCompany,
      getProjectsByUser: mockGetProjectsByUser,
      getProjectStats: mockGetProjectStats,
      getLeadPMForProject: mockGetLeadPMForProject,
      get projects() {
        return companyProjects;
      },
      get userAssignments() {
        return userProjects.map((project) => ({
          userId: user?.id ?? "user-1",
          projectId: project.id,
        }));
      },
      updateProject: mockUpdateProject,
    }));

    useUserStoreWithInit.mockReturnValue({
      fetchUsers: mockFetchUsers,
      getUserById: mockGetUserById,
      get users() {
        return users;
      },
    });

    return {
      setCompanyProjects(nextProjects: Project[]) {
        companyProjects = nextProjects;
      },
      setUserProjects(nextProjects: Project[]) {
        userProjects = nextProjects;
      },
      setUsers(nextUsers: User[]) {
        users = nextUsers;
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("scopes projects to the company for admins", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [
        buildProject({ id: "project-company-1", name: "Company Alpha" }),
        buildProject({ id: "project-company-2", name: "Company Beta" }),
      ],
      userProjects: [buildProject({ id: "project-user-1", name: "Assigned Only" })],
    });

    const { result, rerender } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalled();
    });

    expect(result.current.output.isAdmin).toBe(true);
    expect(mockGetProjectsByCompany).toHaveBeenCalledWith("company-1");
    expect(mockGetProjectsByUser).not.toHaveBeenCalledWith("user-1");
    expect(result.current.output.projectItems.map((item) => item.projectId)).toEqual([
      "project-company-1",
      "project-company-2",
    ]);
    expect(result.current.output.projectCountLabel).toBe("2 projects");
  });

  it("exposes minimal shell render-state models for header actions and project status tone", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [buildProject({ status: "active" })],
    });

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems).toHaveLength(1);
    });

    expect(result.current.output.headerActions).toEqual({
      showCreateAction: true,
      showUserManagementAction: true,
    });
    expect(result.current.output.projectItems[0].statusTone).toBe("success");
  });

  it("scopes projects to assigned work for non-admin users and labels the count", async () => {
    setup({
      user: buildUser({ role: "member" }),
      companyProjects: [buildProject({ id: "project-company-1", name: "Company Alpha" })],
      userProjects: [buildProject({ id: "project-user-1", name: "Assigned Only" })],
    });

    const { result, rerender } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalled();
    });

    expect(result.current.output.isAdmin).toBe(false);
    expect(mockGetProjectsByUser).toHaveBeenCalledWith("user-1");
    expect(result.current.output.projectItems.map((item) => item.projectId)).toEqual([
      "project-user-1",
    ]);
    expect(result.current.output.projectCountLabel).toBe("1 project assigned to you");
  });

  it("filters the visible projects by search query and status", async () => {
    setup({
      companyProjects: [
        buildProject({
          id: "project-1",
          name: "North Tower",
          description: "Concrete core package",
          status: "active",
        }),
        buildProject({
          id: "project-2",
          name: "South Annex",
          description: "Mechanical fit out",
          status: "planning",
        }),
        buildProject({
          id: "project-3",
          name: "East Yard",
          description: "Pipe staging area",
          status: "active",
        }),
      ],
    });

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems).toHaveLength(3);
    });

    act(() => {
      result.current.actions.setSearchQuery("pipe");
    });

    expect(result.current.output.projectItems.map((item) => item.projectId)).toEqual([
      "project-3",
    ]);
    expect(result.current.output.projectCountLabel).toBe("1 project");

    act(() => {
      result.current.actions.setSearchQuery("");
      result.current.actions.selectStatusFilter("planning");
    });

    expect(result.current.output.projectItems.map((item) => item.projectId)).toEqual([
      "project-2",
    ]);
    expect(result.current.output.projectCountLabel).toBe("1 project");
  });

  it("treats a whitespace-only search query as empty for the projects empty state", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [],
      userProjects: [],
    });

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.continuity.shouldRenderEmptyState).toBe(true);
    });

    act(() => {
      result.current.actions.setSearchQuery("   ");
    });

    expect(result.current.output.emptyState).toMatchObject({
      title: "No projects yet",
      message: "Create your first project to get started",
      showCreateAction: true,
    });
  });

  it("preserves cached continuity while verifying a newProjectId and resolves to the new project", async () => {
    const deferredFetchProjects = createDeferred<void>();
    const deferredFetchUsers = createDeferred<void>();
    const deferredAssignments = createDeferred<void>();

    const controls = setup({
      companyProjects: [buildProject({ id: "project-existing", name: "Existing Project" })],
      fetchProjectsImpl: () => deferredFetchProjects.promise,
      fetchUsersImpl: () => deferredFetchUsers.promise,
      fetchUserProjectAssignmentsImpl: () => deferredAssignments.promise,
    });

    const { result, rerender } = renderHook(
      ({ newProjectId }: { newProjectId?: string }) =>
        useProjectsViewAdapter({ newProjectId }),
      {
        initialProps: { newProjectId: undefined },
      },
    );

    await waitFor(() => {
      expect(result.current.output.projectItems[0].projectId).toBe("project-existing");
    });

    rerender({ newProjectId: "project-new" });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.output.continuity.hasCachedFrame).toBe(true);
    expect(result.current.output.continuity.isInitialLoading).toBe(false);
    expect(result.current.output.projectItems[0].projectId).toBe("project-existing");

    controls.setCompanyProjects([
      buildProject({ id: "project-existing", name: "Existing Project" }),
      buildProject({ id: "project-new", name: "New Project" }),
    ]);

    await act(async () => {
      deferredFetchProjects.resolve(undefined);
      deferredFetchUsers.resolve(undefined);
      deferredAssignments.resolve(undefined);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.output.projectItems.map((item) => item.projectId)).toContain(
        "project-new",
      );
    });
  });

  it("forces fetchProjects(true) when a different newProjectId is provided", async () => {
    const controls = setup({
      companyProjects: [buildProject({ id: "project-existing", name: "Existing Project" })],
    });

    const { rerender } = renderHook(
      ({ newProjectId }: { newProjectId?: string }) =>
        useProjectsViewAdapter({ newProjectId }),
      {
        initialProps: { newProjectId: undefined },
      },
    );

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    });
    expect(mockFetchProjects).toHaveBeenNthCalledWith(1, false);
    expect(mockFetchUserProjectAssignments).toHaveBeenNthCalledWith(1, "user-1");

    controls.setCompanyProjects([
      buildProject({ id: "project-existing", name: "Existing Project" }),
      buildProject({ id: "project-alpha", name: "Alpha Project" }),
    ]);

    rerender({ newProjectId: "project-alpha" });

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalledTimes(2);
    });
    expect(mockFetchProjects).toHaveBeenNthCalledWith(2, true);
    expect(mockFetchUserProjectAssignments).toHaveBeenNthCalledWith(
      2,
      "user-1",
      true,
    );

    controls.setCompanyProjects([
      buildProject({ id: "project-existing", name: "Existing Project" }),
      buildProject({ id: "project-alpha", name: "Alpha Project" }),
      buildProject({ id: "project-beta", name: "Beta Project" }),
    ]);

    rerender({ newProjectId: "project-beta" });

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalledTimes(3);
    });
    expect(mockFetchProjects).toHaveBeenNthCalledWith(3, true);
    expect(mockFetchUserProjectAssignments).toHaveBeenNthCalledWith(
      3,
      "user-1",
      true,
    );
  });

  it("does not retry an empty project list when newProjectId is absent so empty state is ready immediately", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [],
      userProjects: [],
    });

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.output.continuity.isInitialLoading).toBe(false);
      expect(result.current.output.continuity.shouldRenderEmptyState).toBe(true);
      expect(result.current.output.continuity.freshnessLabel).toBe("Ready");
      expect(result.current.output.projectItems).toEqual([]);
      expect(result.current.output.emptyState).toMatchObject({
        title: "No projects yet",
        showCreateAction: true,
      });
    });

    expect(mockFetchUsers).toHaveBeenCalledTimes(1);
    expect(mockFetchUserProjectAssignments).toHaveBeenCalledTimes(1);
  });

  it("refreshes users so derived project labels update after a manual refresh", async () => {
    const controls = setup();

    const { result, rerender } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems[0].createdByLabel).toBe("Taylor Rivera");
    });

    controls.setUsers([
      buildUser({ id: "user-2", name: "Updated Creator" }),
      buildUser({ id: "user-3", name: "Updated Lead PM" }),
    ]);

    await act(async () => {
      await result.current.actions.handleRefresh();
    });

    await waitFor(() => {
      expect(mockFetchUsers).toHaveBeenCalledTimes(2);
    });
    expect(mockFetchProjects).toHaveBeenNthCalledWith(2, true);
    expect(mockFetchUserProjectAssignments).toHaveBeenNthCalledWith(
      2,
      "user-1",
      true,
    );

    rerender();

    expect(result.current.output.projectItems[0]).toMatchObject({
      createdByLabel: "Updated Creator",
      leadPmName: "Updated Lead PM",
    });
  });

  it("hydrates project-wide assignments for every visible admin project during the initial load", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [
        buildProject({ id: "project-alpha", name: "Project Alpha" }),
        buildProject({ id: "project-beta", name: "Project Beta" }),
      ],
    });

    renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(mockFetchProjectUserAssignments).toHaveBeenCalledTimes(2);
    });

    expect(mockFetchProjectUserAssignments).toHaveBeenNthCalledWith(1, "project-alpha");
    expect(mockFetchProjectUserAssignments).toHaveBeenNthCalledWith(2, "project-beta");
  });

  it("rehydrates project-wide assignments for the visible project set during manual refresh", async () => {
    setup({
      user: buildUser({ role: "admin" }),
      companyProjects: [
        buildProject({ id: "project-alpha", name: "Project Alpha" }),
        buildProject({ id: "project-beta", name: "Project Beta" }),
      ],
    });

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(mockFetchProjectUserAssignments).toHaveBeenCalledTimes(2);
    });

    mockFetchProjectUserAssignments.mockClear();

    await act(async () => {
      await result.current.actions.handleRefresh();
    });

    expect(mockFetchProjectUserAssignments).toHaveBeenCalledTimes(2);
    expect(mockFetchProjectUserAssignments).toHaveBeenNthCalledWith(1, "project-alpha", true);
    expect(mockFetchProjectUserAssignments).toHaveBeenNthCalledWith(2, "project-beta", true);
  });

  it("keeps the edit modal open after saveEditedProject resolves and waits for explicit success finalization", async () => {
    const deferredUpdate = createDeferred<void>();
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    setup();
    mockUpdateProject.mockImplementation(() => deferredUpdate.promise);

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems).toHaveLength(1);
    });

    act(() => {
      result.current.actions.openEditProject("project-1");
    });

    expect(result.current.output.isEditModalVisible).toBe(true);

    act(() => {
      result.current.actions.saveEditedProject(buildProject({ id: "project-1" }));
    });

    expect(mockUpdateProject).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({ id: "project-1" }),
    );
    expect(result.current.output.isEditModalVisible).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();

    await act(async () => {
      deferredUpdate.resolve(undefined);
      await deferredUpdate.promise;
    });

    expect(result.current.output.isEditModalVisible).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("closes the edit modal and alerts success only when explicit save finalization runs", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    setup();

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems).toHaveLength(1);
    });

    act(() => {
      result.current.actions.openEditProject("project-1");
    });

    expect(result.current.output.isEditModalVisible).toBe(true);

    act(() => {
      result.current.actions.completeEditedProjectSave();
    });

    expect(result.current.output.isEditModalVisible).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith("Success", "Project updated successfully");

    alertSpy.mockRestore();
  });

  it("rejects saveEditedProject when updateProject fails and keeps the edit modal open", async () => {
    const updateError = new Error("Update failed");
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    setup();
    mockUpdateProject.mockRejectedValue(updateError);

    const { result } = renderHook(() => useProjectsViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.projectItems).toHaveLength(1);
    });

    act(() => {
      result.current.actions.openEditProject("project-1");
    });

    expect(result.current.output.isEditModalVisible).toBe(true);

    await expect(
      result.current.actions.saveEditedProject(buildProject({ id: "project-1" })),
    ).rejects.toThrow("Update failed");

    expect(result.current.output.isEditModalVisible).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "ProjectsScreen: Failed to update project:",
      updateError,
    );

    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}
