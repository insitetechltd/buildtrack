import { renderHook, act } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore.supabase';
import { supabase } from '@/api/supabase';
import { Task, TaskStatus } from '@/types/buildtrack';

jest.mock('@/api/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFrom = mockSupabase.from as unknown as jest.Mock;

const managerId = 'manager-123';
const workerId = 'worker-456';
const workerTwoId = 'worker-789';
const baseTimestamp = '2026-06-16T09:00:00.000Z';

const createTaskState = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-123',
  projectId: 'project-123',
  parentTaskId: null,
  nestingLevel: 0,
  rootTaskId: 'task-123',
  title: 'Install HVAC System',
  description: 'Install HVAC on level 3',
  priority: 'high',
  category: 'general',
  dueDate: '2026-06-30T00:00:00.000Z',
  attachments: [],
  assignedTo: [workerId],
  assignedBy: managerId,
  createdAt: baseTimestamp,
  updates: [],
  status: 'new',
  completionPercentage: 0,
  activities: [],
  ...overrides,
});

const resetTaskStore = () => {
  useTaskStore.setState({
    tasks: [],
    taskReadStatuses: [],
    isLoading: false,
    error: null,
    taskFetchTimestamps: {},
    allTasksFetchTimestamp: null,
  });
};

describe('taskStore.supabase workflow tests', () => {
  beforeEach(() => {
    resetTaskStore();
    jest.clearAllMocks();
  });

  it('assigns and reassigns a task through the Supabase-backed workflow', async () => {
    const updateTaskMock = jest.fn().mockResolvedValue(undefined);
    const assignmentInsert = jest.fn().mockResolvedValue({ error: null });

    useTaskStore.setState({
      tasks: [createTaskState()],
      updateTask: updateTaskMock as any,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field: string, id: string) => ({
            single: jest.fn().mockResolvedValue({
              data: {
                name:
                  id === managerId
                    ? 'Jane Manager'
                    : id === workerId
                      ? 'Sarah Worker'
                      : 'Mike Installer',
              },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: assignmentInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.assignTask('task-123', [workerId, workerTwoId]);
    });

    expect(updateTaskMock).toHaveBeenCalledWith('task-123', {
      assignedTo: [workerId, workerTwoId],
    });
    expect(assignmentInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'assignment',
        data: expect.objectContaining({
          assignedTo: [workerId, workerTwoId],
          assignedBy: managerId,
        }),
      })
    );
  });

  it('accepts a task and logs the status change', async () => {
    const updateTaskMock = jest.fn().mockResolvedValue(undefined);
    const activityInsert = jest.fn().mockResolvedValue({ error: null });

    useTaskStore.setState({
      tasks: [createTaskState()],
      updateTask: updateTaskMock as any,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Sarah Worker' },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: activityInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.acceptTask('task-123', workerId);
    });

    expect(updateTaskMock).toHaveBeenCalledWith(
      'task-123',
      expect.objectContaining({
        status: 'in_progress',
        acceptedBy: workerId,
      })
    );
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'status_change',
        status: 'in_progress',
      })
    );
  });

  it('declines a task and persists the reason', async () => {
    const updateTaskMock = jest.fn().mockResolvedValue(undefined);
    const activityInsert = jest.fn().mockResolvedValue({ error: null });

    useTaskStore.setState({
      tasks: [createTaskState()],
      updateTask: updateTaskMock as any,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Sarah Worker' },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: activityInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.declineTask('task-123', workerId, 'Waiting on materials');
    });

    expect(updateTaskMock).toHaveBeenCalledWith(
      'task-123',
      expect.objectContaining({
        status: 'declined',
        declinedReason: 'Waiting on materials',
      })
    );
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'status_change',
        status: 'declined',
      })
    );
  });

  it('adds a task progress update and refreshes cached task data', async () => {
    const refreshTaskMock = jest.fn().mockResolvedValue(null);
    const taskActivityInsert = jest.fn().mockResolvedValue({ error: null });
    const updateEq = jest.fn().mockResolvedValue({ error: null });

    useTaskStore.setState({
      tasks: [createTaskState()],
      fetchTaskById: refreshTaskMock as any,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'task_activities') {
        return {
          insert: taskActivityInsert,
        };
      }

      if (table === 'tasks') {
        return {
          update: jest.fn().mockReturnValue({
            eq: updateEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.addTaskUpdate('task-123', {
        description: 'Installed ducting and updated brackets',
        photos: ['https://example.com/progress.jpg'],
        completionPercentage: 50,
        status: 'in_progress',
        userId: workerId,
      });
    });

    expect(taskActivityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'progress_update',
        completion_percentage: 50,
        status: 'in_progress',
      })
    );
    expect(result.current.tasks.find((task) => task.id === 'task-123')?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'progress_update',
          description: 'Installed ducting and updated brackets',
          completionPercentage: 50,
          status: 'in_progress',
        }),
      ])
    );
    expect(result.current.tasks.find((task) => task.id === 'task-123')?.updates).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('task_updates');
    expect(updateEq).toHaveBeenCalledWith('id', 'task-123');
    expect(refreshTaskMock).toHaveBeenCalledWith('task-123');
  });

  it('adds a subtask progress update and refreshes the subtask cache entry', async () => {
    const refreshTaskMock = jest.fn().mockResolvedValue(null);
    const taskActivityInsert = jest.fn().mockResolvedValue({ error: null });
    const updateEq = jest.fn().mockResolvedValue({ error: null });
    const subTask = createTaskState({
      id: 'subtask-123',
      parentTaskId: 'task-123',
      nestingLevel: 1,
      rootTaskId: 'task-123',
      status: 'in_progress',
    });

    useTaskStore.setState({
      tasks: [createTaskState(), subTask],
      fetchTaskById: refreshTaskMock as any,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'task_activities') {
        return {
          insert: taskActivityInsert,
        };
      }

      if (table === 'tasks') {
        return {
          update: jest.fn().mockReturnValue({
            eq: updateEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.addSubTaskUpdate('task-123', 'subtask-123', {
        description: 'Finished subtask install sequence',
        photos: [],
        completionPercentage: 100,
        status: 'submitted_for_review',
        userId: workerId,
      });
    });

    expect(taskActivityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'subtask-123',
        activity_type: 'progress_update',
        completion_percentage: 100,
        status: 'submitted_for_review',
      })
    );
    expect(result.current.tasks.find((task) => task.id === 'subtask-123')?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'progress_update',
          description: 'Finished subtask install sequence',
          completionPercentage: 100,
          status: 'submitted_for_review',
        }),
      ])
    );
    expect(result.current.tasks.find((task) => task.id === 'subtask-123')?.updates).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalledWith('task_updates');
    expect(updateEq).toHaveBeenCalledWith('id', 'subtask-123');
    expect(refreshTaskMock).toHaveBeenCalledWith('subtask-123');
  });

  it('creates a subtask in the unified tasks table for nested task workflows', async () => {
    const subTaskRow = {
      id: 'subtask-123',
      parent_task_id: 'task-123',
      nesting_level: 1,
      root_task_id: 'task-123',
      project_id: 'project-123',
      title: 'Wire thermostat',
      description: 'Connect the thermostat controls',
      task_reference: null,
      priority: 'medium',
      category: 'electrical',
      due_date: '2026-07-02T00:00:00.000Z',
      current_status: 'new',
      completion_percentage: 0,
      assigned_to: [workerId],
      assigned_by: managerId,
      location: null,
      attachments: [],
      created_at: baseTimestamp,
    };
    const taskActivitiesInsert = jest.fn((payload: Record<string, any>) => ({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: payload.activity_type === 'creation' ? 'activity-subtask-creation' : 'activity-subtask-status',
            task_id: 'subtask-123',
            user_id: managerId,
            activity_type: payload.activity_type,
            timestamp: payload.timestamp,
            data: payload.data,
            description: payload.description,
            completion_percentage: payload.completion_percentage,
            status: payload.status,
          },
          error: null,
        }),
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: subTaskRow,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Jane Manager' },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: taskActivitiesInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    useTaskStore.setState({
      tasks: [createTaskState()],
    });

    const { result } = renderHook(() => useTaskStore());

    let subTaskId = '';
    await act(async () => {
      subTaskId = await result.current.createSubTask('task-123', {
        title: 'Wire thermostat',
        description: 'Connect the thermostat controls',
        priority: 'medium',
        category: 'electrical',
        projectId: 'project-123',
        assignedTo: [workerId],
        assignedBy: managerId,
        dueDate: '2026-07-02T00:00:00.000Z',
        attachments: [],
      });
    });

    expect(subTaskId).toBe('subtask-123');
    expect(result.current.tasks.some(task => task.id === 'subtask-123')).toBe(true);
    expect(taskActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'subtask-123',
        activity_type: 'creation',
      }),
    );
    expect(result.current.tasks.find((task) => task.id === 'subtask-123')?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'creation',
        }),
      ])
    );
  });

  it('auto-accepts self-assigned subtasks with an in-progress status', async () => {
    const taskInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'subtask-self',
            parent_task_id: 'task-123',
            nesting_level: 1,
            root_task_id: 'task-123',
            project_id: 'project-123',
            title: 'Self assigned subtask',
            description: 'Follow up directly',
            task_reference: null,
            priority: 'medium',
            category: 'electrical',
            due_date: '2026-07-02T00:00:00.000Z',
            current_status: 'in_progress',
            completion_percentage: 0,
            assigned_to: [managerId],
            assigned_by: managerId,
            location: null,
            attachments: [],
            accepted: true,
            accepted_at: baseTimestamp,
            created_at: baseTimestamp,
          },
          error: null,
        }),
      }),
    });
    const taskActivitiesInsert = jest.fn((payload: Record<string, any>) => ({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: payload.activity_type === 'creation' ? 'activity-self-creation' : 'activity-self-status',
            task_id: 'subtask-self',
            user_id: managerId,
            activity_type: payload.activity_type,
            timestamp: payload.timestamp,
            data: payload.data,
            description: payload.description,
            completion_percentage: payload.completion_percentage,
            status: payload.status,
          },
          error: null,
        }),
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: taskInsert,
        };
      }

      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Jane Manager' },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: taskActivitiesInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    useTaskStore.setState({
      tasks: [createTaskState()],
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.createSubTask('task-123', {
        title: 'Self assigned subtask',
        description: 'Follow up directly',
        priority: 'medium',
        category: 'electrical',
        projectId: 'project-123',
        assignedTo: [managerId],
        assignedBy: managerId,
        dueDate: '2026-07-02T00:00:00.000Z',
        attachments: [],
      });
    });

    expect(taskInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_status: 'in_progress',
        accepted: true,
      }),
    );
    expect(taskActivitiesInsert).toHaveBeenCalledTimes(2);
    expect(taskActivitiesInsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        task_id: 'subtask-self',
        activity_type: 'status_change',
        status: 'in_progress',
      }),
    );
  });

  it('writes accepted false for non-self-assigned nested subtasks', async () => {
    const taskInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'subtask-nested',
            parent_task_id: 'subtask-parent',
            nesting_level: 2,
            root_task_id: 'task-123',
            project_id: 'project-123',
            title: 'Nested delegated subtask',
            description: 'Delegated to another worker',
            task_reference: null,
            priority: 'medium',
            category: 'electrical',
            due_date: '2026-07-02T00:00:00.000Z',
            current_status: 'new',
            completion_percentage: 0,
            assigned_to: [workerId],
            assigned_by: managerId,
            location: null,
            attachments: [],
            accepted: false,
            accepted_at: null,
            created_at: baseTimestamp,
          },
          error: null,
        }),
      }),
    });
    const taskActivitiesInsert = jest.fn((payload: Record<string, any>) => ({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'activity-nested-creation',
            task_id: 'subtask-nested',
            user_id: managerId,
            activity_type: payload.activity_type,
            timestamp: payload.timestamp,
            data: payload.data,
            description: payload.description,
            completion_percentage: payload.completion_percentage,
            status: payload.status,
          },
          error: null,
        }),
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: taskInsert,
        };
      }

      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Jane Manager' },
              error: null,
            }),
          })),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: taskActivitiesInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    useTaskStore.setState({
      tasks: [
        createTaskState(),
        createTaskState({
          id: 'subtask-parent',
          parentTaskId: 'task-123',
          nestingLevel: 1,
          rootTaskId: 'task-123',
        }),
      ],
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.createNestedSubTask('task-123', 'subtask-parent', {
        title: 'Nested delegated subtask',
        description: 'Delegated to another worker',
        priority: 'medium',
        category: 'electrical',
        projectId: 'project-123',
        assignedTo: [workerId],
        assignedBy: managerId,
        dueDate: '2026-07-02T00:00:00.000Z',
        attachments: [],
      });
    });

    expect(taskInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_status: 'new',
        accepted: false,
      }),
    );
    expect(taskActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'subtask-nested',
        activity_type: 'creation',
      }),
    );
  });
});
