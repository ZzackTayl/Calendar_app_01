/**
 * Comprehensive User Isolation and Data Boundary Enforcement
 * 
 * This module implements bulletproof cross-user isolation for the PolyHarmony Calendar system.
 * It provides multiple layers of security to ensure users can never access other users' data.
 * 
 * Security Layers:
 * 1. User Context Validation - Validates user ownership on all operations
 * 2. Database Query Filtering - Ensures all queries filter by user ownership
 * 3. Privacy Boundary Enforcement - Applies privacy rules at multiple levels
 * 4. Audit Logging - Tracks all access attempts for security monitoring
 * 
 * CRITICAL: This module is essential for production readiness and data privacy compliance.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { User, Event, Relationship, PrivacyLevel } from '@/lib/supabase/types';

export interface UserContext {
  userId: string;
  permissions: string[];
  encryptionDomain: string;
  sessionId?: string;
}

export interface OwnershipValidationResult {
  allowed: boolean;
  reason: string;
  auditData?: {
    action: string;
    resourceType: string;
    resourceId: string;
    success: boolean;
    timestamp: string;
  };
}

export interface PrivacyBoundaryResult {
  originalData: any;
  filteredData: any;
  privacyApplied: boolean;
  privacyLevel: PrivacyLevel;
  viewerPermissions: string[];
}

/**
 * Core User Isolation Service
 * 
 * Provides comprehensive ownership validation and cross-user data isolation.
 * All data access must go through this service to ensure security.
 */
