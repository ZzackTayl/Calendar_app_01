/**
 * Comprehensive Permission Service
 * 
 * This service handles all permission checks for the calendar application,
 * including relationship-based access, group permissions, and event visibility.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  level?: 'none' | 'busy_only' | 'details' | 'full';
}

export class PermissionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if a user can view another user's calendar
   */
  async canViewUserCalendar(
    viewerId: string, 
    calendarOwnerId: string
  ): Promise<PermissionCheckResult> {
    // Owner can always view their own calendar
    if (viewerId === calendarOwnerId) {
      return { allowed: true, level: 'full', reason: 'Own calendar' };
    }

    // Check direct relationship
    const { data: relationships } = await this.supabase
      .from('relationships')
      .select('connection_tier, is_active')
      .or(
        `and(user_id.eq.${viewerId},partner_id.eq.${calendarOwnerId}),` +
        `and(user_id.eq.${calendarOwnerId},partner_id.eq.${viewerId})`
      )
      .eq('is_active', true)
      .limit(1);

    if (relationships && relationships.length > 0) {
      const tier = relationships[0].connection_tier;
      if (tier === 'private') {
        return { allowed: false, reason: 'Private connection tier' };
      }
      return { 
        allowed: true, 
        level: tier as 'busy_only' | 'details',
        reason: 'Direct relationship' 
      };
    }

    // Check group memberships
    const { data: sharedGroups } = await this.supabase
      .from('relationship_group_members')
      .select(`
        group_id,
        group:relationship_groups!inner(id, group_name)
      `)
      .eq('user_id', viewerId)
      .is('left_at', null);

    if (sharedGroups && sharedGroups.length > 0) {
      // Check if calendar owner is in any of the same groups
      const groupIds = sharedGroups.map(g => g.group_id);
      const { data: ownerInGroups } = await this.supabase
        .from('relationship_group_members')
        .select('group_id')
        .eq('user_id', calendarOwnerId)
        .in('group_id', groupIds)
        .is('left_at', null);

      if (ownerInGroups && ownerInGroups.length > 0) {
        // Check group member permissions
        const { data: permissions } = await this.supabase
          .from('group_member_permissions')
          .select('permission_level, can_see_details')
          .eq('user_id', viewerId)
          .eq('target_user_id', calendarOwnerId)
          .in('group_id', groupIds)
          .limit(1);

        if (permissions && permissions.length > 0) {
          const perm = permissions[0];
          if (perm.can_see_details) {
            return { 
              allowed: true, 
              level: 'details',
              reason: 'Group permission' 
            };
          } else {
            return { 
              allowed: true, 
              level: 'busy_only',
              reason: 'Group permission (limited)' 
            };
          }
        }

        // Default group permission
        return { 
          allowed: true, 
          level: 'busy_only',
          reason: 'Shared group membership' 
        };
      }
    }

    return { allowed: false, reason: 'No relationship or shared group' };
  }

  /**
   * Check if a user can view a specific event
   */
  async canViewEvent(
    viewerId: string,
    eventId: string
  ): Promise<PermissionCheckResult> {
    // Get event details
    const { data: event } = await this.supabase
      .from('events')
      .select('user_id, privacy_level, privacy_override')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { allowed: false, reason: 'Event not found' };
    }

    // Owner can always view their own events
    if (viewerId === event.user_id) {
      return { allowed: true, level: 'full', reason: 'Own event' };
    }

    // Check if event has private override
    if (event.privacy_override === 'private') {
      // Check explicit permissions
      const { data: explicitPerm } = await this.supabase
        .from('event_permissions')
        .select('permission_level')
        .eq('event_id', eventId)
        .or(
          `relationship_id.in.(SELECT id FROM relationships WHERE (user_id = '${viewerId}' OR partner_id = '${viewerId}') AND is_active = true),` +
          `group_id.in.(SELECT group_id FROM relationship_group_members WHERE user_id = '${viewerId}' AND left_at IS NULL)`
        )
        .limit(1);

      if (explicitPerm && explicitPerm.length > 0) {
        return { 
          allowed: true, 
          level: 'details',
          reason: 'Explicit permission granted' 
        };
      }
      return { allowed: false, reason: 'Private event without permission' };
    }

    // Check calendar view permission
    const calendarPerm = await this.canViewUserCalendar(viewerId, event.user_id);
    
    if (!calendarPerm.allowed) {
      return calendarPerm;
    }

    // Determine visibility based on connection tier and privacy level
    if (calendarPerm.level === 'busy_only') {
      return { 
        allowed: true, 
        level: 'busy_only',
        reason: calendarPerm.reason 
      };
    }

    return { 
      allowed: true, 
      level: 'details',
      reason: calendarPerm.reason 
    };
  }

  /**
   * Get all events visible to a user (including their own and partners')
   */
  async getVisibleEventsQuery(
    userId: string,
    filters: {
      start_date?: string;
      end_date?: string;
      search?: string;
      relationship_id?: string;
      privacy_level?: string;
      group_id?: string;
    } = {}
  ) {
    // Get all relationships where user can see calendars
    const { data: relationships } = await this.supabase
      .from('relationships')
      .select('user_id, partner_id, connection_tier')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
      .eq('is_active', true)
      .neq('connection_tier', 'private');

    const visibleUserIds = [userId];
    const relationshipMap = new Map<string, string>();

    if (relationships) {
      relationships.forEach(rel => {
        const partnerId = rel.user_id === userId ? rel.partner_id : rel.user_id;
        visibleUserIds.push(partnerId);
        relationshipMap.set(partnerId, rel.connection_tier);
      });
    }

    // Get groups user is a member of
    const { data: userGroups } = await this.supabase
      .from('relationship_group_members')
      .select('group_id')
      .eq('user_id', userId)
      .is('left_at', null);

    const groupIds = userGroups?.map(g => g.group_id) || [];

    // If specific group filter, check membership
    if (filters.group_id && !groupIds.includes(filters.group_id)) {
      return { data: [], error: null };
    }

    // Build the events query
    let query = this.supabase
      .from('events')
      .select(`
        *,
        user:user_id(id, full_name, email),
        relationship:relationship_id(
          id,
          partner_name,
          relationship_type,
          color
        ),
        event_permissions(
          relationship_id,
          group_id,
          permission_level
        )
      `)
      .order('start_time', { ascending: true });

    // Add user visibility filter
    query = query.in('user_id', visibleUserIds);

    // Apply date filters
    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('end_time', filters.end_date);
    }

    // Apply search filter
    if (filters.search) {
      const sanitizedSearch = filters.search.replace(/[<>'\"]/g, '').trim();
      if (sanitizedSearch) {
        query = query.or(
          `title.ilike.%${sanitizedSearch}%,` +
          `description.ilike.%${sanitizedSearch}%,` +
          `location.ilike.%${sanitizedSearch}%`
        );
      }
    }

    // Apply relationship filter
    if (filters.relationship_id) {
      query = query.eq('relationship_id', filters.relationship_id);
    }

    // Apply privacy filter
    if (filters.privacy_level) {
      query = query.eq('privacy_level', filters.privacy_level);
    }

    const { data: events, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Filter events based on visibility rules
    const visibleEvents = events?.filter(event => {
      // Own events are always visible
      if (event.user_id === userId) return true;

      // Private override events need explicit permission
      if (event.privacy_override === 'private') {
        return event.event_permissions?.some((perm: any) => {
          if (perm.group_id && groupIds.includes(perm.group_id)) {
            return true;
          }
          // Check if permission is for user's relationships
          // This would need more complex logic in production
          return false;
        });
      }

      // Check connection tier
      const connectionTier = relationshipMap.get(event.user_id);
      if (!connectionTier || connectionTier === 'private') return false;

      // For busy_only tier, mask details
      if (connectionTier === 'busy_only') {
        // Return event with limited information
        return {
          ...event,
          title: 'Busy',
          description: null,
          location: null,
          _visibility_level: 'busy_only'
        };
      }

      return true;
    }) || [];

    return { data: visibleEvents, error: null };
  }

  /**
   * Check if user can modify an event
   */
  async canModifyEvent(
    userId: string,
    eventId: string
  ): Promise<PermissionCheckResult> {
    const { data: event } = await this.supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .single();

    if (!event) {
      return { allowed: false, reason: 'Event not found' };
    }

    if (userId === event.user_id) {
      return { allowed: true, level: 'full', reason: 'Event owner' };
    }

    // In future, could add delegate permissions here
    return { allowed: false, reason: 'Not event owner' };
  }

  /**
   * Check if user is a member of a group
   */
  async isGroupMember(
    userId: string,
    groupId: string
  ): Promise<boolean> {
    const { data } = await this.supabase
      .from('relationship_group_members')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .is('left_at', null)
      .single();

    return !!data;
  }

  /**
   * Check group member permissions
   */
  async getGroupMemberPermissions(
    userId: string,
    targetUserId: string,
    groupId: string
  ) {
    const { data } = await this.supabase
      .from('group_member_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('target_user_id', targetUserId)
      .eq('group_id', groupId)
      .single();

    return data;
  }
}

// Export a singleton instance factory
export function createPermissionService(supabase: SupabaseClient) {
  return new PermissionService(supabase);
}
