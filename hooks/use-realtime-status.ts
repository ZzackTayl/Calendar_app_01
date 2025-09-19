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
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const supabase = createSupabaseClient();
  const statusChannelRef = useRef<any>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencyRef = useRef<number[]>([]);
  const retryCountRef = useRef(0);

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

  const reconnect: () => void = useCallback(() => {
    if (!user?.id || !enableStatusTracking) return;

    setStatus('reconnecting');
    setRetryCount(prev => {
      const next = prev + 1;
      retryCountRef.current = next;
      return next;
    });

    // Clean up existing connection
    if (statusChannelRef.current) {
      supabase.removeChannel(statusChannelRef.current);
      statusChannelRef.current = null;
    }

    const setupStatusChannel = async () => {
      try {
        const channel = supabase
          .channel(`status-${user.id}`)
          .subscribe((channelStatus: string) => {
            if (channelStatus === 'SUBSCRIBED') {
              setStatus('connected');
              setLastConnected(new Date());
              retryCountRef.current = 0;
              setRetryCount(0);
              startHeartbeat();
            } else if (channelStatus === 'CLOSED') {
              setStatus('disconnected');
            } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
              setStatus('error');
              // Auto-retry after a delay
              setTimeout(() => {
                if (retryCountRef.current < 3) {
                  reconnect();
                }
              }, Math.min(1000 * Math.pow(2, retryCountRef.current), 10000));
            }
          });

        statusChannelRef.current = channel;
      } catch (error) {
        console.error('Failed to setup status channel:', error);
        setStatus('error');
      }
    };

    void setupStatusChannel();
  }, [user?.id, enableStatusTracking, supabase, startHeartbeat]);

  // Initial connection setup
  useEffect(() => {
    if (!user?.id || !enableStatusTracking) {
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
  }, [user?.id, enableStatusTracking, supabase, reconnect]);

  // Auto-reconnect when coming back online
  useEffect(() => {
    if (isOnline && status === 'disconnected' && user?.id) {
      setTimeout(() => {
        reconnect();
      }, 1000); // Brief delay to let network stabilize
    }
  }, [isOnline, status, user?.id, reconnect]);

  return {
    status,
    lastConnected,
    connectionQuality,
    retryCount,
    isOnline,
    reconnect,
  };
}