export class UserIsolationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Validates that a user owns a specific resource
   * 
   * @param userContext - The requesting user's context
   * @param resourceType - Type of resource being accessed
   * @param resourceId - ID of the resource
   * @param requiredPermission - Required permission level
   * @returns Validation result with audit data
   */
  async validateOwnership(
    userContext: UserContext,
    resourceType: 'event' | 'relationship' | 'user' | 'group',
    resourceId: string,
    requiredPermission: 'read' | 'write' | 'delete' = 'read'
  ): Promise<OwnershipValidationResult> {
    const startTime = Date.now();
    
    try {
      // Log access attempt for security monitoring
      await this.logAccessAttempt(userContext, resourceType, resourceId, requiredPermission);
      
      const isOwner = await this.checkResourceOwnership(userContext.userId, resourceType, resourceId);
      
      if (!isOwner) {
        // Log potential security violation
        await this.logSecurityViolation(userContext, resourceType, resourceId, 'ownership_violation');
        
        return {
          allowed: false,
          reason: `User ${userContext.userId} does not own ${resourceType} ${resourceId}`,
          auditData: {
            action: `validate_ownership_${requiredPermission}`,
            resourceType,
            resourceId,
            success: false,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Additional permission checks
      const hasPermission = await this.checkUserPermission(userContext, requiredPermission);
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `User ${userContext.userId} lacks ${requiredPermission} permission`,
          auditData: {
            action: `validate_ownership_${requiredPermission}`,
            resourceType,
            resourceId,
            success: false,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        allowed: true,
        reason: 'Valid ownership and permissions',
        auditData: {
          action: `validate_ownership_${requiredPermission}`,
          resourceType,
          resourceId,
          success: true,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      // Log system error
      await this.logSystemError(userContext, resourceType, resourceId, error);
      
      // Fail secure - deny access on error
      return {
        allowed: false,
        reason: 'System error during ownership validation - access denied for security',
        auditData: {
          action: `validate_ownership_${requiredPermission}`,
          resourceType,
          resourceId,
          success: false,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Checks if a user owns a specific resource
   * 
   * @param userId - User ID to check
   * @param resourceType - Type of resource
   * @param resourceId - Resource ID
   * @returns True if user owns the resource
   */
  private async checkResourceOwnership(
    userId: string,
    resourceType: 'event' | 'relationship' | 'user' | 'group',
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case 'event':
        const { data: event } = await this.supabase
          .from('events')
          .select('user_id')
          .eq('id', resourceId)
          .eq('user_id', userId) // CRITICAL: Always filter by user_id
          .single();
        return !!event;

      case 'relationship':
        const { data: relationship } = await this.supabase
          .from('relationships')
          .select('user_id')
          .eq('id', resourceId)
          .eq('user_id', userId) // CRITICAL: Always filter by user_id
          .single();
        return !!relationship;

      case 'user':
        // User can only access their own user record
        return userId === resourceId;

      case 'group':
        const { data: groupMembership } = await this.supabase
          .from('relationship_group_members')
          .select('id')
          .eq('group_id', resourceId)
          .eq('user_id', userId) // CRITICAL: Always filter by user_id
          .is('left_at', null)
          .single();
        return !!groupMembership;

      default:
        // Unknown resource type - deny access
        return false;
    }
  }

  /**
   * Creates a secure database query builder that automatically filters by user ownership
   * 
   * @param userContext - User context for the query
   * @param table - Table name
   * @returns Secure query builder with user filtering applied
   */
  createSecureQuery(userContext: UserContext, table: string) {
    const baseQuery = this.supabase.from(table).select('*');
    
    // Apply user ownership filter based on table type
    switch (table) {
      case 'events':
      case 'relationships':
      case 'relationship_groups':
        return baseQuery.eq('user_id', userContext.userId);
      
      case 'users':
        return baseQuery.eq('id', userContext.userId);
      
      case 'relationship_group_members':
        return baseQuery.eq('user_id', userContext.userId);
      
      default:
        // For unknown tables, require explicit ownership filtering
        throw new Error(`Secure query not supported for table: ${table}. Implement explicit filtering.`);
    }
  }

  /**
   * Filters events based on user permissions and privacy boundaries
   * 
   * @param events - Events to filter
   * @param viewerContext - Context of the user viewing the events
   * @param ownerUserId - ID of the event owner (if different from viewer)
   * @returns Filtered events with privacy applied
   */
  async filterEventsByPrivacyBoundaries(
    events: Event[],
    viewerContext: UserContext,
    ownerUserId?: string
  ): Promise<PrivacyBoundaryResult[]> {
    const results: PrivacyBoundaryResult[] = [];
    
    for (const event of events) {
      const isOwner = event.user_id === viewerContext.userId;
      
      if (isOwner) {
        // Owners can see their own events without filtering
        results.push({
          originalData: event,
          filteredData: event,
          privacyApplied: false,
          privacyLevel: event.privacy_level,
          viewerPermissions: ['owner', 'full_access']
        });
        continue;
      }

      // Check if viewer can see this event
      const canView = await this.checkEventViewPermission(viewerContext.userId, event);
      
      if (!canView.allowed) {
        // Event should be completely hidden
        continue;
      }

      // Apply privacy filtering based on privacy level and relationship
      const filteredEvent = await this.applyEventPrivacyFiltering(event, viewerContext, canView.level);
      
      results.push({
        originalData: event,
        filteredData: filteredEvent,
        privacyApplied: filteredEvent.title !== event.title || filteredEvent.description !== event.description,
        privacyLevel: event.privacy_level,
        viewerPermissions: canView.permissions || []
      });
    }

    return results;
  }

  /**
   * Checks if a user can view a specific event
   * 
   * @param viewerId - ID of the viewer
   * @param event - Event to check
   * @returns Permission result with access level
   */
  private async checkEventViewPermission(viewerId: string, event: Event): Promise<{
    allowed: boolean;
    level: 'none' | 'busy_only' | 'details' | 'full';
    permissions?: string[];
  }> {
    // Private events are only visible to owner
    if (event.privacy_level === 'private') {
      return { allowed: false, level: 'none' };
    }

    // Public events are visible to everyone with connection
    if (event.privacy_level === 'public') {
      const hasConnection = await this.checkUserConnection(viewerId, event.user_id);
      return {
        allowed: hasConnection,
        level: hasConnection ? 'details' : 'none',
        permissions: hasConnection ? ['view_details'] : []
      };
    }

    // Check relationship-based permissions
    const { data: relationship } = await this.supabase
      .from('relationships')
      .select('connection_tier, privacy_level, status')
      .or(`and(user_id.eq.${viewerId},partner_id.eq.${event.user_id}),and(user_id.eq.${event.user_id},partner_id.eq.${viewerId})`)
      .eq('status', 'active')
      .single();

    if (!relationship) {
      return { allowed: false, level: 'none' };
    }

    // Apply connection tier restrictions
    switch (relationship.connection_tier) {
      case 'private':
        return { allowed: false, level: 'none' };
      case 'busy_only':
        return { allowed: true, level: 'busy_only', permissions: ['view_time'] };
      case 'details':
        return { allowed: true, level: 'details', permissions: ['view_time', 'view_details'] };
      default:
        return { allowed: false, level: 'none' };
    }
  }

  /**
   * Applies privacy filtering to an event based on viewer permissions
   * 
   * @param event - Original event
   * @param viewerContext - Viewer's context
   * @param accessLevel - Level of access granted
   * @returns Filtered event
   */
  private async applyEventPrivacyFiltering(
    event: Event,
    viewerContext: UserContext,
    accessLevel: 'none' | 'busy_only' | 'details' | 'full'
  ): Promise<Event> {
    switch (accessLevel) {
      case 'none':
        // This shouldn't happen as non-viewable events are filtered out
        throw new Error('Cannot apply privacy filtering to non-viewable event');

      case 'busy_only':
        return {
          ...event,
          title: 'Busy',
          description: undefined,
          location: undefined,
          // Keep timing and privacy level for scheduling purposes
          start_time: event.start_time,
          end_time: event.end_time,
          privacy_level: event.privacy_level
        };

      case 'details':
      case 'full':
        // Return full event details
        return event;

      default:
        // Fail secure
        return {
          ...event,
          title: 'Busy',
          description: undefined,
          location: undefined
        };
    }
  }

  /**
   * Checks if two users have any connection
   * 
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns True if users are connected
   */
  private async checkUserConnection(userId1: string, userId2: string): Promise<boolean> {
    const { data: connection } = await this.supabase
      .from('relationships')
      .select('id')
      .or(`and(user_id.eq.${userId1},partner_id.eq.${userId2}),and(user_id.eq.${userId2},partner_id.eq.${userId1})`)
      .eq('status', 'active')
      .limit(1)
      .single();

    return !!connection;
  }

  /**
   * Checks if user has a specific permission
   * 
   * @param userContext - User context
   * @param permission - Permission to check
   * @returns True if user has permission
   */
  private async checkUserPermission(
    userContext: UserContext,
    permission: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    // All authenticated users have read permission
    if (permission === 'read') return true;
    
    // Users can write/delete their own data
    return userContext.permissions.includes(permission) || userContext.permissions.includes('full_access');
  }

  /**
   * Logs access attempts for security monitoring
   * 
   * @param userContext - User context
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param action - Action attempted
   */
  private async logAccessAttempt(
    userContext: UserContext,
    resourceType: string,
    resourceId: string,
    action: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('audit_logs')
        .insert({
          user_id: userContext.userId,
          action: `access_${action}`,
          resource_type: resourceType,
          resource_id: resourceId,
          success: null, // Will be updated after validation
          metadata: {
            session_id: userContext.sessionId,
            encryption_domain: userContext.encryptionDomain,
            permissions: userContext.permissions
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log access attempt:', error);
    }
  }

  /**
   * Logs security violations for monitoring
   * 
   * @param userContext - User context
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param violationType - Type of violation
   */
  private async logSecurityViolation(
    userContext: UserContext,
    resourceType: string,
    resourceId: string,
    violationType: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('security_violations')
        .insert({
          user_id: userContext.userId,
          violation_type: violationType,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: {
            session_id: userContext.sessionId,
            user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Logs system errors during security operations
   * 
   * @param userContext - User context
   * @param resourceType - Resource type
   * @param resourceId - Resource ID
   * @param error - Error that occurred
   */
  private async logSystemError(
    userContext: UserContext,
    resourceType: string,
    resourceId: string,
    error: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('system_errors')
        .insert({
          user_id: userContext.userId,
          error_type: 'security_operation_error',
          resource_type: resourceType,
          resource_id: resourceId,
          error_message: error instanceof Error ? error.message : String(error),
          metadata: {
            stack_trace: error instanceof Error ? error.stack : null,
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log system error:', logError);
    }
  }
}

/**
 * Factory function to create user isolation service
 */
export function createUserIsolationService(supabase: SupabaseClient): UserIsolationService {
  return new UserIsolationService(supabase);
}

/**
 * Helper function to create user context from session
 */
export function createUserContext(
  userId: string,
  permissions: string[] = ['read'],
  sessionId?: string
): UserContext {
  return {
    userId,
    permissions,
    encryptionDomain: `user_${userId}`, // Isolated encryption domain per user
    sessionId
  };
}