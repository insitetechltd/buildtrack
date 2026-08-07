import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore.supabase';
import {
  clearRequestCoordinator,
  supabase,
} from '@/api/supabase';
import { TaskCategory, TaskStatus } from '@/types/buildtrack';

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

const resetTaskStore = () => {
  useTaskStore.setState({
    tasks: [],
    archivedTasks: [],
    taskReadStatuses: [],
    isLoading: false,
    error: null,
    taskFetchTimestamps: {},
    allTasksFetchTimestamp: null,
  });
};

describe('taskStore deferred-schema fallback contract tests', () => {
  beforeEach(() => {
    resetTaskStore();
    clearRequestCoordinator();
    jest.clearAllMocks();
  });

  describe('A1a. createTask deferred fallback strips redesign columns on 42703', () => {
    it('calls fallback insert once without primary_assignee_id / delegated_user_ids when first insert returns column-not-exists', async () => {
      const taskRow = createTaskRow();

      const firstInsertMock = jest.fn().mockReturnThis();
      const firstSelectMock = jest.fn().mockReturnThis();
      const firstSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: '42703',
          message: 'column "primary_assignee_id" of relation "tasks" does not exist',
          details: 'primary_assignee_id undefined_column',
        },
      });

      const fallbackInsertMock = jest.fn().mockReturnThis();
      const fallbackSelectMock = jest.fn().mockReturnThis();
      const fallbackSingleMock = jest.fn().mockResolvedValue({
        data: taskRow,
        error: null,
      });

      const usersSelectMock = jest.fn().mockReturnThis();
      const usersSingleMock = jest.fn().mockResolvedValue({
        data: { name: 'Jane Manager' },
        error: null,
      });

      const activityInsertMock = jest.fn().mockReturnThis();
      const activitySelectMock = jest.fn().mockReturnThis();
      const activitySingleMock = jest.fn().mockResolvedValue({
        data: createTaskActivityRow(),
        error: null,
      });

      let tasksInsertCallCount = 0;

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          tasksInsertCallCount++;
          if (tasksInsertCallCount === 1) {
            return {
              insert: firstInsertMock,
              select: firstSelectMock,
              single: firstSingleMock,
            };
          } else {
            return {
              insert: fallbackInsertMock,
              select: fallbackSelectMock,
              single: fallbackSingleMock,
            };
          }
        }
        if (table === 'users') {
          return {
            select: usersSelectMock,
            eq: jest.fn().mockReturnThis(),
            single: usersSingleMock,
          };
        }
        if (table === 'task_activities') {
          return {
            insert: activityInsertMock,
            select: activitySelectMock,
            single: activitySingleMock,
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.createTask({
            projectId: 'project-123',
            title: 'Install HVAC System',
            description: 'Install HVAC on level 3',
            priority: 'high',
            category: 'general' as TaskCategory,
            dueDate: '2026-06-30T00:00:00.000Z',
            attachments: [],
            assignedTo: [workerId],
            assignedBy: managerId,
            primaryAssigneeId: workerId,
            delegatedUserIds: [],
          });
        } catch (_e) {
        }
      });

      await waitFor(() => {
        expect(tasksInsertCallCount).toBeGreaterThanOrEqual(1);
      });

      expect(firstInsertMock).toHaveBeenCalledTimes(1);
      const firstInsertPayload = firstInsertMock.mock.calls[0][0];

      if (tasksInsertCallCount >= 2) {
        expect(fallbackInsertMock).toHaveBeenCalledTimes(1);
        const fallbackInsertPayload = fallbackInsertMock.mock.calls[0][0];
        expect(fallbackInsertPayload).not.toHaveProperty('primary_assignee_id');
        expect(fallbackInsertPayload).not.toHaveProperty('delegated_user_ids');
        expect(fallbackInsertPayload).not.toHaveProperty('container_id');
        expect(fallbackInsertPayload).not.toHaveProperty('sub_container_id');
        expect(fallbackInsertPayload).not.toHaveProperty('tags');
        expect(fallbackInsertPayload).not.toHaveProperty('location_on_site');
        expect(firstInsertPayload).toHaveProperty('primary_assignee_id');
      } else {
        expect(tasksInsertCallCount).toBe(2);
      }
    });
  });

  describe('A1b. updateTask deferred fallback strips redesign columns on 42703', () => {
    it('calls fallback update once without redesign keys when first update returns column-not-exists', async () => {
      const firstUpdatePayloadSpy = jest.fn();
      const fallbackUpdatePayloadSpy = jest.fn();

      let tasksUpdateCallSequence = 0;

      useTaskStore.setState({
        tasks: [{
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
        }],
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            update: (payload: any) => {
              tasksUpdateCallSequence++;
              if (tasksUpdateCallSequence === 1) {
                firstUpdatePayloadSpy(payload);
              } else {
                fallbackUpdatePayloadSpy(payload);
              }
              return {
                eq: (_field: string, _val: string) => {
                  if (tasksUpdateCallSequence === 1) {
                    return Promise.resolve({
                      data: null,
                      error: {
                        code: '42703',
                        message: 'column "delegated_user_ids" of relation "tasks" does not exist',
                        details: 'delegated_user_ids undefined_column',
                      },
                    });
                  } else {
                    return Promise.resolve({
                      data: null,
                      error: null,
                    });
                  }
                },
              };
            },
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: createTaskRow(),
              error: null,
            }),
            order: jest.fn().mockResolvedValue({
              data: [createTaskActivityRow()],
              error: null,
            }),
          };
        }
        if (table === 'task_activities') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [createTaskActivityRow()],
              error: null,
            }),
            insert: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: createTaskActivityRow(),
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
          insert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.updateTask('task-123', {
            title: 'Updated Title',
            primaryAssigneeId: workerId,
            delegatedUserIds: ['user-789'],
            containerId: 'container-1',
            subContainerId: 'subcontainer-1',
            tags: ['hvac'],
            locationOnSite: 'Level 3',
          });
        } catch (_e) {
        }
      });

      await waitFor(() => {
        expect(tasksUpdateCallSequence).toBeGreaterThanOrEqual(1);
      });

      expect(firstUpdatePayloadSpy).toHaveBeenCalledTimes(1);
      const firstPayload = firstUpdatePayloadSpy.mock.calls[0][0];
      expect(firstPayload).toHaveProperty('primary_assignee_id');
      expect(firstPayload).toHaveProperty('delegated_user_ids');

      expect(tasksUpdateCallSequence).toBeGreaterThanOrEqual(2);
      expect(fallbackUpdatePayloadSpy).toHaveBeenCalledTimes(1);
      const fallbackPayload = fallbackUpdatePayloadSpy.mock.calls[0][0];
      expect(fallbackPayload).not.toHaveProperty('primary_assignee_id');
      expect(fallbackPayload).not.toHaveProperty('delegated_user_ids');
      expect(fallbackPayload).not.toHaveProperty('container_id');
      expect(fallbackPayload).not.toHaveProperty('sub_container_id');
      expect(fallbackPayload).not.toHaveProperty('tags');
      expect(fallbackPayload).not.toHaveProperty('location_on_site');
      expect(fallbackPayload).toHaveProperty('title', 'Updated Title');
    });
  });
});
