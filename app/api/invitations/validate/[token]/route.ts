import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createSupabaseClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

interface ValidateInvitationResponse {
  success: boolean;
  valid: boolean;
  invitation?: {
    id: string;
    invitation_type: string;
    sender_name: string;
    recipient_email: string;
    message?: string;
    expires_at: string;
    group_info?: {
      group_name: string;
      description?: string;
      color?: string;
    };
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createSupabaseClient();
    const { token } = params;

    if (!token) {
      return NextResponse.json<ValidateInvitationResponse>({
        success: false,
        valid: false,
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
          invitation_type,
          recipient_email,
          message,
          status,
          expires_at,
          sender:users!invitations_sender_id_fkey(
            phone_number
          )
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
            invitee_email,
            message,
            status,
            expires_at,
            inviter:users!group_invitations_inviter_id_fkey(
              phone_number
            ),
            group:relationship_groups!group_invitations_group_id_fkey(
              group_name,
              description,
              color
            )
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      groupInvitationToken = data;
    }

    const tokenData = invitationToken || groupInvitationToken;

    if (!tokenData) {
      return NextResponse.json<ValidateInvitationResponse>({
        success: true,
        valid: false,
        error: 'Invalid invitation token'
      }, { status: 404 });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json<ValidateInvitationResponse>({
        success: true,
        valid: false,
        error: 'Invitation token has already been used'
      }, { status: 410 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json<ValidateInvitationResponse>({
        success: true,
        valid: false,
        error: 'Invitation token has expired'
      }, { status: 410 });
    }

    // Check if invitation itself is still valid
    const invitation = invitationToken ? 
      (tokenData as any).invitations : 
      (tokenData as any).group_invitations;

    if (invitation.status !== 'pending') {
      return NextResponse.json<ValidateInvitationResponse>({
        success: true,
        valid: false,
        error: 'Invitation has already been processed'
      }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<ValidateInvitationResponse>({
        success: true,
        valid: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    // Build response data
    const responseInvitation = {
      id: invitation.id,
      invitation_type: invitationToken ? invitation.invitation_type : 'group_invitation',
      sender_name: invitationToken ? 
        invitation.sender?.phone_number || 'Unknown' :
        invitation.inviter?.phone_number || 'Unknown',
      recipient_email: invitationToken ? 
        invitation.recipient_email : 
        invitation.invitee_email,
      message: invitation.message,
      expires_at: invitation.expires_at,
      group_info: groupInvitationToken ? {
        group_name: invitation.group?.group_name,
        description: invitation.group?.description,
        color: invitation.group?.color
      } : undefined
    };

    return NextResponse.json<ValidateInvitationResponse>({
      success: true,
      valid: true,
      invitation: responseInvitation
    });

  } catch (error) {
    console.error('Error validating invitation token:', error);
    return NextResponse.json<ValidateInvitationResponse>({
      success: false,
      valid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}