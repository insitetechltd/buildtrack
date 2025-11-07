import { useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAuthStore } from '../state/authStore';
import { triggerRefresh } from './DataRefreshManager';

/**
 * NetworkSyncManager - Detects network state changes and triggers sync on reconnect
 * 
 * Features:
 * 1. Monitors network connectivity state
 * 2. Triggers automatic sync when network reconnects
 * 3. Logs network state transitions for debugging
 * 4. Works alongside DataRefreshManager (handles foreground sync)
 * 
 * Usage: Add <NetworkSyncManager /> to your AppNavigator
 */

export function NetworkSyncManager() {
  const { user } = useAuthStore();
  const wasOfflineRef = useRef(false);
  const lastSyncOnReconnectRef = useRef(Date.now());

  const syncAllData = async () => {
    if (!user) {
      console.log('📡 [NetworkSync] Skipping sync - no user logged in');
      return;
    }

    const now = Date.now();
    
    // Throttle: Prevent syncs more frequent than 2 seconds after reconnect
    if (now - lastSyncOnReconnectRef.current < 2000) {
      console.log('📡 [NetworkSync] Skipping sync - too soon since last reconnect sync');
      return;
    }
    
    lastSyncOnReconnectRef.current = now;
    
    console.log('📡 [NetworkSync] Network reconnected - syncing all data...', new Date().toLocaleTimeString());
    
    // Use the exported triggerRefresh function from DataRefreshManager
    await triggerRefresh();
    
    console.log('✅ [NetworkSync] Sync completed successfully after reconnect');
  };

  useEffect(() => {
    // Only run if user is logged in
    if (!user) {
      console.log('📡 [NetworkSync] Manager inactive - no user');
      return;
    }

    console.log('📡 [NetworkSync] Manager starting for user:', user.name);

    // Get initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      wasOfflineRef.current = !state.isConnected;
      console.log(`📡 [NetworkSync] Initial network state: ${state.isConnected ? 'ONLINE' : 'OFFLINE'}`);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const wasOffline = wasOfflineRef.current;

      console.log(`📡 [NetworkSync] Network state changed: ${isConnected ? 'ONLINE' : 'OFFLINE'}`);

      // If we were offline and now we're online, trigger sync
      if (wasOffline && isConnected) {
        console.log('📡 [NetworkSync] Network reconnected - triggering sync...');
        syncAllData();
      }

      // Update the ref for next comparison
      wasOfflineRef.current = !isConnected;
    });

    // Cleanup on unmount
    return () => {
      console.log('📡 [NetworkSync] Manager stopping - cleaning up');
      unsubscribe();
    };
  }, [user?.id]); // Only re-run if user changes

  return null; // This is a logic-only component
}

