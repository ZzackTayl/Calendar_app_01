/**
 * Cross-User Isolation Middleware
 *
 * Comprehensive middleware to prevent cross-user data access vulnerabilities.
 * This module provides standardized validation patterns for all API routes.
 *
 * CRITICAL SECURITY FUNCTIONS:
 * 1. Enforces consistent authentication patterns across all routes
 * 2. Validates user context for all database operations
 * 3. Prevents privilege escalation in group and relationship operations
 * 4. Provides secure query builders with automatic user filtering
 * 5. Implements audit logging for security monitoring
 */

import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { requireAuthentication } from '@/lib/auth/session-manager';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { createUserIsolationService, createUserContext, UserContext } from '@/lib/security/user-isolation';
import { createApiResponse } from '@/lib/api/response-handler';

export interface IsolationValidationResult {
  success: boolean;
  userContext?: UserContext;
  supabase?: any;
  isolationService?: any;
  error?: string;
  statusCode?: number;
}

export interface RouteSecurityConfig {
  requiresAuth: boolean;
  requiresCSRF: boolean;
  requiredPermissions: string[];
  allowedMethods: string[];
  rateLimitKey?: string;
}

/**
 * Validates user authentication and creates secure context for API operations
 *
 * @param request - The incoming request
 * @param config - Security configuration for the route
 * @returns Validation result with user context and secure services
 */
export async function validateUserIsolation(
  request: NextRequest,
  config: RouteSecurityConfig = {
    requiresAuth: true,
    requiresCSRF: true,
    requiredPermissions: ['read'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
  }
): Promise<IsolationValidationResult> {
  try {
    // Validate HTTP method
    if (!config.allowedMethods.includes(request.method)) {
      return {
        success: false,
        error: 'Method not allowed',
        statusCode: 405
      };
    }

    // Skip auth validation for routes that don't require it
    if (!config.requiresAuth) {
      return {
        success: true,
        supabase: await createRouteHandlerClient()
      };
    }

    // Enhanced authentication with session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return {
        success: false,
        error: `Authentication required: ${authValidation.error}`,
        statusCode: 401
      };
    }

    // CSRF validation for state-changing operations
    if (config.requiresCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfValidation = await validateCSRFProtection(request);
      if (!csrfValidation.valid) {
        return {
          success: false,
          error: 'CSRF validation failed',
          statusCode: 403
        };
      }
    }

    const user = authValidation.user;
    const supabase = await createRouteHandlerClient();

    // Create secure user context
    const userContext = createUserContext(
      user.id,
      config.requiredPermissions,
      authValidation.session?.access_token?.substring(0, 16)
    );

    // Create isolation service for secure operations
    const isolationService = createUserIsolationService(supabase);

    return {
      success: true,
      userContext,
      supabase,
      isolationService
    };

  } catch (error) {
    console.error('Error in user isolation validation:', error);
    return {
      success: false,
      error: 'Internal security validation error',
      statusCode: 500
    };
  }
}

/**
 * Validates resource ownership using the isolation service
 *
 * @param isolationService - The isolation service instance
 * @param userContext - User context
 * @param resourceType - Type of resource being accessed
 * @param resourceId - ID of the resource
 * @param permission - Required permission level
 * @returns Ownership validation result
 */
export async function validateResourceOwnership(
  isolationService: any,
  userContext: UserContext,
  resourceType: 'event' | 'relationship' | 'user' | 'group',
  resourceId: string,
  permission: 'read' | 'write' | 'delete' = 'read'
) {
  // Validate UUID format for resource ID
  if (!/^[0-9a-fA-F-]{36}$/.test(resourceId)) {
    return {
      allowed: false,
      reason: 'Invalid resource ID format',
      statusCode: 400
    };
  }

  return await isolationService.validateOwnership(
    userContext,
    resourceType,
    resourceId,
    permission
  );
}

/**
 * Validates group membership and permissions with security checks
 *
 * @param isolationService - The isolation service instance
 * @param userContext - User context
 * @param groupId - Group ID to validate
 * @param requiredRole - Required role or permission
 * @returns Group permission validation result
 */
