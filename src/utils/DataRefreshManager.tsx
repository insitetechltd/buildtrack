import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore.supabase';
import { useUserStore } from '../state/userStore.supabase';
import { useAuthStore } from '../state/authStore';
import { getSessionScopedSupabase } from '../api/supabaseSessionGate';

/**
 * DataRefreshManager - Ensures data stays fresh and synchronized
 * 
 * Features:
 * 1. Refreshes when app comes to foreground
 * 2. Periodic polling every 60 seconds as fallback
 * 3. Force refresh on user actions
 * 4. Tracks data mutations and notifies all users
 * 5. Ensures persistence layer stays in sync
 * 
 * Usage: Add <DataRefreshManager /> to your AppNavigator
 */

let refreshInterval: NodeJS.Timeout | null = null;
let lastDataHash: string = '';

// Generate a hash of current data state to detect changes
const generateDataHash = () => {
  const taskStore = useTaskStore.getState();
  const projectStore = useProjectStore.getState();
  const userStore = useUserStore.getState();
  
  const dataString = JSON.stringify({
    taskCount: taskStore.tasks.length,
    taskIds: taskStore.tasks.map(t => t.id).sort().join(','),
    projectCount: projectStore.projects.length,
    projectIds: projectStore.projects.map(p => p.id).sort().join(','),
    userCount: userStore.users.length,
    assignmentCount: projectStore.userAssignments.length,
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
};

// Export triggerRefresh function for use by NetworkSyncManager
// 0 so the first post-JS-restart sync always runs. Persist writes tasks: []
// (Hermes OOM); Activity would otherwise stay empty until the 30s/60s poll.
let lastRefreshTime = 0;
const SESSION_RETRY_MS = 300;
const SESSION_FORCE_ATTEMPTS = 4;

async function resolveRefreshSession(force: boolean) {
  let client = await getSessionScopedSupabase();
  if (client || !force) {
    return client;
  }

  // iOS wake: persisted auth user can be present before AuthStorage finishes
  // restoring the JWT. Nudge refresh, then retry getSession briefly.
  try {
    await useAuthStore.getState().refreshSession?.();
  } catch {
    // refreshSession logs out on invalid refresh token; treat as no session.
  }

  client = await getSessionScopedSupabase();
  if (client) {
    return client;
  }

  for (let attempt = 1; attempt < SESSION_FORCE_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_MS));
    client = await getSessionScopedSupabase();
    if (client) {
      return client;
    }
  }
  return null;
}

// Function to force a re-render of all components using these stores
export const triggerRefresh = async (options?: { force?: boolean }) => {
  const now = Date.now();
  const previousRefreshTime = lastRefreshTime;
  const force = options?.force === true;
  
  // Prevent too frequent refreshes (minimum 500ms between refreshes).
  // Operator pull bypasses this so the native spinner is never a no-op.
  if (!force && now - previousRefreshTime < 500) {
    return;
  }
  
  lastRefreshTime = now;
  
  // Check if data has actually changed
  const currentHash = generateDataHash();
  const hasDataChanged = currentHash !== lastDataHash;
  
  if (force || hasDataChanged || now - previousRefreshTime > 30000) {
    lastDataHash = currentHash;
    
    // Actually fetch fresh data from Supabase instead of just re-rendering
    const taskStore = useTaskStore.getState();
    const projectStore = useProjectStore.getState();
    const userStore = useUserStore.getState();
    const authStore = useAuthStore.getState();
    const user = authStore.user;
    
    try {
      // Fetch fresh data if user is logged in
      if (user) {
        const sessionClient = await resolveRefreshSession(force);
        if (!sessionClient) {
          if (force && taskStore.tasks.length === 0) {
            useTaskStore.setState({
              isLoading: false,
              error: 'Could not load tasks. Pull to retry.',
            });
          }
          return;
        }

        const startTime = Date.now();
        console.log('[DataSync] Starting parallel data fetch...');

        // Fetch all data in parallel for maximum speed
        await Promise.all([
          projectStore.fetchProjects(true),
          projectStore.fetchUserProjectAssignments(user.id, true),
          taskStore.fetchTasks(force),
          userStore.fetchUsers()
        ]);
        
        const duration = Date.now() - startTime;
        console.log(`[DataSync] ✓ Fresh data fetched from Supabase in ${duration}ms`, new Date().toLocaleTimeString());
        
        // Warn if fetch took too long
        if (duration > 10000) {
          console.warn(`[DataSync] ⚠️ Data fetch took ${duration}ms - network may be slow`);
        }
      }
    } catch (error) {
      console.error('[DataSync] Error fetching fresh data:', error);
      
      // Fallback to old behavior if fetch fails
      useTaskStore.setState({ 
        isLoading: false,
        tasks: [...taskStore.tasks]
      });
      useProjectStore.setState({ 
        isLoading: false,
        projects: [...projectStore.projects],
        userAssignments: [...projectStore.userAssignments]
      });
      useUserStore.setState({ 
        isLoading: false,
        users: [...userStore.users]
      });
    }
    
    if (hasDataChanged) {
      console.log('[DataSync] ✓ Data changed - all users notified', new Date().toLocaleTimeString());
    }
  }
};

export const DataRefreshManager = () => {
  const appState = useRef(AppState.currentState);
  const lastRefresh = useRef(Date.now());
  const foregroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuthStore();

  // Internal refresh function that uses the exported triggerRefresh
  const handleRefresh = async () => {
    await triggerRefresh();
  };

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Debounce AppState flicker (permission sheets / Maestro) so wake
        // force-refresh does not stack with Realtime resubscribe storms.
        if (foregroundTimerRef.current) {
          clearTimeout(foregroundTimerRef.current);
        }
        foregroundTimerRef.current = setTimeout(() => {
          foregroundTimerRef.current = null;
          if (AppState.currentState !== 'active') {
            return;
          }
          console.log('[DataSync] App foregrounded - force syncing data...');
          void triggerRefresh({ force: true });
        }, 750);
      }
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic polling (every 60 seconds) as fallback
    // Note: Real-time subscriptions handle most updates, polling is backup
    refreshInterval = setInterval(() => {
      if (AppState.currentState === 'active' && user) {
        handleRefresh();
      }
    }, 60000); // 60 seconds - reduced since RealtimeSyncManager handles most updates

    // Initial sync
    lastDataHash = generateDataHash();
    handleRefresh();

    // Cleanup
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (foregroundTimerRef.current) {
        clearTimeout(foregroundTimerRef.current);
        foregroundTimerRef.current = null;
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };
  }, [user?.id]);

  return null; // This is a logic-only component
};

// Helper function to manually trigger refresh after mutations
export const notifyDataMutation = (mutationType: 'task' | 'project' | 'user' | 'assignment') => {
  const taskStore = useTaskStore.getState();
  const projectStore = useProjectStore.getState();
  const userStore = useUserStore.getState();
  
  // Immediately notify all subscribers about the mutation
  useTaskStore.setState({ 
    tasks: [...taskStore.tasks],
    isLoading: false 
  });
  useProjectStore.setState({ 
    projects: [...projectStore.projects],
    userAssignments: [...projectStore.userAssignments],
    isLoading: false 
  });
  useUserStore.setState({ 
    users: [...userStore.users],
    isLoading: false 
  });
  
  // Update hash
  lastDataHash = generateDataHash();
  
  console.log(`[DataSync] ⚡ ${mutationType} mutation - all users notified immediately`);
};

// Legacy helper for backward compatibility
export const forceRefresh = notifyDataMutation;
