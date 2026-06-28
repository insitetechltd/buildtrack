describe('sync manager regression tests', () => {
  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('fires the fallback background sync when the 30-second interval elapses', async () => {
    let now = 1000;

    const fetchTasks = jest.fn().mockResolvedValue(undefined);
    const fetchProjects = jest.fn().mockResolvedValue(undefined);
    const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
    const fetchUsers = jest.fn().mockResolvedValue(undefined);

    const taskStoreState = {
      tasks: [{ id: 'task-1' }],
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

    const { triggerRefresh } = require('../../utils/DataRefreshManager');

    now = 2000;
    await triggerRefresh();

    expect(fetchProjects).toHaveBeenCalledTimes(1);
    expect(fetchUserProjectAssignments).toHaveBeenCalledWith('user-1', true);
    expect(fetchTasks).toHaveBeenCalledWith(true);
    expect(fetchUsers).toHaveBeenCalledTimes(1);

    now = 33050;
    await triggerRefresh();

    expect(fetchProjects).toHaveBeenCalledTimes(2);
    expect(fetchUserProjectAssignments).toHaveBeenNthCalledWith(2, 'user-1', true);
    expect(fetchTasks).toHaveBeenNthCalledWith(2, true);
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('removes deleted tasks from local state without invoking the legacy delete path', async () => {
    let tasksChangeHandler:
      | ((payload: { eventType: string; old?: { id?: string }; new?: { id?: string } | null }) => Promise<void>)
      | undefined;

    const legacyDeleteTask = jest.fn(() => {
      throw new Error('legacy deleteTask should not be called');
    });

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
      old: { id: 'task-soft-delete' },
      new: {
        id: 'task-soft-delete',
        deleted_at: '2026-06-28T12:00:00.000Z',
      },
    });

    expect(evictTaskFromCache).toHaveBeenCalledWith('task-soft-delete');
    expect(fetchTaskById).not.toHaveBeenCalled();
  });
});
