'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface UseRealtimeStatusOptions {
  enableStatusTracking?: boolean;
}

interface UseRealtimeStatusReturn {
  status: ConnectionStatus;
  lastConnected: Date | null;
  connectionQuality: 'good' | 'poor' | 'unknown';
  retryCount: number;
  isOnline: boolean;
  reconnect: () => void;
}

export function useRealtimeStatus(options: UseRealtimeStatusOptions = {}): UseRealtimeStatusReturn {
  const { user, demoMode } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const supabase = createSupabaseClient();
  const statusChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencyRef = useRef<number[]>([]);

  const { enableStatusTracking = true } = options;

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (status === 'disconnected') {
        setStatus('reconnecting');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  // Connection quality monitoring through heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (!statusChannelRef.current || !isOnline) return;

      const startTime = Date.now();
      
      // Send a simple message and measure response time
      statusChannelRef.current.send({
        type: 'heartbeat',
        timestamp: startTime
      });

      // Simulate measuring latency (in real implementation, you'd wait for response)
      setTimeout(() => {
        const latency = Date.now() - startTime;
        latencyRef.current.push(latency);
        
        // Keep only last 10 measurements
        if (latencyRef.current.length > 10) {
          latencyRef.current.shift();
        }

        // Calculate average latency
        const avgLatency = latencyRef.current.reduce((a, b) => a + b, 0) / latencyRef.current.length;
        
        if (avgLatency < 200) {
          setConnectionQuality('good');
        } else if (avgLatency < 500) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('poor');
        }
      }, 100);
    }, 30000); // Every 30 seconds
  }, [isOnline]);

  const reconnect = useCallback(() => {
    if (!user?.id || demoMode || !enableStatusTracking) return;

    setStatus('reconnecting');
    setRetryCount(prev => prev + 1);

    // Clean up existing connection
    if (statusChannelRef.current) {
      supabase.removeChannel(statusChannelRef.current);
      statusChannelRef.current = null;
    }

    // Attempt to reconnect
    const setupStatusChannel = async () => {
      try {
        const channel = supabase.channel(`status-${user.id}`)
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              setStatus('connected');
              setLastConnected(new Date());
              setRetryCount(0);
              startHeartbeat();
            } else if (status === 'CLOSED') {
              setStatus('disconnected');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setStatus('error');
              // Auto-retry after a delay
              setTimeout(() => {
                if (retryCount < 3) {
                  reconnect();
                }
              }, Math.min(1000 * Math.pow(2, retryCount), 10000)); // Exponential backoff, max 10s
            }
          });

        statusChannelRef.current = channel;
      } catch (error) {
        console.error('Failed to setup status channel:', error);
        setStatus('error');
      }
    };

    setupStatusChannel();
  }, [user?.id, demoMode, enableStatusTracking, retryCount, supabase, startHeartbeat]);

  // Initial connection setup
  useEffect(() => {
    if (!user?.id || demoMode || !enableStatusTracking) {
      setStatus('disconnected');
      return;
    }

    reconnect();

    return () => {
      if (statusChannelRef.current) {
        supabase.removeChannel(statusChannelRef.current);
        statusChannelRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [user?.id, demoMode, enableStatusTracking, supabase]);

  // Auto-reconnect when coming back online
  useEffect(() => {
    if (isOnline && status === 'disconnected' && user?.id && !demoMode) {
      setTimeout(() => {
        reconnect();
      }, 1000); // Brief delay to let network stabilize
    }
  }, [isOnline, status, user?.id, demoMode, reconnect]);

  return {
    status,
    lastConnected,
    connectionQuality,
    retryCount,
    isOnline,
    reconnect,
  };
}