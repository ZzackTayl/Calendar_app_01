import crypto from 'crypto';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// OAuth State Configuration
const STATE_TOKEN_LENGTH = 32;
const STATE_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

export interface OAuthStateData {
  state: string;
  expires: number;
  userId: string;
  provider: 'google' | 'apple';
  nonce?: string;
}

/**
 * Generate cryptographically secure OAuth state parameter
 */
export function generateOAuthState(): string {
  return crypto.randomBytes(STATE_TOKEN_LENGTH).toString('hex');
}

/**
 * Generate cryptographically secure nonce for additional security
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create OAuth state data with expiration
 */
export function createOAuthStateData(userId: string, provider: 'google' | 'apple'): OAuthStateData {
  return {
    state: generateOAuthState(),
    expires: Date.now() + STATE_TOKEN_EXPIRY,
    userId,
    provider,
    nonce: generateNonce()
  };
}

/**
 * Store OAuth state in database for server-side validation
 */
export async function storeOAuthState(stateData: OAuthStateData): Promise<void> {
  const supabase = await createRouteHandlerClient();
  
  await supabase
    .from('oauth_states')
    .insert({
      state: stateData.state,
      user_id: stateData.userId,
      provider: stateData.provider,
      nonce: stateData.nonce,
      expires_at: new Date(stateData.expires).toISOString(),
      created_at: new Date().toISOString()
    });
}

/**
 * Validate OAuth state parameter
 */
export async function validateOAuthState(
  state: string, 
  userId: string, 
  provider: 'google' | 'apple'
): Promise<{ valid: boolean; nonce?: string }> {
  if (!state || !userId) {
    return { valid: false };
  }

  const supabase = await createRouteHandlerClient();
  
  const { data: stateData, error } = await supabase
    .from('oauth_states')
    .select('state, nonce, expires_at, provider')
    .eq('user_id', userId)
    .eq('state', state)
    .eq('provider', provider)
    .single();

  if (error || !stateData) {
    return { valid: false };
  }

  // Check if state has expired
  const expiresAt = new Date(stateData.expires_at).getTime();
  if (Date.now() > expiresAt) {
    // Clean up expired state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('user_id', userId)
      .eq('state', state);
    return { valid: false };
  }

  // State is valid, clean it up (one-time use)
  await supabase
    .from('oauth_states')
    .delete()
    .eq('user_id', userId)
    .eq('state', state);

  return { valid: true, nonce: stateData.nonce };
}

/**
 * Clean up expired OAuth states (should be called periodically)
 */
export async function cleanupExpiredOAuthStates(): Promise<void> {
  const supabase = await createRouteHandlerClient();
  
  await supabase
    .from('oauth_states')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

/**
 * Validate that OAuth callback matches the expected parameters
 */
export function validateOAuthCallback(params: {
  state?: string;
  code?: string;
  error?: string;
}): { valid: boolean; error?: string } {
  // Check for OAuth provider errors
  if (params.error) {
    return { 
      valid: false, 
      error: `OAuth provider error: ${params.error}` 
    };
  }

  // Validate required parameters
  if (!params.state) {
    return { 
      valid: false, 
      error: 'Missing state parameter in OAuth callback' 
    };
  }

  if (!params.code) {
    return { 
      valid: false, 
      error: 'Missing authorization code in OAuth callback' 
    };
  }

  return { valid: true };
}