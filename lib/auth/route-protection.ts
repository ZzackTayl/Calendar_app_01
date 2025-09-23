/**
 * Centralized Route Protection Service
 * Provides comprehensive route classification and access validation
 */

import { User } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export interface RouteClassification {
  type: 'public' | 'auth' | 'protected' | 'admin' | 'api';
  requiresAuth: boolean;
  requiresEmailVerification: boolean;
  allowsUnverified: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface AccessValidationResult {
  allowed: boolean;
  action: 'allow' | 'redirect_signin' | 'redirect_verify' | 'redirect_onboarding' | 'block';
  redirectPath?: string;
  reason: string;
  securityAlerts: string[];
  metadata: {
    route: string;
    classification: RouteClassification;
    userState: 'anonymous' | 'authenticated' | 'unverified' | 'verified';
    timestamp: number;
    validationId: string;
  };
}

export interface SecurityPolicy {
  enforceEmailVerification: boolean;
  allowDemoMode: boolean;
  requireMFA: boolean;
  blockSuspiciousActivity: boolean;
  logAllAccess: boolean;
}

// Route classification patterns
const ROUTE_PATTERNS: Array<{ pattern: RegExp; classification: RouteClassification }> = [
  // Public routes - no authentication required
  {
    pattern: /^\/$/,
    classification: {
      type: 'public',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'low',
      description: 'Landing page'
    }
  },
  {
    pattern: /^\/privacy$/,
    classification: {
      type: 'public',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'low',
      description: 'Privacy policy'
    }
  },
  {
    pattern: /^\/terms$/,
    classification: {
      type: 'public',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'low',
      description: 'Terms of service'
    }
  },
  {
    pattern: /^\/support$/,
    classification: {
      type: 'public',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'low',
      description: 'Support page'
    }
  },

  // Authentication routes - for unauthenticated users
  {
    pattern: /^\/auth\/(signin|signup|forgot-password)$/,
    classification: {
      type: 'auth',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'medium',
      description: 'Authentication pages'
    }
  },
  {
    pattern: /^\/auth\/callback$/,
    classification: {
      type: 'auth',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'high',
      description: 'OAuth callback'
    }
  },

  // Email verification routes - for authenticated but unverified users
  {
    pattern: /^\/auth\/(confirm-email|update-password)$/,
    classification: {
      type: 'auth',
      requiresAuth: true,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'medium',
      description: 'Email verification pages'
    }
  },

  // Onboarding - for verified users who haven't completed setup
  {
    pattern: /^\/onboarding$/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'medium',
      description: 'User onboarding'
    }
  },

  // Protected application routes - require full authentication
  {
    pattern: /^\/dashboard$/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Main dashboard'
    }
  },
  {
    pattern: /^\/calendar/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Calendar functionality'
    }
  },
  {
    pattern: /^\/events/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Event management'
    }
  },
  {
    pattern: /^\/contacts/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Contact management'
    }
  },
  {
    pattern: /^\/groups/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Group management'
    }
  },
  {
    pattern: /^\/relationships/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Relationship management'
    }
  },
  {
    pattern: /^\/invitations/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Invitation management'
    }
  },
  {
    pattern: /^\/sharing/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'high',
      description: 'Sharing functionality'
    }
  },
  {
    pattern: /^\/settings/,
    classification: {
      type: 'protected',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'critical',
      description: 'User settings'
    }
  },

  // API routes - require authentication and have specific security requirements
  {
    pattern: /^\/api\/auth\/(signin|signup|signout|callback)$/,
    classification: {
      type: 'api',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'high',
      description: 'Authentication API'
    }
  },
  {
    pattern: /^\/api\/health$/,
    classification: {
      type: 'api',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'low',
      description: 'Health check API'
    }
  },
  {
    pattern: /^\/api\//,
    classification: {
      type: 'api',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'critical',
      description: 'Protected API endpoints'
    }
  },

  // Debug routes - special handling for development
  {
    pattern: /^\/debug/,
    classification: {
      type: 'admin',
      requiresAuth: true,
      requiresEmailVerification: true,
      allowsUnverified: false,
      securityLevel: 'critical',
      description: 'Debug functionality'
    }
  },

  // Test routes - development only
  {
    pattern: /^\/test-/,
    classification: {
      type: 'admin',
      requiresAuth: false,
      requiresEmailVerification: false,
      allowsUnverified: true,
      securityLevel: 'medium',
      description: 'Test functionality'
    }
  }
];

