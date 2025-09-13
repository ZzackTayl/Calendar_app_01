import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createSupabaseClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

interface InvitationDetailsResponse {
  success: boolean;
  invitation?: {
    id: string;
    invitation_type: string;
    sender: {
      phone_number: string;
      display_name?: string;
    };
    recipient_email: string;
    message?: string;
    expires_at: string;
    created_at: string;
    group_info?: {
      id: string;
      group_name: string;
      description?: string;
      color?: string;
      member_count?: number;
      members?: Array<{
        phone_number: string;
        display_name?: string;
        role?: string;
      }>;
    };
    requirements?: {
      authentication_required: boolean;
      setup_permissions_available: boolean;
      can_create_relationship: boolean;
      can_assign_to_group: boolean;
    };
  };
  valid: boolean;
  error?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const { token } = params;

    if (!token) {
      return NextResponse.json<InvitationDetailsResponse>({
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
          created_at,
          sender:users!invitations_sender_id_fkey(
            phone_number,
            full_name
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
            created_at,
            inviter:users!group_invitations_inviter_id_fkey(
              phone_number,
              full_name
            ),
            group:relationship_groups!group_invitations_group_id_fkey(
              id,
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
      return NextResponse.json<InvitationDetailsResponse>({
        success: true,
        valid: false,
        error: 'Invalid invitation token'
      }, { status: 404 });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json<InvitationDetailsResponse>({
        success: true,
        valid: false,
        error: 'Invitation token has already been used'
      }, { status: 410 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json<InvitationDetailsResponse>({
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
      return NextResponse.json<InvitationDetailsResponse>({
        success: true,
        valid: false,
        error: 'Invitation has already been processed'
      }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<InvitationDetailsResponse>({
        success: true,
        valid: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    let groupInfo = undefined;
    let memberCount = 0;
    let members: Array<{ phone_number: string; display_name?: string; role?: string }> = [];

    // If this is a group invitation, get additional group details
    if (groupInvitationToken) {
      const groupId = invitation.group.id;

      // Get member count
      const { count } = await supabase
        .from('relationship_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .is('left_at', null);

      memberCount = count || 0;

      // Get existing members (limited to prevent large responses)
      const { data: membersList } = await supabase
        .from('relationship_group_members')
        .select(`
          role,
          user:users!relationship_group_members_user_id_fkey(
            phone_number,
            full_name
          )
        `)
        .eq('group_id', groupId)
        .is('left_at', null)
        .limit(10);

      if (membersList) {
        members = membersList.map(member => ({
          phone_number: (member.user as any)?.phone_number || 'Unknown',
          display_name: (member.user as any)?.full_name,
          role: member.role
        }));
      }

      groupInfo = {
        id: groupId,
        group_name: invitation.group.group_name,
        description: invitation.group.description,
        color: invitation.group.color,
        member_count: memberCount,
        members: members
      };
    }

    // Build response data
    const responseInvitation = {
      id: invitation.id,
      invitation_type: invitationToken ? invitation.invitation_type : 'group_invitation',
      sender: {
        phone_number: invitationToken ? 
          invitation.sender?.phone_number || 'Unknown' :
          invitation.inviter?.phone_number || 'Unknown',
        display_name: invitationToken ?
          invitation.sender?.full_name :
          invitation.inviter?.full_name
      },
      recipient_email: invitationToken ? 
        invitation.recipient_email : 
        invitation.invitee_email,
      message: invitation.message,
      expires_at: invitation.expires_at,
      created_at: invitation.created_at,
      group_info: groupInfo,
      requirements: {
        authentication_required: true,
        setup_permissions_available: invitationToken ? true : false,
        can_create_relationship: invitationToken ? true : false,
        can_assign_to_group: invitationToken ? true : false
      }
    };

    return NextResponse.json<InvitationDetailsResponse>({
      success: true,
      valid: true,
      invitation: responseInvitation
    });

  } catch (error) {
    console.error('Error getting invitation details:', error);
    return NextResponse.json<InvitationDetailsResponse>({
      success: false,
      valid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}