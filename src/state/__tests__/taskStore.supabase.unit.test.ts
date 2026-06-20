import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore.supabase';
import { supabase } from '@/api/supabase';
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

  it('creates a task in the Supabase-backed store and logs a creation activity', async () => {
    const taskRow = createTaskRow();
    const creationActivity = createTaskActivityRow();
    const taskInsertSingle = jest.fn().mockResolvedValue({ data: taskRow, error: null });
    const activityInsertSingle = jest.fn().mockResolvedValue({ data: creationActivity, error: null });
    const activityInsert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: activityInsertSingle,
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: taskInsertSingle,
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
        dueDate: '2026-06-30T00:00:00.000Z',
        attachments: [],
      });
    });

    expect(createdTaskId).toBe('task-123');
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].activities).toHaveLength(1);
    expect(activityInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'task-123',
        activity_type: 'creation',
        status: 'new',
      })
    );
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
});