// Default classification for unmatched routes
const DEFAULT_CLASSIFICATION: RouteClassification = {
  type: 'protected',
  requiresAuth: true,
  requiresEmailVerification: true,
  allowsUnverified: false,
  securityLevel: 'high',
  description: 'Default protected route'
};

/**
 * Classify a route based on its path
 */
export function classifyRoute(path: string): RouteClassification {
  // Normalize path
  const normalizedPath = path.split('?')[0].split('#')[0];
  
  // Find matching pattern
  for (const { pattern, classification } of ROUTE_PATTERNS) {
    if (pattern.test(normalizedPath)) {
      return classification;
    }
  }
  
  // Return default classification for unmatched routes
  return DEFAULT_CLASSIFICATION;
}

/**
 * Validate access to a route based on user state and security policy
 */
export function validateRouteAccess(
  path: string,
  user: User | null,
  policy: Partial<SecurityPolicy> = {},
  request?: NextRequest
): AccessValidationResult {
  const validationId = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();
  const classification = classifyRoute(path);
  const securityAlerts: string[] = [];
  
  // Determine user state
  const userState = getUserState(user, policy);
  
  console.log(`[${validationId}] Validating route access`, {
    path,
    userState,
    classification: classification.type,
    requiresAuth: classification.requiresAuth
  });
  
  // Check if route requires authentication
  if (classification.requiresAuth && !user) {
    return createAccessResult({
      allowed: false,
      action: 'redirect_signin',
      redirectPath: '/auth/signin',
      reason: 'Authentication required',
      securityAlerts: ['unauthenticated_access_attempt'],
      route: path,
      classification,
      userState,
      timestamp,
      validationId
    });
  }
  
  // Check email verification requirements
  if (classification.requiresEmailVerification && user && !user.email_confirmed_at) {
    if (!classification.allowsUnverified) {
      return createAccessResult({
        allowed: false,
        action: 'redirect_verify',
        redirectPath: '/auth/confirm-email',
        reason: 'Email verification required',
        securityAlerts: ['unverified_access_attempt'],
        route: path,
        classification,
        userState,
        timestamp,
        validationId
      });
    } else {
      securityAlerts.push('unverified_user_allowed');
    }
  }
  
  // Check for demo mode restrictions
  if (policy.allowDemoMode === false && isDemoUser(user)) {
    securityAlerts.push('demo_user_access');
  }
  
  // Check for suspicious activity
  if (policy.blockSuspiciousActivity && request) {
    const suspiciousAlerts = detectSuspiciousActivity(request, user);
    securityAlerts.push(...suspiciousAlerts);
    
    if (suspiciousAlerts.length > 0 && classification.securityLevel === 'critical') {
      return createAccessResult({
        allowed: false,
        action: 'block',
        reason: 'Suspicious activity detected',
        securityAlerts,
        route: path,
        classification,
        userState,
        timestamp,
        validationId
      });
    }
  }
  
  // Check if user needs onboarding
  if (user && classification.type === 'protected' && needsOnboarding(user)) {
    return createAccessResult({
      allowed: false,
      action: 'redirect_onboarding',
      redirectPath: '/onboarding',
      reason: 'Onboarding required',
      securityAlerts: ['onboarding_required'],
      route: path,
      classification,
      userState,
      timestamp,
      validationId
    });
  }
  
  // Special handling for authentication routes when user is already authenticated
  if (classification.type === 'auth' && user && user.email_confirmed_at) {
    // Redirect authenticated users away from auth pages
    if (path.includes('/signin') || path.includes('/signup')) {
      return createAccessResult({
        allowed: false,
        action: 'redirect_signin',
        redirectPath: '/dashboard',
        reason: 'Already authenticated',
        securityAlerts: ['authenticated_user_on_auth_page'],
        route: path,
        classification,
        userState,
        timestamp,
        validationId
      });
    }
  }
  
  // Log access for audit if required
  if (policy.logAllAccess) {
    console.log(`[${validationId}] AUDIT: Route access`, {
      path,
      userId: user?.id,
      userEmail: user?.email,
      userState,
      classification: classification.type,
      securityLevel: classification.securityLevel,
      allowed: true,
      securityAlerts: securityAlerts.length,
      timestamp: new Date().toISOString()
    });
  }
  
  // Access allowed
  return createAccessResult({
    allowed: true,
    action: 'allow',
    reason: 'Access granted',
    securityAlerts,
    route: path,
    classification,
    userState,
    timestamp,
    validationId
  });
}

/**
 * Determine user state based on authentication and verification status
 */
