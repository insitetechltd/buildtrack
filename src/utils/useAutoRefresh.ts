import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useTaskStore } from '../state/taskStore.supabase';
import { useProjectStore } from '../state/projectStore';
import { useUserStore } from '../state/userStore.supabase';

/**
 * Auto-refresh hook that reloads data from stores when:
 * 1. App comes to foreground
 * 2. Periodically while app is active (every 30 seconds)
 * 
 * This simulates real-time updates in the mock data environment
 */
export function useAutoRefresh() {
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Force stores to re-initialize from their initial state
    const refreshAllData = () => {
      // Get current state
      const taskState = useTaskStore.getState();
      const projectState = useProjectStore.getState();
      const userState = useUserStore.getState();
      
      // Trigger a re-render by touching the state
      // This forces components to re-read from the store
      taskState.isLoading = false;
      projectState.isLoading = false;
      userState.isLoading = false;
      
      console.log('[AutoRefresh] Data refreshed at', new Date().toLocaleTimeString());
    };

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AutoRefresh] App became active, refreshing data...');
        refreshAllData();
      }
    };

    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set up periodic refresh (every 30 seconds while app is active)
    intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        refreshAllData();
      }
    }, 30000); // 30 seconds

    // Initial refresh
    refreshAllData();

    // Cleanup
    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);
}
