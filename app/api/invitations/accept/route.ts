import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { AcceptInvitationRequest, ConnectionSetupResponse } from '@/lib/supabase/types';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Invalid CSRF token'
      }, { status: 403 });
    }

    // Parse the request body
    const body: AcceptInvitationRequest = await request.json();
    const {
      invitation_id,
      setup_permissions = true,
      create_relationship = false,
      relationship_type,
      custom_relationship_name,
      assign_to_group = false,
      group_id,
      create_new_group = false,
      new_group_name,
      new_group_description
    } = body;

    // Validate required fields
    if (!invitation_id) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Invitation ID is required'
      }, { status: 400 });
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitation_id)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Invitation not found or already processed'
      }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Invitation has expired'
      }, { status: 410 });
    }

    // Check if user is the intended recipient
    if (invitation.recipient_user_id && invitation.recipient_user_id !== user.id) {
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'You are not the intended recipient of this invitation'
      }, { status: 403 });
    }

    // Update invitation status to accepted
    const { error: updateInvitationError } = await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        recipient_user_id: user.id
      })
      .eq('id', invitation_id);

    if (updateInvitationError) {
      console.error('Error updating invitation:', updateInvitationError);
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Failed to update invitation'
      }, { status: 500 });
    }

    // Create connection setup record
    const connectionSetupData = {
      user_a_id: invitation.sender_id,
      user_b_id: user.id,
      setup_status: setup_permissions ? 'pending' : 'skipped',
      user_a_to_b_individual_permission: body.user_a_to_b_individual_permission || 'limited_access',
      user_b_to_a_individual_permission: body.user_b_to_a_individual_permission || 'limited_access',
      user_a_to_b_group_permission: body.user_a_to_b_group_permission || null,
      user_b_to_a_group_permission: body.user_b_to_a_group_permission || null
    };

    const { data: connectionSetup, error: connectionError } = await supabase
      .from('connection_setups')
      .insert(connectionSetupData)
      .select()
      .single();

    if (connectionError) {
      console.error('Error creating connection setup:', connectionError);
      return NextResponse.json<ConnectionSetupResponse>({
        success: false,
        error: 'Failed to create connection setup'
      }, { status: 500 });
    }

    let relationshipCreated = false;
    let groupAssigned = false;
    let assignedGroupId = null;

    // Handle group creation if requested
    if (create_new_group && new_group_name) {
      const { data: newGroup, error: groupError } = await supabase
        .from('relationship_groups')
        .insert({
          user_id: user.id,
          group_name: new_group_name,
          description: new_group_description || null
        })
        .select()
        .single();

      if (!groupError && newGroup) {
        assignedGroupId = newGroup.id;
        groupAssigned = true;
      }
    } else if (assign_to_group && group_id) {
      // Verify user has access to the group
      const { data: groupAccess } = await supabase
        .from('relationship_groups')
        .select('id')
        .eq('id', group_id)
        .eq('user_id', user.id)
        .single();

      if (groupAccess) {
        assignedGroupId = group_id;
        groupAssigned = true;
      }
    }

    // Handle relationship creation if requested
    if (create_relationship && relationship_type) {
      const relationshipData = {
        user_id: user.id,
        partner_id: invitation.sender_id,
        relationship_type,
        custom_type_name: custom_relationship_name || null,
        default_connection_tier: 'busy_only' as const
      };

      const { error: relationshipError } = await supabase
        .from('relationships')
        .insert(relationshipData);

      if (!relationshipError) {
        relationshipCreated = true;
      }
    }

    // Update connection setup with final details
    const updateData: any = {
      setup_status: 'completed',
      completed_at: new Date().toISOString()
    };

    if (assignedGroupId) {
      updateData.assigned_group_id = assignedGroupId;
    }

    if (relationship_type) {
      updateData.relationship_type = relationship_type;
      updateData.custom_relationship_name = custom_relationship_name;
    }

    const { error: updateConnectionError } = await supabase
      .from('connection_setups')
      .update(updateData)
      .eq('id', connectionSetup.id);

    if (updateConnectionError) {
      console.error('Error updating connection setup:', updateConnectionError);
    }

    return NextResponse.json<ConnectionSetupResponse>({
      success: true,
      connection_setup: {
        ...connectionSetup,
        ...updateData
      },
      relationship_created: relationshipCreated,
      group_assigned: groupAssigned,
      message: 'Invitation accepted successfully'
    });

  } catch (error) {
    console.error('Error in accept invitation:', error);
    return NextResponse.json<ConnectionSetupResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
