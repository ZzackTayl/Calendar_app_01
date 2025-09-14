import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createSupabaseClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

interface AcceptTokenInvitationRequest {
  // For individual invitations
  setup_permissions?: boolean;
  create_relationship?: boolean;
  relationship_type?: string;
  custom_relationship_name?: string;
  assign_to_group?: boolean;
  group_id?: string;
  create_new_group?: boolean;
  new_group_name?: string;
  new_group_description?: string;
  user_a_to_b_individual_permission?: string;
  user_b_to_a_individual_permission?: string;
  
  // For group invitations
  member_permissions?: Array<{
    target_user_id: string;
    permission_level: string;
    can_see_details?: boolean;
    can_see_location?: boolean;
    can_see_description?: boolean;
    can_see_attendees?: boolean;
    notify_on_events?: boolean;
    notify_on_changes?: boolean;
  }>;
}

interface AcceptTokenInvitationResponse {
  success: boolean;
  invitation_type?: string;
  message?: string;
  error?: string;
  connection_setup?: any;
  relationship_created?: boolean;
  group_assigned?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createSupabaseClient();
    const { token } = params;

    // Get the current user (for authenticated acceptance)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Authentication required to accept invitation'
      }, { status: 401 });
    }

    if (!token) {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Token is required'
      }, { status: 400 });
    }

    const body: AcceptTokenInvitationRequest = await request.json().catch(() => ({}));

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
          sender_id,
          recipient_email,
          recipient_user_id,
          status,
          expires_at,
          invitation_type
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
            group_id,
            inviter_id,
            invitee_email,
            invitee_user_id,
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
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Invalid invitation token'
      }, { status: 404 });
    }

    // Check if token has been used
    if (tokenData.used_at) {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Invitation token has already been used'
      }, { status: 410 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Invitation token has expired'
      }, { status: 410 });
    }

    // Check if invitation itself is still valid
    const invitation = invitationToken ? 
      (tokenData as any).invitations : 
      (tokenData as any).group_invitations;

    if (invitation.status !== 'pending') {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Invitation has already been processed'
      }, { status: 410 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    const now = new Date().toISOString();

    // Mark token as used first
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
      // Continue anyway
    }

    if (invitationToken) {
      // Handle individual invitation acceptance
      const invitation = (tokenData as any).invitations;

      // Check if user is the intended recipient (by email match)
      if (user.email !== invitation.recipient_email) {
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'You are not the intended recipient of this invitation'
        }, { status: 403 });
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: now,
          recipient_user_id: user.id
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'Failed to accept invitation'
        }, { status: 500 });
      }

      // Create connection setup (similar to existing accept endpoint logic)
      const connectionSetupData = {
        user_a_id: invitation.sender_id,
        user_b_id: user.id,
        setup_status: body.setup_permissions !== false ? 'pending' : 'skipped',
        user_a_to_b_individual_permission: body.user_a_to_b_individual_permission || 'limited_access',
        user_b_to_a_individual_permission: body.user_b_to_a_individual_permission || 'limited_access',
      };

      const { data: connectionSetup, error: connectionError } = await supabase
        .from('connection_setups')
        .insert(connectionSetupData)
        .select()
        .single();

      if (connectionError) {
        console.error('Error creating connection setup:', connectionError);
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'Failed to create connection setup'
        }, { status: 500 });
      }

      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: true,
        invitation_type: 'individual',
        message: 'Individual invitation accepted successfully',
        connection_setup: connectionSetup
      });

    } else {
      // Handle group invitation acceptance
      const invitation = (tokenData as any).group_invitations;

      // Check if user is the intended recipient (by email match)
      if (user.email !== invitation.invitee_email) {
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'You are not the intended recipient of this group invitation'
        }, { status: 403 });
      }

      // Check if user is already a member of the group
      const { data: existingMember } = await supabase
        .from('relationship_group_members')
        .select('id')
        .eq('group_id', invitation.group_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (existingMember) {
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'You are already a member of this group'
        }, { status: 409 });
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from('group_invitations')
        .update({
          status: 'accepted',
          accepted_at: now,
          invitee_user_id: user.id
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating group invitation:', updateError);
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'Failed to accept group invitation'
        }, { status: 500 });
      }

      // Add user to the group
      const { error: addMemberError } = await supabase
        .from('relationship_group_members')
        .insert({
          group_id: invitation.group_id,
          user_id: user.id,
          role: 'member',
          can_invite_members: true,
          can_edit_group_info: false,
          can_remove_members: false
        });

      if (addMemberError) {
        console.error('Error adding user to group:', addMemberError);
        return NextResponse.json<AcceptTokenInvitationResponse>({
          success: false,
          error: 'Failed to add user to group'
        }, { status: 500 });
      }

      return NextResponse.json<AcceptTokenInvitationResponse>({
        success: true,
        invitation_type: 'group',
        message: 'Group invitation accepted successfully'
      });
    }

  } catch (error) {
    console.error('Error accepting invitation via token:', error);
    return NextResponse.json<AcceptTokenInvitationResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}