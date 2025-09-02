'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { type Relationship } from '@/lib/supabase/types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeRelationshipsOptions {
  initialData?: Relationship[];
  enableOptimisticUpdates?: boolean;
}

interface UseRealtimeRelationshipsReturn {
  relationships: Relationship[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticUpdate: (relationship: Relationship) => void;
  optimisticDelete: (relationshipId: string) => void;
}

export function useRealtimeRelationships(options: UseRealtimeRelationshipsOptions = {}): UseRealtimeRelationshipsReturn {
  const { user, demoMode } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optimisticUpdatesRef = useRef<Map<string, Relationship>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Fetch relationships data
  const fetchRelationships = useCallback(async () => {
    if (!user?.id || demoMode) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRelationships(data || []);
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch relationships');
    } finally {
      setLoading(false);
    }
  }, [user?.id, demoMode, supabase]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<Relationship>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Security check: only process relationships for the current user
    if (newRecord && 'user_id' in newRecord && newRecord.user_id !== user?.id) return;
    if (oldRecord && 'user_id' in oldRecord && oldRecord.user_id !== user?.id) return;

    setRelationships(currentRelationships => {
      switch (eventType) {
        case 'INSERT':
          if (!newRecord || !('id' in newRecord)) return currentRelationships;
          
          // Check if relationship already exists (avoid duplicates)
          const existsInCurrent = currentRelationships.some(r => r.id === newRecord.id);
          if (existsInCurrent) return currentRelationships;
          
          return [...currentRelationships, newRecord as Relationship].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        case 'UPDATE':
          if (!newRecord || !('id' in newRecord)) return currentRelationships;
          
          // Clear any optimistic update for this relationship
          if (newRecord.id) {
            optimisticUpdatesRef.current.delete(newRecord.id);
          }
          
          return currentRelationships.map(relationship => 
            relationship.id === newRecord.id ? (newRecord as Relationship) : relationship
          );

        case 'DELETE':
          if (!oldRecord || !('id' in oldRecord)) return currentRelationships;
          
          // Clear any optimistic update for this relationship
          if (oldRecord.id) {
            optimisticUpdatesRef.current.delete(oldRecord.id);
          }
          
          return currentRelationships.filter(relationship => relationship.id !== oldRecord.id);

        default:
          return currentRelationships;
      }
    });
  }, [user?.id]);

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

        const channel = supabase.channel(`relationships-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'relationships',
              filter: `user_id=eq.${user.id}`,
            },
            handleRealtimeUpdate
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Relationships real-time subscription active');
              reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            } else if (status === 'CLOSED') {
              console.log('❌ Relationships real-time subscription closed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('⚠️ Relationships real-time subscription error');
              
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
              console.warn('⏰ Relationships real-time subscription timed out');
              
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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, demoMode, supabase, handleRealtimeUpdate]);

  // Initial data fetch
  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Optimistic update functions (only if enabled)
  const optimisticUpdate = useCallback((relationship: Relationship) => {
    if (!options.enableOptimisticUpdates) return;
    
    optimisticUpdatesRef.current.set(relationship.id, relationship);
    
    setRelationships(currentRelationships => {
      const existingIndex = currentRelationships.findIndex(r => r.id === relationship.id);
      if (existingIndex >= 0) {
        // Update existing relationship
        const updated = [...currentRelationships];
        updated[existingIndex] = relationship;
        return updated;
      } else {
        // Add new relationship
        return [relationship, ...currentRelationships];
      }
    });
  }, [options.enableOptimisticUpdates]);

  const optimisticDelete = useCallback((relationshipId: string) => {
    if (!options.enableOptimisticUpdates) return;
    
    setRelationships(currentRelationships => 
      currentRelationships.filter(r => r.id !== relationshipId)
    );
  }, [options.enableOptimisticUpdates]);

  return {
    relationships,
    loading,
    error,
    refetch: fetchRelationships,
    optimisticUpdate,
    optimisticDelete,
  };
}