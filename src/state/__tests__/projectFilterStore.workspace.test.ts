import { act } from "@testing-library/react-native";

import { supabase } from "@/api/supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";

jest.mock("@/api/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe("projectFilterStore workspace bootstrap", () => {
  const mockSupabase = supabase as unknown as {
    from: jest.Mock;
  };

  const createDeferred = <T,>() => {
    let resolve!: (value: T) => void;
    let reject!: (error?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useProjectFilterStore.setState({
      selectedProjectId: null,
      lastSelectedProjects: {},
      workspaceReady: false,
      workspaceReadyUserId: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("restores the last selected project into the active workspace", async () => {
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: { last_selected_project_id: "project-west" },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBe("project-west");
    expect(useProjectFilterStore.getState().workspaceReady).toBe(true);
  });

  it("marks the workspace ready even when no stored project exists", async () => {
    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: { last_selected_project_id: null },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBeNull();
    expect(useProjectFilterStore.getState().workspaceReady).toBe(true);
  });

  it("clears a stale selected project when no restored project exists for the current user", async () => {
    useProjectFilterStore.setState({
      selectedProjectId: "stale-project",
      lastSelectedProjects: {
        "other-user": "project-elsewhere",
      },
      workspaceReady: false,
      workspaceReadyUserId: null,
    });

    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: { last_selected_project_id: null },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBeNull();
    expect(useProjectFilterStore.getState().workspaceReady).toBe(true);
  });

  it("does not reuse a same-user local fallback when the database returns no saved project", async () => {
    useProjectFilterStore.setState({
      selectedProjectId: "stale-project",
      lastSelectedProjects: {
        "user-1": "local-project",
      },
      workspaceReady: false,
      workspaceReadyUserId: null,
    });

    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValue({
      data: { last_selected_project_id: null },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBeNull();
    expect(useProjectFilterStore.getState().workspaceReadyUserId).toBe("user-1");
    expect(useProjectFilterStore.getState().lastSelectedProjects["user-1"]).toBeUndefined();
  });

  it("does not restore a cleared local fallback on a later offline bootstrap attempt", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});

    useProjectFilterStore.setState({
      selectedProjectId: "stale-project",
      lastSelectedProjects: {
        "user-1": "local-project",
      },
      workspaceReady: false,
      workspaceReadyUserId: null,
    });

    const select = jest.fn().mockReturnThis();
    const eq = jest.fn().mockReturnThis();
    const single = jest.fn().mockResolvedValueOnce({
      data: { last_selected_project_id: null },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select,
      eq,
      single,
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    mockSupabase.from.mockImplementation(() => {
      throw new Error("offline");
    });

    await act(async () => {
      await useProjectFilterStore.getState().initializeWorkspaceProject("user-1");
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBeNull();
    expect(useProjectFilterStore.getState().lastSelectedProjects["user-1"]).toBeUndefined();
  });

  it("keeps only the latest workspace bootstrap result when requests resolve out of order", async () => {
    const firstUser = createDeferred<{
      data: { last_selected_project_id: string | null };
      error: null;
    }>();
    const secondUser = createDeferred<{
      data: { last_selected_project_id: string | null };
      error: null;
    }>();

    mockSupabase.from.mockImplementation(() => {
      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((_field: string, userId: string) => ({
          single: jest.fn().mockImplementation(() => {
            if (userId === "user-1") {
              return firstUser.promise;
            }

            return secondUser.promise;
          }),
        })),
      };

      return query;
    });

    await act(async () => {
      const firstBootstrap = useProjectFilterStore
        .getState()
        .initializeWorkspaceProject("user-1");
      const secondBootstrap = useProjectFilterStore
        .getState()
        .initializeWorkspaceProject("user-2");

      firstUser.resolve({
        data: { last_selected_project_id: "project-alpha" },
        error: null,
      });
      secondUser.resolve({
        data: { last_selected_project_id: "project-bravo" },
        error: null,
      });

      await Promise.all([firstBootstrap, secondBootstrap]);
    });

    expect(useProjectFilterStore.getState().selectedProjectId).toBe("project-bravo");
    expect(useProjectFilterStore.getState().workspaceReadyUserId).toBe("user-2");
    expect(useProjectFilterStore.getState().workspaceReady).toBe(true);
  });

  it("does not persist transient workspace readiness fields", () => {
    const partialize = useProjectFilterStore.persist.getOptions().partialize;

    const persistedState = partialize?.({
      ...useProjectFilterStore.getState(),
      workspaceReady: true,
      workspaceReadyUserId: "user-1",
    });

    expect(persistedState).toBeDefined();
    expect(persistedState).not.toHaveProperty("workspaceReady");
    expect(persistedState).not.toHaveProperty("workspaceReadyUserId");
  });
});
