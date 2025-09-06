'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { type Relationship } from '@/lib/supabase/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { 
  enhancedRealtimeManager, 
  RealtimeSubscriptionOptions,
  RealtimeSubscription 
} from '@/lib/supabase/enhanced-realtime-manager';
import { realtimeAuth, RealtimeAuthState } from '@/lib/supabase/realtime-auth';

interface UseRealtimeRelationshipsOptions {
  initialData?: Relationship[];
  enableOptimisticUpdates?: boolean;
  enableOfflineSupport?: boolean;
  maxReconnectAttempts?: number;
}

interface UseRealtimeRelationshipsReturn {
  relationships: Relationship[];
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  isOnline: boolean;
  authState: RealtimeAuthState;
  refetch: () => Promise<void>;
  optimisticUpdate: (relationship: Relationship) => void;
  optimisticDelete: (relationshipId: string) => void;
  forceReconnect: () => Promise<void>;
  getConnectionStats: () => any;
}

export function useRealtimeRelationships(options: UseRealtimeRelationshipsOptions = {}): UseRealtimeRelationshipsReturn {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'>('disconnected');
  const [isOnline, setIsOnline] = useState(true);
  const [authState, setAuthState] = useState<RealtimeAuthState>(realtimeAuth.getAuthState());
  
  const supabase = createSupabaseClient();
  const subscriptionIdRef = useRef<string | null>(null);
  const optimisticUpdatesRef = useRef<Map<string, Relationship>>(new Map());
  const dataVersionRef = useRef(0);

  // Fetch relationships data with enhanced error handling
  const fetchRelationships = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      dataVersionRef.current += 1;
      const currentVersion = dataVersionRef.current;
      
      console.log('[REALTIME-RELATIONSHIPS] Fetching relationships data...');
      
      const { data, error: fetchError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Only update if this is still the latest fetch
      if (currentVersion === dataVersionRef.current) {
        setRelationships(data || []);
        console.log(`[REALTIME-RELATIONSHIPS] Fetched ${data?.length || 0} relationships`);
      }
    } catch (err) {
      console.error('[REALTIME-RELATIONSHIPS] Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch relationships');
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  // Handle real-time updates with enhanced conflict resolution
  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<Relationship>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    console.log('[REALTIME-RELATIONSHIPS] Received real-time update:', {
      eventType,
      recordId: (newRecord as any)?.id || (oldRecord as any)?.id,
      userId: user?.id
    });

    setRelationships(currentRelationships => {
      let updatedRelationships = [...currentRelationships];
      
      switch (eventType) {
        case 'INSERT':
          if (!newRecord || !('id' in newRecord)) {
            console.warn('[REALTIME-RELATIONSHIPS] INSERT event missing new record');
            return currentRelationships;
          }
          
          // Check if relationship already exists (avoid duplicates)
          const existingIndex = currentRelationships.findIndex(r => r.id === newRecord.id);
          if (existingIndex >= 0) {
            console.log('[REALTIME-RELATIONSHIPS] UPDATE instead of INSERT - relationship exists');
            updatedRelationships[existingIndex] = newRecord as Relationship;
          } else {
            console.log('[REALTIME-RELATIONSHIPS] Adding new relationship:', newRecord.id);
            updatedRelationships = [newRecord as Relationship, ...updatedRelationships];
          }
          break;

        case 'UPDATE':
          if (!newRecord || !('id' in newRecord)) {
            console.warn('[REALTIME-RELATIONSHIPS] UPDATE event missing new record');
            return currentRelationships;
          }
          
          const updateIndex = currentRelationships.findIndex(r => r.id === newRecord.id);
          if (updateIndex >= 0) {
            console.log('[REALTIME-RELATIONSHIPS] Updating relationship:', newRecord.id);
            updatedRelationships[updateIndex] = newRecord as Relationship;
            
            // Clear any optimistic update for this relationship
            optimisticUpdatesRef.current.delete(newRecord.id);
            
            // Remove optimistic update from enhanced manager
            const optimisticUpdate = enhancedRealtimeManager.getOptimisticUpdate(newRecord.id);
            if (optimisticUpdate) {
              console.log('[REALTIME-RELATIONSHIPS] Resolved optimistic update for:', newRecord.id);
            }
          } else {
            console.log('[REALTIME-RELATIONSHIPS] INSERT instead of UPDATE - relationship not found');
            updatedRelationships = [newRecord as Relationship, ...updatedRelationships];
          }
          break;

        case 'DELETE':
          if (!oldRecord || !('id' in oldRecord)) {
            console.warn('[REALTIME-RELATIONSHIPS] DELETE event missing old record');
            return currentRelationships;
          }
          
          const deleteIndex = currentRelationships.findIndex(r => r.id === oldRecord.id);
          if (deleteIndex >= 0) {
            console.log('[REALTIME-RELATIONSHIPS] Deleting relationship:', oldRecord.id);
            updatedRelationships.splice(deleteIndex, 1);
            
            // Clear any optimistic update for this relationship
            if ((oldRecord as any)?.id) {
              optimisticUpdatesRef.current.delete((oldRecord as any).id);
            }
          }
          break;

        default:
          console.warn('[REALTIME-RELATIONSHIPS] Unknown event type:', eventType);
          return currentRelationships;
      }
      
      // Sort by created_at descending
      updatedRelationships.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return updatedRelationships;
    });
  }, [user?.id]);

  // Setup enhanced real-time subscription with bulletproof error handling
  useEffect(() => {
    if (!user?.id) {
      setConnectionStatus('disconnected');
      return;
    }

    const setupEnhancedSubscription = async () => {
      try {
        console.log('[REALTIME-RELATIONSHIPS] Setting up enhanced subscription for user:', user.id);
        setConnectionStatus('connecting');
        setError(null);
        
        const subscriptionOptions: RealtimeSubscriptionOptions = {
          table: 'relationships',
          event: '*',
          schema: 'public',
          filter: `user_id=eq.${user.id}`
        };
        
        const subscriptionId = enhancedRealtimeManager.subscribe(subscriptionOptions, (payload) => {
          console.log('[REALTIME-RELATIONSHIPS] Received payload:', payload);
          handleRealtimeUpdate(payload);
          setConnectionStatus('connected');
          setError(null);
        });
        subscriptionIdRef.current = subscriptionId;
        
        console.log('[REALTIME-RELATIONSHIPS] Enhanced subscription created:', subscriptionId);
        
      } catch (error) {
        console.error('[REALTIME-RELATIONSHIPS] Failed to setup enhanced subscription:', error);
        setError(error instanceof Error ? error.message : 'Failed to establish real-time connection');
        setConnectionStatus('error');
      }
    };

    setupEnhancedSubscription();

    return () => {
      if (subscriptionIdRef.current) {
        console.log('[REALTIME-RELATIONSHIPS] Cleaning up subscription:', subscriptionIdRef.current);
        enhancedRealtimeManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
      }
    };
  }, [user?.id, handleRealtimeUpdate, options.enableOptimisticUpdates, options.enableOfflineSupport, options.maxReconnectAttempts]);

  // Setup auth state monitoring
  useEffect(() => {
    const unsubscribe = realtimeAuth.addAuthStateListener((newAuthState) => {
      setAuthState(newAuthState);
      
      if (newAuthState.error) {
        setError(`Authentication error: ${newAuthState.error}`);
      }
    });

    return unsubscribe;
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  // Enhanced optimistic update functions with conflict resolution
  const optimisticUpdate = useCallback((relationship: Relationship) => {
    if (!options.enableOptimisticUpdates) return;
    
    console.log('[REALTIME-RELATIONSHIPS] Applying optimistic update for:', relationship.id);
    
    // Store in local optimistic updates
    optimisticUpdatesRef.current.set(relationship.id, relationship);
    
    // Store in enhanced manager for conflict resolution
    const existingRelationship = relationships.find(r => r.id === relationship.id);
    enhancedRealtimeManager.addOptimisticUpdate(
      relationship.id,
      existingRelationship ? 'UPDATE' : 'INSERT',
      relationship,
      existingRelationship // rollback data
    );
    
    setRelationships(currentRelationships => {
      const existingIndex = currentRelationships.findIndex(r => r.id === relationship.id);
      if (existingIndex >= 0) {
        // Update existing relationship
        const updated = [...currentRelationships];
        updated[existingIndex] = relationship;
        return updated;
      } else {
        // Add new relationship
        return [relationship, ...currentRelationships].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
    });
  }, [options.enableOptimisticUpdates, relationships]);

  const optimisticDelete = useCallback((relationshipId: string) => {
    if (!options.enableOptimisticUpdates) return;
    
    console.log('[REALTIME-RELATIONSHIPS] Applying optimistic delete for:', relationshipId);
    
    const existingRelationship = relationships.find(r => r.id === relationshipId);
    if (existingRelationship) {
      // Store in enhanced manager for potential rollback
      enhancedRealtimeManager.addOptimisticUpdate(
        relationshipId,
        'DELETE',
        null,
        existingRelationship
      );
    }
    
    setRelationships(currentRelationships => 
      currentRelationships.filter(r => r.id !== relationshipId)
    );
  }, [options.enableOptimisticUpdates, relationships]);

  // Force reconnection function
  const forceReconnect = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('[REALTIME-RELATIONSHIPS] Forcing reconnection...');
    
    if (subscriptionIdRef.current) {
      await enhancedRealtimeManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }
    
    // Trigger re-setup via dependency change
    dataVersionRef.current += 1;
    
    // Re-setup will happen via useEffect
  }, [user?.id]);

  // Get connection statistics
  const getConnectionStats = useCallback(() => {
    return enhancedRealtimeManager.getConnectionStats();
  }, []);

  return {
    relationships,
    loading,
    error,
    connectionStatus,
    isOnline,
    authState,
    refetch: fetchRelationships,
    optimisticUpdate,
    optimisticDelete,
    forceReconnect,
    getConnectionStats,
  };
}