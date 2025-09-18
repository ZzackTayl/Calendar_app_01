import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { createUserIsolationService, createUserContext } from '@/lib/security/user-isolation';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
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
    const { groupId } = params;

    // Validate parameters with proper sanitization
    if (!groupId || typeof groupId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(groupId)) {
      return api.success({
        success: false,
        error: 'Valid Group ID is required'
      }, { status: 400 });
    }

    // Create user isolation service for secure operations
    const isolationService = createUserIsolationService(supabase);
    const userContext = createUserContext(user.id, ['write', 'delete'], authValidation.sessionId);

    // Validate group ownership using isolation service
    const ownershipValidation = await isolationService.validateOwnership(
      userContext,
      'group',
      groupId,
      'delete'
    );

    if (!ownershipValidation.allowed) {
      return api.success({
        success: false,
        error: 'Access denied: You do not have permission to delete this group',
        reason: ownershipValidation.reason
      }, { status: 403 });
    }

    // Use secure query to check group creator role with proper user isolation
    const secureQuery = isolationService.createSecureQuery(userContext, 'relationship_group_members');
    const { data: groupMember, error: memberError } = await secureQuery
      .select('role')
      .eq('group_id', groupId)
      .is('left_at', null)
      .single();

    if (memberError || !groupMember) {
      return api.success({
        success: false,
        error: 'You are not a member of this group or access denied'
      }, { status: 403 });
    }

    // Only group creators can delete groups - this prevents privilege escalation
    if (groupMember.role !== 'creator') {
      return api.success({
        success: false,
        error: 'Only the group creator can delete the group'
      }, { status: 403 });
    }

    // Use secure query to delete group with automatic user_id filtering
    const secureGroupQuery = isolationService.createSecureQuery(userContext, 'relationship_groups');
    const { error: deleteError } = await secureGroupQuery
      .delete()
      .eq('id', groupId);

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return api.success({
        success: false,
        error: 'Failed to delete group'
      }, { status: 500 });
    }

    return api.success({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete group:', error);
    return api.success({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
