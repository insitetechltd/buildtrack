import { useEffect, useRef } from 'react';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { useUserStore } from '../state/userStore.supabase';
import { buildResourceKey, invalidateResourceKeys, supabase } from '../api/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// #region debug-point E:realtime-manager init
const __DEBUG_SERVER_URL__ = "http://192.168.86.47:7777/event";
const __DEBUG_SESSION_ID__ = "ui-buttons-unresponsive";
const __dbgReport = (fields: Record<string, any>) => {
  try {
    const payload = JSON.stringify({
      sessionId: __DEBUG_SESSION_ID__,
      runId: "pre",
      ...fields,
      ts: Date.now(),
    });
    if (typeof fetch === "function") {
      fetch(__DEBUG_SERVER_URL__, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      }).catch(() => {});
    }
  } catch {}
};
// #endregion

/**
 * RealtimeSyncManager - Provides real-time updates via Supabase Realtime subscriptions
 * 
 * Features:
 * 1. Subscribes to postgres_changes events for key tables
 * 2. Updates stores incrementally (not full refresh)
 * 3. Relies on RLS policies for security (no filters needed)
 * 4. Handles subscription errors gracefully
 * 5. Unsubscribes on unmount/network loss
 * 
 * Works alongside DataRefreshManager (polling reduced to 60s as fallback)
 * 
 * Usage: Add <RealtimeSyncManager /> to your AppNavigator
 */

