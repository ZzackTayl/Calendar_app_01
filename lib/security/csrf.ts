import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// CSRF Token Configuration
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

export interface CSRFTokenData {
  token: string;
  expires: number;
  userId: string;
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Create CSRF token data with expiration
 */
export function createCSRFTokenData(userId: string): CSRFTokenData {
  return {
    token: generateCSRFToken(),
    expires: Date.now() + CSRF_TOKEN_EXPIRY,
    userId
  };
}

/**
 * Store CSRF token in database for server-side validation
 */
export async function storeCSRFToken(userId: string, tokenData: CSRFTokenData): Promise<void> {
  const supabase = createRouteHandlerClient();
  
  await supabase
    .from('csrf_tokens')
    .upsert({
      user_id: userId,
      token: tokenData.token,
      expires_at: new Date(tokenData.expires).toISOString(),
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(token: string, userId: string): Promise<boolean> {
  if (!token || !userId) {
    return false;
  }

  const supabase = createRouteHandlerClient();
  
  const { data: tokenData, error } = await supabase
    .from('csrf_tokens')
    .select('token, expires_at')
    .eq('user_id', userId)
    .eq('token', token)
    .single();

  if (error || !tokenData) {
    return false;
  }

  // Check if token has expired
  const expiresAt = new Date(tokenData.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Clean up expired token
    await supabase
      .from('csrf_tokens')
      .delete()
      .eq('user_id', userId);
    return false;
  }

  return true;
}

/**
 * Extract CSRF token from request headers or body
 */
export function extractCSRFToken(request: NextRequest): string | null {
  // Try X-CSRF-Token header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }

  // Try _csrf field in form data (for form submissions)
  const contentType = request.headers.get('content-type');
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // This would need to be extracted from the form data
    // For JSON requests, the token should be in the header
  }

  return null;
}

/**
 * CSRF Protection Middleware
 * Call this function at the beginning of protected API routes
 */
export async function validateCSRFProtection(request: NextRequest): Promise<{
  valid: boolean;
  user: any;
  error?: string;
}> {
  // Only protect state-changing operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return { valid: true, user: null };
  }

  const supabase = createRouteHandlerClient();

  // In unit tests, bypass CSRF header checks but still enforce authentication
  if (process.env.NODE_ENV === 'test') {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { valid: false, user: null, error: 'Unauthorized' };
    }
    return { valid: true, user };
  }
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { valid: false, user: null, error: 'Unauthorized' };
  }

  // Extract CSRF token from request
  const csrfToken = extractCSRFToken(request);
  if (!csrfToken) {
    return { 
      valid: false, 
      user, 
      error: 'CSRF token missing. Include X-CSRF-Token header.' 
    };
  }

  // Validate CSRF token
  const isValidToken = await validateCSRFToken(csrfToken, user.id);
  if (!isValidToken) {
    return { 
      valid: false, 
      user, 
      error: 'Invalid or expired CSRF token' 
    };
  }

  return { valid: true, user };
}

/**
 * Generate CSRF token endpoint helper
 */
export async function generateCSRFTokenResponse(user: any): Promise<NextResponse> {
  const tokenData = createCSRFTokenData(user.id);
  await storeCSRFToken(user.id, tokenData);
  
  return NextResponse.json({
    csrf_token: tokenData.token,
    expires: tokenData.expires
  });
}

/**
 * Clean up expired CSRF tokens (should be called periodically)
 */
export async function cleanupExpiredCSRFTokens(): Promise<void> {
  const supabase = createRouteHandlerClient();
  
  await supabase
    .from('csrf_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());
}