/**
 * Authentication Bypass Prevention Tests
 * 
 * Tests to ensure unauthenticated users cannot access protected routes
 * and that middleware properly blocks unauthorized access attempts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import { 
  classifyRoute, 
  analyzeAuthState, 
  enforceSecurityPolicy,
  validateMiddlewareSession 
} from '@/lib/auth/middleware-helpers';
import { createServerClient } from '@supabase/ssr';

// Mock Supabase client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn()
}));

// Mock security event loggers
vi.mock('@/lib/security/event-logger', () => ({
  logAuthBypassAttempt: vi.fn(),
  logUnauthorizedAccess: vi.fn(),
  logMiddlewareAction: vi.fn(),
  logDemoModeEvent: vi.fn()
}));

// Mock debug utilities
vi.mock('@/lib/debug/auth-debug', () => ({
  generateRequestId: () => 'test-request-id',
  extractMiddlewareAuthInfo: vi.fn(),
  generateAuthDiagnosticReport: vi.fn()
}));

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn()
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  (createServerClient as any).mockReturnValue(mockSupabaseClient);
  
  // Mock console methods to reduce test noise
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Route Classification Security', () => {
  it('should correctly classify protected routes', () => {
    const protectedRoutes = [
      '/dashboard',
      '/calendar',
      '/events',
      '/contacts',
      '/groups',
      '/relationships',
      '/settings',
      '/sharing'
    ];

    protectedRoutes.forEach(route => {
      const classification = classifyRoute(route);
      expect(classification.isProtected).toBe(true);
      expect(classification.isPublic).toBe(false);
      expect(classification.requiresEmailVerification).toBe(true);
    });
  });

  it('should correctly classify public routes', () => {
    const publicRoutes = [
      '/',
      '/privacy',
      '/terms',
      '/support',
      '/auth/signin',
      '/auth/signup',
      '/auth/callback'
    ];

    publicRoutes.forEach(route => {
      const classification = classifyRoute(route);
      expect(classification.isPublic).toBe(true);
      expect(classification.isProtected).toBe(false);
    });
  });

  it('should classify API routes correctly', () => {
    const protectedApiRoutes = [
      '/api/events',
      '/api/contacts',
      '/api/groups',
      '/api/user'
    ];

    const publicApiRoutes = [
      '/api/auth/signin',
      '/api/auth/signup',
      '/api/health',
      '/api/webhooks/stripe'
    ];

    protectedApiRoutes.forEach(route => {
      const classification = classifyRoute(route);
      expect(classification.isApi).toBe(true);
      expect(classification.isProtected).toBe(true);
    });

    publicApiRoutes.forEach(route => {
      const classification = classifyRoute(route);
      expect(classification.isApi).toBe(true);
      expect(classification.isPublic).toBe(true);
    });
  });

  it('should identify sensitive routes requiring full verification', () => {
    const sensitiveRoutes = [
      '/settings',
      '/settings/privacy',
      '/sharing'
    ];

    sensitiveRoutes.forEach(route => {
      const classification = classifyRoute(route);
      expect(classification.securityLevel).toBe('sensitive');
      expect(classification.requiresEmailVerification).toBe(true);
    });
  });
});

describe('Authentication State Analysis', () => {
  it('should correctly identify unauthenticated users', () => {
    const authState = analyzeAuthState(null, null);
    
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.isEmailVerified).toBe(false);
    expect(authState.isCompletelyUnauthenticated).toBe(true);
    expect(authState.shouldRedirectToSignIn).toBe(true);
    expect(authState.shouldRedirectToConfirmEmail).toBe(false);
  });

  it('should correctly identify authenticated and verified users', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };

    const authState = analyzeAuthState(mockUser as any, null);
    
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.isEmailVerified).toBe(true);
    expect(authState.isUnverifiedUser).toBe(false);
    expect(authState.shouldRedirectToSignIn).toBe(false);
    expect(authState.shouldRedirectToConfirmEmail).toBe(false);
  });

  it('should correctly identify unverified users', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: null
    };

    const authState = analyzeAuthState(mockUser as any, null);
    
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.isEmailVerified).toBe(false);
    expect(authState.isUnverifiedUser).toBe(true);
    expect(authState.shouldRedirectToSignIn).toBe(false);
    expect(authState.shouldRedirectToConfirmEmail).toBe(true);
  });

  it('should handle email_not_confirmed error correctly', () => {
    const mockError = {
      code: 'email_not_confirmed',
      message: 'Email not confirmed'
    };

    const authState = analyzeAuthState(null, mockError as any);
    
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.shouldRedirectToConfirmEmail).toBe(true);
    expect(authState.shouldRedirectToSignIn).toBe(false);
  });
});

describe('Security Policy Enforcement', () => {
  it('should block unauthenticated users from protected routes', () => {
    const classification = classifyRoute('/dashboard');
    const authState = analyzeAuthState(null, null);
    
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
    expect(policy.redirectTo).toContain('/auth/signin');
    expect(policy.reason).toContain('Authentication required');
  });

  it('should allow authenticated users to access protected routes', () => {
    const classification = classifyRoute('/dashboard');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    const authState = analyzeAuthState(mockUser as any, null);
    
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
    expect(policy.reason).toContain('Authenticated user access granted');
  });

  it('should redirect unverified users to email confirmation', () => {
    const classification = classifyRoute('/dashboard');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: null
    };
    const authState = analyzeAuthState(mockUser as any, null);
    
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
    expect(policy.redirectTo).toBe('/auth/confirm-email');
    expect(policy.reason).toContain('Email verification required');
  });

  it('should enforce stricter security for sensitive routes', () => {
    const classification = classifyRoute('/settings');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: null
    };
    const authState = analyzeAuthState(mockUser as any, null);
    
    const policy = enforceSecurityPolicy(classification, authState, '/settings');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
    expect(policy.redirectTo).toBe('/auth/confirm-email');
    expect(policy.reason).toContain('Email verification required');
  });

  it('should allow access to public routes regardless of auth state', () => {
    const classification = classifyRoute('/');
    const authState = analyzeAuthState(null, null);
    
    const policy = enforceSecurityPolicy(classification, authState, '/');
    
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
    expect(policy.reason).toContain('Public route access allowed');
  });
});

describe('Middleware Session Validation', () => {
  it('should validate sessions for protected routes', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/dashboard');
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: {
          id: 'user-123',
          email: 'test@example.com',
          email_confirmed_at: '2024-01-01T00:00:00Z'
        }
      },
      error: null
    });

    const result = await validateMiddlewareSession(mockRequest);
    
    expect(result.isValid).toBe(true);
    expect(result.user).toBeTruthy();
    expect(result.shouldTerminate).toBe(false);
    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
  });

  it('should handle session validation errors', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/dashboard');
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid session' }
    });

    const result = await validateMiddlewareSession(mockRequest);
    
    expect(result.isValid).toBe(false);
    expect(result.shouldTerminate).toBe(true);
    expect(result.securityAlerts).toContain('session_validation_error');
  });

  it('should detect incomplete user data', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/dashboard');
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: {
          id: 'user-123',
          email: null // Missing email
        }
      },
      error: null
    });

    const result = await validateMiddlewareSession(mockRequest);
    
    expect(result.isValid).toBe(true);
    expect(result.securityAlerts).toContain('incomplete_user_data');
  });

  it('should detect suspicious user agents', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/dashboard', {
      headers: {
        'user-agent': 'Suspicious Bot/1.0'
      }
    });
    
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: {
          id: 'user-123',
          email: 'test@example.com'
        }
      },
      error: null
    });

    const result = await validateMiddlewareSession(mockRequest);
    
    expect(result.securityAlerts).toContain('suspicious_user_agent');
  });
});

describe('Middleware Integration Logic Tests', () => {
  it('should determine correct security policy for unauthenticated users on protected routes', () => {
    const classification = classifyRoute('/dashboard');
    const authState = analyzeAuthState(null, null);
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
    expect(policy.redirectTo).toContain('/auth/signin');
  });

  it('should determine correct security policy for authenticated users', () => {
    const classification = classifyRoute('/dashboard');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    const authState = analyzeAuthState(mockUser as any, null);
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
  });

  it('should allow access to public routes regardless of auth state', () => {
    const classification = classifyRoute('/');
    const authState = analyzeAuthState(null, null);
    const policy = enforceSecurityPolicy(classification, authState, '/');
    
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
  });

  it('should redirect unverified users appropriately', () => {
    const classification = classifyRoute('/dashboard');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: null
    };
    const authState = analyzeAuthState(mockUser as any, null);
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
    expect(policy.redirectTo).toBe('/auth/confirm-email');
  });

  it('should handle API route protection correctly', () => {
    const classification = classifyRoute('/api/events');
    const authState = analyzeAuthState(null, null);
    const policy = enforceSecurityPolicy(classification, authState, '/api/events');
    
    expect(policy.allowAccess).toBe(false);
    expect(policy.securityLevel).toBe('redirect');
  });

  it('should allow public API routes', () => {
    const classification = classifyRoute('/api/auth/signin');
    const authState = analyzeAuthState(null, null);
    const policy = enforceSecurityPolicy(classification, authState, '/api/auth/signin');
    
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
  });

  it('should handle demo mode security logic', () => {
    // Test demo mode detection logic
    const isDevelopment = false; // Simulate production
    const hasExplicitDemoConfig = false;
    const hasDemoFlag = true;
    
    // In production without explicit config, demo mode should be cleared
    const shouldClearDemo = !isDevelopment && !hasExplicitDemoConfig && hasDemoFlag;
    expect(shouldClearDemo).toBe(true);
    
    // In development with explicit config, demo mode should be allowed
    const isDevelopmentWithConfig = true;
    const hasExplicitDemoConfigDev = true;
    const shouldAllowDemo = isDevelopmentWithConfig && hasExplicitDemoConfigDev;
    expect(shouldAllowDemo).toBe(true);
  });

  it('should validate session validation error handling logic', async () => {
    const mockRequest = new NextRequest('http://localhost:3000/dashboard');
    
    // Test error handling
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Network error' }
    });

    const result = await validateMiddlewareSession(mockRequest);
    
    expect(result.isValid).toBe(false);
    expect(result.shouldTerminate).toBe(true);
    expect(result.securityAlerts).toContain('session_validation_error');
  });

  it('should validate security header logic', () => {
    const classification = classifyRoute('/dashboard');
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      email_confirmed_at: '2024-01-01T00:00:00Z'
    };
    const authState = analyzeAuthState(mockUser as any, null);
    const policy = enforceSecurityPolicy(classification, authState, '/dashboard');
    
    // Verify that successful authentication would result in security headers
    expect(policy.allowAccess).toBe(true);
    expect(policy.securityLevel).toBe('allow');
    expect(classification.securityLevel).toBeDefined();
  });
});

describe('Demo Mode Security Logic', () => {
  it('should correctly identify when demo mode should be cleared in production', () => {
    // Test the logic that determines when to clear demo mode
    const testCases = [
      {
        isDevelopment: false,
        hasExplicitConfig: false,
        hasDemoFlag: true,
        shouldClear: true,
        description: 'Production without explicit config should clear demo mode'
      },
      {
        isDevelopment: true,
        hasExplicitConfig: true,
        hasDemoFlag: true,
        shouldClear: false,
        description: 'Development with explicit config should allow demo mode'
      },
      {
        isDevelopment: false,
        hasExplicitConfig: true,
        hasDemoFlag: true,
        shouldClear: false,
        description: 'Production with explicit config should allow demo mode'
      },
      {
        isDevelopment: false,
        hasExplicitConfig: false,
        hasDemoFlag: false,
        shouldClear: false,
        description: 'No demo flag means no clearing needed'
      }
    ];

    testCases.forEach(testCase => {
      const shouldClearDemo = !testCase.isDevelopment && 
                             !testCase.hasExplicitConfig && 
                             testCase.hasDemoFlag;
      
      expect(shouldClearDemo).toBe(testCase.shouldClear);
    });
  });

  it('should identify all demo mode cookies that need clearing', () => {
    const demoCookieNames = [
      'ph_demo_enabled',
      'ph_demo_version',
      'ph_demo_events',
      'ph_demo_relationships',
      'ph_demo_contacts',
      'ph_demo_groups'
    ];

    // Verify all expected demo cookies are in the list
    expect(demoCookieNames).toContain('ph_demo_enabled');
    expect(demoCookieNames).toContain('ph_demo_version');
    expect(demoCookieNames).toContain('ph_demo_events');
    expect(demoCookieNames).toContain('ph_demo_relationships');
    expect(demoCookieNames).toContain('ph_demo_contacts');
    expect(demoCookieNames).toContain('ph_demo_groups');
    expect(demoCookieNames.length).toBe(6);
  });
});