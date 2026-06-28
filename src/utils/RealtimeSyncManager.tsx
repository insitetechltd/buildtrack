import { useEffect, useRef } from 'react';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { useUserStore } from '../state/userStore.supabase';
import { buildResourceKey, invalidateResourceKeys, supabase } from '../api/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
    nextTask?: {
      project_id?: string | null;
      assigned_to?: Array<string | number> | null;
      assigned_by?: string | number | null;
    } | null,
  ) => {
    const taskStore = useTaskStore.getState();
    const cachedTask = taskStore.tasks.find((task) => task.id === taskId);
    const projectId = nextTask?.project_id ?? cachedTask?.projectId ?? null;
    const assignedTo = Array.isArray(nextTask?.assigned_to)
      ? nextTask.assigned_to.map((assigneeId) => String(assigneeId))
      : cachedTask?.assignedTo || [];
    const assignedBy = nextTask?.assigned_by !== undefined && nextTask?.assigned_by !== null
      ? String(nextTask.assigned_by)
      : cachedTask?.assignedBy ?? null;

    return [
      buildResourceKey('tasks', 'all'),
      buildResourceKey('task', taskId),
      projectId ? buildResourceKey('tasks', 'project', projectId) : '',
      ...assignedTo.map((assigneeId) => buildResourceKey('tasks', 'user', assigneeId)),
      assignedBy ? buildResourceKey('tasks', 'assignedBy', assignedBy) : '',
    ].filter(Boolean);
  };

  useEffect(() => {
    // Only run if user is logged in and Supabase is configured
    if (!user || !supabase) {
      console.log('🔴 [Realtime] Manager inactive - no user or Supabase not configured');
      return;
    }

    console.log('🔴 [Realtime] Manager starting for user:', user.name, 'company:', user.companyId);

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
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the updated task to get full data with relations
            const newTaskId = (payload.new as any)?.id;
            if (newTaskId) {
              const deletedAt = (payload.new as any)?.deleted_at;

              if (deletedAt) {
                taskStore.evictTaskFromCache(newTaskId);
                return;
              }

              invalidateResourceKeys(
                getTaskResourceKeys(newTaskId, payload.new as any)
              );
              const refreshedTask = await taskStore.fetchTaskById(newTaskId);
              if (!refreshedTask) {
                taskStore.evictTaskFromCache(newTaskId);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove task from local store
            const oldTaskId = (payload.old as any)?.id;
            if (oldTaskId) {
              taskStore.evictTaskFromCache(oldTaskId);
            }
          }
        }
      )
      .subscribe((status) => {
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
          
          // Refresh the task to get updated completion percentage and activities
          if (payload.new && 'task_id' in payload.new && payload.new.task_id) {
            invalidateResourceKeys(
              getTaskResourceKeys(payload.new.task_id as string)
            );
            await taskStore.fetchTaskById(payload.new.task_id as string);
          }
        }
      )
      .subscribe((status) => {
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
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refresh projects list
            await projectStore.fetchProjects();
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
          }
        }
      )
      .subscribe((status) => {
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
          
          // Refresh users list
          await userStore.fetchUsers();
          
          // If it's the current user, refresh auth store too
          if (payload.new?.id === userId) {
            const authStore = useAuthStore.getState();
            await authStore.refreshUser();
          }
        }
      )
      .subscribe((status) => {
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
