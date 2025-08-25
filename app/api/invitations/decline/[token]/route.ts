import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSupabaseClient } from '@/lib/supabase/server';

interface DeclineInvitationResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const { token } = params;

    if (!token) {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Token is required'
      }, { status: 400 });
    }

    // Hash the token to match against stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // First, check individual invitations
    const { data: invitationToken } = await supabase
      .from('invitation_tokens')
      .select(`
        id,
        expires_at,
        invitation_id,
        used_at,
        invitations!inner(
          id,
          status,
          expires_at
        )
      `)
      .eq('token_hash', tokenHash)
      .single();

    // If not found, check group invitations
    let groupInvitationToken = null;
    if (!invitationToken) {
      const { data } = await supabase
        .from('group_invitation_tokens')
        .select(`
          id,
          expires_at,
          invitation_id,
          used_at,
          group_invitations!inner(
            id,
            status,
            expires_at
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      groupInvitationToken = data;
    }

    const tokenData = invitationToken || groupInvitationToken;

    if (!tokenData) {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Invalid invitation token'
      }, { status: 404 });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Invitation token has already been used'
      }, { status: 410 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Invitation token has expired'
      }, { status: 410 });
    }

    // Check if invitation itself is still valid
    const invitation = invitationToken ? 
      (tokenData as any).invitations : 
      (tokenData as any).group_invitations;

    if (invitation.status !== 'pending') {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Invitation has already been processed'
      }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    const now = new Date().toISOString();

    // Mark token as used
    const tokenTable = invitationToken ? 'invitation_tokens' : 'group_invitation_tokens';
    const { error: tokenError } = await supabase
      .from(tokenTable)
      .update({
        used_at: now,
        used_by_ip: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
        used_by_user_agent: request.headers.get('user-agent') || 'unknown'
      })
      .eq('id', tokenData.id);

    if (tokenError) {
      console.error('Error marking token as used:', tokenError);
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Failed to process token'
      }, { status: 500 });
    }

    // Update invitation status to declined
    const invitationTable = invitationToken ? 'invitations' : 'group_invitations';
    const { error: invitationError } = await supabase
      .from(invitationTable)
      .update({
        status: 'declined',
        declined_at: now
      })
      .eq('id', invitation.id);

    if (invitationError) {
      console.error('Error declining invitation:', invitationError);
      return NextResponse.json<DeclineInvitationResponse>({
        success: false,
        error: 'Failed to decline invitation'
      }, { status: 500 });
    }

    return NextResponse.json<DeclineInvitationResponse>({
      success: true,
      message: 'Invitation declined successfully'
    });

  } catch (error) {
    console.error('Error declining invitation:', error);
    return NextResponse.json<DeclineInvitationResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}