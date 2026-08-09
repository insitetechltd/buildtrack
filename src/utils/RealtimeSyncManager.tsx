import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { useUserStore } from '../state/userStore.supabase';
import { buildResourceKey, invalidateResourceKeys, supabase } from '../api/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  nextRealtimeReconnectDelayMs,
  shouldScheduleRealtimeReconnect,
} from './realtimeReconnect';

/**
 * RealtimeSyncManager - Provides real-time updates via Supabase Realtime subscriptions
 *
 * Features:
 * 1. Subscribes to postgres_changes events for key tables
 * 2. Updates stores incrementally (not full refresh)
 * 3. Relies on RLS policies for security (no filters needed)
 * 4. Handles subscription errors gracefully
 * 5. Exponential-backoff resubscribe on CHANNEL_ERROR / CLOSED / TIMED_OUT (M-SUPABASE-04a)
 * 6. Foreground AppState nudge after background (socket often dies silently)
 *
 * Works alongside DataRefreshManager (polling reduced to 60s as fallback)
 *
 * Usage: Add <RealtimeSyncManager /> to your AppNavigator
 *
 * Expected publication membership (live audit SQL — see docs/superpowers/sql/
 * 20260810_msupabase04a_publication_membership_audit.sql):
 *   tasks (*), task_activities (INSERT), projects (*), users (UPDATE)
 */

