import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { ConnectionTier } from '@/lib/privacy/privacy-enforcement';

export interface RelationshipPrivacySettings {
  id: string;
  partner_name: string;
  connection_tier: ConnectionTier;
  color: string;
  relationship_type: string;
}

export interface GroupPrivacySettings {
  id: string;
  group_name: string;
  connection_tier: ConnectionTier;
  color: string;
}

export function usePrivacySettings() {
  const { user, demoMode } = useAuth();
  const [relationships, setRelationships] = useState<RelationshipPrivacySettings[]>([]);
  const [groups, setGroups] = useState<GroupPrivacySettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrivacySettings = useCallback(async () => {
    if (!user && !demoMode) return;

    try {
      setLoading(true);
      setError(null);

      if (demoMode) {
        // Mock data for demo mode
        setRelationships([
          {
            id: 'demo-rel-1',
            partner_name: 'Demo Partner',
            connection_tier: 'details',
            color: '#3B82F6',
            relationship_type: 'partner'
          }
        ]);
        setGroups([]);
        return;
      }

      const supabase = createSupabaseClient();

      // Fetch relationships with their connection tiers
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select(`
          id,
          partner_name,
          connection_tier,
          color,
          relationship_type
        `)
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('partner_name');

      if (relationshipsError) {
        throw new Error(`Failed to fetch relationships: ${relationshipsError.message}`);
      }

      // Fetch groups with their connection tiers
      const { data: groupsData, error: groupsError } = await supabase
        .from('relationship_groups')
        .select(`
          id,
          group_name,
          connection_tier,
          color
        `)
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('group_name');

      if (groupsError) {
        throw new Error(`Failed to fetch groups: ${groupsError.message}`);
      }

      setRelationships(relationshipsData || []);
      setGroups(groupsData || []);
    } catch (err) {
      console.error('Error fetching privacy settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch privacy settings');
    } finally {
      setLoading(false);
    }
  }, [user, demoMode]);

  const updateRelationshipPrivacy = useCallback(async (
    relationshipId: string, 
    connectionTier: ConnectionTier
  ) => {
    if (!user || demoMode) return;

    try {
      const supabase = createSupabaseClient();

      const { error } = await supabase
        .from('relationships')
        .update({ connection_tier: connectionTier })
        .eq('id', relationshipId)
        .eq('user_id', user!.id);

      if (error) {
        throw new Error(`Failed to update relationship privacy: ${error.message}`);
      }

      // Update local state
      setRelationships(prev => 
        prev.map(rel => 
          rel.id === relationshipId 
            ? { ...rel, connection_tier: connectionTier }
            : rel
        )
      );
    } catch (err) {
      console.error('Error updating relationship privacy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update relationship privacy');
    }
  }, [user, demoMode]);

  const updateGroupPrivacy = useCallback(async (
    groupId: string, 
    connectionTier: ConnectionTier
  ) => {
    if (!user || demoMode) return;

    try {
      const supabase = createSupabaseClient();

      const { error } = await supabase
        .from('relationship_groups')
        .update({ connection_tier: connectionTier })
        .eq('id', groupId)
        .eq('user_id', user!.id);

      if (error) {
        throw new Error(`Failed to update group privacy: ${error.message}`);
      }

      // Update local state
      setGroups(prev => 
        prev.map(group => 
          group.id === groupId 
            ? { ...group, connection_tier: connectionTier }
            : group
        )
      );
    } catch (err) {
      console.error('Error updating group privacy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update group privacy');
    }
  }, [user, demoMode]);

  useEffect(() => {
    fetchPrivacySettings();
  }, [fetchPrivacySettings]);

  return {
    relationships,
    groups,
    loading,
    error,
    updateRelationshipPrivacy,
    updateGroupPrivacy,
    refetch: fetchPrivacySettings
  };
}
