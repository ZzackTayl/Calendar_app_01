import { createSupabaseClient } from './client';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Token refresh utility for real-time connections
 * Handles automatic token refresh and session validation
 */

export interface TokenRefreshOptions {
  maxRetries?: number;
  retryDelay?: number;
  silent?: boolean;
}

export interface TokenRefreshResult {
  success: boolean;
  session?: any;
  error?: string;
}

/**
 * Check if the current session is valid and refresh if needed
 */
export async function ensureValidSession(options: TokenRefreshOptions = {}): Promise<TokenRefreshResult> {
  const { maxRetries = 3, retryDelay = 1000, silent = false } = options;
  const supabase = createSupabaseClient();

  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      if (!silent) console.warn('Session check failed:', sessionError);
      return { success: false, error: sessionError.message };
    }

    // If session exists and is valid, return success
    if (session && session.access_token) {
      return { success: true, session };
    }

    // Try to refresh the session
    if (!silent) console.log('🔄 Attempting to refresh session...');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      if (!silent) console.error('Session refresh failed:', refreshError);
      return { success: false, error: refreshError.message };
    }

    if (refreshData.session) {
      if (!silent) console.log('✅ Session refreshed successfully');
      return { success: true, session: refreshData.session };
    }

    return { success: false, error: 'No valid session available' };

  } catch (error: any) {
    if (!silent) console.error('Token refresh error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Retry function with exponential backoff for token refresh
 */
export async function retryTokenRefresh(
  operation: () => Promise<TokenRefreshResult>,
  options: TokenRefreshOptions = {}
): Promise<TokenRefreshResult> {
  const { maxRetries = 3, retryDelay = 1000, silent = false } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await operation();
    
    if (result.success) {
      return result;
    }

    if (attempt === maxRetries) {
      if (!silent) console.error(`Token refresh failed after ${maxRetries} attempts`);
      return result;
    }

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, attempt - 1);
    if (!silent) console.log(`🔄 Retrying token refresh in ${delay}ms (attempt ${attempt}/${maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Setup automatic token refresh for real-time connections
 */
export function setupTokenRefreshForRealtime(
  onTokenExpired?: () => void,
  onTokenRefreshed?: (session: Session | null) => void
) {
  const supabase = createSupabaseClient();

  // Listen for auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'TOKEN_REFRESHED') {
        if (onTokenRefreshed) {
          onTokenRefreshed(session);
        }
        console.log('✅ Token refreshed automatically');
      } else if (event === 'SIGNED_OUT') {
        if (onTokenExpired) {
          onTokenExpired();
        }
        console.log('❌ User signed out, cleaning up real-time connections');
      }
    }
  );

  return subscription;
}

/**
 * Validate token before making API calls
 */
export async function validateTokenForAPI(): Promise<boolean> {
  const result = await ensureValidSession({ silent: true });
  return result.success;
}

/**
 * Get current session with automatic refresh
 */
export async function getCurrentSession(): Promise<Session | null> {
  const result = await ensureValidSession();
  return result.session;
}

/**
 * Force token refresh (useful for testing or manual refresh)
 */
export async function forceTokenRefresh(): Promise<TokenRefreshResult> {
  const supabase = createSupabaseClient();
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session) {
      return { success: true, session: data.session };
    }

    return { success: false, error: 'No session available after refresh' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Check if token is about to expire (within specified minutes, default 5)
 * For real-time connections, we use longer buffer to prevent interruptions
 */
export function isTokenExpiringSoon(
  session: Session | null, 
  bufferMinutes: number = 5,
  realtimeBuffer: boolean = false
): boolean {
  if (!session?.access_token) return true;
  
  try {
    // Decode JWT to get expiration
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    
    // Use longer buffer for real-time connections to prevent interruptions
    const effectiveBuffer = realtimeBuffer ? bufferMinutes + 2 : bufferMinutes;
    const bufferTime = effectiveBuffer * 60 * 1000;
    
    return (expirationTime - currentTime) < bufferTime;
  } catch (error) {
    console.warn('Could not decode token to check expiration');
    return true; // Assume expiring if we can't decode
  }
}

/**
 * Setup periodic token validation for long-running applications
 * Optimized for real-time connections with proactive refresh
 */
export function setupPeriodicTokenValidation(
  intervalMinutes: number = 5,
  onTokenExpired?: () => void,
  realtimeMode: boolean = false
): () => void {
  const interval = setInterval(async () => {
    const session = await getCurrentSession();
    
    // Use longer buffer for real-time connections
    if (session && isTokenExpiringSoon(session, 5, realtimeMode)) {
      const logPrefix = realtimeMode ? '[REALTIME]' : '';
      console.log(`${logPrefix} ⚠️ Token expiring soon, refreshing proactively...`);
      
      const result = await forceTokenRefresh();
      
      if (result.success) {
        console.log(`${logPrefix} ✅ Token refreshed successfully`);
      } else if (onTokenExpired) {
        console.warn(`${logPrefix} ❌ Token refresh failed:`, result.error);
        onTokenExpired();
      }
    }
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => clearInterval(interval);
}