export function RealtimeSyncManager() {
  const { user } = useAuthStore();
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const intentionalTeardownRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const getTaskResourceKeys = (
    taskId: string,
    taskPayload?: {
      project_id?: string | null;
      assigned_to?: Array<string | number> | null;
      assigned_by?: string | number | null;
    } | null,
    options?: {
      fallbackToKnownTaskQueries?: boolean;
    },
  ) => {
    const taskStore = useTaskStore.getState();
    const cachedTask = taskStore.tasks.find((task) => task.id === taskId);
    const projectId = taskPayload?.project_id ?? cachedTask?.projectId ?? null;
    const assignedTo = Array.isArray(taskPayload?.assigned_to)
      ? taskPayload.assigned_to.map((assigneeId) => String(assigneeId))
      : cachedTask?.assignedTo || [];
    const assignedBy = taskPayload?.assigned_by !== undefined && taskPayload?.assigned_by !== null
      ? String(taskPayload.assigned_by)
      : cachedTask?.assignedBy ?? null;
    const scopedKeys = [
      buildResourceKey('tasks', 'all'),
      buildResourceKey('task', taskId),
      projectId ? buildResourceKey('tasks', 'project', projectId) : '',
      ...assignedTo.map((assigneeId) => buildResourceKey('tasks', 'user', assigneeId)),
      assignedBy ? buildResourceKey('tasks', 'assignedBy', assignedBy) : '',
    ].filter(Boolean);

    if (projectId || assignedTo.length > 0 || assignedBy) {
      return scopedKeys;
    }

    if (!options?.fallbackToKnownTaskQueries) {
      return scopedKeys;
    }

    const knownTaskKeys = Object.keys(taskStore.taskQueryMeta || {}).filter(
      (resourceKey) => resourceKey.startsWith('tasks:') || resourceKey.startsWith('task:')
    );

    return Array.from(new Set([...scopedKeys, ...knownTaskKeys]));
  };

  const getMergedTaskResourceKeys = (
    taskId: string,
    previousTask?: {
      project_id?: string | null;
      assigned_to?: Array<string | number> | null;
      assigned_by?: string | number | null;
    } | null,
    nextTask?: {
      project_id?: string | null;
      assigned_to?: Array<string | number> | null;
      assigned_by?: string | number | null;
    } | null,
  ) => {
    return Array.from(
      new Set([
        ...getTaskResourceKeys(taskId, previousTask, { fallbackToKnownTaskQueries: true }),
        ...getTaskResourceKeys(taskId, nextTask, { fallbackToKnownTaskQueries: true }),
      ])
    );
  };

  useEffect(() => {
    if (!user || !supabase) {
      console.log('🔴 [Realtime] Manager inactive - no user or Supabase not configured');
      return;
    }

    console.log('🔴 [Realtime] Manager starting for user:', user.name, 'company:', user.companyId);

    intentionalTeardownRef.current = false;
    reconnectAttemptRef.current = 0;

    const companyId = user.companyId;
    const userId = user.id;
    void companyId;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const removeAllChannels = () => {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      channelsRef.current.forEach((channel) => {
        supabaseClient.removeChannel(channel);
      });
      channelsRef.current = [];
    };

    const handleSubscriptionError = (channelName: string, error: unknown) => {
      console.warn(`⚠️ [Realtime] ${channelName} subscription error:`, error);
      console.warn(`   → Often means Realtime publication missing this table, or the socket died.`);
      console.warn(`   → Audit: docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql`);
      console.warn(`   → App continues — polling + reconnect backoff handle recovery.`);
    };

    const scheduleReconnect = (reason: string) => {
      if (intentionalTeardownRef.current) return;
      if (reconnectTimerRef.current) return; // already scheduled

      const attempt = reconnectAttemptRef.current;
      const delayMs = nextRealtimeReconnectDelayMs(attempt);
      reconnectAttemptRef.current = attempt + 1;

      console.warn(
        `⚠️ [Realtime] Scheduling reconnect in ${delayMs}ms (attempt ${attempt + 1}) — ${reason}`,
      );

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (intentionalTeardownRef.current || !supabase) return;
        console.log('🔴 [Realtime] Reconnecting channels…');
        removeAllChannels();
        subscribeAll();
      }, delayMs);
    };

    const onChannelStatus = (channelName: string, status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ [Realtime] ${channelName} channel subscribed`);
        reconnectAttemptRef.current = 0;
        return;
      }

      if (status === 'CHANNEL_ERROR') {
        handleSubscriptionError(channelName, `Channel error (${status})`);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⚠️ [Realtime] ${channelName} channel subscription timed out`);
      } else if (status === 'CLOSED') {
        console.warn(`⚠️ [Realtime] ${channelName} channel closed`);
      }

      if (shouldScheduleRealtimeReconnect(status, intentionalTeardownRef.current)) {
        scheduleReconnect(`${channelName}:${status}`);
      }
    };

    const subscribeAll = () => {
      if (!supabase || intentionalTeardownRef.current) return;

      const tasksChannel = supabase
        .channel('tasks-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tasks',
          },
          async (payload) => {
            const taskId = (payload.new as any)?.id || (payload.old as any)?.id;
            console.log('🔴 [Realtime] Task change detected:', payload.eventType, taskId);

            const taskStore = useTaskStore.getState();

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const newTaskId = (payload.new as any)?.id;
              if (newTaskId) {
                const deletedAt = (payload.new as any)?.deleted_at;

                if (deletedAt) {
                  invalidateResourceKeys(
                    getTaskResourceKeys(newTaskId, payload.old as any, {
                      fallbackToKnownTaskQueries: true,
                    })
                  );
                  taskStore.evictTaskFromCache(newTaskId);
                  return;
                }

                invalidateResourceKeys(
                  getMergedTaskResourceKeys(newTaskId, payload.old as any, payload.new as any)
                );
                const refreshedTask = await taskStore.fetchTaskById(newTaskId);
                if (!refreshedTask) {
                  taskStore.evictTaskFromCache(newTaskId);
                }
              }
            } else if (payload.eventType === 'DELETE') {
              const oldTaskId = (payload.old as any)?.id;
              if (oldTaskId) {
                invalidateResourceKeys(
                  getTaskResourceKeys(oldTaskId, payload.old as any, {
                    fallbackToKnownTaskQueries: true,
                  })
                );
                taskStore.evictTaskFromCache(oldTaskId);
              }
            }
          }
        )
        .subscribe((status) => onChannelStatus('tasks', status));

      const taskActivitiesChannel = supabase
        .channel('task-activities-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'task_activities',
          },
          async (payload) => {
            console.log('🔴 [Realtime] Task activity detected:', payload.new?.task_id, payload.new?.activity_type);

            const taskStore = useTaskStore.getState();

            if (payload.new && 'task_id' in payload.new && payload.new.task_id) {
              invalidateResourceKeys(
                getTaskResourceKeys(payload.new.task_id as string)
              );
              await taskStore.fetchTaskById(payload.new.task_id as string);
            }
          }
        )
        .subscribe((status) => onChannelStatus('task_activities', status));

      const projectsChannel = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
          },
          async (payload) => {
            const projectId = (payload.new as any)?.id || (payload.old as any)?.id;
            console.log('🔴 [Realtime] Project change detected:', payload.eventType, projectId);

            const projectStore = useProjectStore.getState();

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              await projectStore.fetchProjects();
            } else if (payload.eventType === 'DELETE') {
              const oldProjectId = (payload.old as any)?.id;
              if (oldProjectId) {
                useProjectStore.setState((state) => ({
                  projects: state.projects.filter((project) => project.id !== oldProjectId),
                  userAssignments: state.userAssignments.filter(
                    (assignment) => assignment.projectId !== oldProjectId,
                  ),
                }));
              }
            }
          }
        )
        .subscribe((status) => onChannelStatus('projects', status));

      const usersChannel = supabase
        .channel('users-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
          },
          async (payload) => {
            console.log('🔴 [Realtime] User change detected:', payload.new?.id);

            const userStore = useUserStore.getState();
            await userStore.fetchUsers();

            if (payload.new?.id === userId) {
              const authStore = useAuthStore.getState();
              await authStore.refreshUser();
            }
          }
        )
        .subscribe((status) => onChannelStatus('users', status));

      channelsRef.current = [tasksChannel, taskActivitiesChannel, projectsChannel, usersChannel];
    };

    subscribeAll();

    const onAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (
        (prev === 'background' || prev === 'inactive') &&
        next === 'active' &&
        !intentionalTeardownRef.current &&
        supabase
      ) {
        // Backgrounding often kills the WS without CLOSED — one soft resubscribe, no backoff stack.
        clearReconnectTimer();
        reconnectAttemptRef.current = 0;
        removeAllChannels();
        console.log('🔴 [Realtime] App foreground — soft resubscribe');
        subscribeAll();
      }
    };
    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      intentionalTeardownRef.current = true;
      clearReconnectTimer();
      appStateSub.remove();
      console.log('🔴 [Realtime] Manager stopping - unsubscribing from channels');
      removeAllChannels();
    };
  }, [user?.id, user?.companyId]);

  return null;
}
