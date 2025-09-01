/**
 * Privacy Enforcement Utilities
 * 
 * This module provides utilities for enforcing the new 3-tier privacy model:
 * - Private: See nothing (unless explicitly granted access)
 * - Busy Only: See free/busy blocks only
 * - Details: See all event details
 */

export type ConnectionTier = 'private' | 'busy_only' | 'details';
export type EventPrivacyLevel = 'private' | 'busy_only' | 'details';

export interface PrivacyCheckResult {
  canView: boolean;
  canViewDetails: boolean;
  reason: string;
}

/**
 * Determines what level of access a viewer has to an event based on:
 * 1. Event privacy level
 * 2. Connection tier between event owner and viewer
 * 3. Explicit permissions (for private events)
 */
export function checkEventAccess(
  eventPrivacyLevel: EventPrivacyLevel,
  connectionTier: ConnectionTier,
  hasExplicitPermission: boolean = false
): PrivacyCheckResult {
  
  // Private events: Only visible to owner or explicitly granted users
  if (eventPrivacyLevel === 'private') {
    if (hasExplicitPermission) {
      return {
        canView: true,
        canViewDetails: true,
        reason: 'Explicit permission granted for private event'
      };
    }
    
    return {
      canView: false,
      canViewDetails: false,
      reason: 'Private event - no access without explicit permission'
    };
  }
  
  // Busy Only events: Respect connection tier
  if (eventPrivacyLevel === 'busy_only') {
    if (connectionTier === 'private') {
      return {
        canView: false,
        canViewDetails: false,
        reason: 'Connection tier is private - no access to busy_only event'
      };
    }
    
    if (connectionTier === 'busy_only') {
      return {
        canView: true,
        canViewDetails: false,
        reason: 'Connection tier allows busy_only access'
      };
    }
    
    if (connectionTier === 'details') {
      return {
        canView: true,
        canViewDetails: false,
        reason: 'Event is busy_only, connection tier is details - limited to busy_only'
      };
    }
  }
  
  // Details events: Respect connection tier
  if (eventPrivacyLevel === 'details') {
    if (connectionTier === 'private') {
      return {
        canView: false,
        canViewDetails: false,
        reason: 'Connection tier is private - no access to details event'
      };
    }
    
    if (connectionTier === 'busy_only') {
      return {
        canView: true,
        canViewDetails: false,
        reason: 'Connection tier is busy_only - limited access to details event'
      };
    }
    
    if (connectionTier === 'details') {
      return {
        canView: true,
        canViewDetails: true,
        reason: 'Connection tier allows full details access'
      };
    }
  }
  
  // Fallback (should never reach here)
  return {
    canView: false,
    canViewDetails: false,
    reason: 'Unknown privacy configuration'
  };
}

/**
 * Filters event data based on privacy access level
 */
export function filterEventData(event: any, canViewDetails: boolean): any {
  if (!canViewDetails) {
    // Return only basic time information for busy_only access
    return {
      id: event.id,
      start_time: event.start_time,
      end_time: event.end_time,
      is_all_day: event.is_all_day,
      time_zone: event.time_zone,
      // Hide all other details
      title: 'Busy',
      description: null,
      location: null,
      privacy_level: 'busy_only',
      relationship_id: null,
      visible_to_relationships: null,
      visible_to_groups: null,
      color: '#6B7280', // Gray color for busy blocks
      status: 'confirmed',
      recurrence_rule: null,
      recurrence_exception_dates: null,
      created_at: event.created_at,
      updated_at: event.updated_at,
      user_id: event.user_id
    };
  }
  
  // Return full event data for details access
  return event;
}

/**
 * Gets the appropriate display text for a privacy level
 */
export function getPrivacyDisplayText(privacyLevel: EventPrivacyLevel): string {
  switch (privacyLevel) {
    case 'private':
      return 'Private - Only visible to you';
    case 'busy_only':
      return 'Busy Only - Partners see free/busy blocks only';
    case 'details':
      return 'Details - Partners can see all event details';
    default:
      return 'Unknown privacy level';
  }
}

/**
 * Gets the appropriate display text for a connection tier
 */
export function getConnectionTierDisplayText(tier: ConnectionTier): string {
  switch (tier) {
    case 'private':
      return 'Private - See nothing';
    case 'busy_only':
      return 'Busy Only - See free/busy blocks only';
    case 'details':
      return 'Details - See all event details';
    default:
      return 'Unknown connection tier';
  }
}
