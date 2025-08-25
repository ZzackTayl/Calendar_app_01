import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { AcceptGroupInvitationRequest, GroupInvitationResponse, PrivacyLevel } from '@/lib/supabase/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse the request body
    const body: AcceptGroupInvitationRequest = await request.json();
    const { invitation_id, member_permissions } = body;

    // Validate required fields
    if (!invitation_id) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Invitation ID is required'
      }, { status: 400 });
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
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
      .eq('id', invitation_id)
      .eq('status', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Group invitation not found or already processed'
      }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Group invitation has expired'
      }, { status: 410 });
    }

    // Check if user is the intended recipient
    if (invitation.invitee_user_id && invitation.invitee_user_id !== user.id) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'You are not the intended recipient of this invitation'
      }, { status: 403 });
    }

    // Check if user is already a member of the group
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', invitation.group_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (existingMember) {
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'You are already a member of this group'
      }, { status: 409 });
    }

    // Update invitation status to accepted
    const { error: updateInvitationError } = await supabase
      .from('group_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invitee_user_id: user.id
      })
      .eq('id', invitation_id);

    if (updateInvitationError) {
      console.error('Error updating group invitation:', updateInvitationError);
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Failed to update group invitation'
      }, { status: 500 });
    }

    // Add user to the group
    const { data: groupMember, error: addMemberError } = await supabase
      .from('group_members')
      .insert({
        group_id: invitation.group_id,
        user_id: user.id,
        role: 'member',
        can_invite_members: true,
        can_edit_group_info: false,
        can_remove_members: false
      })
      .select()
      .single();

    if (addMemberError) {
      console.error('Error adding user to group:', addMemberError);
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Failed to add user to group'
      }, { status: 500 });
    }

    // Get all existing group members
    const { data: existingMembers, error: membersError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', invitation.group_id)
      .is('left_at', null);

    if (membersError) {
      console.error('Error fetching group members:', membersError);
      return NextResponse.json<GroupInvitationResponse>({
        success: false,
        error: 'Failed to fetch group members'
      }, { status: 500 });
    }

    // Set up permissions for the new member
    const permissionInserts = [];

    // 1. Set permissions for the new member to see all existing members
    for (const member of existingMembers || []) {
      if (member.user_id !== user.id) {
        const permission = {
          group_id: invitation.group_id,
          user_id: user.id,
          target_user_id: member.user_id,
          permission_level: 'limited_access' as PrivacyLevel,
          can_see_details: true,
          can_see_location: true,
          can_see_description: true,
          can_see_attendees: true,
          notify_on_events: true,
          notify_on_changes: false
        };

        // Override with user-provided permissions if available
        const userPermission = member_permissions?.find(p => p.target_user_id === member.user_id);
        if (userPermission) {
          permission.permission_level = userPermission.permission_level;
          if (userPermission.can_see_details !== undefined) permission.can_see_details = userPermission.can_see_details;
          if (userPermission.can_see_location !== undefined) permission.can_see_location = userPermission.can_see_location;
          if (userPermission.can_see_description !== undefined) permission.can_see_description = userPermission.can_see_description;
          if (userPermission.can_see_attendees !== undefined) permission.can_see_attendees = userPermission.can_see_attendees;
          if (userPermission.notify_on_events !== undefined) permission.notify_on_events = userPermission.notify_on_events;
          if (userPermission.notify_on_changes !== undefined) permission.notify_on_changes = userPermission.notify_on_changes;
        }

        permissionInserts.push(permission);
      }
    }

    // 2. Set permissions for all existing members to see the new member
    for (const member of existingMembers || []) {
      if (member.user_id !== user.id) {
        permissionInserts.push({
          group_id: invitation.group_id,
          user_id: member.user_id,
          target_user_id: user.id,
          permission_level: 'limited_access' as PrivacyLevel,
          can_see_details: true,
          can_see_location: true,
          can_see_description: true,
          can_see_attendees: true,
          notify_on_events: true,
          notify_on_changes: false
        });
      }
    }

    // Insert all permissions
    if (permissionInserts.length > 0) {
      const { error: permissionsError } = await supabase
        .from('group_member_permissions')
        .insert(permissionInserts);

      if (permissionsError) {
        console.error('Error setting group permissions:', permissionsError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json<GroupInvitationResponse>({
      success: true,
      invitation: {
        ...invitation,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        invitee_user_id: user.id
      },
      message: 'Group invitation accepted successfully'
    });

  } catch (error) {
    console.error('Error in accept group invitation:', error);
    return NextResponse.json<GroupInvitationResponse>({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
