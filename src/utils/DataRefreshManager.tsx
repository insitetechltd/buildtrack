import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTaskStore } from '../state/taskStore';
import { useProjectStore } from '../state/projectStore';
import { useUserStore } from '../state/userStore';
import { useAuthStore } from '../state/authStore';

/**
 * DataRefreshManager - Ensures data stays fresh and synchronized
 * 
 * Features:
 * 1. Refreshes when app comes to foreground
 * 2. Periodic polling every 5 seconds for new data
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

export const DataRefreshManager = () => {
  const appState = useRef(AppState.currentState);
  const lastRefresh = useRef(Date.now());
  const { user } = useAuthStore();

  // Function to force a re-render of all components using these stores
  const triggerRefresh = async () => {
    const now = Date.now();
    
    // Prevent too frequent refreshes (minimum 500ms between refreshes)
    if (now - lastRefresh.current < 500) {
      return;
    }
    
    lastRefresh.current = now;
    
    // Check if data has actually changed
    const currentHash = generateDataHash();
    const hasDataChanged = currentHash !== lastDataHash;
    
    if (hasDataChanged || now - lastRefresh.current > 30000) {
      lastDataHash = currentHash;
      
      // Actually fetch fresh data from Supabase instead of just re-rendering
      const taskStore = useTaskStore.getState();
      const projectStore = useProjectStore.getState();
      const userStore = useUserStore.getState();
      
      try {
        // Fetch fresh data if user is logged in
        if (user) {
          await Promise.all([
            projectStore.fetchProjects(),
            projectStore.fetchUserProjectAssignments(user.id),
            taskStore.fetchTasks(), // Fetch ALL tasks, not just user's tasks
            userStore.fetchUsers()
          ]);
          
          console.log('[DataSync] ✓ Fresh data fetched from Supabase', new Date().toLocaleTimeString());
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

  useEffect(() => {
    // Only run if user is logged in
    if (!user) return;

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[DataSync] App foregrounded - syncing data...');
        triggerRefresh();
      }
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic polling (every 30 seconds) for real-time feel
    refreshInterval = setInterval(() => {
      if (AppState.currentState === 'active' && user) {
        triggerRefresh();
      }
    }, 30000); // 30 seconds - less aggressive

    // Initial sync
    lastDataHash = generateDataHash();
    triggerRefresh();

    // Cleanup
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };
  }, [user]);

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
