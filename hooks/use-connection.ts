/**
 * useConnection Hook
 * Provides connection status and quality information
 */

import { useState, useEffect } from 'react';
import connectionManager, { type ConnectionInfo, type ConnectionQuality } from '../lib/offline/connection-manager';

export function useConnection() {
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo>(
    connectionManager.getConnectionInfo()
  );

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = connectionManager.onConnectionChange((isOnline) => {
      setConnectionInfo(connectionManager.getConnectionInfo());
    });

    // Update initial state
    setConnectionInfo(connectionManager.getConnectionInfo());

    return unsubscribe;
  }, []);

  return {
    isOnline: connectionInfo.isOnline,
    quality: connectionInfo.quality,
    lastOnlineTime: connectionInfo.lastOnlineTime,
    offlineSince: connectionInfo.offlineSince,
    offlineDuration: connectionManager.getOfflineDuration(),
    isLongOffline: connectionManager.isLongOffline(),
    
    // Utility functions
    waitForConnection: connectionManager.waitForConnection.bind(connectionManager),
    scheduleRetry: connectionManager.scheduleRetry.bind(connectionManager),
    cancelRetry: connectionManager.cancelRetry.bind(connectionManager),
  };
}
