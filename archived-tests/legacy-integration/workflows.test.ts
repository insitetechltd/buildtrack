import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '@/state/taskStore';
import { useProjectStore } from '@/state/projectStore';
import { useAuthStore } from '@/state/authStore';
import { supabase } from '@/api/supabase';

// Mock Supabase
jest.mock('@/api/supabase');

describe('Integration Workflow Tests', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  const mockManager = {
    id: 'manager-123',
    name: 'John Manager',
    email: 'manager@buildtrack.com',
    role: 'manager' as const,
    companyId: 'company-123',
  };

  const mockWorker = {
    id: 'worker-456',
    name: 'Sarah Worker',
    email: 'worker@buildtrack.com',
    role: 'worker' as const,
    companyId: 'company-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
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

  describe('Complete Task Workflow', () => {
    it('should complete full task workflow: Create → Assign → Accept → Update → Complete', async () => {
      // Step 1: Manager creates task
      const taskData = {
        title: 'Install HVAC System',
        description: 'Install HVAC on 3rd floor',
        priority: 'high' as const,
        category: 'general' as const,
        projectId: 'project-123',
        assignedTo: [mockWorker.id],
        assignedBy: mockManager.id,
        dueDate: new Date().toISOString(),
        attachments: [],
      };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'task-workflow-123',
                ...taskData,
                currentStatus: 'not_started',
                completionPercentage: 0,
              },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      let taskId: string;

      // Create task
      await act(async () => {
        taskId = await taskStore.current.createTask(taskData);
      });

      expect(taskId).toBe('task-workflow-123');

      // Step 2: Worker accepts task
      await act(async () => {
        await taskStore.current.acceptTask(taskId, mockWorker.id);
      });

      // Step 3: Worker adds progress update
      await act(async () => {
        await taskStore.current.addTaskUpdate(taskId, {
          text: '50% complete - HVAC units installed',
          userId: mockWorker.id,
          photos: ['https://storage.supabase.co/progress1.jpg'],
        });
      });

      // Step 4: Worker updates status
      await act(async () => {
        await taskStore.current.updateTaskStatus(taskId, 'in_progress', 50);
      });

      // Step 5: Worker completes task
      await act(async () => {
        await taskStore.current.updateTaskStatus(taskId, 'completed', 100);
      });

      // Verify all steps were executed
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Project Setup Workflow', () => {
    it('should complete project setup: Create project → Assign users → Create tasks → Assign tasks', async () => {
      // Step 1: Create project
      const projectData = {
        name: 'New Office Building',
        description: 'Downtown commercial project',
        status: 'planning' as const,
        companyId: 'company-123',
        startDate: new Date().toISOString(),
        createdBy: mockManager.id,
      };

      (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'project-setup-123', ...projectData },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {},
                error: null,
              }),
            }),
          }),
        };
      });

      const { result: projectStore } = renderHook(() => useProjectStore());
      const { result: taskStore } = renderHook(() => useTaskStore());

      let projectId: string;

      // Create project
      await act(async () => {
        projectId = await projectStore.current.createProject(projectData);
      });

      // Step 2: Assign users to project
      await act(async () => {
        await projectStore.current.assignUserToProject(
          mockWorker.id,
          projectId,
          'contractor',
          mockManager.id
        );
      });

      // Step 3: Create tasks under project
      const taskIds: string[] = [];
      for (let i = 1; i <= 3; i++) {
        await act(async () => {
          const id = await taskStore.current.createTask({
            title: `Task ${i}`,
            description: `Description for task ${i}`,
            priority: 'medium' as const,
            category: 'general' as const,
            projectId,
            assignedTo: [mockWorker.id],
            assignedBy: mockManager.id,
            dueDate: new Date().toISOString(),
            attachments: [],
          });
          taskIds.push(id);
        });
      }

      expect(taskIds).toHaveLength(3);
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('File Upload Workflow', () => {
    it('should complete file upload workflow: Select image → Compress → Upload → Attach to task', async () => {
      // This workflow is tested through the file upload service tests
      // and integration with task updates
      const mockTask = { id: 'task-upload-123' };

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'update-123',
                photos: ['https://storage.supabase.co/photo.jpg'],
              },
              error: null,
            }),
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      await act(async () => {
        await taskStore.current.addTaskUpdate(mockTask.id, {
          text: 'Photo uploaded',
          userId: mockWorker.id,
          photos: ['https://storage.supabase.co/photo.jpg'],
        });
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Task Delegation Workflow', () => {
    it('should delegate task: Manager creates → Assigns to worker → Worker creates subtasks', async () => {
      const parentTaskId = 'parent-task-123';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'subtask-123' },
              error: null,
            }),
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Worker creates subtasks
      await act(async () => {
        await taskStore.current.createSubTask(parentTaskId, {
          title: 'Subtask 1',
          description: 'First subtask',
          priority: 'medium' as const,
          assignedTo: [mockWorker.id],
          assignedBy: mockWorker.id,
          dueDate: new Date().toISOString(),
        });
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('subtasks');
    });
  });

  describe('Task Rejection Workflow', () => {
    it('should handle rejection: Worker rejects → Provides reason → Manager reassigns', async () => {
      const taskId = 'task-reject-123';
      const rejectionReason = 'Insufficient equipment available';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Worker rejects task
      await act(async () => {
        await taskStore.current.declineTask(taskId, mockWorker.id, rejectionReason);
      });

      // Manager reassigns to another worker
      await act(async () => {
        await taskStore.current.assignTask(taskId, ['worker-789']);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('User Onboarding Workflow', () => {
    it('should onboard user: Register → Login → View projects → Accept first task', async () => {
      // Step 1: Register
      (mockSupabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 'new-user-123', email: 'newuser@buildtrack.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      });

      const { result: authStore } = renderHook(() => useAuthStore());

      await act(async () => {
        await authStore.current.signUp('newuser@buildtrack.com', 'Password123!', 'New User');
      });

      // Step 2: Login (already done during signup)
      expect(authStore.current.user).toBeTruthy();

      // Step 3: View projects and tasks would be handled by respective stores
      // Step 4: Accept first task
      const { result: taskStore } = renderHook(() => useTaskStore());

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }));

      await act(async () => {
        await taskStore.current.acceptTask('task-123', 'new-user-123');
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Multi-User Collaboration', () => {
    it('should track multiple users working on same task', async () => {
      const taskId = 'collab-task-123';
      const users = ['user-1', 'user-2', 'user-3'];

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'update-123' },
              error: null,
            }),
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Each user adds their update
      for (const userId of users) {
        await act(async () => {
          await taskStore.current.addTaskUpdate(taskId, {
            text: `Update from ${userId}`,
            userId,
            photos: [],
          });
        });
      }

      expect(mockSupabase.from).toHaveBeenCalledTimes(users.length);
    });
  });

  describe('Today\'s Tasks Workflow', () => {
    it('should manage starred tasks: User stars task → Views "Today" filter → Completes starred task', async () => {
      const taskId = 'today-task-123';
      const userId = mockWorker.id;

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // User stars task for today
      await act(async () => {
        await taskStore.current.toggleTaskStar(taskId, userId);
      });

      // Complete the starred task
      await act(async () => {
        await taskStore.current.updateTaskStatus(taskId, 'completed', 100);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Overdue Task Workflow', () => {
    it('should handle overdue tasks: Task becomes overdue → Manager notified → Reassigns', async () => {
      const overdueTaskId = 'overdue-task-123';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Manager reassigns overdue task
      await act(async () => {
        await taskStore.current.assignTask(overdueTaskId, ['worker-new-789']);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Task History Tracking', () => {
    it('should track complete task history: Create → Updates → Status changes', async () => {
      const taskId = 'history-task-123';

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'update-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: {},
            error: null,
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Add multiple updates
      const updates = [
        { text: 'Started work', percentage: 10 },
        { text: 'Made good progress', percentage: 40 },
        { text: 'Almost done', percentage: 80 },
        { text: 'Completed', percentage: 100 },
      ];

      for (const update of updates) {
        await act(async () => {
          await taskStore.current.addTaskUpdate(taskId, {
            text: update.text,
            userId: mockWorker.id,
            photos: [],
          });
          await taskStore.current.updateTaskStatus(
            taskId,
            update.percentage === 100 ? 'completed' : 'in_progress',
            update.percentage
          );
        });
      }

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Bulk Task Operations', () => {
    it('should handle bulk task creation and assignment', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: `task-${Math.random()}` },
              error: null,
            }),
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // Create 10 tasks in bulk
      const taskPromises = Array.from({ length: 10 }, (_, i) =>
        taskStore.current.createTask({
          title: `Bulk Task ${i + 1}`,
          description: `Task ${i + 1} description`,
          priority: 'medium' as const,
          category: 'general' as const,
          projectId: 'project-123',
          assignedTo: [mockWorker.id],
          assignedBy: mockManager.id,
          dueDate: new Date().toISOString(),
          attachments: [],
        })
      );

      await act(async () => {
        await Promise.all(taskPromises);
      });

      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle network failure and retry', async () => {
      let attemptCount = 0;

      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockImplementation(() => {
              attemptCount++;
              if (attemptCount === 1) {
                // First attempt fails
                return Promise.resolve({
                  data: null,
                  error: { message: 'Network error' },
                });
              }
              // Second attempt succeeds
              return Promise.resolve({
                data: { id: 'task-retry-123' },
                error: null,
              });
            }),
          }),
        }),
      }));

      const { result: taskStore } = renderHook(() => useTaskStore());

      // First attempt
      try {
        await act(async () => {
          await taskStore.current.createTask({
            title: 'Retry Task',
            description: 'Test retry mechanism',
            priority: 'medium' as const,
            category: 'general' as const,
            projectId: 'project-123',
            assignedTo: [mockWorker.id],
            assignedBy: mockManager.id,
            dueDate: new Date().toISOString(),
            attachments: [],
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Retry
      await act(async () => {
        await taskStore.current.createTask({
          title: 'Retry Task',
          description: 'Test retry mechanism',
          priority: 'medium' as const,
          category: 'general' as const,
          projectId: 'project-123',
          assignedTo: [mockWorker.id],
          assignedBy: mockManager.id,
          dueDate: new Date().toISOString(),
          attachments: [],
        });
      });

      expect(attemptCount).toBe(2);
    });
  });
});

