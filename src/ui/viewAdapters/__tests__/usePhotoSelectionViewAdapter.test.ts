import { act, renderHook } from "@testing-library/react-native";
import { usePhotoSelectionViewAdapter } from "../usePhotoSelectionViewAdapter";

const mockUploadFileWithVerification = jest.fn();
const mockAddBatch = jest.fn();
const mockGetTasksByProject = jest.fn();
const mockDismissBatch = jest.fn();

jest.mock("@imgly/editor-react-native", () => ({
  EditorPreset: { PHOTO: "PHOTO" },
  default: {
    openEditor: jest.fn(),
  },
}));

jest.mock("../../../api/fileUploadService", () => ({
  uploadFileWithVerification: (...args: unknown[]) => mockUploadFileWithVerification(...args),
}));

jest.mock("../../../state/unattachedPhotoBatchStore", () => ({
  useUnattachedPhotoBatchStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      batches: [],
      addBatch: mockAddBatch,
      dismissBatch: mockDismissBatch,
      getBatchesForProject: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../../state/taskStore.supabase", () => ({
  useTaskStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      tasks: [],
      getTasksByProject: (projectId: string) => mockGetTasksByProject(projectId),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(() => ({ exists: true, size: 1024 })),
}));

jest.mock("expo-constants", () => ({
  executionEnvironment: "storeClient",
}));

