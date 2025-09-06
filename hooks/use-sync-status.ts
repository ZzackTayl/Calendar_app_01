/**
 * useSyncStatus Hook
 * Offline functionality removed for production
 */

import { useState, useEffect } from 'react';

// Types for compatibility (offline functionality removed)
type SyncStatus = {
  isActive: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  error: string | null;
};

type SyncResult = {
  success: boolean;
  changes: number;
  error?: string;
};

export function useSyncStatus() {
  const [syncStatus] = useState<SyncStatus>({
    isActive: false,
    isSyncing: false,
    lastSync: null,
    nextSync: null,
    error: null
  });
  const [pendingCount] = useState(0);

  useEffect(() => {
    // Offline functionality removed for production - no sync monitoring
    console.log('Sync status monitoring disabled for production build');
  }, []);

  const triggerSync = async (): Promise<SyncResult> => {
    // Offline functionality removed for production
    throw new Error('Sync functionality not available in production build');
  };

  return {
    ...syncStatus,
    pendingCount,
    
    // Actions - offline functionality removed
    triggerSync,
    enableBackgroundSync: () => {},
    disableBackgroundSync: () => {},
  };
}
