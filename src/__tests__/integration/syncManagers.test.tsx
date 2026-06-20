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

    jest.doMock('../../state/projectStore', () => {
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
    expect(fetchUserProjectAssignments).toHaveBeenCalledWith('user-1');
    expect(fetchTasks).toHaveBeenCalledTimes(1);
    expect(fetchUsers).toHaveBeenCalledTimes(1);

    now = 33050;
    await triggerRefresh();

    expect(fetchProjects).toHaveBeenCalledTimes(2);
    expect(fetchUserProjectAssignments).toHaveBeenCalledTimes(2);
    expect(fetchTasks).toHaveBeenCalledTimes(2);
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

    jest.doMock('../../state/projectStore', () => {
      const projectStoreState = {
        fetchProjects,
        deleteProject,
      };

      const useProjectStore = jest.fn(() => projectStoreState);
      useProjectStore.getState = () => projectStoreState;
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
    expect(taskStoreState.tasks).toEqual([{ id: 'task-keep', title: 'Keep me' }]);
    expect(taskStoreState.taskReadStatuses).toEqual([
      { userId: 'user-1', taskId: 'task-keep', isRead: false },
    ]);
    expect(taskStoreState.taskFetchTimestamps).toEqual({
      'task-keep': 2000,
    });
    expect(taskStoreState.allTasksFetchTimestamp).toBeNull();
  });
});