describe("usePhotoSelectionViewAdapter batch-review features", () => {
  const baseProps = {
    taskId: "",
    projectId: "proj-1",
    companyId: "co-1",
    userId: "user-1",
    initialCompletionPercentage: 0,
    onNavigateBack: jest.fn(),
    uploadImmediately: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: { public_url: "https://cdn.example.com/u/1.jpg" },
    });
  });

  it("handleSetCaption updates photos[i].caption on selected photo state", () => {
    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        initialPhotos: [
          { uri: "file://a.jpg", fileName: "a.jpg", isAnnotated: false },
          { uri: "file://b.jpg", fileName: "b.jpg", isAnnotated: false },
        ],
      } as any),
    );

    act(() => {
      result.current.handleSetCaption(1, "Crack in foundation");
    });

    expect(result.current.output.photos[1].caption).toBe("Crack in foundation");
    expect(result.current.output.photos[0].caption).toBeUndefined();
  });

  it("handleMovePhotoUp swaps index with its previous sibling", () => {
    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        initialPhotos: [
          { uri: "file://0.jpg", fileName: "0.jpg", isAnnotated: false },
          { uri: "file://1.jpg", fileName: "1.jpg", isAnnotated: false },
          { uri: "file://2.jpg", fileName: "2.jpg", isAnnotated: false },
        ],
      } as any),
    );

    act(() => {
      result.current.handleMovePhotoUp(1);
    });

    expect(result.current.output.photos.map((p) => p.fileName)).toEqual([
      "1.jpg",
      "0.jpg",
      "2.jpg",
    ]);
  });

  it("handleMoveUp on first index and handleMoveDown on last index are each no-ops", () => {
    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        initialPhotos: [
          { uri: "file://0.jpg", fileName: "0.jpg", isAnnotated: false },
          { uri: "file://1.jpg", fileName: "1.jpg", isAnnotated: false },
          { uri: "file://2.jpg", fileName: "2.jpg", isAnnotated: false },
        ],
      } as any),
    );

    const before = result.current.output.photos.map((p) => p.fileName);
    const lastIndex = before.length - 1;

    act(() => {
      result.current.handleMovePhotoUp(0);
      result.current.handleMovePhotoDown(lastIndex);
    });
    expect(result.current.output.photos.map((p) => p.fileName)).toEqual(before);
  });

  it("saveIntent=project_unattached + handleUploadPhotos calls upload with entityType=project and addBatch", async () => {
    const onPhotosUploaded = jest.fn();
    const onSaveUnattachedDone = jest.fn();
    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: { public_url: "https://cdn.example.com/unattached-1.jpg" },
    });

    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        projectId: "proj-9",
        taskId: "unused",
        initialPhotos: [
          { uri: "file://u1.jpg", fileName: "u1.jpg", isAnnotated: false, caption: "Wall" },
        ],
        onPhotosUploaded,
        onSaveUnattachedDone,
        uploadImmediately: true,
      } as any),
    );

    act(() => {
      result.current.handleSetSaveIntent("project_unattached");
    });

    await act(async () => {
      await result.current.handleUploadPhotos();
    });

    const uploadArgs = mockUploadFileWithVerification.mock.calls[0][0];
    expect(uploadArgs.entityType).toBe("project");
    expect(uploadArgs.entityId).toBe("proj-9");

    expect(mockAddBatch).toHaveBeenCalledTimes(1);
    const added = mockAddBatch.mock.calls[0][0];
    expect(added.projectId).toBe("proj-9");
    expect(added.photoUrls).toEqual(["https://cdn.example.com/unattached-1.jpg"]);
    expect(added.captions).toEqual(["Wall"]);

    expect(onSaveUnattachedDone).toHaveBeenCalled();
    expect(onPhotosUploaded).not.toHaveBeenCalled();
  });

  it("selectedTaskId set → handleUploadPhotos uses entityType=task-update and fires onAttachedToExistingTask", async () => {
    const onAttachedToExistingTask = jest.fn();
    const onPhotosUploaded = jest.fn();
    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: { public_url: "https://cdn.example.com/attached-1.jpg" },
    });
    mockGetTasksByProject.mockReturnValue([
      { id: "task-existing-42", title: "Existing task 42", updated_at: "2026-08-07T00:00:00Z" },
    ]);

    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        projectId: "proj-x",
        taskId: "unused-task",
        initialPhotos: [
          { uri: "file://a1.jpg", fileName: "a1.jpg", isAnnotated: false },
        ],
        onAttachedToExistingTask,
        onPhotosUploaded,
        uploadImmediately: true,
      } as any),
    );

    act(() => {
      result.current.handleSelectTaskForAttach("task-existing-42");
    });
    expect(result.current.output.selectedTaskId).toBe("task-existing-42");

    await act(async () => {
      await result.current.handleUploadPhotos();
    });

    const uploadArgs = mockUploadFileWithVerification.mock.calls[0][0];
    expect(uploadArgs.entityType).toBe("task-update");
    expect(uploadArgs.entityId).toBe("task-existing-42");
    expect(onAttachedToExistingTask).toHaveBeenCalledWith("task-existing-42", [
      "https://cdn.example.com/attached-1.jpg",
    ]);
    expect(onPhotosUploaded).not.toHaveBeenCalled();
  });

  it("caption on a photo passes through to upload description option", async () => {
    const onAttachedToExistingTask = jest.fn();
    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: { public_url: "https://cdn.example.com/d.jpg" },
    });
    mockGetTasksByProject.mockReturnValue([
      { id: "task-desc", title: "Desc task", updated_at: "2026-08-07T00:00:00Z" },
    ]);

    const { result } = renderHook(() =>
      usePhotoSelectionViewAdapter({
        ...baseProps,
        projectId: "proj-desc",
        taskId: "unused",
        initialPhotos: [
          {
            uri: "file://d.jpg",
            fileName: "d.jpg",
            isAnnotated: false,
            caption: "Front door jamb misalignment",
          },
        ],
        onAttachedToExistingTask,
        uploadImmediately: true,
      } as any),
    );

    act(() => {
      result.current.handleSelectTaskForAttach("task-desc");
    });

    await act(async () => {
      await result.current.handleUploadPhotos();
    });

    expect(mockUploadFileWithVerification).toHaveBeenCalledTimes(1);
    const options = mockUploadFileWithVerification.mock.calls[0][0];
    expect(options.description).toBe("Front door jamb misalignment");
  });
});
