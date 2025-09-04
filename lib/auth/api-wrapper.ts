/**
 * Enhanced API Route Wrapper with Authentication Context Integrity
 * 
 * This module provides a wrapper for API routes that ensures consistent
 * authentication context and handles session dissociation gracefully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthentication, SessionValidationResult } from './session-manager';
import { User } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends NextRequest {
  user: User;
  sessionValidation: SessionValidationResult;
}

export interface APIRouteHandler {
  (request: AuthenticatedRequest): Promise<NextResponse>;
}

export interface APIRouteOptions {
  requireAuth?: boolean;
  allowUnverified?: boolean;
  rateLimitKey?: string;
  csrfProtection?: boolean;
}

/**
 * Wrap API route with enhanced authentication and error handling
 */
export function withAuth(
  handler: APIRouteHandler,
  options: APIRouteOptions = {}
) {
  return async function wrappedHandler(request: NextRequest): Promise<NextResponse> {
    const requestId = Math.random().toString(36).substring(2, 15);
    const startTime = Date.now();
    const { pathname } = request.nextUrl;
    
    console.log(`[${requestId}] API Request: ${request.method} ${pathname}`);
    
    try {
      // Default options
      const {
        requireAuth = true,
        allowUnverified = false,
        rateLimitKey,
        csrfProtection = false
      } = options;
      
      // Skip auth for non-protected routes
      if (!requireAuth) {
        const authenticatedRequest = request as AuthenticatedRequest;
        return await handler(authenticatedRequest);
      }
      
      // Validate authentication with session recovery
      const validation = await requireAuthentication(request);
      
      if (!validation.valid || !validation.user) {
        console.warn(`[${requestId}] Authentication failed for ${pathname}:`, validation.error);
        
        return NextResponse.json({
          error: 'Authentication required',
          details: validation.error,
          contextIntegrity: validation.contextIntegrity,
          timestamp: new Date().toISOString()
        }, { 
          status: 401,
          headers: {
            'X-Auth-Context': validation.contextIntegrity,
            'X-Request-ID': requestId
          }
        });
      }
      
      // Check email verification if required
      if (!allowUnverified && !validation.user.email_confirmed_at) {
        console.warn(`[${requestId}] Unverified user attempted access to ${pathname}`);
        
        return NextResponse.json({
          error: 'Email verification required',
          details: 'Please verify your email address before accessing this resource',
          userEmail: validation.user.email,
          timestamp: new Date().toISOString()
        }, { 
          status: 403,
          headers: {
            'X-Auth-Context': 'unverified',
            'X-Request-ID': requestId
          }
        });
      }
      
      // Add authentication context to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = validation.user;
      authenticatedRequest.sessionValidation = validation;
      
      // Log successful authentication context
      console.log(`[${requestId}] Authentication context established`, {
        userId: validation.user.id,
        email: validation.user.email,
        emailVerified: !!validation.user.email_confirmed_at,
        contextIntegrity: validation.contextIntegrity,
        sessionRefreshed: validation.refreshed
      });
      
      // Execute the actual handler
      const response = await handler(authenticatedRequest);
      
      // Add authentication context headers to response
      response.headers.set('X-Auth-Context', validation.contextIntegrity);
      response.headers.set('X-Request-ID', requestId);
      response.headers.set('X-User-ID', validation.user.id);
      
      if (validation.refreshed) {
        response.headers.set('X-Session-Refreshed', 'true');
      }
      
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] API Request completed in ${duration}ms`);
      
      return response;
      
    } catch (error) {
      console.error(`[${requestId}] API Route error:`, error);
      
      return NextResponse.json({
        error: 'Internal server error',
        details: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: {
          'X-Request-ID': requestId
        }
      });
    }
  };
}

/**
 * Enhanced error response with authentication context
 */
export function createAuthErrorResponse(
  error: string,
  details?: string,
  status: number = 401,
  contextIntegrity: string = 'failed'
): NextResponse {
  return NextResponse.json({
    error,
    details,
    contextIntegrity,
    timestamp: new Date().toISOString()
  }, {
    status,
    headers: {
      'X-Auth-Context': contextIntegrity,
      'X-Request-ID': Math.random().toString(36).substring(2, 15)
    }
  });
}

/**
 * Middleware for consistent authentication context in API routes
 */
export async function ensureAuthContext(request: NextRequest): Promise<{
  user: User | null;
  error?: string;
  contextIntegrity: string;
}> {
  try {
    const validation = await requireAuthentication(request);
    
    return {
      user: validation.user,
      error: validation.error,
      contextIntegrity: validation.contextIntegrity
    };
  } catch (error) {
    console.error('Auth context error:', error);
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      contextIntegrity: 'failed'
    };
  }
}

/**
 * Helper to check if user has permission for resource
 */
export async function checkResourcePermission(
  user: User,
  resourceUserId: string,
  resourceType: string = 'resource'
): Promise<boolean> {
  // Basic ownership check
  if (user.id === resourceUserId) {
    return true;
  }
  
  // For now, implement strict ownership model
  // Future enhancements can add:
  // - Role-based access control through user roles table
  // - Shared resource permissions through sharing tables
  // - Group-based permissions through group membership
  
  console.warn(`Permission denied: User ${user.id} attempted to access ${resourceType} owned by ${resourceUserId}`);
  return false;
}

/**
 * Create permission error response
 */
export function createPermissionErrorResponse(
  resourceType: string = 'resource'
): NextResponse {
  return NextResponse.json({
    error: 'Permission denied',
    details: `You don't have permission to access this ${resourceType}`,
    timestamp: new Date().toISOString()
  }, { 
    status: 403,
    headers: {
      'X-Request-ID': Math.random().toString(36).substring(2, 15)
    }
  });
}