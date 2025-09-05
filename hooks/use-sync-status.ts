/**
 * useSyncStatus Hook
 * Provides sync status information and controls
 */

import { useState, useEffect } from 'react';
import syncManager, { type SyncStatus, type SyncResult } from '../lib/offline/sync-manager';

export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    syncManager.getSyncStatus()
  );
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    // Update initial state
    setSyncStatus(syncManager.getSyncStatus());

    // Update pending count
    const updatePendingCount = async () => {
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();
    
    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 30000); // Every 30 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async (): Promise<SyncResult> => {
    try {
      const result = await syncManager.forcSync();
      // Update pending count after sync
      const count = await syncManager.getPendingCount();
      setPendingCount(count);
      return result;
    } catch (error) {
      throw error;
    }
  };

  return {
    ...syncStatus,
    pendingCount,
    
    // Actions
    triggerSync,
    enableBackgroundSync: syncManager.enableBackgroundSync.bind(syncManager),
    disableBackgroundSync: syncManager.disableBackgroundSync.bind(syncManager),
  };
}
