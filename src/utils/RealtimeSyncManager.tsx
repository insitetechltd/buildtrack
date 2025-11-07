import { useEffect, useRef } from 'react';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore';
import { useUserStore } from '../state/userStore.supabase';
import { supabase } from '../api/supabase';
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
          console.log('🔴 [Realtime] Task change detected:', payload.eventType, payload.new?.id || payload.old?.id);
          
          const taskStore = useTaskStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Fetch the updated task to get full data with relations
            if (payload.new?.id) {
              await taskStore.fetchTaskById(payload.new.id);
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove task from local store
            await taskStore.deleteTask(payload.old.id);
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

    // Subscribe to task_updates table changes (new progress updates)
    const taskUpdatesChannel = supabase
      .channel('task-updates-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new updates
          schema: 'public',
          table: 'task_updates',
        },
        async (payload) => {
          console.log('🔴 [Realtime] Task update detected:', payload.new?.task_id);
          
          const taskStore = useTaskStore.getState();
          
          // Refresh the task to get updated completion percentage
          if (payload.new?.task_id) {
            await taskStore.fetchTaskById(payload.new.task_id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Task updates channel subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          handleSubscriptionError('task_updates', 'Channel error - Realtime may not be enabled for task_updates table');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [Realtime] Task updates channel subscription timed out');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Realtime] Task updates channel closed');
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
          console.log('🔴 [Realtime] Project change detected:', payload.eventType, payload.new?.id || payload.old?.id);
          
          const projectStore = useProjectStore.getState();
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Refresh projects list
            await projectStore.fetchProjects();
          } else if (payload.eventType === 'DELETE') {
            // Remove project from local store
            await projectStore.deleteProject(payload.old.id);
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
    channelsRef.current = [tasksChannel, taskUpdatesChannel, projectsChannel, usersChannel];

    // Cleanup on unmount
    return () => {
      console.log('🔴 [Realtime] Manager stopping - unsubscribing from channels');
      
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      
      channelsRef.current = [];
    };
  }, [user?.id, user?.companyId]); // Re-run if user or company changes

  return null; // This is a logic-only component
}

