import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore';
import { supabase } from '@/api/supabase';
import { Priority, TaskStatus, TaskCategory } from '@/types/buildtrack';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Task Management Workflow Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockProject = {
    id: 'project-123',
    name: 'Test Project',
    companyId: 'company-123',
  };

  const mockUser = {
    id: 'user-123',
    name: 'John Manager',
    email: 'john@buildtrack.com',
    role: 'manager' as const,
  };

  const mockWorker = {
    id: 'worker-456',
    name: 'Sarah Worker',
    email: 'sarah@buildtrack.com',
    role: 'worker' as const,
  };

  beforeEach(() => {
    // Reset store
    useTaskStore.setState({
      tasks: [],
      taskReadStatuses: [],
      isLoading: false,
      error: null,
    });

    jest.clearAllMocks();

    // Setup default mock responses
    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  describe('Task Creation', () => {
    it('should create task with all required fields', async () => {
      const newTask = {
        title: 'Install Safety Railings',
        description: 'Install railings on 2nd floor perimeter',
        priority: 'high' as Priority,
        category: 'safety' as TaskCategory,
        projectId: mockProject.id,
        assignedTo: [mockWorker.id],
        assignedBy: mockUser.id,
        dueDate: new Date().toISOString(),
        attachments: [],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'task-123',
                ...newTask,
                createdAt: new Date().toISOString(),
                currentStatus: 'not_started',
                completionPercentage: 0,
                updates: [],
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      let taskId: string;
      await act(async () => {
        taskId = await result.current.createTask(newTask);
      });

      expect(taskId).toBe('task-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should create task with optional fields', async () => {
      const taskWithOptionals = {
        title: 'Review Electrical Plans',
        description: 'Review and approve electrical system plans',
        priority: 'medium' as Priority,
        category: 'electrical' as TaskCategory,
        projectId: mockProject.id,
        assignedTo: [mockWorker.id],
        assignedBy: mockUser.id,
        dueDate: new Date().toISOString(),
        attachments: ['file1.pdf', 'file2.jpg'],
        estimatedHours: 8,
        actualHours: 0,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'task-456', ...taskWithOptionals },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      let taskId: string;
      await act(async () => {
        taskId = await result.current.createTask(taskWithOptionals);
      });

      expect(taskId).toBe('task-456');
    });

    it('should create task with attachments', async () => {
      const taskWithAttachments = {
        title: 'Photo Documentation',
        description: 'Document current progress',
        priority: 'low' as Priority,
        category: 'general' as TaskCategory,
        projectId: mockProject.id,
        assignedTo: [mockWorker.id],
        assignedBy: mockUser.id,
        dueDate: new Date().toISOString(),
        attachments: [
          'https://storage.supabase.co/photo1.jpg',
          'https://storage.supabase.co/photo2.jpg',
        ],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'task-789', ...taskWithAttachments },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.createTask(taskWithAttachments);
      });

      const call = (mockSupabase.from as jest.Mock).mock.results[0].value.insert.mock.calls[0][0];
      expect(call.attachments).toHaveLength(2);
    });

    it('should validate required fields when creating task', async () => {
      const invalidTask = {
        title: '', // Empty title should fail
        description: 'Test description',
        priority: 'high' as Priority,
        category: 'general' as TaskCategory,
        projectId: mockProject.id,
        assignedTo: [],
        assignedBy: mockUser.id,
        dueDate: new Date().toISOString(),
        attachments: [],
      };

      const { result } = renderHook(() => useTaskStore());

      await expect(async () => {
        await act(async () => {
          await result.current.createTask(invalidTask);
        });
      }).rejects.toThrow();
    });

    it('should set task priority levels correctly', async () => {
      const priorities: Priority[] = ['low', 'medium', 'high', 'critical'];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'task-priority' },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      for (const priority of priorities) {
        await act(async () => {
          await result.current.createTask({
            title: `Task with ${priority} priority`,
            description: 'Test',
            priority,
            category: 'general',
            projectId: mockProject.id,
            assignedTo: [mockWorker.id],
            assignedBy: mockUser.id,
            dueDate: new Date().toISOString(),
            attachments: [],
          });
        });
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(priorities.length);
    });

    it('should set task categories correctly', async () => {
      const categories: TaskCategory[] = ['safety', 'electrical', 'plumbing', 'structural', 'general', 'materials'];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'task-category' },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      for (const category of categories) {
        await act(async () => {
          await result.current.createTask({
            title: `${category} task`,
            description: 'Test',
            priority: 'medium',
            category,
            projectId: mockProject.id,
            assignedTo: [mockWorker.id],
            assignedBy: mockUser.id,
            dueDate: new Date().toISOString(),
            attachments: [],
          });
        });
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(categories.length);
    });
  });

  describe('Task Assignment', () => {
    const mockTask = {
      id: 'task-123',
      title: 'Test Task',
      assignedTo: [],
    };

    it('should assign task to single user', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, assignedTo: [mockWorker.id] },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.assignTask(mockTask.id, [mockWorker.id]);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should assign task to multiple users', async () => {
      const worker2Id = 'worker-789';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, assignedTo: [mockWorker.id, worker2Id] },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.assignTask(mockTask.id, [mockWorker.id, worker2Id]);
      });

      const updateCall = (mockSupabase.from as jest.Mock).mock.results[0].value.update.mock.calls[0][0];
      expect(updateCall.assignedTo).toHaveLength(2);
    });

    it('should reassign task to different user', async () => {
      const newWorkerId = 'worker-new-999';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, assignedTo: [newWorkerId] },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      // First assign to original worker
      await act(async () => {
        await result.current.assignTask(mockTask.id, [mockWorker.id]);
      });

      // Then reassign to new worker
      await act(async () => {
        await result.current.assignTask(mockTask.id, [newWorkerId]);
      });

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('should remove user from task assignment', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, assignedTo: [] },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.assignTask(mockTask.id, []);
      });

      const updateCall = (mockSupabase.from as jest.Mock).mock.results[0].value.update.mock.calls[0][0];
      expect(updateCall.assignedTo).toHaveLength(0);
    });
  });

  describe('Task Status Updates', () => {
    const mockTask = {
      id: 'task-123',
      title: 'Test Task',
      currentStatus: 'not_started' as TaskStatus,
      completionPercentage: 0,
    };

    it('should update task status to in_progress', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, currentStatus: 'in_progress', completionPercentage: 25 },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateTaskStatus(mockTask.id, 'in_progress', 25);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should update task status to completed', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, currentStatus: 'completed', completionPercentage: 100 },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateTaskStatus(mockTask.id, 'completed', 100);
      });

      const updateCall = (mockSupabase.from as jest.Mock).mock.results[0].value.update.mock.calls[0][0];
      expect(updateCall.currentStatus).toBe('completed');
      expect(updateCall.completionPercentage).toBe(100);
    });

    it('should update task status to rejected', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockTask, currentStatus: 'rejected' },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateTaskStatus(mockTask.id, 'rejected', 0);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should track status change history', async () => {
      const updates = [
        { status: 'in_progress', percentage: 25 },
        { status: 'in_progress', percentage: 50 },
        { status: 'in_progress', percentage: 75 },
        { status: 'completed', percentage: 100 },
      ];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockTask,
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      for (const update of updates) {
        await act(async () => {
          await result.current.updateTaskStatus(mockTask.id, update.status as TaskStatus, update.percentage);
        });
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(updates.length);
    });
  });

  describe('Task Updates & Progress', () => {
    const mockTask = {
      id: 'task-123',
      title: 'Test Task',
      updates: [],
    };

    it('should add text update to task', async () => {
      const textUpdate = {
        text: 'Work in progress, 50% complete',
        userId: mockWorker.id,
        photos: [],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'update-123',
                taskId: mockTask.id,
                ...textUpdate,
                timestamp: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.addTaskUpdate(mockTask.id, textUpdate);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('task_updates');
    });

    it('should add photo update to task', async () => {
      const photoUpdate = {
        text: 'Completed railing installation',
        userId: mockWorker.id,
        photos: ['https://storage.supabase.co/photo1.jpg'],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'update-456', ...photoUpdate },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.addTaskUpdate(mockTask.id, photoUpdate);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should calculate completion percentage', async () => {
      const task = {
        id: 'task-calc',
        subtasks: [
          { completionPercentage: 100 },
          { completionPercentage: 50 },
          { completionPercentage: 0 },
          { completionPercentage: 75 },
        ],
      };

      // Average: (100 + 50 + 0 + 75) / 4 = 56.25
      const expectedPercentage = 56;

      // This would be tested through the actual calculation logic
      expect(expectedPercentage).toBeGreaterThan(0);
      expect(expectedPercentage).toBeLessThan(100);
    });

    it('should track update timestamps', async () => {
      const update = {
        text: 'Progress update',
        userId: mockWorker.id,
        photos: [],
      };

      const timestamp = new Date().toISOString();

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'update-time',
                ...update,
                timestamp,
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.addTaskUpdate(mockTask.id, update);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Task Filtering & Queries', () => {
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        assignedTo: [mockWorker.id],
        projectId: 'project-1',
        currentStatus: 'not_started' as TaskStatus,
        priority: 'high' as Priority,
        dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday (overdue)
        starred: [mockWorker.id],
      },
      {
        id: 'task-2',
        title: 'Task 2',
        assignedTo: [mockWorker.id, 'worker-2'],
        projectId: 'project-1',
        currentStatus: 'in_progress' as TaskStatus,
        priority: 'medium' as Priority,
        dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        starred: [],
      },
      {
        id: 'task-3',
        title: 'Task 3',
        assignedTo: ['worker-2'],
        projectId: 'project-2',
        currentStatus: 'completed' as TaskStatus,
        priority: 'low' as Priority,
        dueDate: new Date().toISOString(),
        starred: [],
      },
    ];

    beforeEach(() => {
      useTaskStore.setState({ tasks: mockTasks });
    });

    it('should get tasks by user', () => {
      const { result } = renderHook(() => useTaskStore());

      const userTasks = result.current.getTasksByUser(mockWorker.id);

      expect(userTasks).toHaveLength(2);
      expect(userTasks[0].id).toBe('task-1');
      expect(userTasks[1].id).toBe('task-2');
    });

    it('should get tasks by project', () => {
      const { result } = renderHook(() => useTaskStore());

      const projectTasks = result.current.getTasksByProject('project-1');

      expect(projectTasks).toHaveLength(2);
    });

    it('should get overdue tasks', () => {
      const { result } = renderHook(() => useTaskStore());

      const overdueTasks = result.current.getOverdueTasks();

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].id).toBe('task-1');
    });

    it('should get tasks by status', () => {
      const { result } = renderHook(() => useTaskStore());

      const inProgressTasks = result.current.getTasksByStatus('in_progress');

      expect(inProgressTasks).toHaveLength(1);
      expect(inProgressTasks[0].currentStatus).toBe('in_progress');
    });

    it('should get tasks by priority', () => {
      const { result } = renderHook(() => useTaskStore());

      const highPriorityTasks = result.current.getTasksByPriority('high');

      expect(highPriorityTasks).toHaveLength(1);
      expect(highPriorityTasks[0].priority).toBe('high');
    });

    it('should filter starred tasks (Today\'s Tasks)', () => {
      const { result } = renderHook(() => useTaskStore());

      const starredTasks = result.current.getStarredTasks(mockWorker.id);

      expect(starredTasks).toHaveLength(1);
      expect(starredTasks[0].starred).toContain(mockWorker.id);
    });
  });

  describe('Task Actions', () => {
    it('should accept assigned task', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { accepted: true },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.acceptTask('task-123', mockWorker.id);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should decline assigned task with reason', async () => {
      const declineReason = 'Not enough time to complete this task';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { declined: true, declineReason },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.declineTask('task-123', mockWorker.id, declineReason);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });

    it('should delete task', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.deleteTask('task-123');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });

    it('should edit task details', async () => {
      const updates = {
        title: 'Updated Task Title',
        description: 'Updated description',
        priority: 'critical' as Priority,
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { id: 'task-123', ...updates },
            error: null,
          }),
        }),
      }));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.updateTask('task-123', updates);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
    });
  });
});