function getUserState(user: User | null, policy: Partial<SecurityPolicy>): 'anonymous' | 'authenticated' | 'unverified' | 'verified' {
  if (!user) {
    return 'anonymous';
  }
  
  if (!user.email_confirmed_at) {
    return 'unverified';
  }
  
  if (policy.requireMFA && !hasValidMFA(user)) {
    return 'authenticated'; // Authenticated but not fully verified
  }
  
  return 'verified';
}

/**
 * Check if user is a demo user
 */
function isDemoUser(user: User | null): boolean {
  if (!user) return false;
  
  // Check for demo user indicators
  return user.email?.includes('demo') || 
         user.email?.includes('test') ||
         user.user_metadata?.demo_mode === true;
}

/**
 * Check if user needs onboarding
 */
function needsOnboarding(user: User): boolean {
  // Check if user has completed onboarding
  return !user.user_metadata?.onboarding_completed;
}

/**
 * Check if user has valid MFA
 */
function hasValidMFA(user: User): boolean {
  // Placeholder for MFA validation
  // This would check for valid MFA factors
  return user.user_metadata?.mfa_enabled === true;
}

/**
 * Detect suspicious activity patterns
 */
function detectSuspiciousActivity(request: NextRequest, user: User | null): string[] {
  const alerts: string[] = [];
  
  // Check user agent
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.toLowerCase().includes('bot') || userAgent.toLowerCase().includes('crawler')) {
    alerts.push('suspicious_user_agent');
  }
  
  // Check for rapid requests (basic rate limiting check)
  const now = Date.now();
  const requestKey = `${'unknown'}_${user?.id || 'anonymous'}`;
  
  // This would be enhanced with proper rate limiting storage
  // For now, just check for obvious bot patterns
  if (userAgent.length < 10 || !userAgent.includes('Mozilla')) {
    alerts.push('minimal_user_agent');
  }
  
  return alerts;
}

/**
 * Create standardized access result
 */
function createAccessResult(params: {
  allowed: boolean;
  action: 'allow' | 'redirect_signin' | 'redirect_verify' | 'redirect_onboarding' | 'block';
  redirectPath?: string;
  reason: string;
  securityAlerts: string[];
  route: string;
  classification: RouteClassification;
  userState: 'anonymous' | 'authenticated' | 'unverified' | 'verified';
  timestamp: number;
  validationId: string;
}): AccessValidationResult {
  return {
    allowed: params.allowed,
    action: params.action,
    redirectPath: params.redirectPath,
    reason: params.reason,
    securityAlerts: params.securityAlerts,
    metadata: {
      route: params.route,
      classification: params.classification,
      userState: params.userState,
      timestamp: params.timestamp,
      validationId: params.validationId
    }
  };
}

/**
 * Get security policy for environment
 */
export function getSecurityPolicy(environment: 'development' | 'staging' | 'production' = 'production'): SecurityPolicy {
  const basePolicy: SecurityPolicy = {
    enforceEmailVerification: true,
    allowDemoMode: false,
    requireMFA: false,
    blockSuspiciousActivity: true,
    logAllAccess: true
  };
  
  switch (environment) {
    case 'development':
      return {
        ...basePolicy,
        allowDemoMode: true,
        blockSuspiciousActivity: false,
        logAllAccess: false
      };
    
    case 'staging':
      return {
        ...basePolicy,
        allowDemoMode: true,
        requireMFA: false
      };
    
    case 'production':
    default:
      return basePolicy;
  }
}

/**
 * Check if route is protected
 */
export function isRouteProtected(path: string): boolean {
  const classification = classifyRoute(path);
  return classification.requiresAuth;
}

/**
 * Get route security level
 */
export function getRouteSecurityLevel(path: string): 'low' | 'medium' | 'high' | 'critical' {
  const classification = classifyRoute(path);
  return classification.securityLevel;
}

/**
 * Log security event for route access
 */
export function logRouteSecurityEvent(
  event: 'access_granted' | 'access_denied' | 'suspicious_activity' | 'security_violation',
  path: string,
  user: User | null,
  details: Record<string, any> = {}
): void {
  const timestamp = new Date().toISOString();
  const classification = classifyRoute(path);
  
  console.log(`SECURITY EVENT: ${event}`, {
    timestamp,
    event,
    path,
    userId: user?.id,
    userEmail: user?.email,
    classification: classification.type,
    securityLevel: classification.securityLevel,
    ...details
  });
  
  // In a production system, this would also send to a security monitoring service
}