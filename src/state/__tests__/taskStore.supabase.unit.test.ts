import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore.supabase';
import { useUserStore } from '../userStore.supabase';
import {
  buildResourceKey,
  clearRequestCoordinator,
  createQueryMeta,
  getRequestCacheEnvelope,
  supabase,
} from '@/api/supabase';
import { Task, TaskCategory, TaskStatus } from '@/types/buildtrack';

jest.mock('@/api/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFrom = mockSupabase.from as unknown as jest.Mock;

const managerId = 'manager-123';
const workerId = 'worker-456';
const baseTimestamp = '2026-06-16T09:00:00.000Z';

const createTaskRow = (overrides: Record<string, any> = {}) => ({
  id: 'task-123',
  project_id: 'project-123',
  parent_task_id: null,
  nesting_level: 0,
  root_task_id: 'task-123',
  title: 'Install HVAC System',
  description: 'Install HVAC on level 3',
  task_reference: null,
  billing_status: 'non_billable',
  priority: 'high',
  category: 'general',
  due_date: '2026-06-30T00:00:00.000Z',
  current_status: 'new',
  completion_percentage: 0,
  assigned_to: [workerId],
  assigned_by: managerId,
  location: null,
  attachments: [],
  starred_by_users: [],
  accepted_by: null,
  accepted_at: null,
  decline_reason: null,
  reviewed_by: null,
  reviewed_at: null,
  cancelled_at: null,
  cancelled_by: null,
  deleted_at: null,
  deleted_by: null,
  archived_at: null,
  archived_by: null,
  created_at: baseTimestamp,
  updated_at: baseTimestamp,
  ...overrides,
});

const createTaskActivityRow = (overrides: Record<string, any> = {}) => ({
  id: 'activity-123',
  task_id: 'task-123',
  user_id: managerId,
  activity_type: 'creation',
  timestamp: baseTimestamp,
  data: {
    title: 'Install HVAC System',
    assignedTo: [workerId],
    assignedBy: managerId,
  },
  description: 'Task created by Jane Manager',
  completion_percentage: 0,
  status: 'new',
  notifications_sent: false,
  notified_at: null,
  created_at: baseTimestamp,
  ...overrides,
});

const createTaskState = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-123',
  projectId: 'project-123',
  title: 'Install HVAC System',
  description: 'Install HVAC on level 3',
  priority: 'high',
  category: 'general' as TaskCategory,
  dueDate: '2026-06-30T00:00:00.000Z',
  attachments: [],
  assignedTo: [workerId],
  assignedBy: managerId,
  createdAt: baseTimestamp,
  updates: [],
  status: 'new' as TaskStatus,
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

describe('taskStore.supabase unit tests', () => {
  beforeEach(() => {
    resetTaskStore();
    clearRequestCoordinator();
    jest.clearAllMocks();
  });

  it('fetches tasks from Supabase, caches them, and only refetches on force refresh', async () => {
    const taskRow = createTaskRow();
    const activityRow = createTaskActivityRow();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [taskRow], error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasks();
    });

    await waitFor(() => {
      expect(result.current.tasks).toHaveLength(1);
    });

    expect(result.current.tasks[0].id).toBe(taskRow.id);
    expect(result.current.tasks[0].activities).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.fetchTasks();
    });

    expect(mockFrom).toHaveBeenCalledTimes(2);

    await act(async () => {
      await result.current.fetchTasks(true);
    });

    expect(mockFrom).toHaveBeenCalledTimes(4);
  });

  it('retries task creation without deferred redesign schema fields when Supabase is behind', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const taskRow = createTaskRow();
    const creationActivity = createTaskActivityRow();
    const taskInsertSingle = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGRST204',
          message: "Could not find the 'container_id' column of 'tasks' in the schema cache",
          details: null,
          hint: null,
        },
      })
      .mockResolvedValueOnce({ data: taskRow, error: null });
    const taskInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: taskInsertSingle,
      }),
    });
    const activityInsertSingle = jest.fn().mockResolvedValue({ data: creationActivity, error: null });
    const activityInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: activityInsertSingle,
      }),
    });

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
          insert: activityInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    let createdTaskId = '';
    await act(async () => {
      createdTaskId = await result.current.createTask({
        title: 'Install HVAC System',
        description: 'Install HVAC on level 3',
        priority: 'high',
        category: 'general',
        projectId: 'project-123',
        assignedTo: [workerId],
        assignedBy: managerId,
        primaryAssigneeId: workerId,
        delegatedUserIds: ['worker-789'],
        containerId: 'container-123',
        subContainerId: 'sub-container-456',
        tags: ['critical_this_week'],
        dueDate: '2026-06-30T00:00:00.000Z',
        attachments: [],
      });
    });

    expect(createdTaskId).toBe('task-123');
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].activities).toHaveLength(1);
    expect(taskInsert).toHaveBeenCalledTimes(2);
    const firstInsertedTaskPayload = taskInsert.mock.calls[0]?.[0];
    expect(firstInsertedTaskPayload).toEqual(
      expect.objectContaining({
        primary_assignee_id: workerId,
        delegated_user_ids: ['worker-789'],
        container_id: 'container-123',
        sub_container_id: 'sub-container-456',
        tags: ['critical_this_week'],
      })
    );
    const fallbackInsertedTaskPayload = taskInsert.mock.calls[1]?.[0];
    expect(Object.prototype.hasOwnProperty.call(fallbackInsertedTaskPayload, 'primary_assignee_id')).toBe(
      false
    );
    expect(Object.prototype.hasOwnProperty.call(fallbackInsertedTaskPayload, 'delegated_user_ids')).toBe(
      false
    );
    expect(Object.prototype.hasOwnProperty.call(fallbackInsertedTaskPayload, 'container_id')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(fallbackInsertedTaskPayload, 'sub_container_id')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(fallbackInsertedTaskPayload, 'tags')).toBe(false);
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'creation',
        status: 'new',
      })
    );
    consoleWarnSpy.mockRestore();
  });

  it('prevents assignee changes after a task has been accepted or started', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    resetTaskStore();
    useTaskStore.setState({
      tasks: [
        createTaskState({
          status: 'in_progress',
          assignedTo: [workerId],
        }),
      ],
    });

    const { result } = renderHook(() => useTaskStore());

    let thrownError: unknown;

    await act(async () => {
      try {
        await result.current.updateTask('task-123', { assignedTo: ['worker-999'] });
      } catch (error) {
        thrownError = error;
      }
    });

    expect(thrownError).toBeInstanceOf(Error);
    expect((thrownError as Error).message).toContain(
      'Cannot change assignees once a task has been accepted'
    );

    consoleErrorSpy.mockRestore();
  });

  it('clears the legacy accepted flag when a task is reset to new status', async () => {
    const updateMock = jest.fn().mockReturnThis();
    const eqMock = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          update: updateMock,
          eq: eqMock,
        };
      }

      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Jane Manager' },
            error: null,
          }),
        };
      }

      if (table === 'task_activities') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    resetTaskStore();
    useTaskStore.setState({
      tasks: [
        createTaskState({
          status: 'submitted_for_review',
          accepted: true,
          acceptedAt: baseTimestamp,
          assignedTo: [workerId],
        }),
      ],
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.updateTask('task-123', {
        assignedTo: ['worker-999'],
        status: 'new',
      });
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current_status: 'new',
        accepted: false,
        accepted_at: null,
      }),
    );
  });

  it('rolls back redesign-only metadata updates when stale Supabase schema rejects them', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const updateEqMock = jest.fn().mockResolvedValue({
      error: {
        code: 'PGRST204',
        message: "Could not find the 'tags' column of 'tasks' in the schema cache",
        details: null,
        hint: null,
      },
    });
    const updateMock = jest.fn().mockReturnValue({
      eq: updateEqMock,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          update: updateMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    resetTaskStore();
    useTaskStore.setState((state) => ({
      ...state,
      tasks: [
        createTaskState({
          tags: [],
        } as any),
      ],
      trackTaskEdit: jest.fn().mockResolvedValue(undefined),
      notifyTaskEdit: jest.fn().mockResolvedValue(undefined),
    }));

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await expect(
        result.current.updateTask('task-123', {
          tags: ['critical_this_week'],
        })
      ).resolves.toBeUndefined();
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      tags: ['critical_this_week'],
    });
    expect(result.current.tasks[0]).toMatchObject({
      tags: [],
    });
    expect(result.current.error).toBeNull();

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('persists compatible task edits and drops deferred redesign metadata when schema is behind', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const updateEqMock = jest
      .fn()
      .mockResolvedValueOnce({
        error: {
          code: 'PGRST204',
          message: "Could not find the 'tags' column of 'tasks' in the schema cache",
          details: null,
          hint: null,
        },
      })
      .mockResolvedValueOnce({ error: null });
    const updateMock = jest.fn().mockReturnValue({
      eq: updateEqMock,
    });
    const mockTrackTaskEdit = jest.fn().mockResolvedValue(undefined);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          update: updateMock,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    resetTaskStore();
    useTaskStore.setState((state) => ({
      ...state,
      tasks: [
        createTaskState({
          title: 'Install HVAC System',
          tags: [],
        } as any),
      ],
      trackTaskEdit: mockTrackTaskEdit,
      notifyTaskEdit: jest.fn().mockResolvedValue(undefined),
    }));

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await expect(
        result.current.updateTask('task-123', {
          title: 'Install HVAC Phase 2',
          tags: ['critical_this_week'],
        })
      ).resolves.toBeUndefined();
    });

    expect(updateMock).toHaveBeenCalledTimes(2);
    expect(updateMock.mock.calls[0]?.[0]).toEqual({
      title: 'Install HVAC Phase 2',
      tags: ['critical_this_week'],
    });
    expect(updateMock.mock.calls[1]?.[0]).toEqual({
      title: 'Install HVAC Phase 2',
    });
    expect(result.current.tasks[0]).toMatchObject({
      title: 'Install HVAC Phase 2',
      tags: [],
    });
    expect(mockTrackTaskEdit).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('declines flat subtasks without requiring a nested children tree', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Reviewer User' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const updateSubTaskMock = jest.fn().mockResolvedValue(undefined);
    const addSubTaskUpdateMock = jest.fn().mockResolvedValue(undefined);

    resetTaskStore();
    useTaskStore.setState((state) => ({
      ...state,
      tasks: [
        createTaskState(),
        createTaskState({
          id: 'subtask-123',
          parentTaskId: 'task-123',
          assignedTo: [workerId],
          assignedBy: managerId,
          completionPercentage: 75,
        }),
      ],
      updateSubTask: updateSubTaskMock,
      addSubTaskUpdate: addSubTaskUpdateMock,
    }));

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.declineSubTask('task-123', 'subtask-123', 'reviewer-1', 'Need changes');
    });

    expect(updateSubTaskMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-123',
      expect.objectContaining({
        status: 'rejected',
        declinedReason: 'Need changes',
        assignedTo: [managerId],
      }),
    );
    expect(addSubTaskUpdateMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-123',
      expect.objectContaining({
        status: 'rejected',
        description: expect.stringContaining('Need changes'),
      }),
    );
  });

  it('declines nested subtasks via rootTaskId when the parent task is not the direct parent', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Reviewer User' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const updateSubTaskMock = jest.fn().mockResolvedValue(undefined);
    const addSubTaskUpdateMock = jest.fn().mockResolvedValue(undefined);

    resetTaskStore();
    useTaskStore.setState((state) => ({
      ...state,
      tasks: [
        createTaskState(),
        createTaskState({
          id: 'subtask-parent',
          parentTaskId: 'task-123',
          rootTaskId: 'task-123',
          assignedTo: [workerId],
          assignedBy: managerId,
        }),
        createTaskState({
          id: 'subtask-leaf',
          parentTaskId: 'subtask-parent',
          rootTaskId: 'task-123',
          assignedTo: [workerId],
          assignedBy: managerId,
          completionPercentage: 50,
        }),
      ],
      updateSubTask: updateSubTaskMock,
      addSubTaskUpdate: addSubTaskUpdateMock,
    }));

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.declineSubTask('task-123', 'subtask-leaf', 'reviewer-1', 'Nested changes');
    });

    expect(updateSubTaskMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-leaf',
      expect.objectContaining({
        status: 'rejected',
        assignedTo: [managerId],
      }),
    );
    expect(addSubTaskUpdateMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-leaf',
      expect.objectContaining({
        status: 'rejected',
        description: expect.stringContaining('Nested changes'),
      }),
    );
  });

  it('declines nested-only fallback subtasks stored under parent children arrays', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { name: 'Reviewer User' },
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const updateSubTaskMock = jest.fn().mockResolvedValue(undefined);
    const addSubTaskUpdateMock = jest.fn().mockResolvedValue(undefined);

    resetTaskStore();
    useTaskStore.setState((state) => ({
      ...state,
      tasks: [
        {
          ...createTaskState(),
          children: [
            createTaskState({
              id: 'subtask-nested-only',
              parentTaskId: 'task-123',
              assignedTo: [workerId],
              assignedBy: managerId,
              completionPercentage: 25,
            }),
          ],
        },
      ],
      updateSubTask: updateSubTaskMock,
      addSubTaskUpdate: addSubTaskUpdateMock,
    }));

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.declineSubTask('task-123', 'subtask-nested-only', 'reviewer-1', 'Fallback child');
    });

    expect(updateSubTaskMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-nested-only',
      expect.objectContaining({
        status: 'rejected',
        assignedTo: [managerId],
      }),
    );
    expect(addSubTaskUpdateMock).toHaveBeenCalledWith(
      'task-123',
      'subtask-nested-only',
      expect.objectContaining({
        status: 'rejected',
        description: expect.stringContaining('Fallback child'),
      }),
    );
  });

  it('treats stale scoped task caches as background-refresh eligible only when the live coordinator envelope exists', async () => {
    let now = 1_000;
    const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    const projectTaskRow = createTaskRow({
      id: 'task-project-live-envelope',
      project_id: 'project-123',
    });
    const activityRow = createTaskActivityRow({
      task_id: 'task-project-live-envelope',
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [projectTaskRow], error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasksByProject('project-123', true);
    });

    const resourceKey = buildResourceKey('tasks', 'project', 'project-123');

    expect(getRequestCacheEnvelope(resourceKey)).toMatchObject({
      key: resourceKey,
      data: expect.any(Array),
      lastFetchedAt: 1_000,
      staleAt: 16_000,
      expiresAt: 61_000,
    });

    now = 16_001;

    expect(
      useTaskStore.getState().shouldRefreshTasksInBackground(resourceKey, ['task-project-live-envelope'])
    ).toBe(true);

    dateNowSpy.mockRestore();
  });

  it('does not treat cached task ids as background-refresh eligible when no live request envelope exists', () => {
    const resourceKey = buildResourceKey('tasks', 'all');

    useTaskStore.setState({
      tasks: [createTaskState()],
      taskQueryMeta: {
        [resourceKey]: createQueryMeta(resourceKey, {
          hasHydratedData: true,
          hasFetchedOnce: true,
          lastFetchedAt: 1_000,
          lastSuccessfulFetchAt: 1_000,
          staleAt: 61_000,
          expiresAt: 121_000,
          emptyStateResolved: true,
        }),
      },
    });

    clearRequestCoordinator();

    expect(
      useTaskStore.getState().shouldRefreshTasksInBackground(resourceKey, ['task-123'])
    ).toBe(false);
  });

  it('does not synthesize freshness timestamps from persisted taskQueryMeta when no live envelope exists', () => {
    const resourceKey = buildResourceKey('tasks', 'all');

    useTaskStore.setState({
      taskQueryMeta: {
        [resourceKey]: createQueryMeta(resourceKey, {
          hasHydratedData: true,
          hasFetchedOnce: true,
          lastFetchedAt: 1_000,
          lastSuccessfulFetchAt: 1_500,
          staleAt: 61_000,
          expiresAt: 121_000,
          emptyStateResolved: true,
        }),
      },
    });

    clearRequestCoordinator();
    useTaskStore.getState().completeTaskQuerySuccess(resourceKey, ['task-123']);

    const meta = useTaskStore.getState().taskQueryMeta[resourceKey];

    expect(getRequestCacheEnvelope(resourceKey)).toBeNull();
    expect(meta.lastFetchedAt).toBeNull();
    expect(meta.lastSuccessfulFetchAt).toBeNull();
    expect(meta.staleAt).toBeNull();
    expect(meta.expiresAt).toBeNull();
  });

  it('normalizes fetchTaskById responses to preserve hierarchy fields and assignment metadata', async () => {
    const taskRow = createTaskRow({
      id: 'subtask-123',
      parent_task_id: 'task-123',
      nesting_level: 2,
      root_task_id: 'root-task-123',
      assigned_to: [42, workerId],
      assigned_by: 9001,
      current_status: 'in_progress',
      completion_percentage: 65,
    });
    const activityRow = createTaskActivityRow({
      task_id: 'subtask-123',
      activity_type: 'progress_update',
      completion_percentage: 65,
      status: 'in_progress',
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: taskRow, error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    let fetchedTask: Task | null = null;
    await act(async () => {
      fetchedTask = await result.current.fetchTaskById('subtask-123', true);
    });

    expect(fetchedTask).toMatchObject({
      id: 'subtask-123',
      parentTaskId: 'task-123',
      nestingLevel: 2,
      rootTaskId: 'root-task-123',
      assignedTo: ['42', workerId],
      assignedBy: '9001',
      status: 'in_progress',
      completionPercentage: 65,
    });
    expect(fetchedTask?.updates).toEqual([
      expect.objectContaining({
        id: activityRow.id,
        status: 'in_progress',
        completionPercentage: 65,
      }),
    ]);
    expect(result.current.tasks[0]).toMatchObject({
      id: 'subtask-123',
      parentTaskId: 'task-123',
      nestingLevel: 2,
      rootTaskId: 'root-task-123',
      assignedTo: ['42', workerId],
      assignedBy: '9001',
    });
    expect(result.current.taskFetchTimestamps['subtask-123']).toEqual(expect.any(Number));
  });


  it('normalizes legacy assignedTo arrays into redesign primary and delegated assignees', async () => {
    const taskRow = createTaskRow({
      id: 'task-redesign-legacy',
      assigned_to: ['u-primary', 'u-helper'],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: taskRow, error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    let fetchedTask: Task | null = null;
    await act(async () => {
      fetchedTask = await result.current.fetchTaskById('task-redesign-legacy', true);
    });

    expect(fetchedTask).toMatchObject({
      assignedTo: ['u-primary', 'u-helper'],
    });
    expect((fetchedTask as any)?.primaryAssigneeId).toBe('u-primary');
    expect((fetchedTask as any)?.delegatedUserIds).toEqual(['u-helper']);
    expect((fetchedTask as any)?.tags).toEqual([]);
  });

  it('preserves explicit redesign assignment metadata when it already exists', async () => {
    const taskRow = createTaskRow({
      id: 'task-redesign-explicit',
      assigned_to: ['u-primary', 'u-helper'],
      primary_assignee_id: 'u-explicit-primary',
      delegated_user_ids: ['u-explicit-helper'],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: taskRow, error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    let fetchedTask: Task | null = null;
    await act(async () => {
      fetchedTask = await result.current.fetchTaskById('task-redesign-explicit', true);
    });

    expect((fetchedTask as any)?.primaryAssigneeId).toBe('u-explicit-primary');
    expect((fetchedTask as any)?.delegatedUserIds).toEqual(['u-explicit-helper']);
    expect(fetchedTask?.assignedTo).toEqual(['u-primary', 'u-helper']);
  });

  it('preserves redesign container fields and tags through normalization', async () => {
    const taskRow = createTaskRow({
      id: 'task-redesign-container',
      assigned_to: ['u-primary'],
      container_id: 'container-7',
      sub_container_id: 'sub-container-9',
      tags: ['electrical', 'priority'],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: taskRow, error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    let fetchedTask: Task | null = null;
    await act(async () => {
      fetchedTask = await result.current.fetchTaskById('task-redesign-container', true);
    });

    expect((fetchedTask as any)?.containerId).toBe('container-7');
    expect((fetchedTask as any)?.subContainerId).toBe('sub-container-9');
    expect((fetchedTask as any)?.tags).toEqual(['electrical', 'priority']);
  });

  it('defaults missing redesign tags during persisted store normalization', () => {
    const merge = useTaskStore.persist.getOptions().merge;
    expect(merge).toBeDefined();

    const persistedTask = createTaskState({
      id: 'task-persisted-redesign-tags',
      assignedTo: ['u-primary', 'u-helper'],
    } as any);

    const mergedState = merge?.(
      {
        tasks: [persistedTask],
        taskReadStatuses: [],
        allTasksFetchTimestamp: null,
        taskQueryMeta: {},
      } as any,
      useTaskStore.getState() as any
    ) as ReturnType<typeof useTaskStore.getState>;

    expect((mergedState.tasks[0] as any).primaryAssigneeId).toBe('u-primary');
    expect((mergedState.tasks[0] as any).delegatedUserIds).toEqual(['u-helper']);
    expect((mergedState.tasks[0] as any).tags).toEqual([]);
  });

  it('upserts scoped project fetch results without dropping unrelated cached tasks', async () => {
    const existingTask = createTaskState({
      id: 'task-existing',
      projectId: 'project-keep',
      title: 'Keep existing task',
      assignedTo: ['existing-worker'],
      assignedBy: 'existing-manager',
    });

    const projectTaskRow = createTaskRow({
      id: 'task-project-1',
      project_id: 'project-123',
      assigned_to: [42, workerId],
      assigned_by: 9001,
    });

    const activityRow = createTaskActivityRow({
      task_id: 'task-project-1',
    });

    useTaskStore.setState({
      tasks: [existingTask],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [projectTaskRow], error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasksByProject('project-123', true);
    });

    expect(result.current.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining(['task-existing', 'task-project-1'])
    );
    expect(result.current.tasks).toHaveLength(2);

    const fetchedTask = result.current.tasks.find((task) => task.id === 'task-project-1');
    expect(fetchedTask).toMatchObject({
      assignedTo: ['42', workerId],
      assignedBy: '9001',
    });
  });

  it('removes stale tasks that no longer belong to the fetched project scope while preserving unrelated tasks', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const staleProjectTask = createTaskState({
      id: 'task-stale-project',
      projectId: 'project-123',
      title: 'Remove stale project task',
    });
    const unrelatedTask = createTaskState({
      id: 'task-other-project',
      projectId: 'project-keep',
      title: 'Keep unrelated task',
    });
    const freshProjectTaskRow = createTaskRow({
      id: 'task-fresh-project',
      project_id: 'project-123',
    });
    const activityRow = createTaskActivityRow({
      task_id: 'task-fresh-project',
    });

    useTaskStore.setState({
      tasks: [staleProjectTask, unrelatedTask],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [freshProjectTaskRow], error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasksByProject('project-123', true);
    });

    expect(result.current.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining(['task-fresh-project', 'task-other-project'])
    );
    expect(result.current.tasks.map((task) => task.id)).not.toContain('task-stale-project');
    consoleErrorSpy.mockRestore();
  });

  it('refreshes stale scoped tasks that moved to another project instead of evicting them globally', async () => {
    const movedTask = createTaskState({
      id: 'task-moved',
      projectId: 'project-123',
      title: 'Move me to another project',
    });
    const unrelatedTask = createTaskState({
      id: 'task-unrelated',
      projectId: 'project-keep',
      title: 'Keep unrelated task',
    });
    const freshProjectTaskRow = createTaskRow({
      id: 'task-fresh-project-2',
      project_id: 'project-123',
    });
    const movedTaskRow = createTaskRow({
      id: 'task-moved',
      project_id: 'project-999',
      assigned_to: [workerId],
      assigned_by: managerId,
    });
    const activityRow = createTaskActivityRow({
      task_id: 'task-fresh-project-2',
    });

    useTaskStore.setState({
      tasks: [movedTask, unrelatedTask],
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        const taskByIdQuery = {
          is: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: movedTaskRow, error: null }),
        };
        const taskQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (field: string, value: string) {
            if (field === 'project_id' && value === 'project-123') {
              return taskQuery;
            }

            if (field === 'id' && value === 'task-moved') {
              return taskByIdQuery;
            }

            return taskQuery;
          }),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [freshProjectTaskRow], error: null }),
        };

        return taskQuery;
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest
            .fn()
            .mockResolvedValueOnce({ data: [activityRow], error: null })
            .mockResolvedValueOnce({ data: [], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasksByProject('project-123', true);
    });

    expect(result.current.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining(['task-fresh-project-2', 'task-moved', 'task-unrelated'])
    );
    expect(result.current.tasks.find((task) => task.id === 'task-moved')).toMatchObject({
      projectId: 'project-999',
    });
  });

  it('normalizes assignee identifiers when fetching scoped user task subsets', async () => {
    const userTaskRow = createTaskRow({
      id: 'task-user-1',
      assigned_to: [7, workerId],
      assigned_by: 88,
    });

    const activityRow = createTaskActivityRow({
      task_id: 'task-user-1',
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          select: jest.fn().mockReturnThis(),
          contains: jest.fn().mockReturnThis(),
          is: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [userTaskRow], error: null }),
        };
      }

      if (table === 'task_activities') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [activityRow], error: null }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.fetchTasksByUser(workerId, true);
    });

    expect(result.current.tasks[0]).toMatchObject({
      id: 'task-user-1',
      assignedTo: ['7', workerId],
      assignedBy: '88',
    });
  });

  it('uses the Sprint 7 Supabase persistence namespaces for task and user stores', () => {
    expect(useTaskStore.persist.getOptions().name).toBe('insite-tasks-supabase-v1');
    expect(useUserStore.persist.getOptions().name).toBe('insite-users-supabase-v1');
  });

  it('hydrates legacy updates into activities during persisted store merge', () => {
    const merge = useTaskStore.persist.getOptions().merge;
    expect(merge).toBeDefined();

    const persistedTask = createTaskState({
      id: 'task-persisted-1',
      activities: undefined,
      updates: [
        {
          id: 'legacy-update-1',
          userId: workerId,
          timestamp: baseTimestamp,
          description: 'Legacy persisted progress update',
          completionPercentage: 40,
          status: 'in_progress',
          photos: ['https://example.com/persisted-photo.jpg'],
        },
      ],
    });

    const mergedState = merge?.(
      {
        tasks: [persistedTask],
        taskReadStatuses: [],
        allTasksFetchTimestamp: null,
        taskQueryMeta: {},
      } as any,
      useTaskStore.getState() as any
    ) as ReturnType<typeof useTaskStore.getState>;

    expect(mergedState.tasks[0]).toMatchObject({
      id: 'task-persisted-1',
      updates: [
        expect.objectContaining({
          id: 'legacy-update-1',
          description: 'Legacy persisted progress update',
        }),
      ],
      activities: [
        expect.objectContaining({
          id: 'legacy-update-1',
          activityType: 'progress_update',
          description: 'Legacy persisted progress update',
        }),
      ],
    });
  });

});
