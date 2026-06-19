import { renderHook } from '@testing-library/react-native';
import { useTaskDetailViewAdapter } from '../../ui/viewAdapters/useTaskDetailViewAdapter';

jest.mock('../../state/taskStore.supabase', () => ({
  useTaskStore: jest.fn(() => ({
    tasks: [],
    fetchTaskById: jest.fn(),
    acceptTask: jest.fn(),
    declineTask: jest.fn(),
    submitTaskForReview: jest.fn(),
    acceptTaskCompletion: jest.fn(),
    acceptSubTaskCompletion: jest.fn(),
    submitSubTaskForReview: jest.fn(),
    acceptSubTask: jest.fn(),
    declineSubTask: jest.fn(),
    cancelTask: jest.fn(),
  })),
}));

jest.mock('../../state/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    user: { id: 'user-1' },
  })),
}));

jest.mock('../../state/userStore.supabase', () => ({
  useUserStore: jest.fn(() => ({
    getUserById: jest.fn(),
  })),
}));

jest.mock('../../utils/useTranslation', () => ({
  useTranslation: () => ({
    tasks: { taskDetails: 'Task Details' },
    taskDetail: { noChildren: 'No sub-tasks' },
    common: { back: 'Back' },
    projects: { unknown: 'Unknown' },
  }),
}));

jest.mock('../../utils/dateFormatter', () => ({
  useDateFormatter: () => ({
    formatDateShort: jest.fn(),
  }),
}));

describe('useTaskDetailViewAdapter', () => {
  it('should return loading state initially when task is not found', () => {
    const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: '123' }));
    expect(result.current.output.readiness.hasUsableData).toBe(false);
    expect(result.current.output.continuity.isInitialLoading).toBe(true);
  });
});
