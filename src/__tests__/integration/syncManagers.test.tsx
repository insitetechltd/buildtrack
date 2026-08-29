describe('sync manager regression tests', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('fires the fallback background sync when the 30-second interval elapses without busting tracked task caches', async () => {
    let now = 1000;

    const invalidateResourceKeys = jest.fn();
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [{ id: 'task-1' }],
      taskQueryMeta: {
        'tasks:all': { key: 'tasks:all' },
        'task:task-1': { key: 'task:task-1' },
        'tasks:project:project-1': { key: 'tasks:project:project-1' },
      },
      fetchTasks,
    };
    const projectStoreState = {
      projects: [{ id: 'project-1' }],
      userAssignments: [{ userId: 'user-1', projectId: 'project-1' }],
      fetchProjects,
      fetchUserProjectAssignments,
    };
    const userStoreState = {
      users: [{ id: 'user-1' }],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: 'user-1' },
    };

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../api/supabase', () => ({
      invalidateResourceKeys,
    }));
    jest.doMock('../../api/supabaseSessionGate', () => ({
      getSessionScopedSupabase: jest.fn().mockResolvedValue({}),
    }));

    const { triggerRefresh } = require('../../utils/DataRefreshManager');

    now = 2000;
    await triggerRefresh();

    expect(invalidateResourceKeys).not.toHaveBeenCalled();
    expect(fetchProjects).toHaveBeenCalledTimes(1);
    expect(fetchProjects).toHaveBeenCalledWith(false);
    expect(fetchUserProjectAssignments).toHaveBeenCalledWith('user-1', false);
    expect(fetchTasks).toHaveBeenCalledWith(false);
    expect(fetchUsers).toHaveBeenCalledTimes(1);

    now = 33050;
    await triggerRefresh();

    expect(fetchProjects).toHaveBeenCalledTimes(2);
    expect(fetchProjects).toHaveBeenNthCalledWith(2, false);
    expect(fetchUserProjectAssignments).toHaveBeenNthCalledWith(2, 'user-1', false);
    expect(fetchTasks).toHaveBeenNthCalledWith(2, false);
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('force-refetches on operator pull even when the 30s hash skip would apply', async () => {
    let now = 1000;
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [{ id: 'task-1' }],
      taskQueryMeta: {},
      fetchTasks,
    };
    const projectStoreState = {
      projects: [{ id: 'project-1' }],
      userAssignments: [{ userId: 'user-1', projectId: 'project-1' }],
      fetchProjects,
      fetchUserProjectAssignments,
    };
    const userStoreState = {
      users: [{ id: 'user-1' }],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: 'user-1' },
    };

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });
    jest.doMock('../../state/projectStore.supabase', () => {
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });
    jest.doMock('../../state/userStore.supabase', () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });
    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });
    jest.doMock('../../api/supabase', () => ({
      invalidateResourceKeys: jest.fn(),
    }));
    jest.doMock('../../api/supabaseSessionGate', () => ({
      getSessionScopedSupabase: jest.fn().mockResolvedValue({}),
    }));

    const { triggerRefresh } = require('../../utils/DataRefreshManager');

    now = 2000;
    await triggerRefresh();
    expect(fetchTasks).toHaveBeenCalledTimes(1);

    now = 4000;
    await triggerRefresh();
    expect(fetchTasks).toHaveBeenCalledTimes(1);

    now = 4200;
    await triggerRefresh({ force: true });
    expect(fetchTasks).toHaveBeenCalledTimes(2);
    expect(fetchTasks).toHaveBeenLastCalledWith(true);
  });

  it('refetches empty persisted tasks on warm start instead of waiting 30s', async () => {
    let now = 1000;
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [],
      taskQueryMeta: {},
      fetchTasks,
    };
    const projectStoreState = {
      projects: [{ id: 'project-1' }],
      userAssignments: [{ userId: 'user-1', projectId: 'project-1' }],
      fetchProjects,
      fetchUserProjectAssignments,
    };
    const userStoreState = {
      users: [{ id: 'user-1' }],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: 'user-1' },
    };

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });
    jest.doMock('../../state/projectStore.supabase', () => {
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });
    jest.doMock('../../state/userStore.supabase', () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });
    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });
    jest.doMock('../../api/supabase', () => ({
      invalidateResourceKeys: jest.fn(),
    }));
    jest.doMock('../../api/supabaseSessionGate', () => ({
      getSessionScopedSupabase: jest.fn().mockResolvedValue({}),
    }));

    const { triggerRefresh } = require('../../utils/DataRefreshManager');

    // Persist partialize writes tasks: []. Warm JS restart must refetch immediately;
    // lastRefreshTime = Date.now() at import skipped this window (<500ms / <30s).
    now = 1200;
    await triggerRefresh();

    expect(fetchTasks).toHaveBeenCalledWith(false);
    expect(fetchProjects).toHaveBeenCalledTimes(1);
  });

  it('skips refresh when there is no JWT session', async () => {
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const setTaskStoreState = jest.fn();

    const taskStoreState = {
      tasks: [],
      taskQueryMeta: {},
      fetchTasks,
    };
    const projectStoreState = {
      projects: [],
      userAssignments: [],
      fetchProjects,
      fetchUserProjectAssignments,
    };
    const userStoreState = {
      users: [],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: 'user-1' },
      refreshSession: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(Date, 'now').mockReturnValue(2000);

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = setTaskStoreState;
      return { useTaskStore };
    });
    jest.doMock('../../state/projectStore.supabase', () => {
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });
    jest.doMock('../../state/userStore.supabase', () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });
    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });
    jest.doMock('../../api/supabase', () => ({
      invalidateResourceKeys: jest.fn(),
    }));
    jest.doMock('../../api/supabaseSessionGate', () => ({
      getSessionScopedSupabase: jest.fn().mockResolvedValue(null),
    }));

    const { triggerRefresh } = require('../../utils/DataRefreshManager');
    await triggerRefresh({ force: true });

    expect(fetchTasks).not.toHaveBeenCalled();
    expect(fetchProjects).not.toHaveBeenCalled();
    expect(taskStoreState.fetchTasks).not.toHaveBeenCalled();
    expect(setTaskStoreState).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Could not load tasks. Pull to retry.',
      }),
    );
  });

  it('retries session on force refresh then fetches (wake JWT lag)', async () => {
    jest.useFakeTimers();
    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const getSessionScopedSupabase = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue({});

    const taskStoreState = {
      tasks: [],
      taskQueryMeta: {},
      fetchTasks,
    };
    const projectStoreState = {
      projects: [{ id: 'project-1' }],
      userAssignments: [{ userId: 'user-1', projectId: 'project-1' }],
      fetchProjects,
      fetchUserProjectAssignments,
    };
    const userStoreState = {
      users: [{ id: 'user-1' }],
      fetchUsers,
    };
    const authStoreState = {
      user: { id: 'user-1' },
      refreshSession: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(Date, 'now').mockReturnValue(5000);

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });
    jest.doMock('../../state/projectStore.supabase', () => {
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });
    jest.doMock('../../state/userStore.supabase', () => {
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      useUserStore.setState = jest.fn();
      return { useUserStore };
    });
    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });
    jest.doMock('../../api/supabase', () => ({
      invalidateResourceKeys: jest.fn(),
    }));
    jest.doMock('../../api/supabaseSessionGate', () => ({
      getSessionScopedSupabase,
    }));

    const { triggerRefresh } = require('../../utils/DataRefreshManager');
    const pending = triggerRefresh({ force: true });
    await jest.runAllTimersAsync();
    await pending;

    expect(authStoreState.refreshSession).toHaveBeenCalled();
    expect(fetchTasks).toHaveBeenCalledWith(true);
    expect(fetchProjects).toHaveBeenCalledWith(true);
    jest.useRealTimers();
  });

  it('invalidates related task resource keys before refetching a realtime-updated task', async () => {
    let tasksChangeHandler:
      | ((payload: {
          eventType: string;
          old?: { id?: string } | null;
          new?: {
            id?: string;
            project_id?: string | null;
            assigned_to?: Array<string | number> | null;
            assigned_by?: string | number | null;
            deleted_at?: string | null;
          } | null;
        }) => Promise<void>)
      | undefined;

    const invalidateResourceKeys = jest.fn();
    const fetchTaskById = jest.fn().mockResolvedValue({ id: 'task-rt-1' });
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [
        {
          id: 'task-rt-1',
          projectId: 'project-1',
          assignedTo: ['worker-1'],
          assignedBy: 'manager-1',
        },
      ],
      fetchTaskById,
      evictTaskFromCache: jest.fn(),
    };

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: {
              eventType: string;
              old?: { id?: string } | null;
              new?: {
                id?: string;
                project_id?: string | null;
                assigned_to?: Array<string | number> | null;
                assigned_by?: string | number | null;
                deleted_at?: string | null;
              } | null;
            }) => Promise<void>
          ) => {
            if (filter.table === 'tasks') {
              tasksChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel: jest.fn(),
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(tasksChangeHandler).toBeDefined();

    await tasksChangeHandler?.({
      eventType: 'UPDATE',
      old: { id: 'task-rt-1' },
      new: {
        id: 'task-rt-1',
      },
    });

    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-rt-1',
      'tasks:project:project-1',
      'tasks:user:worker-1',
      'tasks:assignedBy:manager-1',
    ]);
    expect(fetchTaskById).toHaveBeenCalledWith('task-rt-1');
  });

  it('invalidates both old and new task resource-key families when a realtime update moves task scope', async () => {
    let tasksChangeHandler:
      | ((payload: {
          eventType: string;
          old?: {
            id?: string;
            project_id?: string | null;
            assigned_to?: Array<string | number> | null;
            assigned_by?: string | number | null;
          } | null;
          new?: {
            id?: string;
            project_id?: string | null;
            assigned_to?: Array<string | number> | null;
            assigned_by?: string | number | null;
            deleted_at?: string | null;
          } | null;
        }) => Promise<void>)
      | undefined;

    const invalidateResourceKeys = jest.fn();
    const fetchTaskById = jest.fn().mockResolvedValue({ id: 'task-rt-move' });
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [
        {
          id: 'task-rt-move',
          projectId: 'project-old',
          assignedTo: ['worker-old'],
          assignedBy: 'manager-old',
        },
      ],
      fetchTaskById,
      evictTaskFromCache: jest.fn(),
    };

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: {
              eventType: string;
              old?: {
                id?: string;
                project_id?: string | null;
                assigned_to?: Array<string | number> | null;
                assigned_by?: string | number | null;
              } | null;
              new?: {
                id?: string;
                project_id?: string | null;
                assigned_to?: Array<string | number> | null;
                assigned_by?: string | number | null;
                deleted_at?: string | null;
              } | null;
            }) => Promise<void>
          ) => {
            if (filter.table === 'tasks') {
              tasksChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel: jest.fn(),
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(tasksChangeHandler).toBeDefined();

    await tasksChangeHandler?.({
      eventType: 'UPDATE',
      old: {
        id: 'task-rt-move',
        project_id: 'project-old',
        assigned_to: ['worker-old'],
        assigned_by: 'manager-old',
      },
      new: {
        id: 'task-rt-move',
        project_id: 'project-new',
        assigned_to: ['worker-new'],
        assigned_by: 'manager-new',
      },
    });

    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-rt-move',
      'tasks:project:project-old',
      'tasks:user:worker-old',
      'tasks:assignedBy:manager-old',
      'tasks:project:project-new',
      'tasks:user:worker-new',
      'tasks:assignedBy:manager-new',
    ]);
    expect(fetchTaskById).toHaveBeenCalledWith('task-rt-move');
  });

  it('removes deleted tasks from local state without invoking the legacy delete path', async () => {
    let tasksChangeHandler:
      | ((payload: { eventType: string; old?: { id?: string }; new?: { id?: string } | null }) => Promise<void>)
      | undefined;

    const legacyDeleteTask = jest.fn(() => {
      throw new Error('legacy deleteTask should not be called');
    });

    const invalidateResourceKeys = jest.fn();
    const fetchTaskById = jest.fn().mockResolvedValue(null);
    const evictTaskFromCache = jest.fn((taskId: string) => {
      const { [taskId]: _removed, ...remainingTimestamps } = taskStoreState.taskFetchTimestamps;

      taskStoreState = {
        ...taskStoreState,
        tasks: taskStoreState.tasks.filter((task) => task.id !== taskId),
        taskReadStatuses: taskStoreState.taskReadStatuses.filter((status) => status.taskId !== taskId),
        taskFetchTimestamps: remainingTimestamps,
        allTasksFetchTimestamp: null,
      };
    });
    const deleteProject = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    let taskStoreState = {
      tasks: [
        { id: 'task-delete', title: 'Remove me' },
        { id: 'task-keep', title: 'Keep me' },
      ],
      taskQueryMeta: {
        'tasks:all': { key: 'tasks:all' },
        'task:task-delete': { key: 'task:task-delete' },
        'tasks:project:project-delete': { key: 'tasks:project:project-delete' },
        'tasks:user:worker-delete': { key: 'tasks:user:worker-delete' },
      },
      taskReadStatuses: [
        { userId: 'user-1', taskId: 'task-delete', isRead: true },
        { userId: 'user-1', taskId: 'task-keep', isRead: false },
      ],
      taskFetchTimestamps: {
        'task-delete': 1000,
        'task-keep': 2000,
      },
      allTasksFetchTimestamp: 5000,
      fetchTaskById,
      deleteTask: legacyDeleteTask,
      evictTaskFromCache,
    };

    const setTaskStoreState = jest.fn((updater: unknown) => {
      const patch =
        typeof updater === 'function'
          ? updater(taskStoreState)
          : updater;

      taskStoreState = {
        ...taskStoreState,
        ...(patch as Record<string, unknown>),
      };
    });

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: { eventType: string; old?: { id?: string }; new?: { id?: string } | null }) => Promise<void>
          ) => {
            if (filter.table === 'tasks') {
              tasksChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    const removeChannel = jest.fn();

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = setTaskStoreState;
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel,
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(tasksChangeHandler).toBeDefined();

    await tasksChangeHandler?.({
      eventType: 'DELETE',
      old: { id: 'task-delete' },
      new: null,
    });

    expect(legacyDeleteTask).not.toHaveBeenCalled();
    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-delete',
      'tasks:project:project-delete',
      'tasks:user:worker-delete',
    ]);
    expect(fetchTaskById).not.toHaveBeenCalled();
    expect(evictTaskFromCache).toHaveBeenCalledWith('task-delete');
    expect(taskStoreState.tasks).toEqual([{ id: 'task-keep', title: 'Keep me' }]);
    expect(taskStoreState.taskReadStatuses).toEqual([
      { userId: 'user-1', taskId: 'task-keep', isRead: false },
    ]);
    expect(taskStoreState.taskFetchTimestamps).toEqual({
      'task-keep': 2000,
    });
    expect(taskStoreState.allTasksFetchTimestamp).toBeNull();
  });

  it('invalidates the full task resource-key family before evicting a realtime-deleted task', async () => {
    let tasksChangeHandler:
      | ((payload: {
          eventType: string;
          old?: {
            id?: string;
            project_id?: string | null;
            assigned_to?: Array<string | number> | null;
            assigned_by?: string | number | null;
          } | null;
          new?: { id?: string } | null;
        }) => Promise<void>)
      | undefined;

    const invalidateResourceKeys = jest.fn();
    const evictTaskFromCache = jest.fn();
    const fetchTaskById = jest.fn().mockResolvedValue(null);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [],
      fetchTaskById,
      evictTaskFromCache,
    };

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: {
              eventType: string;
              old?: {
                id?: string;
                project_id?: string | null;
                assigned_to?: Array<string | number> | null;
                assigned_by?: string | number | null;
              } | null;
              new?: { id?: string } | null;
            }) => Promise<void>
          ) => {
            if (filter.table === 'tasks') {
              tasksChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel: jest.fn(),
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(tasksChangeHandler).toBeDefined();

    await tasksChangeHandler?.({
      eventType: 'DELETE',
      old: {
        id: 'task-delete-breadth',
        project_id: 'project-42',
        assigned_to: ['worker-1'],
        assigned_by: 'manager-7',
      },
      new: null,
    });

    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-delete-breadth',
      'tasks:project:project-42',
      'tasks:user:worker-1',
      'tasks:assignedBy:manager-7',
    ]);
    expect(evictTaskFromCache).toHaveBeenCalledWith('task-delete-breadth');
    expect(fetchTaskById).not.toHaveBeenCalled();
  });

  it('keeps task activity invalidation narrow when the task is not cached locally', async () => {
    let taskActivitiesChangeHandler:
      | ((payload: {
          new?: { task_id?: string | null; activity_type?: string | null } | null;
        }) => Promise<void>)
      | undefined;

    const invalidateResourceKeys = jest.fn();
    const fetchTaskById = jest.fn().mockResolvedValue({ id: 'task-activity-1' });
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [],
      taskQueryMeta: {
        'tasks:all': { key: 'tasks:all' },
        'tasks:project:project-77': { key: 'tasks:project:project-77' },
        'tasks:user:worker-77': { key: 'tasks:user:worker-77' },
      },
      fetchTaskById,
      evictTaskFromCache: jest.fn(),
    };

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: {
              new?: { task_id?: string | null; activity_type?: string | null } | null;
            }) => Promise<void>
          ) => {
            if (filter.table === 'task_activities') {
              taskActivitiesChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel: jest.fn(),
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(taskActivitiesChangeHandler).toBeDefined();

    await taskActivitiesChangeHandler?.({
      new: {
        task_id: 'task-activity-1',
        activity_type: 'comment',
      },
    });

    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-activity-1',
    ]);
    expect(fetchTaskById).toHaveBeenCalledWith('task-activity-1');
  });

  it('evicts soft-deleted tasks on realtime update when the payload carries deleted_at', async () => {
    let tasksChangeHandler:
      | ((payload: {
          eventType: string;
          old?: { id?: string } | null;
          new?: { id?: string; deleted_at?: string | null } | null;
        }) => Promise<void>)
      | undefined;

    const fetchTaskById = jest.fn().mockResolvedValue(null);
    const evictTaskFromCache = jest.fn();
    const invalidateResourceKeys = jest.fn();
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [{ id: 'task-soft-delete', title: 'Soft delete me' }],
      fetchTaskById,
      evictTaskFromCache,
    };

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string },
            callback: (payload: {
              eventType: string;
              old?: { id?: string } | null;
              new?: { id?: string; deleted_at?: string | null } | null;
            }) => Promise<void>
          ) => {
            if (filter.table === 'tasks') {
              tasksChangeHandler = callback;
            }

            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };

      return channel;
    };

    const removeChannel = jest.fn();

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });

    jest.doMock('../../state/taskStore.supabase', () => {
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });

    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        userAssignments: [],
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });

    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = {
        fetchUsers,
      };

      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });

    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments
          .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
          .map((segment) => String(segment).trim())
          .filter((segment) => segment.length > 0)
          .join(':'),
      invalidateResourceKeys,
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel,
      },
    }));

    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

    expect(RealtimeSyncManager()).toBeNull();
    expect(tasksChangeHandler).toBeDefined();

    await tasksChangeHandler?.({
      eventType: 'UPDATE',
      old: {
        id: 'task-soft-delete',
        project_id: 'project-9',
        assigned_to: ['worker-9'],
        assigned_by: 'manager-9',
      },
      new: {
        id: 'task-soft-delete',
        deleted_at: '2026-06-28T12:00:00.000Z',
      },
    });

    expect(invalidateResourceKeys).toHaveBeenCalledWith([
      'tasks:all',
      'task:task-soft-delete',
      'tasks:project:project-9',
      'tasks:user:worker-9',
      'tasks:assignedBy:manager-9',
    ]);
    expect(evictTaskFromCache).toHaveBeenCalledWith('task-soft-delete');
    expect(fetchTaskById).not.toHaveBeenCalled();
  });

  it('scopes users/projects realtime filters and avoids full-list refetches', async () => {
    const channelFilters: Array<{ table?: string; filter?: string }> = [];
    let projectsChangeHandler:
      | ((payload: { eventType: string; new?: { id?: string } | null }) => Promise<void>)
      | undefined;
    let usersChangeHandler:
      | ((payload: { new?: { id?: string } | null }) => Promise<void>)
      | undefined;

    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchProjectById = jest.fn().mockResolvedValue({ id: 'project-1' });
    const fetchUsers = jest.fn().mockResolvedValue(undefined);
    const refreshUser = jest.fn().mockResolvedValue(undefined);
    const fetchTaskById = jest.fn();

    const authStoreState = {
      user: {
        id: 'user-1',
        name: 'Test User',
        companyId: 'company-1',
      },
      refreshUser,
    };

    const createChannel = () => {
      const channel = {
        on: jest.fn(
          (
            _event: string,
            filter: { table?: string; filter?: string },
            callback: (payload: {
              eventType?: string;
              new?: { id?: string } | null;
            }) => Promise<void>
          ) => {
            channelFilters.push({ table: filter.table, filter: filter.filter });
            if (filter.table === 'projects') {
              projectsChangeHandler = callback;
            }
            if (filter.table === 'users') {
              usersChangeHandler = callback;
            }
            return channel;
          }
        ),
        subscribe: jest.fn((statusCallback?: (status: string) => void) => {
          statusCallback?.('SUBSCRIBED');
          return channel;
        }),
      };
      return channel;
    };

    jest.doMock('../../state/authStore', () => {
      const useAuthStore = jest.fn(() => authStoreState);
      useAuthStore.getState = () => authStoreState;
      return { useAuthStore };
    });
    jest.doMock('../../state/taskStore.supabase', () => {
      const taskStoreState = { tasks: [], fetchTaskById, evictTaskFromCache: jest.fn() };
      const useTaskStore = jest.fn(() => taskStoreState);
      useTaskStore.getState = () => taskStoreState;
      useTaskStore.setState = jest.fn();
      return { useTaskStore };
    });
    jest.doMock('../../state/projectStore.supabase', () => {
      const projectStoreState = {
        fetchProjects,
        fetchProjectById,
        userAssignments: [],
      };
      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
      useProjectStore.setState = jest.fn();
      return { useProjectStore };
    });
    jest.doMock('../../state/userStore.supabase', () => {
      const userStoreState = { fetchUsers };
      const useUserStore = jest.fn(() => userStoreState);
      useUserStore.getState = () => userStoreState;
      return { useUserStore };
    });
    jest.doMock('../../api/supabase', () => ({
      buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
        segments.filter(Boolean).map(String).join(':'),
      invalidateResourceKeys: jest.fn(),
      supabase: {
        channel: jest.fn(() => createChannel()),
        removeChannel: jest.fn(),
      },
    }));
    jest.doMock('react', () => ({
      __esModule: true,
      useEffect: (effect: () => void) => effect(),
      useRef: (value: unknown) => ({ current: value }),
    }));

    const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');
    expect(RealtimeSyncManager()).toBeNull();

    expect(channelFilters.find((row) => row.table === 'projects')?.filter).toBe(
      'company_id=eq.company-1',
    );
    expect(channelFilters.find((row) => row.table === 'users')?.filter).toBe(
      'company_id=eq.company-1',
    );
    expect(channelFilters.find((row) => row.table === 'tasks')?.filter).toBeUndefined();

    await projectsChangeHandler?.({ eventType: 'UPDATE', new: { id: 'project-1' } });
    expect(fetchProjectById).toHaveBeenCalledWith('project-1', true);
    expect(fetchProjects).not.toHaveBeenCalled();

    await usersChangeHandler?.({ new: { id: 'user-1' } });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(fetchUsers).not.toHaveBeenCalled();

    await usersChangeHandler?.({ new: { id: 'teammate-9' } });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(fetchUsers).not.toHaveBeenCalled();
  });
});
