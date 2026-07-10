import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useCreateTaskViewAdapter } from "../useCreateTaskViewAdapter";

const mockCreateTask = jest.fn();
const mockCreateSubTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockFetchTaskById = jest.fn();
const mockFetchProjectLocations = jest.fn();
const mockEnsureProjectLocation = jest.fn();
const mockGetAllUsers = jest.fn();
const mockGetProjectsByUser = jest.fn();
const mockGetProjectUserAssignments = jest.fn();
const mockFetchProjectUserAssignments = jest.fn();
const mockUseTaskStore = jest.fn();
const mockUseProjectFilterStore = jest.fn();

jest.mock("../../../state/taskStore.supabase", () => ({
  useTaskStore: () => mockUseTaskStore(),
}));

jest.mock("../../../state/authStore", () => ({
  useAuthStore: () => ({
    user: { id: "user-1", companyId: "company-1" },
  }),
}));

jest.mock("../../../state/projectStore.supabase", () => ({
  useProjectStoreWithCompanyInit: () => ({
    getProjectsByUser: mockGetProjectsByUser,
    getProjectUserAssignments: mockGetProjectUserAssignments,
    fetchProjectUserAssignments: mockFetchProjectUserAssignments,
  }),
}));

jest.mock("../../../state/userStore.supabase", () => ({
  useUserStoreWithInit: () => ({
    getUsersByRole: jest.fn().mockReturnValue([]),
    getAllUsers: mockGetAllUsers,
  }),
}));

