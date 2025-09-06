/**
 * useConnection Hook
 * Offline functionality removed for production
 */

import { useState, useEffect } from 'react';

// Types for compatibility (offline functionality removed)
type ConnectionInfo = {
  isOnline: boolean;
  quality: 'good' | 'poor' | 'offline';
  lastOnlineTime: Date | null;
  offlineSince: Date | null;
};

export function useConnection() {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    quality: 'good',
    lastOnlineTime: new Date(),
    offlineSince: null
  });

  useEffect(() => {
    // Offline functionality removed for production - basic online/offline detection only
    const handleOnline = () => {
      setConnectionInfo(prev => ({
        ...prev,
        isOnline: true,
        quality: 'good',
        lastOnlineTime: new Date(),
        offlineSince: null
      }));
    };
    
    const handleOffline = () => {
      setConnectionInfo(prev => ({
        ...prev,
        isOnline: false,
        quality: 'offline',
        offlineSince: new Date()
      }));
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return {
    isOnline: connectionInfo.isOnline,
    quality: connectionInfo.quality,
    lastOnlineTime: connectionInfo.lastOnlineTime,
    offlineSince: connectionInfo.offlineSince,
    offlineDuration: 0, // Offline functionality removed
    isLongOffline: false, // Offline functionality removed
    
    // Utility functions - offline functionality removed
    waitForConnection: async () => Promise.resolve(),
    scheduleRetry: () => {},
    cancelRetry: () => {},
  };
}
