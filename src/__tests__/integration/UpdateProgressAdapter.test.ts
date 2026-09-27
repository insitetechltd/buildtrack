import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useUpdateProgressViewAdapter } from '../../ui/viewAdapters/useUpdateProgressViewAdapter';

const mockRouteParams: Record<string, unknown> = {
  taskId: 'task-1',
};

const mockAddTaskUpdate = jest.fn();
const mockAddAssignerComment = jest.fn().mockResolvedValue(undefined);
const mockFetchTaskById = jest.fn().mockResolvedValue(undefined);

const mockTaskState = {
  tasks: [
    {
      id: 'task-1',
      title: 'Task 1',
      completionPercentage: 20,
      status: 'in_progress',
    },
  ],
  fetchTaskById: mockFetchTaskById,
  addTaskUpdate: mockAddTaskUpdate,
  addSubTaskUpdate: jest.fn(),
  addAssignerComment: mockAddAssignerComment,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    getParent: jest.fn(),
  }),
  useRoute: () => ({
    get params() {
      return mockRouteParams;
    },
  }),
  useFocusEffect: jest.fn((cb) => cb()),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
}));

jest.mock('../../state/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', companyId: 'company-1' },
  }),
}));

jest.mock('../../state/taskStore.supabase', () => ({
  useTaskStore: Object.assign(
    (selector: any) => selector(mockTaskState),
    {
      getState: () => mockTaskState,
    },
  ),
}));

jest.mock('../../utils/usePhotoSelection', () => ({
  usePhotoSelection: () => ({
    showPhotoSelectionDialog: jest.fn(),
  }),
}));

jest.mock('../../utils/useTranslation', () => ({
  useTranslation: () => ({
    taskDetail: {
      progressUpdate: 'Progress Update',
      submitUpdate: 'Submit Update',
      failedToSubmitUpdate: 'Failed',
      progressUpdateAdded: 'Added',
      updateDescription: 'Update Description',
      updateDescriptionPlaceholder: 'Describe…',
    },
    createTask: {
      replyToReport: 'Reply',
      sendReply: 'Send reply',
      replyMessage: 'Reply',
      replyPlaceholder: 'Write a reply…',
      replySent: 'Reply sent',
      replyFailed: 'Failed to send reply',
    },
    errors: {
      success: 'Success',
      error: 'Error',
    },
    common: {
      loading: 'Loading',
    },
  }),
}));

const mockUploadFileWithVerification = jest.fn().mockResolvedValue({
  success: true,
  file: { public_url: 'https://example.com/photo.jpg' },
});

jest.mock('../../api/fileUploadService', () => ({
  uploadFileWithVerification: (...args: unknown[]) =>
    mockUploadFileWithVerification(...args),
}));

jest.mock('../../utils/ensureCappedLocalPhoto', () => ({
  ensureCappedLocalPhoto: jest.fn(async (photo: { uri: string }) => photo.uri),
}));

const mockReturnToTaskDetail = jest.fn();
jest.mock('../../navigation/photoFlowNavigation', () => ({
  returnToTaskDetailAfterUpdateProgress: (...args: unknown[]) =>
    mockReturnToTaskDetail(...args),
}));

