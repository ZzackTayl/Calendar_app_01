import { randomBytes, createHash } from 'crypto';
import { createSupabaseClient } from '@/lib/supabase/server';

export interface InviteTokenResult {
  token: string;
  tokenHash: string;
  inviteLink: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  invitation?: any;
  invitationType?: 'individual' | 'group';
  error?: string;
}

/**
 * Generate a secure invitation token
 */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  return { token, tokenHash };
}

/**
 * Create an invitation link with the provided token
 */
export function createInviteLink(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
  return `${base}/invitations/accept/${token}`;
}

/**
 * Create mobile-optimized invitation links that support both web and app deep linking
 */
export function createMobileInviteLink(token: string, options?: {
  preferApp?: boolean;
  baseUrl?: string;
  appScheme?: string;
}): string {
  const baseUrl = options?.baseUrl || process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://polyharmony.app';
  const appScheme = options?.appScheme || process.env.NEXT_PUBLIC_APP_SCHEME || 'polyharmony';
  
  if (options?.preferApp) {
    // Return custom scheme URL for direct app opening
    return `${appScheme}://invitation/${token}`;
  }
  
  // Return universal link that works on both web and mobile
  // This will open in the app if installed, or web browser if not
  return `${baseUrl}/invitation/accept/${token}`;
}

/**
 * Create invitation links with mobile detection and smart routing
 */
export function createSmartInviteLink(token: string, userAgent?: string): string {
  const isMobile = userAgent ? /Mobile|Android|iPhone|iPad/i.test(userAgent) : false;
  
  return createMobileInviteLink(token, {
    preferApp: false, // Always use universal links for email compatibility
    baseUrl: process.env.NEXT_PUBLIC_WEB_APP_URL || 'https://polyharmony.app'
  });
}

/**
 * Validate an invitation token and return invitation details
 */
export async function validateInviteToken(token: string): Promise<TokenValidationResult> {
  try {
    const supabase = await createSupabaseClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Check individual invitations first
    const { data: individualToken } = await supabase
      .from('invitation_tokens')
      .select(`
        id,
        expires_at,
        used_at,
        invitations!inner(
          id,
          status,
          expires_at,
          sender_id,
          recipient_email,
          invitation_type
        )
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (individualToken) {
      // Validate individual invitation
      if (individualToken.used_at) {
        return { isValid: false, error: 'Token has already been used' };
      }

      if (new Date(individualToken.expires_at) < new Date()) {
        return { isValid: false, error: 'Token has expired' };
      }

      const invitation = Array.isArray(individualToken.invitations) 
        ? individualToken.invitations[0] 
        : individualToken.invitations;
      
      if (!invitation || invitation.status !== 'pending') {
        return { isValid: false, error: 'Invitation has been processed' };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return { isValid: false, error: 'Invitation has expired' };
      }

      return {
        isValid: true,
        invitation: invitation,
        invitationType: 'individual'
      };
    }

    // Check group invitations
    const { data: groupToken } = await supabase
      .from('group_invitation_tokens')
      .select(`
        id,
        expires_at,
        used_at,
        group_invitations!inner(
          id,
          status,
          expires_at,
          group_id,
          inviter_id,
          invitee_email
        )
      `)
      .eq('token_hash', tokenHash)
      .single();

    if (groupToken) {
      // Validate group invitation
      if (groupToken.used_at) {
        return { isValid: false, error: 'Token has already been used' };
      }

      if (new Date(groupToken.expires_at) < new Date()) {
        return { isValid: false, error: 'Token has expired' };
      }

      const invitation = Array.isArray(groupToken.group_invitations) 
        ? groupToken.group_invitations[0] 
        : groupToken.group_invitations;
      
      if (!invitation || invitation.status !== 'pending') {
        return { isValid: false, error: 'Invitation has been processed' };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        return { isValid: false, error: 'Invitation has expired' };
      }

      return {
        isValid: true,
        invitation: invitation,
        invitationType: 'group'
      };
    }

    return { isValid: false, error: 'Invalid token' };

  } catch (error) {
    console.error('Error validating invitation token:', error);
    return { isValid: false, error: 'Failed to validate token' };
  }
}

/**
 * Mark a token as used
 */
export async function markTokenAsUsed(
  token: string, 
  invitationType: 'individual' | 'group',
  metadata?: {
    ip?: string;
    userAgent?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const tableName = invitationType === 'individual' 
      ? 'invitation_tokens' 
      : 'group_invitation_tokens';

    const { error } = await supabase
      .from(tableName)
      .update({
        used_at: new Date().toISOString(),
        used_by_ip: metadata?.ip || null,
        used_by_user_agent: metadata?.userAgent || null
      })
      .eq('token_hash', tokenHash);

    if (error) {
      console.error('Error marking token as used:', error);
      return { success: false, error: 'Failed to mark token as used' };
    }

    return { success: true };

  } catch (error) {
    console.error('Error marking token as used:', error);
    return { success: false, error: 'Failed to mark token as used' };
  }
}

/**
 * Clean up expired invitation tokens
 */
export async function cleanupExpiredInvites(): Promise<{
  success: boolean;
  deletedCount?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseClient();
    const now = new Date().toISOString();

    // Clean up expired individual invitation tokens
    const { count: individualCount, error: individualError } = await supabase
      .from('invitation_tokens')
      .delete({ count: 'exact' })
      .lt('expires_at', now);

    if (individualError) {
      console.error('Error cleaning up individual invitation tokens:', individualError);
    }

    // Clean up expired group invitation tokens
    const { count: groupCount, error: groupError } = await supabase
      .from('group_invitation_tokens')
      .delete({ count: 'exact' })
      .lt('expires_at', now);

    if (groupError) {
      console.error('Error cleaning up group invitation tokens:', groupError);
    }

    // Clean up expired invitations themselves
    const { error: invitationError } = await supabase
      .from('invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (invitationError) {
      console.error('Error marking expired invitations:', invitationError);
    }

    const { error: groupInvitationError } = await supabase
      .from('group_invitations')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (groupInvitationError) {
      console.error('Error marking expired group invitations:', groupInvitationError);
    }

    const totalDeleted = (individualCount || 0) + (groupCount || 0);

    return {
      success: !individualError && !groupError,
      deletedCount: totalDeleted,
      error: individualError || groupError ? 'Some cleanup operations failed' : undefined
    };

  } catch (error) {
    console.error('Error during cleanup:', error);
    return {
      success: false,
      error: 'Failed to cleanup expired invitations'
    };
  }
}

/**
 * Rate limiting for invitation creation
 */
export async function checkInvitationRateLimit(
  userId: string,
  windowMinutes: number = 60,
  maxInvitations: number = 10
): Promise<{ allowed: boolean; remaining?: number; resetTime?: Date }> {
  try {
    const supabase = await createSupabaseClient();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Count invitations created by this user in the time window
    const { count: individualCount } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', userId)
      .gte('created_at', windowStart.toISOString());

    const { count: groupCount } = await supabase
      .from('group_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('inviter_id', userId)
      .gte('created_at', windowStart.toISOString());

    const totalInvitations = (individualCount || 0) + (groupCount || 0);
    const remaining = Math.max(0, maxInvitations - totalInvitations);
    const resetTime = new Date(windowStart.getTime() + windowMinutes * 60 * 1000);

    return {
      allowed: totalInvitations < maxInvitations,
      remaining,
      resetTime
    };

  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request to proceed
    return { allowed: true };
  }
}