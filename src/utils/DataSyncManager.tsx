import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../state/authStore';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { useUserStore } from '../state/userStore.supabase';

/**
 * DataSyncManager - Keeps app data synchronized with Supabase
 * 
 * Features:
 * 1. Refreshes when app comes to foreground
 * 2. Gentle polling every 3 minutes while app is active
 * 3. Syncs all data: tasks, projects, users
 * 4. Prevents duplicate refreshes with throttling
 * 
 * Use Case:
 * - See rejected tasks returned to you
 * - See new task assignments
 * - See task updates from other users
 * - See project and user changes
 */

const POLLING_INTERVAL = 3 * 60 * 1000; // 3 minutes
const MIN_REFRESH_INTERVAL = 2000; // 2 seconds minimum between refreshes

export function DataSyncManager() {
  const appState = useRef(AppState.currentState);
  const lastRefreshTime = useRef(Date.now());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuthStore();

  const syncAllData = async () => {
    if (!user) {
      console.log('📊 [DataSync] Skipping sync - no user logged in');
      return;
    }

    const now = Date.now();
    
    // Throttle: Prevent refreshes more frequent than MIN_REFRESH_INTERVAL
    if (now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      console.log('📊 [DataSync] Skipping sync - too soon since last refresh');
      return;
    }
    
    lastRefreshTime.current = now;
    
    console.log('🔄 [DataSync] Starting data sync...', new Date().toLocaleTimeString());
    
    try {
      // Get all store instances
      const taskStore = useTaskStore.getState();
      const projectStore = useProjectStore.getState();
      const userStore = useUserStore.getState();
      
      // Sync all data in parallel for speed
      await Promise.all([
        // Fetch tasks
        taskStore.fetchTasks?.().catch((error: any) => {
          console.error('❌ [DataSync] Error fetching tasks:', error);
        }),
        
        // Fetch projects and user assignments
        projectStore.fetchProjects?.().catch((error: any) => {
          console.error('❌ [DataSync] Error fetching projects:', error);
        }),
        
        projectStore.fetchUserProjectAssignments?.(user.id).catch((error: any) => {
          console.error('❌ [DataSync] Error fetching user assignments:', error);
        }),
        
        // Fetch users
        userStore.fetchUsers?.().catch((error: any) => {
          console.error('❌ [DataSync] Error fetching users:', error);
        }),
      ]);
      
      console.log('✅ [DataSync] Sync completed successfully');
    } catch (error) {
      console.error('❌ [DataSync] Sync failed:', error);
    }
  };

  useEffect(() => {
    // Only run if user is logged in
    if (!user) {
      console.log('📊 [DataSync] Manager inactive - no user');
      return;
    }

    console.log('📊 [DataSync] Manager starting for user:', user.name);

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('🌟 [DataSync] App foregrounded - syncing data...');
        syncAllData();
      }
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up gentle polling (every 3 minutes while app is active)
    refreshIntervalRef.current = setInterval(() => {
      if (AppState.currentState === 'active' && user) {
        console.log('⏰ [DataSync] Periodic sync (3 min interval)...');
        syncAllData();
      }
    }, POLLING_INTERVAL);

    // Initial sync on mount
    console.log('🚀 [DataSync] Initial sync on mount...');
    syncAllData();

    // Cleanup on unmount
    return () => {
      console.log('📊 [DataSync] Manager stopping - cleaning up');
      
      if (subscription) {
        subscription.remove();
      }
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user?.id]); // Only re-run if user changes

  return null; // This is a logic-only component
}

// Export manual sync function for pull-to-refresh
export const manualSync = async (userId: string) => {
  console.log('🔄 [DataSync] Manual sync triggered...');
  
  try {
    const taskStore = useTaskStore.getState();
    const projectStore = useProjectStore.getState();
    const userStore = useUserStore.getState();
    
    await Promise.all([
      taskStore.fetchTasks?.(),
      projectStore.fetchProjects?.(),
      projectStore.fetchUserProjectAssignments?.(userId),
      userStore.fetchUsers?.(),
    ]);
    
    console.log('✅ [DataSync] Manual sync completed');
    return true;
  } catch (error) {
    console.error('❌ [DataSync] Manual sync failed:', error);
    return false;
  }
};

