/**
 * Authentication Debug Utilities
 * 
 * Comprehensive debugging tools to diagnose authentication issues
 * across server middleware, client auth context, and Supabase state
 */

import { NextRequest } from 'next/server';
import { User } from '@supabase/supabase-js';

export interface AuthDebugInfo {
  timestamp: string;
  requestId: string;
  route: string;
  userAgent?: string;
  middleware: {
    executed: boolean;
    user: {
      exists: boolean;
      email?: string;
      emailVerified?: boolean;
      id?: string;
    };
    error: {
      exists: boolean;
      code?: string;
      message?: string;
    };
    cookies: Record<string, string>;
    headers: Record<string, string>;
  };
  client?: {
    authContextLoaded: boolean;
    user: {
      exists: boolean;
      email?: string;
      emailVerified?: boolean;
      id?: string;
    };
    loading: boolean;
    error?: string;
  };
}

/**
 * Create a unique request ID for tracing auth flow
 */
export function generateRequestId(): string {
  return `auth-${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
}

/**
 * Extract authentication debug info from middleware
 */
export function extractMiddlewareAuthInfo(
  request: NextRequest,
  user: User | null,
  error: any,
  requestId: string
): AuthDebugInfo {
  const cookies: Record<string, string> = {};
  request.cookies.getAll().forEach(cookie => {
    // Only log auth-related cookies for security
    if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      cookies[cookie.name] = cookie.value.substring(0, 20) + '...'; // Truncate for security
    }
  });

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    // Only log relevant headers
    if (['authorization', 'cookie', 'user-agent', 'referer'].includes(key.toLowerCase())) {
      if (key.toLowerCase() === 'cookie') {
        headers[key] = '[REDACTED - See cookies section]';
      } else if (key.toLowerCase() === 'authorization') {
        headers[key] = value ? `Bearer ${value.substring(7, 20)}...` : 'None';
      } else {
        headers[key] = value;
      }
    }
  });

  return {
    timestamp: new Date().toISOString(),
    requestId,
    route: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent')?.substring(0, 100),
    middleware: {
      executed: true,
      user: {
        exists: !!user,
        email: user?.email,
        emailVerified: !!user?.email_confirmed_at,
        id: user?.id,
      },
      error: {
        exists: !!error,
        code: error?.code,
        message: error?.message,
      },
      cookies,
      headers,
    },
  };
}

/**
 * Client-side auth debug info
 */
export function extractClientAuthInfo(
  user: User | null,
  loading: boolean,
  error: string | null,
  requestId: string
): Partial<AuthDebugInfo> {
  return {
    client: {
      authContextLoaded: !loading,
      user: {
        exists: !!user,
        email: user?.email,
        emailVerified: !!user?.email_confirmed_at,
        id: user?.id,
      },
      loading,
      error: error || undefined,
    },
  };
}

/**
 * Enhanced console logging with structured format
 */
export function logAuthDebug(info: AuthDebugInfo, level: 'info' | 'warn' | 'error' = 'info') {
  const logFn = console[level];
  
  logFn(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 AUTHENTICATION DEBUG REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Timestamp: ${info.timestamp}
🆔 Request ID: ${info.requestId}
🛣️  Route: ${info.route}
🖥️  User Agent: ${info.userAgent || 'Unknown'}

🔧 MIDDLEWARE STATE:
  ✅ Executed: ${info.middleware.executed}
  👤 User Exists: ${info.middleware.user.exists}
  📧 Email: ${info.middleware.user.email || 'N/A'}
  ✅ Email Verified: ${info.middleware.user.emailVerified}
  🆔 User ID: ${info.middleware.user.id || 'N/A'}
  ❌ Error Exists: ${info.middleware.error.exists}
  📝 Error Code: ${info.middleware.error.code || 'N/A'}
  💬 Error Message: ${info.middleware.error.message || 'N/A'}
  
🖥️  CLIENT STATE:
  ✅ Context Loaded: ${info.client?.authContextLoaded || 'N/A'}
  👤 User Exists: ${info.client?.user.exists || 'N/A'}
  📧 Email: ${info.client?.user.email || 'N/A'}
  ✅ Email Verified: ${info.client?.user.emailVerified || 'N/A'}
  🔄 Loading: ${info.client?.loading || 'N/A'}
  ❌ Error: ${info.client?.error || 'None'}

🍪 AUTH COOKIES:
${Object.entries(info.middleware.cookies).map(([key, value]) => 
    `  ${key}: ${value}`
  ).join('\n') || '  None found'}

📋 RELEVANT HEADERS:
${Object.entries(info.middleware.headers).map(([key, value]) => 
    `  ${key}: ${value}`
  ).join('\n') || '  None found'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

/**
 * Check for common authentication issues
 */
export function diagnoseAuthIssues(info: AuthDebugInfo): string[] {
  const issues: string[] = [];

  // Server-client mismatch
  if (info.middleware.user.exists && info.client && !info.client.user.exists) {
    issues.push('🚨 Server has user but client does not - possible hydration issue');
  }

  if (!info.middleware.user.exists && info.client?.user.exists) {
    issues.push('🚨 Client has user but server does not - possible session expiry');
  }

  // Email verification issues
  if (info.middleware.user.exists && !info.middleware.user.emailVerified) {
    issues.push('⚠️ User exists but email not verified');
  }

  // Error state issues
  if (info.middleware.error.exists && info.middleware.error.code === 'email_not_confirmed') {
    issues.push('📧 Email confirmation required');
  }

  // Missing auth cookies
  const hasAuthCookies = Object.keys(info.middleware.cookies).some(key => 
    key.includes('supabase') || key.includes('auth')
  );
  if (!hasAuthCookies && info.route.startsWith('/')) {
    issues.push('🍪 No authentication cookies found');
  }

  // Client loading issues
  if (info.client?.loading && info.middleware.user.exists) {
    issues.push('⏳ Client still loading while server has user - possible race condition');
  }

  return issues;
}

/**
 * Complete auth debugging report
 */
export function generateAuthDiagnosticReport(info: AuthDebugInfo): void {
  logAuthDebug(info, info.middleware.error.exists ? 'error' : 'info');
  
  const issues = diagnoseAuthIssues(info);
  if (issues.length > 0) {
    console.warn('🔍 POTENTIAL AUTHENTICATION ISSUES DETECTED:');
    issues.forEach(issue => console.warn(`  ${issue}`));
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}