import { clearWorkspaceSessionState } from "@/state/clearWorkspaceSession";

const mockProjectFilterSetState = jest.fn();
const mockProjectSetState = jest.fn();
const mockTaskSetState = jest.fn();

jest.mock("@/state/projectFilterStore", () => ({
  useProjectFilterStore: {
    setState: (...args: unknown[]) => mockProjectFilterSetState(...args),
  },
}));

jest.mock("@/state/projectStore.supabase", () => ({
  useProjectStore: {
    setState: (...args: unknown[]) => mockProjectSetState(...args),
  },
}));

jest.mock("@/state/taskStore.supabase", () => ({
  useTaskStore: {
    setState: (...args: unknown[]) => mockTaskSetState(...args),
  },
}));

describe("clearWorkspaceSessionState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears selected project, memberships, and in-memory tasks", () => {
    clearWorkspaceSessionState("test");

    expect(mockProjectFilterSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedProjectId: null,
        workspaceReady: false,
        workspaceReadyUserId: null,
      }),
    );
    expect(mockProjectSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        projects: [],
        userAssignments: [],
        projectIdsByUser: {},
      }),
    );
    expect(mockTaskSetState).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: [],
        archivedTasks: [],
        tasksById: {},
      }),
    );
  });
});
