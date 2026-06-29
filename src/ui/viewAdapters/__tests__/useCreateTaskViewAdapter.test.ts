import { act, renderHook } from "@testing-library/react-native";

import { useCreateTaskViewAdapter } from "../useCreateTaskViewAdapter";

const mockCreateTask = jest.fn();
const mockCreateSubTask = jest.fn();
const mockUpdateTask = jest.fn();

jest.mock("../../../state/taskStore.supabase", () => ({
  useTaskStore: () => ({
    tasks: [],
    fetchTaskById: jest.fn(),
    createTask: mockCreateTask,
    createSubTask: mockCreateSubTask,
    updateTask: mockUpdateTask,
  }),
}));

jest.mock("../../../state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", companyId: "company-1" },
  }),
}));

jest.mock("../../../state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectsByUser: jest.fn().mockReturnValue([]),
    getProjectUserAssignments: jest.fn().mockReturnValue([]),
    fetchProjectUserAssignments: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("../../../state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUsersByRole: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock("../../../utils/useFileUpload", () => ({
  useFileUpload: () => ({
    isUploading: false,
  }),
}));

jest.mock("../../../utils/usePhotoSelection", () => ({
  usePhotoSelection: () => ({
    selectedPhotos: [],
  }),
}));

jest.mock("../../../hooks/useTaskLLMAssistant", () => ({
  useTaskLLMAssistant: () => ({
    suggestTaskFromText: jest.fn(),
    isLoading: false,
    lastSuggestion: null,
    clearSuggestion: jest.fn(),
  }),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("useCreateTaskViewAdapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTask.mockResolvedValue("task-1");
    mockCreateSubTask.mockResolvedValue("subtask-1");
    mockUpdateTask.mockResolvedValue(undefined);
  });

  it("creates subtasks without requiring a legacy updates payload", async () => {
    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({
        parentTaskId: "parent-1",
      }),
    );

    act(() => {
      result.current.actions.updateField("title", "Subtask");
      result.current.actions.updateField("description", "Install brackets");
      result.current.actions.updateField("projectId", "project-1");
      result.current.actions.updateField("assignedTo", ["user-2"]);
    });

    await act(async () => {
      await result.current.actions.submit();
    });

    expect(mockCreateSubTask).toHaveBeenCalledWith(
      "parent-1",
      expect.objectContaining({
        title: "Subtask",
        description: "Install brackets",
        projectId: "project-1",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    );
    expect(mockCreateSubTask.mock.calls[0][1]).not.toHaveProperty("updates");
  });
});
