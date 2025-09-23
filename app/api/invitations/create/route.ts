import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createSupabaseClient } from '@/lib/supabase/server';
import { CreateInvitationRequest, InvitationResponse } from '@/lib/supabase/types';
import { generateInviteToken, createInviteLink, createSmartInviteLink, createMobileInviteLink } from '@/lib/invitations/token-utils';
import { checkInvitationRateLimit } from '@/lib/invitations/token-utils';
import { sendInvitationNotification } from '@/lib/email/invitation-service';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const supabase = await createSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // Validate CSRF token after authentication
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: csrfValidation.error || 'CSRF validation failed'
      }, { status: 403 });
    }

    // Parse the request body
    const body: CreateInvitationRequest = await request.json();
    const { recipient_email, recipient_phone, message, invitation_type = 'friend_request' } = body;

    // Check rate limiting
    const rateLimit = await checkInvitationRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: `Rate limit exceeded. You can send ${rateLimit.remaining || 0} more invitations. Limit resets at ${rateLimit.resetTime?.toLocaleTimeString()}`
      }, { status: 429 });
    }

    // Validate required fields
    if (!recipient_email) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: 'Recipient email is required'
      }, { status: 400 });
    }

    // Check if user is trying to invite themselves
    if (recipient_email === user.email) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: 'You cannot invite yourself'
      }, { status: 400 });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('sender_id', user.id)
      .eq('recipient_email', recipient_email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: 'An invitation has already been sent to this email'
      }, { status: 409 });
    }

    // Check if recipient is already a user
    const { data: recipientUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', recipient_email)
      .single();

    // Create the invitation
    const invitationData = {
      invitation_type,
      sender_id: user.id,
      recipient_email,
      recipient_phone: recipient_phone || null,
      message: message || null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      status: 'pending' as const,
      recipient_user_id: recipientUser?.id || null
    };

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invitation:', insertError);
      return NextResponse.json<InvitationResponse>({
        success: false,
        error: 'Failed to create invitation'
      }, { status: 500 });
    }

    // Create invitation token for secure links
    const { token, tokenHash } = generateInviteToken();
    const inviteLink = createSmartInviteLink(token, request.headers.get('user-agent') || undefined);
    const mobileAppLink = createMobileInviteLink(token, { preferApp: true });

    const { error: tokenError } = await supabase
      .from('invitation_tokens')
      .insert({
        invitation_id: invitation.id,
        token_hash: tokenHash,
        expires_at: invitation.expires_at
      });

    if (tokenError) {
      console.error('Error creating invitation token:', tokenError);
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
        recipientEmail: recipient_email,
        senderName: senderProfile?.full_name || undefined,
        senderEmail: user.email || undefined,
        inviteLink,
        mobileAppLink,
        message: message || undefined,
        expiresAt: invitation.expires_at,
        type: 'individual',
        userAgent: request.headers.get('user-agent') || undefined
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email sending fails
    }

    return NextResponse.json<InvitationResponse>({
      success: true,
      invitation: {
        ...invitation,
        invite_link: inviteLink
      },
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error in create invitation:', error);
    return NextResponse.json<InvitationResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
