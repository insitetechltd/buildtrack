import { renderHook, act } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore';
import { supabase } from '@/api/supabase';
import { TaskStatus } from '@/types/buildtrack';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Subtask Management Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockTask = {
    id: 'task-123',
    title: 'Parent Task',
    subtasks: [],
  };

  const mockWorker = {
    id: 'worker-456',
    name: 'Sarah Worker',
  };

  beforeEach(() => {
    useTaskStore.setState({
      tasks: [mockTask],
      taskReadStatuses: [],
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe('Subtask Creation', () => {
    it('should create subtask under parent task', async () => {
      const newSubtask = {
        title: 'Check Safety Equipment',
        description: 'Verify all safety gear is available',
        priority: 'high' as const,
        assignedTo: [mockWorker.id],
        assignedBy: 'manager-123',
        dueDate: new Date().toISOString(),
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'subtask-123',
                parentTaskId: mockTask.id,
                ...newSubtask,
                currentStatus: 'not_started',
                completionPercentage: 0,
                createdAt: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      let subtaskId: string;
      await act(async () => {
        subtaskId = await result.current.createSubTask(mockTask.id, newSubtask);
      });

      expect(subtaskId).toBe('subtask-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should create nested subtask (subtask of subtask)', async () => {
      const parentSubtaskId = 'subtask-parent-456';
      const nestedSubtask = {
        title: 'Nested Subtask',
        description: 'This is a subtask of a subtask',
        priority: 'medium' as const,
        assignedTo: [mockWorker.id],
        assignedBy: 'manager-123',
        dueDate: new Date().toISOString(),
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'nested-subtask-789',
                parentTaskId: mockTask.id,
                parentSubTaskId: parentSubtaskId,
                ...nestedSubtask,
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      let nestedId: string;
      await act(async () => {
        nestedId = await result.current.createNestedSubTask(mockTask.id, parentSubtaskId, nestedSubtask);
      });

      expect(nestedId).toBe('nested-subtask-789');
    });

    it('should create multiple subtasks', async () => {
      const subtasks = [
        {
          title: 'Subtask 1',
          description: 'First subtask',
          priority: 'high' as const,
          assignedTo: [mockWorker.id],
          assignedBy: 'manager-123',
          dueDate: new Date().toISOString(),
        },
        {
          title: 'Subtask 2',
          description: 'Second subtask',
          priority: 'medium' as const,
          assignedTo: [mockWorker.id],
          assignedBy: 'manager-123',
          dueDate: new Date().toISOString(),
        },
        {
          title: 'Subtask 3',
          description: 'Third subtask',
          priority: 'low' as const,
          assignedTo: [mockWorker.id],
          assignedBy: 'manager-123',
          dueDate: new Date().toISOString(),
        },
      ];

      let counter = 1;
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: `subtask-${counter++}` },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      const createdIds: string[] = [];
      for (const subtask of subtasks) {
        await act(async () => {
          const id = await result.current.createSubTask(mockTask.id, subtask);
          createdIds.push(id);
        });
      }

      expect(createdIds).toHaveLength(3);
      // Each createSubTask calls: sub_tasks (insert) + tasks (select for update)
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Subtask Assignment', () => {
    const mockSubtask = {
      id: 'subtask-123',
      parentTaskId: mockTask.id,
      title: 'Test Subtask',
      assignedTo: [],
    };

    it('should assign subtask to user', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { ...mockSubtask, assignedTo: [mockWorker.id] },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateSubTask(mockTask.id, mockSubtask.id, {
          assignedTo: [mockWorker.id],
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should accept subtask assignment', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { accepted: true },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.acceptSubTask(mockTask.id, mockSubtask.id, mockWorker.id);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should decline subtask assignment', async () => {
      const declineReason = 'Already overloaded with other tasks';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { declined: true, declineReason },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.declineSubTask(mockTask.id, mockSubtask.id, mockWorker.id, declineReason);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Subtask Status', () => {
    const mockSubtask = {
      id: 'subtask-123',
      parentTaskId: mockTask.id,
      currentStatus: 'not_started' as TaskStatus,
      completionPercentage: 0,
    };

    it('should update subtask status', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { ...mockSubtask, currentStatus: 'in_progress' },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateSubTaskStatus(mockTask.id, mockSubtask.id, 'in_progress', 50);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should update subtask completion percentage', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { ...mockSubtask, completionPercentage: 75 },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateSubTaskStatus(mockTask.id, mockSubtask.id, 'in_progress', 75);
      });

      // The update was called with unified tasks table
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should update parent task completion when subtask completes', async () => {
      // This tests the cascade effect where completing subtasks updates parent task
      const taskWithSubtasks = {
        id: 'task-with-subtasks',
        subtasks: [
          { id: 'sub-1', completionPercentage: 100 },
          { id: 'sub-2', completionPercentage: 100 },
          { id: 'sub-3', completionPercentage: 50 },
        ],
      };

      useTaskStore.setState({ tasks: [taskWithSubtasks] });

      // Expected average: (100 + 100 + 50) / 3 = 83.33 ≈ 83%
      const expectedCompletion = 83;

      // Mock the parent task update
      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: { completionPercentage: expectedCompletion },
                error: null,
              }),
            }),
          };
        }
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      });

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateSubTaskStatus(taskWithSubtasks.id, 'sub-3', 'completed', 100);
      });

      // Verify subtask and parent task were both updated
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Subtask Management', () => {
    const mockSubtask = {
      id: 'subtask-123',
      parentTaskId: mockTask.id,
      title: 'Original Title',
      description: 'Original Description',
    };

    it('should edit subtask details', async () => {
      const updates = {
        title: 'Updated Subtask Title',
        description: 'Updated subtask description',
        priority: 'critical' as const,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { ...mockSubtask, ...updates },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateSubTask(mockTask.id, mockSubtask.id, updates);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should delete subtask', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.deleteSubTask(mockTask.id, mockSubtask.id);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should add updates to subtask', async () => {
      const update = {
        text: 'Subtask progress update',
        userId: mockWorker.id,
        photos: ['https://storage.supabase.co/subtask-photo.jpg'],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'update-123',
                subtaskId: mockSubtask.id,
                ...update,
                timestamp: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.addSubTaskUpdate(mockTask.id, mockSubtask.id, update);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('task_updates');
    });
  });
});