export async function validateGroupPermission(
  isolationService: any,
  userContext: UserContext,
  groupId: string,
  requiredRole: 'member' | 'admin' | 'creator' | 'can_invite' | 'can_remove' = 'member'
): Promise<{
  allowed: boolean;
  userRole?: string;
  permissions?: any;
  reason?: string;
  statusCode?: number;
}> {
  try {
    // First validate group access
    const groupAccess = await isolationService.validateOwnership(
      userContext,
      'group',
      groupId,
      'read'
    );

    if (!groupAccess.allowed) {
      return {
        allowed: false,
        reason: 'No access to this group',
        statusCode: 403
      };
    }

    // Get user's group membership with secure query
    const secureQuery = isolationService.createSecureQuery(userContext, 'relationship_group_members');
    const { data: membership, error } = await secureQuery
      .select('role, can_invite_members, can_remove_members, can_modify_group')
      .eq('group_id', groupId)
      .is('left_at', null)
      .single();

    if (error || !membership) {
      return {
        allowed: false,
        reason: 'Not a member of this group',
        statusCode: 403
      };
    }

    // Check specific role requirements
    switch (requiredRole) {
      case 'creator':
        if (membership.role !== 'creator') {
          return {
            allowed: false,
            reason: 'Creator role required',
            statusCode: 403
          };
        }
        break;

      case 'admin':
        if (!['creator', 'admin'].includes(membership.role)) {
          return {
            allowed: false,
            reason: 'Admin role required',
            statusCode: 403
          };
        }
        break;

      case 'can_invite':
        if (!membership.can_invite_members && membership.role !== 'creator') {
          return {
            allowed: false,
            reason: 'Invitation permission required',
            statusCode: 403
          };
        }
        break;

      case 'can_remove':
        if (!membership.can_remove_members && membership.role !== 'creator') {
          return {
            allowed: false,
            reason: 'Member removal permission required',
            statusCode: 403
          };
        }
        break;

      case 'member':
        // Already validated by membership check above
        break;

      default:
        return {
          allowed: false,
          reason: 'Unknown permission requirement',
          statusCode: 400
        };
    }

    return {
      allowed: true,
      userRole: membership.role,
      permissions: {
        can_invite_members: membership.can_invite_members,
        can_remove_members: membership.can_remove_members,
        can_modify_group: membership.can_modify_group
      }
    };

  } catch (error) {
    console.error('Error validating group permission:', error);
    return {
      allowed: false,
      reason: 'Error validating group permissions',
      statusCode: 500
    };
  }
}

/**
 * Prevents privilege escalation in group operations
 *
 * @param currentUserRole - Role of the user performing the action
 * @param currentUserPermissions - Permissions of the current user
 * @param targetUserRole - Role of the user being affected
 * @param operation - Type of operation being performed
 * @returns Whether the operation is allowed
 */
export function preventPrivilegeEscalation(
  currentUserRole: string,
  currentUserPermissions: any,
  targetUserRole: string,
  operation: 'remove' | 'promote' | 'demote' | 'modify'
): {
  allowed: boolean;
  reason?: string;
} {
  // Creators cannot be removed by anyone else
  if (operation === 'remove' && targetUserRole === 'creator') {
    return {
      allowed: false,
      reason: 'Group creators cannot be removed'
    };
  }

  // Only creators can remove administrators
  if (operation === 'remove' && targetUserRole === 'admin' && currentUserRole !== 'creator') {
    return {
      allowed: false,
      reason: 'Only group creators can remove administrators'
    };
  }

  // Only creators can promote users to admin
  if (operation === 'promote' && currentUserRole !== 'creator') {
    return {
      allowed: false,
      reason: 'Only group creators can promote users to administrator'
    };
  }

  // Users without remove permissions cannot remove anyone (except themselves)
  if (operation === 'remove' &&
      currentUserRole !== 'creator' &&
      !currentUserPermissions?.can_remove_members) {
    return {
      allowed: false,
      reason: 'You do not have permission to remove members'
    };
  }

  return { allowed: true };
}

/**
 * Sanitizes and validates UUID parameters to prevent injection attacks
 *
 * @param params - Object containing UUID parameters
 * @returns Validation result with sanitized UUIDs
 */
export function validateUuidParams(params: Record<string, any>): {
  valid: boolean;
  sanitized?: Record<string, string>;
  error?: string;
} {
  const uuidRegex = /^[0-9a-fA-F-]{36}$/;
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: `Parameter ${key} must be a string`
      };
    }

    if (!uuidRegex.test(value)) {
      return {
        valid: false,
        error: `Parameter ${key} is not a valid UUID`
      };
    }

    sanitized[key] = value;
  }

  return {
    valid: true,
    sanitized
  };
}

/**
 * Creates a standardized error response for isolation violations
 *
 * @param error - The error message
 * @param statusCode - HTTP status code
 * @returns Standardized API error response
 */
export function createIsolationErrorResponse(error: string, statusCode: number = 403) {
  const api = createApiResponse();
  return api.success({
    success: false,
    error,
    security_event: true,
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}