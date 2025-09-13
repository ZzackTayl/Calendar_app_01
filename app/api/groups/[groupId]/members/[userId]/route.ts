import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createSupabaseClient } from '@/lib/supabase/server';
import { validateCSRFProtection } from '@/lib/security/csrf';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; userId: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.success({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.success({
        success: false,
        error: 'Invalid CSRF token'
      }, { status: 403 });
    }

    const { groupId, userId } = params;

    // Validate parameters
    if (!groupId || !userId) {
      return api.success({
        success: false,
        error: 'Group ID and User ID are required'
      }, { status: 400 });
    }

    // Check if the current user is trying to remove themselves
    const isSelfRemoval = userId === user.id;

    // Get the group member record
    const { data: memberRecord, error: memberError } = await supabase
      .from('group_members')
      .select('*')
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

    // If not self-removal, check if current user has permission
    if (!isSelfRemoval) {
      // Get current user's membership
      const { data: currentUserMember, error: currentUserError } = await supabase
        .from('group_members')
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

      // Check if user has permission to remove members
      if (!currentUserMember.can_remove_members && currentUserMember.role !== 'creator') {
        return api.success({
          success: false,
          error: 'You do not have permission to remove members from this group'
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