describe('useUpdateProgressViewAdapter', () => {
  beforeEach(() => {
    mockRouteParams.taskId = 'task-1';
    delete mockRouteParams.mode;
    mockTaskState.tasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        completionPercentage: 20,
        status: 'in_progress',
      },
    ];
    mockAddTaskUpdate.mockClear();
    mockAddAssignerComment.mockClear();
    mockFetchTaskById.mockClear();
    mockUploadFileWithVerification.mockReset();
    mockUploadFileWithVerification.mockResolvedValue({
      success: true,
      file: { public_url: 'https://example.com/photo.jpg' },
    });
    mockReturnToTaskDetail.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize correctly and return output', () => {
    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));

    expect(result.current.output.screenId).toBe('UpdateProgressScreen');
    expect(result.current.output.readiness.hasUsableData).toBe(true);
    expect(result.current.output.form.completionPercentage).toBe(20);
    expect(result.current.output.form.description).toBe('');
    expect(result.current.output.form.mode).toBe('progress');
    expect(result.current.output.photos).toEqual([]);
  });

  it('should allow setting description', () => {
    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));

    act(() => {
      result.current.actions.setDescription('New progress');
    });

    expect(result.current.output.form.description).toBe('New progress');
    expect(result.current.output.form.isValid).toBe(true);
  });

  it('should allow updating completion percentage', () => {
    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));

    act(() => {
      result.current.actions.setCompletionPercentage(50);
    });

    expect(result.current.output.form.completionPercentage).toBe(50);
  });

  it('merges selected photos and updates when an existing photo is re-annotated', () => {
    const initialPhoto = {
      uri: 'ph://photo-1',
      fileName: 'photo-1.jpg',
      mediaLibraryAssetId: 'photo-1',
    };

    const { result, rerender } = renderHook(
      (props: any) => useUpdateProgressViewAdapter(props),
      {
        initialProps: {
          selectedPhotos: [initialPhoto],
        },
      },
    );

    expect(result.current.output.photos).toHaveLength(1);
    expect(result.current.output.photos[0].uri).toBe('ph://photo-1');

    const editedPhoto = {
      uri: 'ph://photo-1',
      fileName: 'photo-1.jpg',
      mediaLibraryAssetId: 'photo-1',
      isAnnotated: true,
      annotatedUri: 'file:///annotated-1.jpg',
    };

    rerender({
      selectedPhotos: [editedPhoto],
    });

    expect(result.current.output.photos).toHaveLength(1);
    expect(result.current.output.photos[0].uri).toBe('file:///annotated-1.jpg');
    expect(result.current.output.photos[0].isAnnotated).toBe(true);
  });

  it('report_reply mode hides progress chrome and submits via addAssignerComment', async () => {
    mockRouteParams.mode = 'report_reply';
    mockTaskState.tasks = [
      {
        id: 'task-1',
        title: 'Needs triage',
        completionPercentage: 0,
        status: 'reported',
      },
    ];

    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));

    expect(result.current.output.form.mode).toBe('report_reply');
    expect(result.current.output.form.screenTitle).toBe('Reply');
    expect(result.current.output.form.submitLabel).toBe('Send reply');

    act(() => {
      result.current.actions.setDescription('Thanks — looking into it');
    });

    await act(async () => {
      await result.current.actions.handleSubmitUpdate();
    });

    expect(mockAddAssignerComment).toHaveBeenCalledWith('task-1', {
      description: 'Thanks — looking into it',
      photos: [],
      userId: 'user-1',
    });
    expect(mockAddTaskUpdate).not.toHaveBeenCalled();
  });

  it('reported task without mode still hides % and uses reply submit (photo-return safe)', async () => {
    delete mockRouteParams.mode;
    mockTaskState.tasks = [
      {
        id: 'task-1',
        title: 'Test Report Up',
        completionPercentage: 0,
        status: 'reported',
      },
    ];

    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));

    expect(result.current.output.form.mode).toBe('report_reply');
    expect(result.current.output.form.screenTitle).toBe('Reply');
    expect(result.current.output.form.submitLabel).toBe('Send reply');

    act(() => {
      result.current.actions.setDescription('Got it');
    });

    await act(async () => {
      await result.current.actions.handleSubmitUpdate();
    });

    expect(mockAddAssignerComment).toHaveBeenCalled();
    expect(mockAddTaskUpdate).not.toHaveBeenCalled();
  });

  it('does not save an update when a chosen photo fails to upload', async () => {
    mockUploadFileWithVerification.mockResolvedValue({
      success: false,
      error: 'Photo upload failed',
    });

    const { result } = renderHook(
      (props: { selectedPhotos: Array<{ uri: string; fileName: string }> }) =>
        useUpdateProgressViewAdapter(props),
      {
        initialProps: {
          selectedPhotos: [{ uri: 'file:///site.jpg', fileName: 'site.jpg' }],
        },
      },
    );

    act(() => {
      result.current.actions.setDescription('Slab pour complete');
    });

    await act(async () => {
      await result.current.actions.handleSubmitUpdate();
    });

    expect(mockAddTaskUpdate).not.toHaveBeenCalled();
    expect(mockReturnToTaskDetail).not.toHaveBeenCalled();
    expect(result.current.output.form.description).toBe('Slab pour complete');
    expect(result.current.output.photos).toHaveLength(1);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Photos did not upload',
      expect.stringContaining('still here'),
    );
  });
});
