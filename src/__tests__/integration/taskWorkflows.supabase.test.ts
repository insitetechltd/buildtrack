import { renderHook, act } from '@testing-library/react-native';
import { useTaskStore } from '@/state/taskStore.supabase';
import { supabase } from '@/api/supabase';
import { Task } from '@/types/buildtrack';

jest.mock('@/api/supabase');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFrom = mockSupabase.from as unknown as jest.Mock;

const managerId = 'manager-123';
const workerId = 'worker-456';
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

describe('Supabase task workflows integration tests', () => {
  beforeEach(() => {
    resetTaskStore();
    jest.clearAllMocks();
  });

  it('completes create -> assign -> accept -> progress flow through the production task store', async () => {
    const taskInsertSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'task-123',
        project_id: 'project-123',
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
        attachments: [],
        starred_by_users: [],
        accepted_by: null,
        accepted_at: null,
        decline_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: baseTimestamp,
        updated_at: baseTimestamp,
      },
      error: null,
    });
    const activityInsert = jest.fn((payload: Record<string, any>) => {
      if (payload.activity_type === 'creation') {
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'activity-creation',
                task_id: 'task-123',
                user_id: managerId,
                activity_type: 'creation',
                timestamp: baseTimestamp,
                data: payload.data,
                description: payload.description,
                completion_percentage: 0,
                status: 'new',
              },
              error: null,
            }),
          }),
        };
      }

      return Promise.resolve({ error: null });
    });
    const tasksUpdateEq = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: taskInsertSingle,
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: tasksUpdateEq,
          }),
        };
      }

      if (table === 'users') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn((field: string, id: string) => ({
            single: jest.fn().mockResolvedValue({
              data: {
                name: id === managerId ? 'Jane Manager' : 'Sarah Worker',
              },
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
      await result.current.createTask({
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

    const updateTaskMock = jest.fn().mockResolvedValue(undefined);
    const fetchTaskByIdMock = jest.fn().mockResolvedValue(null);
    await act(async () => {
      useTaskStore.setState({
        updateTask: updateTaskMock as any,
        fetchTaskById: fetchTaskByIdMock as any,
      });
    });

    await act(async () => {
      await result.current.assignTask('task-123', [workerId]);
      await result.current.acceptTask('task-123', workerId);
      await result.current.addTaskUpdate('task-123', {
        description: 'Installed ducting and brackets',
        photos: [],
        completionPercentage: 50,
        status: 'in_progress',
        userId: workerId,
      });
    });

    const updatedTask = result.current.tasks.find((task) => task.id === 'task-123');
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'progress_update',
          description: 'Installed ducting and brackets',
          completionPercentage: 50,
          status: 'in_progress',
        }),
      ])
    );
    expect(updatedTask?.updates).toEqual([]);
    expect(updateTaskMock).toHaveBeenCalledTimes(2);
    expect(fetchTaskByIdMock).toHaveBeenCalledWith('task-123');
  });

  it('completes parent-task -> create subtask -> update subtask workflow in the unified task table', async () => {
    const parentTask = createTaskState();
    const subTaskInsertSingle = jest.fn().mockResolvedValue({
      data: {
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
        attachments: [],
        created_at: baseTimestamp,
      },
      error: null,
    });
    const taskActivitiesInsert = jest.fn((payload: Record<string, any>) => {
      if (payload.activity_type === 'creation') {
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'activity-subtask-creation',
                task_id: 'subtask-123',
                user_id: managerId,
                activity_type: 'creation',
                timestamp: payload.timestamp,
                data: payload.data,
                description: payload.description,
                completion_percentage: 0,
                status: 'new',
              },
              error: null,
            }),
          }),
        };
      }

      return Promise.resolve({ error: null });
    });
    const tasksUpdateEq = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: subTaskInsertSingle,
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: tasksUpdateEq,
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
      tasks: [parentTask],
      fetchTaskById: jest.fn().mockResolvedValue(null) as any,
    });

    const { result } = renderHook(() => useTaskStore());

    await act(async () => {
      await result.current.createSubTask('task-123', {
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

    await act(async () => {
      await result.current.addSubTaskUpdate('task-123', 'subtask-123', {
        description: 'Completed the subtask work',
        photos: [],
        completionPercentage: 100,
        status: 'submitted_for_review',
        userId: workerId,
      });
    });

    expect(result.current.tasks.some(task => task.id === 'subtask-123')).toBe(true);
    expect(result.current.tasks.find((task) => task.id === 'subtask-123')?.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          activityType: 'creation',
        }),
      ])
    );
    expect(taskActivitiesInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        task_id: 'subtask-123',
        activity_type: 'progress_update',
      })
    );
    expect(tasksUpdateEq).toHaveBeenCalledWith('id', 'subtask-123');
  });
});
