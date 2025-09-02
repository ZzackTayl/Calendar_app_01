'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { type Event } from '@/lib/supabase/types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { realtimeManager } from '@/lib/realtime-manager';

interface UseRealtimeEventsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  initialData?: Event[];
  enableOptimisticUpdates?: boolean;
}

interface UseRealtimeEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticUpdate: (event: Event) => void;
  optimisticDelete: (eventId: string) => void;
}

export function useRealtimeEvents(options: UseRealtimeEventsOptions = {}): UseRealtimeEventsReturn {
  const { user, demoMode } = useAuth();
  const [events, setEvents] = useState<Event[]>(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optimisticUpdatesRef = useRef<Map<string, Event>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Fetch events data
  const fetchEvents = useCallback(async () => {
    if (!user?.id || demoMode) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (options.dateRange) {
        query = query
          .gte('start_time', options.dateRange.start)
          .lte('start_time', options.dateRange.end);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [user?.id, demoMode, supabase, options.dateRange]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<Event>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Security check: only process events for the current user
    if (newRecord && (newRecord as any).user_id && (newRecord as any).user_id !== user?.id) return;
    if (oldRecord && (oldRecord as any).user_id && (oldRecord as any).user_id !== user?.id) return;

    setEvents(currentEvents => {
      switch (eventType) {
        case 'INSERT':
          if (!newRecord || !('id' in newRecord)) return currentEvents;
          
          // Check if event already exists (avoid duplicates)
          const existsInCurrent = currentEvents.some(e => e.id === newRecord.id);
          if (existsInCurrent) return currentEvents;
          
          // Apply date range filter if specified
          if (options.dateRange && 'start_time' in newRecord && newRecord.start_time) {
            if (newRecord.start_time < options.dateRange.start || 
                newRecord.start_time > options.dateRange.end) {
              return currentEvents;
            }
          }
          
          return [...currentEvents, newRecord as Event].sort((a, b) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );

        case 'UPDATE':
          if (!newRecord || !('id' in newRecord)) return currentEvents;
          
          // Clear any optimistic update for this event
          if (newRecord.id) {
            optimisticUpdatesRef.current.delete(newRecord.id);
          }
          
          return currentEvents.map(event => 
            event.id === newRecord.id ? (newRecord as Event) : event
          );

        case 'DELETE':
          if (!oldRecord || !('id' in oldRecord)) return currentEvents;
          
          // Clear any optimistic update for this event
          if (oldRecord.id) {
            optimisticUpdatesRef.current.delete(oldRecord.id);
          }
          
          return currentEvents.filter(event => event.id !== oldRecord.id);

        default:
          return currentEvents;
      }
    });
  }, [user?.id, options.dateRange]);

  // Setup real-time subscription with token refresh handling
  useEffect(() => {
    if (!user?.id || demoMode) return;

    const setupSubscription = async () => {
      try {
        // Check if user session is valid before setting up subscription
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.warn('No valid session for real-time subscription, attempting to refresh...');
          
          // Try to refresh the session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !refreshData.session) {
            console.error('Failed to refresh session for real-time:', refreshError);
            setError('Authentication expired. Please sign in again.');
            return;
          }
        }

        const channel = realtimeManager.getOrCreateChannel(user.id, 'events', (ch) => {
          ch.on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'events',
              filter: `user_id=eq.${user.id}`,
            },
            handleRealtimeUpdate
          );
        }).subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Events real-time subscription active');
              reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            } else if (status === 'CLOSED') {
              console.log('❌ Events real-time subscription closed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('⚠️ Events real-time subscription error');
              
              // Handle reconnection with exponential backoff
              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000; // Exponential backoff
                
                console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                
                setTimeout(() => {
                  setupSubscription();
                }, delay);
              } else {
                setError('Real-time connection failed. Data may not be current.');
              }
            } else if (status === 'TIMED_OUT') {
              console.warn('⏰ Events real-time subscription timed out');
              
              // Handle timeout with reconnection
              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                setTimeout(() => {
                  setupSubscription();
                }, 1000);
              }
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        setError('Failed to establish real-time connection');
      }
    };

    setupSubscription();

    return () => {
      if (user?.id) {
        realtimeManager.removeChannel(`events-${user.id}`);
      }
      channelRef.current = null;
    };
  }, [user?.id, demoMode, supabase, handleRealtimeUpdate]);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Optimistic update functions (only if enabled)
  const optimisticUpdate = useCallback((event: Event) => {
    if (!options.enableOptimisticUpdates) return;
    
    optimisticUpdatesRef.current.set(event.id, event);
    
    setEvents(currentEvents => {
      const existingIndex = currentEvents.findIndex(e => e.id === event.id);
      if (existingIndex >= 0) {
        // Update existing event
        const updated = [...currentEvents];
        updated[existingIndex] = event;
        return updated.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      } else {
        // Add new event
        return [...currentEvents, event].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      }
    });
  }, [options.enableOptimisticUpdates]);

  const optimisticDelete = useCallback((eventId: string) => {
    if (!options.enableOptimisticUpdates) return;
    
    setEvents(currentEvents => currentEvents.filter(e => e.id !== eventId));
  }, [options.enableOptimisticUpdates]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    optimisticUpdate,
    optimisticDelete,
  };
}