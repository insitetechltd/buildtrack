describe("project sync authority", () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("refreshes projects through the supabase-backed project store", async () => {
    let now = 1000;

    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const supabaseFetchProjects = jest.fn().mockResolvedValue(undefined);
    const supabaseFetchAssignments = jest.fn().mockResolvedValue(undefined);
    const legacyFetchProjects = jest.fn().mockResolvedValue(undefined);
    const legacyFetchAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [{ id: "task-1" }],
      fetchTasks,
    };
    const supabaseProjectStoreState = {
      projects: [{ id: "project-1" }],
      userAssignments: [{ userId: "user-1", projectId: "project-1" }],
      fetchProjects: supabaseFetchProjects,
      fetchUserProjectAssignments: supabaseFetchAssignments,
    };
    const legacyProjectStoreState = {
      projects: [{ id: "legacy-project-1" }],
      userAssignments: [{ userId: "user-1", projectId: "legacy-project-1" }],
      fetchProjects: legacyFetchProjects,
      fetchUserProjectAssignments: legacyFetchAssignments,
    };
    const userStoreState = {
      users: [{ id: "user-1" }],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: "user-1" },
    };

    jest.spyOn(Date, "now").mockImplementation(() => now);

    jest.doMock("../../state/taskStore.supabase", () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock("../../state/projectStore.supabase", () => {
      const useProjectStore = jest.fn(() => supabaseProjectStoreState);
      useProjectStore.getState = () => supabaseProjectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock("../../state/projectStore", () => {
      const useProjectStore = jest.fn(() => legacyProjectStoreState);
      useProjectStore.getState = () => legacyProjectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock("../../state/userStore.supabase", () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });

    jest.doMock("../../state/authStore", () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock("../../api/supabaseSessionGate", () => ({
      getSessionScopedSupabase: jest.fn().mockResolvedValue({}),
    }));

    const { triggerRefresh } = require("../../utils/DataRefreshManager");

    now = 35000;
    await triggerRefresh({ force: true });

    expect(supabaseFetchProjects).toHaveBeenCalledWith(true);
    expect(supabaseFetchAssignments).toHaveBeenCalledWith("user-1", true);
    expect(legacyFetchProjects).not.toHaveBeenCalled();
    expect(legacyFetchAssignments).not.toHaveBeenCalled();
    expect(fetchTasks).toHaveBeenCalledWith(true);
    expect(fetchUsers).toHaveBeenCalledTimes(1);
  });

  it("handles realtime project deletes without calling the legacy delete path", async () => {
    let projectsChangeHandler:
      | ((payload: { eventType: string; old?: { id?: string }; new?: { id?: string } | null }) => Promise<void>)
      | undefined;

    const legacyDeleteProject = jest.fn(() => {
      throw new Error("legacy deleteProject should not be called");
    });
    const supabaseFetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    let supabaseProjectStoreState = {
      projects: [
        { id: "project-delete", name: "Remove me" },
        { id: "project-keep", name: "Keep me" },
      ],
      userAssignments: [
        { userId: "user-1", projectId: "project-delete", isActive: true },
        { userId: "user-1", projectId: "project-keep", isActive: true },
      ],
      fetchProjects: supabaseFetchProjects,
    };

    const setSupabaseProjectStoreState = jest.fn((updater: unknown) => {
      const patch =
        typeof updater === "function"
          ? updater(supabaseProjectStoreState)
          : updater;

      supabaseProjectStoreState = {
        ...supabaseProjectStoreState,
        ...(patch as Record<string, unknown>),
      };
    });

    const authStoreState = {
      user: {
        id: "user-1",
        name: "Test User",
        companyId: "company-1",
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: { eventType: string; old?: { id?: string }; new?: { id?: string } | null }) => Promise<void>,
          ) => {
            if (filter.table === "projects") {
              projectsChangeHandler = callback;
            }

            return channel;
          },
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.("SUBSCRIBED");
          return channel;
        }),
      };

      return channel;
    };

    const removeChannel = jest.fn();

    jest.doMock("../../state/authStore", () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock("../../state/taskStore.supabase", () => {
      const taskStoreState = {
        fetchTaskById: jest.fn(),
      };
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock("../../state/projectStore.supabase", () => {
      const useProjectStore = jest.fn(() => supabaseProjectStoreState);
      useProjectStore.getState = () => supabaseProjectStoreState;
      useProjectStore.setState = setSupabaseProjectStoreState;
      return { useProjectStore };
    });

    jest.doMock("../../state/projectStore", () => {
      const legacyProjectStoreState = {
        fetchProjects: jest.fn(),
        deleteProject: legacyDeleteProject,
      };

      const useProjectStore = jest.fn(() => legacyProjectStoreState);
      useProjectStore.getState = () => legacyProjectStoreState;
      return { useProjectStore };
    });

    jest.doMock("../../state/userStore.supabase", () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock("../../api/supabase", () => ({
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel,
      },
    }));

    jest.doMock("react", () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require("../../utils/RealtimeSyncManager");

    expect(RealtimeSyncManager()).toBeNull();
    expect(projectsChangeHandler).toBeDefined();

    await projectsChangeHandler?.({
      eventType: "DELETE",
      old: { id: "project-delete" },
      new: null,
    });

    expect(legacyDeleteProject).not.toHaveBeenCalled();
    expect(supabaseProjectStoreState.projects).toEqual([{ id: "project-keep", name: "Keep me" }]);
    expect(supabaseProjectStoreState.userAssignments).toEqual([
      { userId: "user-1", projectId: "project-keep", isActive: true },
    ]);
  });
});