jest.mock("../../../state/projectFilterStore", () => ({
  useProjectFilterStore: (selector?: (state: { selectedProjectId: string | null }) => unknown) => {
    const state = mockUseProjectFilterStore();
    return selector ? selector(state) : state;
  },
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

jest.mock("../../../utils/useTranslation", () => ({
  useTranslation: () => ({
    createTask: {
      editTask: "Edit Task",
      createSubTask: "Create Sub-Task",
      nestedSubTask: "Nested Sub-Task",
      createNewTask: "Create New Task",
      nestedUnder: "Nested under:",
      subTaskOf: "Sub-task of:",
      addNewLocation: "Add new location",
    },
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
    mockFetchTaskById.mockResolvedValue(undefined);
    mockFetchProjectLocations.mockResolvedValue([]);
    mockEnsureProjectLocation.mockResolvedValue(undefined);
    mockGetProjectsByUser.mockReturnValue([]);
    mockGetProjectUserAssignments.mockReturnValue([]);
    mockFetchProjectUserAssignments.mockResolvedValue(undefined);
    mockGetAllUsers.mockReturnValue([]);
    mockUseProjectFilterStore.mockReturnValue({
      selectedProjectId: null,
    });
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchProjectLocations: mockFetchProjectLocations,
      ensureProjectLocation: mockEnsureProjectLocation,
    });
  });

  it("hydrates draft form data from AsyncStorage for create mode", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    AsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        title: "Draft title",
        description: "Draft description",
        taskReference: "DRAFT-1",
        billingStatus: "billable",
        priority: "high",
        category: "electrical",
        dueDate: "2099-02-02T00:00:00.000Z",
        locationOnSite: "Level 3 - South Core",
        assignedTo: ["user-2"],
        attachments: ["https://example.com/draft.jpg"],
        projectId: "project-1",
      }),
    );

    const { result } = renderHook(() => useCreateTaskViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.formData.title).toBe("Draft title");
    });

    expect(result.current.output.formData.dueDate.toISOString()).toBe("2099-02-02T00:00:00.000Z");
    expect(result.current.output.formData.projectId).toBe("project-1");
    expect(result.current.output.formData.locationOnSite).toBe("Level 3 - South Core");
    expect(result.current.output.formData.assignedTo).toEqual(["user-2"]);
  });

  it("treats clearFormTimestamp as a one-shot reset trigger", async () => {
    const { result, rerender } = renderHook(
      ({
        clearForm,
        clearFormTimestamp,
      }: {
        clearForm?: boolean;
        clearFormTimestamp?: number;
      }) =>
        useCreateTaskViewAdapter({
          clearForm,
          clearFormTimestamp,
        }),
      {
        initialProps: {
          clearForm: false,
          clearFormTimestamp: undefined,
        },
      },
    );

    act(() => {
      result.current.actions.updateField("title", "First draft");
      result.current.actions.updateField("attachments", ["https://example.com/a.jpg"]);
    });

    rerender({ clearForm: true, clearFormTimestamp: 111 });

    await waitFor(() => {
      expect(result.current.output.formData.title).toBe("");
    });
    expect(result.current.output.formData.attachments).toEqual([]);

    act(() => {
      result.current.actions.updateField("title", "Second draft");
    });

    rerender({ clearForm: false, clearFormTimestamp: undefined });
    rerender({ clearForm: true, clearFormTimestamp: 111 });

    expect(result.current.output.formData.title).toBe("Second draft");

    rerender({ clearForm: true, clearFormTimestamp: 222 });

    await waitFor(() => {
      expect(result.current.output.formData.title).toBe("");
    });
  });

  it("derives location options from shared project locations instead of task history", async () => {
    mockUseProjectFilterStore.mockReturnValue({
      selectedProjectId: "project-1",
    });
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-1",
          title: "Project 1 roof task",
          description: "",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-01T00:00:00.000Z",
          projectId: "project-1",
          locationOnSite: "Roof plant room",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "new",
        },
        {
          id: "task-2",
          title: "Project 1 duplicate location",
          description: "",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-02T00:00:00.000Z",
          projectId: "project-1",
          locationOnSite: "Roof plant room",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "new",
        },
        {
          id: "task-3",
          title: "Project 1 level task",
          description: "",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-03T00:00:00.000Z",
          projectId: "project-1",
          locationOnSite: "Level 1 - Lobby",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "new",
        },
        {
          id: "task-4",
          title: "Project 2 foreign task",
          description: "",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-04T00:00:00.000Z",
          projectId: "project-2",
          locationOnSite: "Basement switch room",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "new",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchProjectLocations: mockFetchProjectLocations,
      ensureProjectLocation: mockEnsureProjectLocation,
    });
    mockGetProjectsByUser.mockReturnValue([
      { id: "project-1", name: "Project Alpha", location: "Tower A" },
      { id: "project-2", name: "Project Beta", location: "Tower B" },
    ]);
    mockFetchProjectLocations.mockResolvedValue([
      {
        id: "location-1",
        projectId: "project-1",
        label: "Roof plant room",
      },
      {
        id: "location-2",
        projectId: "project-1",
        label: "Level 7 riser",
      },
    ]);

    const { result } = renderHook(() => useCreateTaskViewAdapter({}));

    await waitFor(() => {
      expect(result.current.output.locationPicker).toEqual(
        expect.objectContaining({
          projectId: "project-1",
        }),
      );
    });
    await waitFor(() => {
      expect(mockFetchProjectLocations).toHaveBeenCalledWith("project-1");
    });

    expect(result.current.output.locationPicker.options).toEqual([
      {
        id: "location-option-add-new",
        label: "Add new location",
        value: "__add_new_location__",
        isAddNew: true,
      },
      {
        id: "location-option-Roof plant room",
        label: "Roof plant room",
        value: "Roof plant room",
      },
      {
        id: "location-option-Level 7 riser",
        label: "Level 7 riser",
        value: "Level 7 riser",
      },
    ]);
  });

  it("derives nested subtask context and assignable users from project state", async () => {
    mockUseProjectFilterStore.mockReturnValue({
      selectedProjectId: "project-1",
    });
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: "parent-1",
          title: "Top level task",
          parentTaskId: null,
          projectId: "project-1",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "medium",
          category: "general",
          description: "",
          status: "new",
        },
        {
          id: "subtask-parent-1",
          title: "Nested parent task",
          parentTaskId: "parent-1",
          projectId: "project-1",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          dueDate: "2099-01-01T00:00:00.000Z",
          priority: "medium",
          category: "general",
          description: "",
          status: "new",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchProjectLocations: mockFetchProjectLocations,
      ensureProjectLocation: mockEnsureProjectLocation,
    });
    mockGetProjectsByUser.mockReturnValue([
      { id: "project-1", name: "Project Alpha", location: "Tower A" },
    ]);
    mockGetProjectUserAssignments.mockReturnValue([
      { userId: "user-2", projectId: "project-1", isActive: true },
      { userId: "user-3", projectId: "project-1", isActive: true },
    ]);
    mockGetAllUsers.mockReturnValue([
      { id: "user-2", name: "Alice Worker", email: "alice@example.com" },
      { id: "user-3", name: "Bob Electrician", email: "bob@example.com" },
      { id: "user-4", name: "Off Project User", email: "off@example.com" },
    ]);

    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({
        parentTaskId: "parent-1",
        parentSubTaskId: "subtask-parent-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.output.context.headerTitle).toBe("Nested Sub-Task");
    });

    expect(result.current.output.context.parentBanner).toEqual({
      label: "Nested under:",
      title: "Nested parent task",
    });
    expect(result.current.output.context.activeProjectName).toBe("Project Alpha");
    expect(result.current.output.context.requiresEditReason).toBe(false);
    expect(result.current.output.assigneePicker.filteredUsers.map((user) => user.id)).toEqual([
      "user-2",
      "user-3",
    ]);

    act(() => {
      result.current.actions.setUserSearchQuery("bob");
    });

    expect(result.current.output.assigneePicker.filteredUsers.map((user) => user.id)).toEqual([
      "user-3",
    ]);
  });

  it("hydrates edit mode fields and locks assignees from status-derived context", async () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-1",
          title: "Submitted task",
          description: "Ready for review",
          taskReference: "REF-1",
          billingStatus: "billable",
          priority: "high",
          category: "electrical",
          dueDate: "2099-01-01T00:00:00.000Z",
          projectId: "project-1",
          locationOnSite: "Roof plant room",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: ["https://example.com/photo.jpg"],
          status: "submitted_for_review",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
    });
    mockGetProjectsByUser.mockReturnValue([
      { id: "project-1", name: "Project Alpha", location: "Tower A" },
    ]);

    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({
        editTaskId: "task-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.output.formData.title).toBe("Submitted task");
    });

    expect(result.current.output.formData.description).toBe("Ready for review");
    expect(result.current.output.formData.taskReference).toBe("REF-1");
    expect(result.current.output.formData.locationOnSite).toBe("Roof plant room");
    expect(result.current.output.context.headerTitle).toBe("Edit Task");
    expect(result.current.output.context.assigneesLocked).toBe(true);
    expect(result.current.output.context.requiresEditReason).toBe(true);
    expect(result.current.output.context.activeProjectName).toBe("Project Alpha");
  });

  it("submits create and edit modes with stable payloads", async () => {
    const { result: createResult } = renderHook(() =>
      useCreateTaskViewAdapter({}),
    );

    act(() => {
      createResult.current.actions.updateField("title", "New Task");
      createResult.current.actions.updateField("description", "Install rails");
      createResult.current.actions.updateField("projectId", "project-1");
      createResult.current.actions.updateField("locationOnSite", "Lift lobby");
      createResult.current.actions.updateField("assignedTo", ["user-2"]);
    });

    await act(async () => {
      await createResult.current.actions.submit();
    });

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Task",
        description: "Install rails",
        projectId: "project-1",
        locationOnSite: "Lift lobby",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    );
    expect(mockCreateTask.mock.calls[0][0]).not.toHaveProperty("location");
    expect(mockCreateTask.mock.calls[0][0]).not.toHaveProperty("tags");
    expect(mockEnsureProjectLocation).toHaveBeenCalledWith("project-1", "Lift lobby", "user-1");

    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-1",
          title: "Existing task",
          description: "Existing description",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-01T00:00:00.000Z",
          projectId: "project-1",
          locationOnSite: "Roof plant room",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "new",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
      fetchProjectLocations: mockFetchProjectLocations,
      ensureProjectLocation: mockEnsureProjectLocation,
    });

    const { result: editResult } = renderHook(() =>
      useCreateTaskViewAdapter({
        editTaskId: "task-1",
      }),
    );

    await waitFor(() => {
      expect(editResult.current.output.formData.title).toBe("Existing task");
    });

    act(() => {
      editResult.current.actions.updateField("title", "Existing task updated");
      editResult.current.actions.updateField("taskReference", "REF-UPDATED");
      editResult.current.actions.updateField("locationOnSite", "Level 2 riser");
    });

    await act(async () => {
      await editResult.current.actions.submit();
    });

    expect(mockUpdateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        title: "Existing task updated",
        taskReference: "REF-UPDATED",
        projectId: "project-1",
        locationOnSite: "Level 2 riser",
        assignedTo: ["user-2"],
      }),
    );
    expect(mockUpdateTask.mock.calls[0][1]).not.toHaveProperty("location");
    expect(mockUpdateTask.mock.calls[0][1]).not.toHaveProperty("tags");
    expect(mockEnsureProjectLocation).toHaveBeenLastCalledWith("project-1", "Level 2 riser", "user-1");
  });

  it("does not create a shared project location when the optional field is blank", async () => {
    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({}),
    );

    act(() => {
      result.current.actions.updateField("title", "Task without site location");
      result.current.actions.updateField("description", "No location required");
      result.current.actions.updateField("projectId", "project-1");
      result.current.actions.updateField("locationOnSite", "   ");
    });

    await act(async () => {
      await result.current.actions.submit();
    });

    expect(mockEnsureProjectLocation).not.toHaveBeenCalled();
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Task without site location",
        projectId: "project-1",
        locationOnSite: undefined,
      }),
    );
  });

  it("persists a new location immediately when saved from the picker and keeps it in the options list", async () => {
    mockGetProjectsByUser.mockReturnValue([
      { id: "project-1", name: "Project Alpha", location: "Tower A" },
    ]);

    const { result } = renderHook(() => useCreateTaskViewAdapter({}));

    act(() => {
      result.current.actions.updateField("projectId", "project-1");
    });

    await act(async () => {
      await result.current.actions.saveLocationOnSiteSelection("  Level 9 Rooftop  ");
    });

    expect(mockEnsureProjectLocation).toHaveBeenCalledWith("project-1", "Level 9 Rooftop", "user-1");
    expect(result.current.output.formData.locationOnSite).toBe("Level 9 Rooftop");
    expect(result.current.output.locationPicker.options).toEqual([
      {
        id: "location-option-add-new",
        label: "Add new location",
        value: "__add_new_location__",
        isAddNew: true,
      },
      {
        id: "location-option-Level 9 Rooftop",
        label: "Level 9 Rooftop",
        value: "Level 9 Rooftop",
      },
    ]);
  });

  it("returns false and does not submit when validation fails", async () => {
    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({}),
    );

    let submitResult: boolean | undefined;

    await act(async () => {
      submitResult = await result.current.actions.submit();
    });

    expect(submitResult).toBe(false);
    expect(mockCreateTask).not.toHaveBeenCalled();
    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(result.current.output.errors.title).toBeTruthy();
  });

  it("forwards edit reasons for locked edit flows", async () => {
    mockUseTaskStore.mockReturnValue({
      tasks: [
        {
          id: "task-1",
          title: "Locked task",
          description: "Ready for review",
          taskReference: "",
          billingStatus: "non_billable",
          priority: "medium",
          category: "general",
          dueDate: "2099-01-01T00:00:00.000Z",
          projectId: "project-1",
          assignedTo: ["user-2"],
          assignedBy: "user-1",
          attachments: [],
          status: "submitted_for_review",
        },
      ],
      fetchTaskById: mockFetchTaskById,
      createTask: mockCreateTask,
      createSubTask: mockCreateSubTask,
      updateTask: mockUpdateTask,
    });

    const { result } = renderHook(() =>
      useCreateTaskViewAdapter({
        editTaskId: "task-1",
      }),
    );

    await waitFor(() => {
      expect(result.current.output.formData.title).toBe("Locked task");
    });

    await act(async () => {
      await result.current.actions.submit({ editReason: "Clarified scope" });
    });

    expect(mockUpdateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        _editReason: "Clarified scope",
      }),
    );
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
