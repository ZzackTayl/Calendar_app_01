'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { type Invitation } from '@/lib/supabase/types';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeInvitationsOptions {
  initialData?: Invitation[];
  enableOptimisticUpdates?: boolean;
}

interface UseRealtimeInvitationsReturn {
  invitations: Invitation[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  optimisticUpdate: (invitation: Invitation) => void;
  optimisticDelete: (invitationId: string) => void;
}

export function useRealtimeInvitations(options: UseRealtimeInvitationsOptions = {}): UseRealtimeInvitationsReturn {
  const { user, demoMode } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>(options.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optimisticUpdatesRef = useRef<Map<string, Invitation>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Fetch invitations data
  const fetchInvitations = useCallback(async () => {
    if (!user?.id || demoMode) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch both sent and received invitations
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInvitations(data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, demoMode, supabase]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((payload: RealtimePostgresChangesPayload<Invitation>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Enhanced security check for invitations (they don't have user_id, but sender_id/recipient_user_id)
    // This is handled by the subscription filter, but we add an extra layer here

    // Check if the invitation is relevant to the current user (sent or received)
    const isRelevantInvitation = (invitation: Invitation | null) => {
      if (!invitation || !user?.id) return false;
      return invitation.sender_id === user.id || invitation.recipient_user_id === user.id;
    };

    if (!isRelevantInvitation(newRecord as Invitation | null) && !isRelevantInvitation(oldRecord as Invitation | null)) return;

    setInvitations(currentInvitations => {
      switch (eventType) {
        case 'INSERT':
          if (!newRecord || !('id' in newRecord)) return currentInvitations;
          
          // Check if invitation already exists (avoid duplicates)
          const existsInCurrent = currentInvitations.some(i => i.id === newRecord.id);
          if (existsInCurrent) return currentInvitations;
          
          return [...currentInvitations, newRecord as Invitation].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );

        case 'UPDATE':
          if (!newRecord || !('id' in newRecord)) return currentInvitations;
          
          // Clear any optimistic update for this invitation
          if (newRecord.id) {
            optimisticUpdatesRef.current.delete(newRecord.id);
          }
          
          return currentInvitations.map(invitation => 
            invitation.id === newRecord.id ? (newRecord as Invitation) : invitation
          );

        case 'DELETE':
          if (!oldRecord || !('id' in oldRecord)) return currentInvitations;
          
          // Clear any optimistic update for this invitation
          if (oldRecord.id) {
            optimisticUpdatesRef.current.delete(oldRecord.id);
          }
          
          return currentInvitations.filter(invitation => invitation.id !== oldRecord.id);

        default:
          return currentInvitations;
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

        const channel = supabase.channel(`invitations-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invitations',
              filter: `sender_id=eq.${user.id}`,
            },
            handleRealtimeUpdate
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'invitations',
              filter: `recipient_user_id=eq.${user.id}`,
            },
            handleRealtimeUpdate
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Invitations real-time subscription active');
              reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
            } else if (status === 'CLOSED') {
              console.log('❌ Invitations real-time subscription closed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('⚠️ Invitations real-time subscription error');
              
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
              console.warn('⏰ Invitations real-time subscription timed out');
              
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
    fetchInvitations();
  }, [fetchInvitations]);

  // Optimistic update functions (only if enabled)
  const optimisticUpdate = useCallback((invitation: Invitation) => {
    if (!options.enableOptimisticUpdates) return;
    
    optimisticUpdatesRef.current.set(invitation.id, invitation);
    
    setInvitations(currentInvitations => {
      const existingIndex = currentInvitations.findIndex(i => i.id === invitation.id);
      if (existingIndex >= 0) {
        // Update existing invitation
        const updated = [...currentInvitations];
        updated[existingIndex] = invitation;
        return updated;
      } else {
        // Add new invitation
        return [invitation, ...currentInvitations];
      }
    });
  }, [options.enableOptimisticUpdates]);

  const optimisticDelete = useCallback((invitationId: string) => {
    if (!options.enableOptimisticUpdates) return;
    
    setInvitations(currentInvitations => 
      currentInvitations.filter(i => i.id !== invitationId)
    );
  }, [options.enableOptimisticUpdates]);

  return {
    invitations,
    loading,
    error,
    refetch: fetchInvitations,
    optimisticUpdate,
    optimisticDelete,
  };
}