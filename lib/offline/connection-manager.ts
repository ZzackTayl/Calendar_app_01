/**
 * Connection Manager
 * Monitors network connectivity and manages offline/online transitions
 */

type ConnectionCallback = (isOnline: boolean) => void;
type ConnectionQuality = 'good' | 'poor' | 'offline';

interface ConnectionInfo {
  isOnline: boolean;
  quality: ConnectionQuality;
  lastOnlineTime: number;
  offlineSince?: number;
}

class ConnectionManager {
  private isOnline = navigator.onLine;
  private callbacks: Set<ConnectionCallback> = new Set();
  private connectionInfo: ConnectionInfo = {
    isOnline: navigator.onLine,
    quality: navigator.onLine ? 'good' : 'offline',
    lastOnlineTime: navigator.onLine ? Date.now() : 0
  };
  private qualityCheckInterval?: NodeJS.Timeout;
  private retryTimeouts = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.setupEventListeners();
    this.startQualityMonitoring();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Also listen for visibility changes to check connection when app becomes active
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkConnectionQuality();
      }
    });
  }

  private handleOnline = (): void => {
    const wasOffline = !this.isOnline;
    this.isOnline = true;
    
    this.connectionInfo = {
      ...this.connectionInfo,
      isOnline: true,
      lastOnlineTime: Date.now(),
      offlineSince: undefined
    };

    // Check quality when coming back online
    this.checkConnectionQuality();

    if (wasOffline) {
      this.notifyCallbacks(true);
    }
  };

  private handleOffline = (): void => {
    const wasOnline = this.isOnline;
    this.isOnline = false;
    
    this.connectionInfo = {
      ...this.connectionInfo,
      isOnline: false,
      quality: 'offline',
      offlineSince: Date.now()
    };

    if (wasOnline) {
      this.notifyCallbacks(false);
    }
  };

  private notifyCallbacks(isOnline: boolean): void {
    this.callbacks.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  private startQualityMonitoring(): void {
    // Check connection quality every 30 seconds when online
    this.qualityCheckInterval = setInterval(() => {
      if (this.isOnline) {
        this.checkConnectionQuality();
      }
    }, 30000);
  }

  private async checkConnectionQuality(): Promise<void> {
    if (!this.isOnline) {
      this.connectionInfo.quality = 'offline';
      return;
    }

    try {
      const startTime = Date.now();
      
      // Try to fetch a small resource to test connection
      const response = await fetch('/api/health/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        // Determine quality based on response time
        if (responseTime < 1000) {
          this.connectionInfo.quality = 'good';
        } else {
          this.connectionInfo.quality = 'poor';
        }
      } else {
        this.connectionInfo.quality = 'poor';
      }
    } catch (error) {
      console.warn('Connection quality check failed:', error);
      this.connectionInfo.quality = 'poor';
      
      // If we can't reach our own API, we might be offline
      // Double-check with a more reliable endpoint
      try {
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
          mode: 'no-cors',
          signal: AbortSignal.timeout(3000)
        });
        // If this succeeds, we're online but our API might be down
        this.connectionInfo.quality = 'poor';
      } catch {
        // Likely actually offline
        this.handleOffline();
      }
    }
  }

  // Public API
  getConnectionInfo(): ConnectionInfo {
    return { ...this.connectionInfo };
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  getQuality(): ConnectionQuality {
    return this.connectionInfo.quality;
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.callbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Retry helpers with exponential backoff
  scheduleRetry(
    key: string,
    operation: () => Promise<void>,
    attempt = 1,
    maxAttempts = 5
  ): void {
    // Clear any existing retry for this key
    this.cancelRetry(key);

    if (attempt > maxAttempts) {
      console.warn(`Max retry attempts reached for operation: ${key}`);
      return;
    }

    // Exponential backoff: 2^attempt seconds, max 60 seconds
    const delaySeconds = Math.min(Math.pow(2, attempt), 60);
    const delayMs = delaySeconds * 1000;

    console.log(`Scheduling retry ${attempt}/${maxAttempts} for ${key} in ${delaySeconds}s`);

    const timeoutId = setTimeout(async () => {
      try {
        await operation();
        console.log(`Retry ${attempt} succeeded for ${key}`);
      } catch (error) {
        console.warn(`Retry ${attempt} failed for ${key}:`, error);
        
        // Schedule next retry if we're still offline and haven't exceeded max attempts
        if (!this.isOnline && attempt < maxAttempts) {
          this.scheduleRetry(key, operation, attempt + 1, maxAttempts);
        }
      } finally {
        this.retryTimeouts.delete(key);
      }
    }, delayMs);

    this.retryTimeouts.set(key, timeoutId);
  }

  cancelRetry(key: string): void {
    const timeoutId = this.retryTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.retryTimeouts.delete(key);
    }
  }

  cancelAllRetries(): void {
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
  }

  // Wait for connection with timeout
  async waitForConnection(timeoutMs = 30000): Promise<boolean> {
    if (this.isOnline) return true;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const unsubscribe = this.onConnectionChange((isOnline) => {
        if (isOnline) {
          cleanup();
          resolve(true);
        }
      });

      const cleanup = () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    });
  }

  // Get offline duration in milliseconds
  getOfflineDuration(): number {
    if (this.isOnline || !this.connectionInfo.offlineSince) return 0;
    return Date.now() - this.connectionInfo.offlineSince;
  }

  // Check if we've been offline for a long time
  isLongOffline(thresholdMs = 5 * 60 * 1000): boolean { // 5 minutes default
    return this.getOfflineDuration() > thresholdMs;
  }

  // Cleanup
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }
    
    this.cancelAllRetries();
    this.callbacks.clear();
  }
}

// Singleton instance
const connectionManager = new ConnectionManager();

export default connectionManager;
export type { ConnectionCallback, ConnectionQuality, ConnectionInfo };
