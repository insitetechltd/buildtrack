import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { buildResourceKey, invalidateResourceKeys, supabase } from '../api/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  companyEqFilter,
  nextRealtimeReconnectDelayMs,
  REALTIME_APPSTATE_RESUBSCRIBE_DEBOUNCE_MS,
  REALTIME_RECONNECT_MAX_MS,
  shouldPauseRealtimeReconnect,
  shouldScheduleRealtimeReconnect,
} from './realtimeReconnect';

/**
 * RealtimeSyncManager - Provides real-time updates via Supabase Realtime subscriptions
 *
 * Features:
 * 1. Subscribes to postgres_changes events for key tables
 * 2. Updates stores incrementally (not full refresh)
 * 3. Company-scoped filters on users/projects when companyId is known (M-DATA-04)
 * 4. Handles subscription errors gracefully
 * 5. Exponential-backoff resubscribe on CHANNEL_ERROR / CLOSED / TIMED_OUT (M-SUPABASE-04a)
 * 6. Debounced foreground resubscribe; pause after repeated failures until foreground
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
  const foregroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedUntilForegroundRef = useRef(false);
  const replacingChannelsRef = useRef(false);
  const subscribedNamesRef = useRef<Set<string>>(new Set());
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

    const clearForegroundTimer = () => {
      if (foregroundTimerRef.current) {
        clearTimeout(foregroundTimerRef.current);
        foregroundTimerRef.current = null;
      }
    };

    const removeAllChannels = () => {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      replacingChannelsRef.current = true;
      subscribedNamesRef.current = new Set();
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
      if (shouldPauseRealtimeReconnect(attempt) && AppState.currentState !== 'active') {
        pausedUntilForegroundRef.current = true;
        console.warn(
          `⚠️ [Realtime] Pausing reconnect until foreground (attempt ${attempt}) — ${reason}`,
        );
        return;
      }

      const delayMs = shouldPauseRealtimeReconnect(attempt)
        ? REALTIME_RECONNECT_MAX_MS
        : nextRealtimeReconnectDelayMs(attempt);
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
        replacingChannelsRef.current = false;
      }, delayMs);
    };

    const onChannelStatus = (channelName: string, status: string) => {
      if (replacingChannelsRef.current && status === 'CLOSED') {
        return;
      }

      if (status === 'SUBSCRIBED') {
        console.log(`✅ [Realtime] ${channelName} channel subscribed`);
        subscribedNamesRef.current.add(channelName);
        if (subscribedNamesRef.current.size >= 4) {
          reconnectAttemptRef.current = 0;
          pausedUntilForegroundRef.current = false;
        }
        return;
      }

      subscribedNamesRef.current.delete(channelName);

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
      subscribedNamesRef.current = new Set();

      const companyFilter = companyEqFilter(companyId);

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
                const archivedAt = (payload.new as any)?.archived_at;

                if (deletedAt) {
                  invalidateResourceKeys(
                    getTaskResourceKeys(newTaskId, payload.old as any, {
                      fallbackToKnownTaskQueries: true,
                    })
                  );
                  taskStore.evictTaskFromCache(newTaskId);
                  return;
                }

                // Archive soft-hides from active lists. fetchTaskById excludes archived
                // rows, so refresh would return null and leave open Task Detail stuck
                // on "Loading…". Evict immediately from the active cache instead.
                if (archivedAt) {
                  invalidateResourceKeys(
                    getMergedTaskResourceKeys(newTaskId, payload.old as any, payload.new as any)
                  );
                  const cached = taskStore.tasks.find((task) => task.id === newTaskId);
                  const archivedTask = cached
                    ? {
                        ...cached,
                        archivedAt: String(archivedAt),
                        archivedBy: (payload.new as any)?.archived_by
                          ? String((payload.new as any).archived_by)
                          : cached.archivedBy,
                      }
                    : undefined;
                  taskStore.evictTaskFromCache(newTaskId);
                  if (archivedTask) {
                    useTaskStore.setState((state) => ({
                      archivedTasks: [
                        archivedTask,
                        ...(state.archivedTasks ?? []).filter((t) => t.id !== newTaskId),
                      ],
                    }));
                  }
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
        .channel(companyId ? `projects-changes:${companyId}` : 'projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            ...(companyFilter ? { filter: companyFilter } : {}),
          },
          async (payload) => {
            const projectId = (payload.new as any)?.id || (payload.old as any)?.id;
            console.log('🔴 [Realtime] Project change detected:', payload.eventType, projectId);

            const projectStore = useProjectStore.getState();

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              if (projectId) {
                await projectStore.fetchProjectById(String(projectId), true);
              }
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
        .channel(companyId ? `users-changes:${companyId}` : 'users-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            ...(companyFilter ? { filter: companyFilter } : {}),
          },
          async (payload) => {
            const changedUserId = payload.new?.id;
            console.log('🔴 [Realtime] User change detected:', changedUserId);

            if (changedUserId && changedUserId === userId) {
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
        if (foregroundTimerRef.current) return;
        foregroundTimerRef.current = setTimeout(() => {
          foregroundTimerRef.current = null;
          if (intentionalTeardownRef.current || !supabase) return;
          if (AppState.currentState !== 'active') return;
          clearReconnectTimer();
          reconnectAttemptRef.current = 0;
          pausedUntilForegroundRef.current = false;
          removeAllChannels();
          console.log('🔴 [Realtime] App foreground — debounced resubscribe');
          subscribeAll();
          replacingChannelsRef.current = false;
        }, REALTIME_APPSTATE_RESUBSCRIBE_DEBOUNCE_MS);
      }
    };
    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      intentionalTeardownRef.current = true;
      clearReconnectTimer();
      clearForegroundTimer();
      appStateSub.remove();
      console.log('🔴 [Realtime] Manager stopping - unsubscribing from channels');
      removeAllChannels();
    };
  }, [user?.id, user?.companyId]);

  return null;
}