export function RealtimeSyncManager() {
  const { user } = useAuthStore();
  const channelsRef = useRef<RealtimeChannel[]>([]);

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
    // Only run if user is logged in and Supabase is configured
    if (!user || !supabase) {
      console.log('🔴 [Realtime] Manager inactive - no user or Supabase not configured');
      // #region debug-point E:manager-start
      __dbgReport({
        hypothesisId: "E",
        location: "src/utils/RealtimeSyncManager.tsx:118",
        msg: "[DEBUG] RealtimeSyncManager start skipped (no user/supabase).",
        data: { hasUser: !!user, hasSupabase: !!supabase, userId: user?.id ?? null },
      });
      // #endregion
      return;
    }

    console.log('🔴 [Realtime] Manager starting for user:', user.name, 'company:', user.companyId);
    // #region debug-point E:manager-start
    __dbgReport({
      hypothesisId: "E",
      location: "src/utils/RealtimeSyncManager.tsx:124",
      msg: "[DEBUG] RealtimeSyncManager starting subscriptions.",
      data: { userId: user.id, companyId: user.companyId, userName: user.name },
      traceId: "rsm-start-" + Date.now(),
    });
    // #endregion

    const companyId = user.companyId;
    const userId = user.id;

    // Helper to handle subscription errors
    const handleSubscriptionError = (channelName: string, error: any) => {
      // Log warning instead of error for Realtime subscription issues
      // These are often due to tables not being enabled for Realtime in Supabase
      console.warn(`⚠️ [Realtime] ${channelName} subscription error:`, error);
      console.warn(`   → This is usually because Realtime isn't enabled for the ${channelName} table.`);
      console.warn(`   → Run scripts/enable-realtime.sql in your Supabase SQL Editor to fix this.`);
      console.warn(`   → App will continue working - polling will handle updates as fallback.`);
      // Don't crash - polling will handle updates as fallback
    };

    // Subscribe to tasks table changes
    // Note: RLS policies ensure users only see their company's tasks
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks',
          // No filter needed - RLS handles security
        },
        async (payload) => {
          const taskId = (payload.new as any)?.id || (payload.old as any)?.id;
          console.log('🔴 [Realtime] Task change detected:', payload.eventType, taskId);
          
          const taskStore = useTaskStore.getState();
          // #region debug-point E:task-event
          const startTasks = Date.now();
          const traceIdTasks = "rsm-task-" + startTasks;
          __dbgReport({
            hypothesisId: "E",
            location: "src/utils/RealtimeSyncManager.tsx:164",
            msg: "[DEBUG] Realtime tasks-changes payload received.",
            data: { eventType: payload.eventType, taskId, recv_ts_ms: startTasks },
            traceId: traceIdTasks,
          });
          // #endregion
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the updated task to get full data with relations
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
                // #region debug-point E:task-event-end
                __dbgReport({
                  hypothesisId: "E",
                  location: "src/utils/RealtimeSyncManager.tsx:192",
                  msg: "[DEBUG] Realtime tasks-changes soft-delete branch done.",
                  data: { duration_ms: Date.now() - startTasks, deleted: !!deletedAt, taskId: newTaskId },
                  traceId: traceIdTasks,
                });
                // #endregion
                return;
              }

              invalidateResourceKeys(
                getMergedTaskResourceKeys(newTaskId, payload.old as any, payload.new as any)
              );
              const refreshedTask = await taskStore.fetchTaskById(newTaskId);
              if (!refreshedTask) {
                taskStore.evictTaskFromCache(newTaskId);
              }
              // #region debug-point E:task-event-end
              __dbgReport({
                hypothesisId: "E",
                location: "src/utils/RealtimeSyncManager.tsx:212",
                msg: "[DEBUG] Realtime tasks-changes insert/update branch done.",
                data: { duration_ms: Date.now() - startTasks, taskId: newTaskId, hadRefreshedTask: !!refreshedTask },
                traceId: traceIdTasks,
              });
              // #endregion
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove task from local store
            const oldTaskId = (payload.old as any)?.id;
            if (oldTaskId) {
              invalidateResourceKeys(
                getTaskResourceKeys(oldTaskId, payload.old as any, {
                  fallbackToKnownTaskQueries: true,
                })
              );
              taskStore.evictTaskFromCache(oldTaskId);
            }
            // #region debug-point E:task-event-end
            __dbgReport({
              hypothesisId: "E",
              location: "src/utils/RealtimeSyncManager.tsx:230",
              msg: "[DEBUG] Realtime tasks-changes delete branch done.",
              data: { duration_ms: Date.now() - startTasks, taskId: oldTaskId },
              traceId: traceIdTasks,
            });
            // #endregion
          }
        }
      )
      .subscribe((status) => {
        // #region debug-point E:task-channel-status
        __dbgReport({
          hypothesisId: "E",
          location: "src/utils/RealtimeSyncManager.tsx:254",
          msg: "[DEBUG] tasks-channels subscribe status.",
          data: { status },
          traceId: "rsm-task-channel-" + Date.now(),
        });
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Tasks channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError('tasks', 'Channel error - Realtime may not be enabled for tasks table');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Tasks channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Tasks channel closed');
        }
      });

    // Subscribe to task_activities table changes (unified activity log)
    const taskActivitiesChannel = supabase
      .channel('task-activities-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new activities
          schema: 'public',
          table: 'task_activities',
        },
        async (payload) => {
          console.log('🔴 [Realtime] Task activity detected:', payload.new?.task_id, payload.new?.activity_type);
          
          const taskStore = useTaskStore.getState();
          // #region debug-point E:task-activity-event
          const startTA = Date.now();
          const traceIdTA = "rsm-taskactivity-" + startTA;
          __dbgReport({
            hypothesisId: "E",
            location: "src/utils/RealtimeSyncManager.tsx:290",
            msg: "[DEBUG] Realtime task-activities-changes payload received.",
            data: { task_id: payload.new?.task_id ?? null, activity_type: payload.new?.activity_type ?? null, recv_ts_ms: startTA },
            traceId: traceIdTA,
          });
          // #endregion
          
          // Refresh the task to get updated completion percentage and activities
          if (payload.new && 'task_id' in payload.new && payload.new.task_id) {
            invalidateResourceKeys(
              getTaskResourceKeys(payload.new.task_id as string)
            );
            await taskStore.fetchTaskById(payload.new.task_id as string);
            // #region debug-point E:task-activity-event-end
            __dbgReport({
              hypothesisId: "E",
              location: "src/utils/RealtimeSyncManager.tsx:308",
              msg: "[DEBUG] Realtime task-activities-changes handler done.",
              data: { duration_ms: Date.now() - startTA, task_id: payload.new?.task_id ?? null },
              traceId: traceIdTA,
            });
            // #endregion
          }
        }
      )
      .subscribe((status) => {
        // #region debug-point E:task-activity-channel-status
        __dbgReport({
          hypothesisId: "E",
          location: "src/utils/RealtimeSyncManager.tsx:317",
          msg: "[DEBUG] task-activities-channels subscribe status.",
          data: { status },
          traceId: "rsm-taskactivity-channel-" + Date.now(),
        });
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Task activities channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError('task_activities', 'Channel error - Realtime may not be enabled for task_activities table');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Task activities channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Task activities channel closed');
        }
      });

    // Subscribe to projects table changes
    // Note: RLS policies ensure users only see their company's projects
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          // No filter needed - RLS handles security
        },
        async (payload) => {
          const projectId = (payload.new as any)?.id || (payload.old as any)?.id;
          console.log('🔴 [Realtime] Project change detected:', payload.eventType, projectId);
          
          const projectStore = useProjectStore.getState();
          // #region debug-point E:project-event
          const startProj = Date.now();
          const traceIdProj = "rsm-project-" + startProj;
          __dbgReport({
            hypothesisId: "E",
            location: "src/utils/RealtimeSyncManager.tsx:350",
            msg: "[DEBUG] Realtime projects-changes payload received.",
            data: { eventType: payload.eventType, projectId, recv_ts_ms: startProj },
            traceId: traceIdProj,
          });
          // #endregion
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refresh projects list
            await projectStore.fetchProjects();
            // #region debug-point E:project-event-end
            __dbgReport({
              hypothesisId: "E",
              location: "src/utils/RealtimeSyncManager.tsx:366",
              msg: "[DEBUG] Realtime projects-changes insert/update branch done.",
              data: { duration_ms: Date.now() - startProj, projectId },
              traceId: traceIdProj,
            });
            // #endregion
          } else if (payload.eventType === 'DELETE') {
            // Reconcile local state only; the database row is already gone.
            const oldProjectId = (payload.old as any)?.id;
            if (oldProjectId) {
              useProjectStore.setState((state) => ({
                projects: state.projects.filter((project) => project.id !== oldProjectId),
                userAssignments: state.userAssignments.filter(
                  (assignment) => assignment.projectId !== oldProjectId,
                ),
              }));
            }
            // #region debug-point E:project-event-end
            __dbgReport({
              hypothesisId: "E",
              location: "src/utils/RealtimeSyncManager.tsx:383",
              msg: "[DEBUG] Realtime projects-changes delete branch done.",
              data: { duration_ms: Date.now() - startProj, projectId: oldProjectId },
              traceId: traceIdProj,
            });
            // #endregion
          }
        }
      )
      .subscribe((status) => {
        // #region debug-point E:project-channel-status
        __dbgReport({
          hypothesisId: "E",
          location: "src/utils/RealtimeSyncManager.tsx:402",
          msg: "[DEBUG] projects-channels subscribe status.",
          data: { status },
          traceId: "rsm-project-channel-" + Date.now(),
        });
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Projects channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError('projects', 'Channel error - Realtime may not be enabled for projects table');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Projects channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Projects channel closed');
        }
      });

    // Subscribe to users table changes (for user profile updates)
    // Note: RLS policies ensure users only see their company's users
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Only listen for updates (not inserts/deletes)
          schema: 'public',
          table: 'users',
          // No filter needed - RLS handles security
        },
        async (payload) => {
          console.log('🔴 [Realtime] User change detected:', payload.new?.id);
          
          const userStore = useUserStore.getState();
          // #region debug-point E:users-event
          const startU = Date.now();
          const traceIdU = "rsm-users-" + startU;
          __dbgReport({
            hypothesisId: "E",
            location: "src/utils/RealtimeSyncManager.tsx:430",
            msg: "[DEBUG] Realtime users-changes payload received.",
            data: { user_id: payload.new?.id ?? payload.old?.id ?? null, eventType: payload.eventType, recv_ts_ms: startU },
            traceId: traceIdU,
          });
          // #endregion
          
          // Refresh users list
          await userStore.fetchUsers();
          
          // If it's the current user, refresh auth store too
          if (payload.new?.id === userId) {
            const authStore = useAuthStore.getState();
            await authStore.refreshUser();
          }
          // #region debug-point E:users-event-end
          __dbgReport({
            hypothesisId: "E",
            location: "src/utils/RealtimeSyncManager.tsx:448",
            msg: "[DEBUG] Realtime users-changes handler done.",
            data: { duration_ms: Date.now() - startU, user_id: payload.new?.id ?? payload.old?.id ?? null, isCurrentUser: payload.new?.id === userId },
            traceId: traceIdU,
          });
          // #endregion
        }
      )
      .subscribe((status) => {
        // #region debug-point E:users-channel-status
        __dbgReport({
          hypothesisId: "E",
          location: "src/utils/RealtimeSyncManager.tsx:470",
          msg: "[DEBUG] users-channels subscribe status.",
          data: { status },
          traceId: "rsm-users-channel-" + Date.now(),
        });
        // #endregion
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Users channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError('users', 'Channel error - Realtime may not be enabled for users table');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Users channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Users channel closed');
        }
      });

    // Store channels for cleanup
    channelsRef.current = [tasksChannel, taskActivitiesChannel, projectsChannel, usersChannel];

    // Cleanup on unmount
    return () => {
      console.log('🔴 [Realtime] Manager stopping - unsubscribing from channels');
      
      const supabaseClient = supabase;
      if (supabaseClient) {
        channelsRef.current.forEach((channel) => {
          supabaseClient.removeChannel(channel);
        });
      }
      
      channelsRef.current = [];
    };
  }, [user?.id, user?.companyId]); // Re-run if user or company changes

  return null; // This is a logic-only component
}
