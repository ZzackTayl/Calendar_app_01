import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { CreateGroupInvitationRequest, GroupInvitationResponse } from '@/lib/supabase/types';
import { generateInviteToken, createInviteLink, checkInvitationRateLimit } from '@/lib/invitations/token-utils';
import { sendInvitationNotification } from '@/lib/email/invitation-service';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { createUserIsolationService, createUserContext } from '@/lib/security/user-isolation';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Use consistent authentication pattern with enhanced session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Authentication required',
        details: authValidation.error
      }, { status: 401 });
    }

    // Validate CSRF token after authentication
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: csrfValidation.error || 'CSRF validation failed'
      }, { status: 403 });
    }

    const user = authValidation.user;
    const supabase = createRouteHandlerClient();

    // Create user isolation service for secure operations
    const isolationService = createUserIsolationService(supabase);
    const userContext = createUserContext(user.id, ['write'], authValidation.session?.access_token?.substring(0, 16));

    // Parse the request body
    const body: CreateGroupInvitationRequest = await request.json();
    const { group_id, invitee_email, invitee_phone, message } = body;

    // Check rate limiting
    const rateLimit = await checkInvitationRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: `Rate limit exceeded. You can send ${rateLimit.remaining || 0} more invitations. Limit resets at ${rateLimit.resetTime?.toLocaleTimeString()}`
      }, { status: 429 });
    }

    // Validate required fields with proper sanitization
    if (!group_id || !invitee_email ||
        typeof group_id !== 'string' || typeof invitee_email !== 'string' ||
        !/^[0-9a-fA-F-]{36}$/.test(group_id) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitee_email)) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Valid Group ID and invitee email are required'
      }, { status: 400 });
    }

    // SECURITY FIX: Validate group ownership using isolation service
    const groupOwnershipValidation = await isolationService.validateOwnership(
      userContext,
      'group',
      group_id,
      'write'
    );

    if (!groupOwnershipValidation.allowed) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Access denied: You do not have access to this group',
        reason: groupOwnershipValidation.reason
      }, { status: 403 });
    }

    // Use secure query to check group membership and permissions
    const { data: groupMember, error: memberError } = await supabase
      .from('relationship_group_members')
      .select('role, can_invite_members')
      .eq('group_id', group_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (memberError || !groupMember) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'You are not a member of this group or access denied'
      }, { status: 403 });
    }

    // SECURITY FIX: Check if user has permission to invite members
    if (!groupMember.can_invite_members && groupMember.role !== 'creator') {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'You do not have permission to invite members to this group'
      }, { status: 403 });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('group_invitations')
      .select('id, status')
      .eq('group_id', group_id)
      .eq('invitee_email', invitee_email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'An invitation has already been sent to this email for this group'
      }, { status: 409 });
    }

    // Check if invitee is already a member of the group
    const { data: existingMember } = await supabase
      .from('relationship_group_members')
      .select('id')
      .eq('group_id', group_id)
      .eq('user_id', invitee_email)
      .is('left_at', null)
      .single();

    if (existingMember) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'This user is already a member of this group'
      }, { status: 409 });
    }

    // Check if recipient is already a user
    const { data: recipientUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', invitee_email)
      .single();

    // Create the invitation
    const invitationData = {
      group_id,
      inviter_id: user.id,
      invitee_email,
      invitee_phone: invitee_phone || null,
      message: message || null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: 'pending' as const,
      invitee_user_id: recipientUser?.id || null
    };

    const { data: invitation, error: insertError } = await supabase
      .from('group_invitations')
      .insert(invitationData)
      .select(`
        *,
        group:relationship_groups!group_invitations_group_id_fkey(
          group_name,
          description,
          color
        ),
        inviter:users!group_invitations_inviter_id_fkey(
          phone_number
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating group invitation:', insertError);
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Failed to create group invitation'
      }, { status: 500 });
    }

    // Create invitation token for secure links
    const { token, tokenHash } = generateInviteToken();
    const inviteLink = createInviteLink(token);

    const { error: tokenError } = await supabase
      .from('group_invitation_tokens')
      .insert({
        invitation_id: invitation.id,
        token_hash: tokenHash,
        expires_at: invitation.expires_at
      });

    if (tokenError) {
      console.error('Error creating group invitation token:', tokenError);
      // Don't fail the request, just log the error
    }

    // Send email notification to recipient
    try {
      const { data: senderProfile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      await sendInvitationNotification({
        recipientEmail: invitee_email,
        senderName: senderProfile?.full_name || undefined,
        senderEmail: user.email || undefined,
        inviteLink,
        message: message || undefined,
        expiresAt: invitation.expires_at,
        type: 'group',
        groupName: invitation.group?.group_name || undefined,
        groupDescription: invitation.group?.description || undefined
      });
    } catch (emailError) {
      console.error('Error sending group invitation email:', emailError);
      // Don't fail the request if email sending fails
    }

    return NextResponse.json<GroupInvitationResponse>({
      success: true,
      invitation: {
        ...invitation,
        invite_link: inviteLink
      },
      message: 'Group invitation sent successfully'
    });

  } catch (error) {
    console.error('Error in create group invitation:', error);
    return NextResponse.json<GroupInvitationResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
