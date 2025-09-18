import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { createUserIsolationService, createUserContext } from '@/lib/security/user-isolation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; userId: string } }
) {
  const api = createApiResponse();

  try {
    // Use consistent authentication pattern with enhanced session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.success({
        success: false,
        error: 'Authentication required',
        details: authValidation.error
      }, { status: 401 });
    }

    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.success({
        success: false,
        error: 'CSRF validation failed'
      }, { status: 403 });
    }

    const user = authValidation.user;
    const supabase = createRouteHandlerClient();
    const { groupId, userId } = params;

    // Validate parameters with proper UUID format validation
    if (!groupId || !userId ||
        typeof groupId !== 'string' || typeof userId !== 'string' ||
        !/^[0-9a-fA-F-]{36}$/.test(groupId) || !/^[0-9a-fA-F-]{36}$/.test(userId)) {
      return api.success({
        success: false,
        error: 'Valid Group ID and User ID are required'
      }, { status: 400 });
    }

    // Create user isolation service for secure operations
    const isolationService = createUserIsolationService(supabase);
    const userContext = createUserContext(user.id, ['write', 'delete'], authValidation.session?.access_token?.substring(0, 16));

    // First validate that the current user has access to this group
    const groupOwnershipValidation = await isolationService.validateOwnership(
      userContext,
      'group',
      groupId,
      'write'
    );

    if (!groupOwnershipValidation.allowed) {
      return api.success({
        success: false,
        error: 'Access denied: You do not have access to this group',
        reason: groupOwnershipValidation.reason
      }, { status: 403 });
    }

    // Check if the current user is trying to remove themselves
    const isSelfRemoval = userId === user.id;

    // Get the group member record using secure query to prevent cross-user access
    const { data: memberRecord, error: memberError } = await supabase
      .from('group_members')
      .select('*, user_id, role, can_remove_members')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (memberError || !memberRecord) {
      return api.success({
        success: false,
        error: 'User is not a member of this group'
      }, { status: 404 });
    }

    // CRITICAL FIX: If not self-removal, validate permissions securely
    if (!isSelfRemoval) {
      // Use secure query to get current user's membership with proper user isolation
      const { data: currentUserMember, error: currentUserError } = await supabase
        .from('relationship_group_members')
        .select('role, can_remove_members')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .is('left_at', null)
        .single();

      if (currentUserError || !currentUserMember) {
        return api.success({
          success: false,
          error: 'You are not a member of this group'
        }, { status: 403 });
      }

      // SECURITY FIX: Prevent privilege escalation - creators cannot be removed by others
      if (memberRecord.role === 'creator') {
        return api.success({
          success: false,
          error: 'Group creators cannot be removed by other members'
        }, { status: 403 });
      }

      // SECURITY FIX: Enforce proper permission hierarchy
      if (currentUserMember.role !== 'creator' && !currentUserMember.can_remove_members) {
        return api.success({
          success: false,
          error: 'You do not have permission to remove members from this group'
        }, { status: 403 });
      }

      // SECURITY FIX: Prevent non-creators from removing other elevated members
      if (currentUserMember.role !== 'creator' &&
          memberRecord.role === 'admin') {
        return api.success({
          success: false,
          error: 'Only group creators can remove administrators'
        }, { status: 403 });
      }
    }

    // Mark the member as left
    const { error: updateError } = await supabase
      .from('group_members')
      .update({
        left_at: new Date().toISOString()
      })
      .eq('id', memberRecord.id);

    if (updateError) {
      console.error('Error removing group member:', updateError);
      return api.success({
        success: false,
        error: 'Failed to remove member from group'
      }, { status: 500 });
    }

    // Remove all permissions involving this user
    const { error: permissionsError } = await supabase
      .from('group_member_permissions')
      .delete()
      .eq('group_id', groupId)
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

    if (permissionsError) {
      console.error('Error removing group permissions:', permissionsError);
      // Don't fail the request, just log the error
    }

    return api.success({
      success: true,
      message: isSelfRemoval ? 'You have left the group' : 'Member removed from group successfully'
    });

  } catch (error) {
    console.error('Error in remove group member:', error);
    return api.success({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
