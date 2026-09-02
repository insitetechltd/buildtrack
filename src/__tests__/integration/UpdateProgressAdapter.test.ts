import { renderHook, act } from '@testing-library/react-native';
import { useUpdateProgressViewAdapter } from '../../ui/viewAdapters/useUpdateProgressViewAdapter';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    getParent: jest.fn(),
  }),
  useRoute: () => ({
    params: {
      taskId: 'task-1',
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
  useTaskStore: (selector: any) => {
    const state = {
      tasks: [{ id: 'task-1', title: 'Task 1', completionPercentage: 20, status: 'in_progress' }],
      fetchTaskById: jest.fn(),
      addTaskUpdate: jest.fn(),
      addSubTaskUpdate: jest.fn(),
    };
    return selector(state);
  },
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

jest.mock('../../api/fileUploadService', () => ({
  uploadFileWithVerification: jest.fn().mockResolvedValue({
    success: true,
    file: { public_url: 'https://example.com/photo.jpg' },
  }),
}));

describe('useUpdateProgressViewAdapter', () => {
  it('should initialize correctly and return output', () => {
    const { result } = renderHook(() => useUpdateProgressViewAdapter({}));
    
    expect(result.current.output.screenId).toBe('UpdateProgressScreen');
    expect(result.current.output.readiness.hasUsableData).toBe(true);
    expect(result.current.output.form.completionPercentage).toBe(20);
    expect(result.current.output.form.description).toBe('');
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
});
