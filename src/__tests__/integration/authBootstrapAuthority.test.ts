describe("auth bootstrap authority", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("boots the supabase-backed stores after login instead of the legacy project store", async () => {
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const legacyInitializeUserData = jest.fn().mockResolvedValue(undefined);

    const signInWithPassword = jest.fn().mockResolvedValue({
      data: {
        user: { id: "user-1" },
      },
      error: null,
    });

    const single = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        name: "Test User",
        email: "user@example.com",
        role: "admin",
        company_id: "company-1",
        is_pending: false,
      },
      error: null,
    });

    const eq = jest.fn(() => ({
      single,
    }));

    const select = jest.fn(() => ({
      eq,
    }));

    const from = jest.fn((table: string) => {
      if (table === "users") {
        return {
          select,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    jest.doMock("../../api/supabase", () => ({
      supabase: {
        auth: {
          signInWithPassword,
          signOut: jest.fn(),
        },
        from,
      },
    }));

    jest.doMock("../../state/projectStore.supabase", () => ({
      useProjectStore: {
        getState: () => ({
          fetchProjects,
          fetchUserProjectAssignments,
        }),
      },
    }));

    jest.doMock("../../state/taskStore.supabase", () => ({
      useTaskStore: {
        getState: () => ({
          fetchTasks,
        }),
      },
    }));

    jest.doMock("../../state/userStore.supabase", () => ({
      useUserStore: {
        getState: () => ({
          fetchUsers,
        }),
      },
    }));

    jest.doMock("../../state/projectStore", () => ({
      useProjectStore: {
        getState: () => ({
          _initializeUserData: legacyInitializeUserData,
        }),
      },
    }));

    const { useAuthStore } = require("../../state/authStore");
    const store = useAuthStore.getState();

    await store.login("user@example.com", "Password123!");

    await jest.advanceTimersByTimeAsync(100);

    expect(fetchProjects).toHaveBeenCalledWith(true);
    expect(fetchUserProjectAssignments).toHaveBeenCalledWith("user-1", true);
    expect(fetchTasks).not.toHaveBeenCalled();
    expect(fetchUsers).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1500);

    expect(fetchTasks).toHaveBeenCalledWith(true);
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(legacyInitializeUserData).not.toHaveBeenCalled();
  });
});
