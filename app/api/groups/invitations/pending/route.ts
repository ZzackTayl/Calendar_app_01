import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createSupabaseClient } from '@/lib/supabase/server';
import { PendingGroupInvitationsResponse } from '@/lib/supabase/types';
import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<PendingGroupInvitationsResponse>({
        success: false,
        invitations: [],
        count: 0,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get pending group invitations for this user
    const { data: invitations, error: invitationsError } = await supabase
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
      .eq('invitee_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching group invitations:', invitationsError);
      return NextResponse.json<PendingGroupInvitationsResponse>({
        success: false,
        invitations: [],
        count: 0,
        error: 'Failed to fetch group invitations'
      }, { status: 500 });
    }

    // Also get invitations sent to user's email (for users who haven't signed up yet)
    const { data: emailInvitations, error: emailError } = await supabase
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
      .eq('invitee_email', user.email)
      .is('invitee_user_id', null)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (emailError) {
      console.error('Error fetching email group invitations:', emailError);
    }

    // Combine both sets of invitations
    const allInvitations = [
      ...(invitations || []),
      ...(emailInvitations || [])
    ];

    return NextResponse.json<PendingGroupInvitationsResponse>({
      success: true,
      invitations: allInvitations,
      count: allInvitations.length
    });

  } catch (error) {
    console.error('Error in get pending group invitations:', error);
    return NextResponse.json<PendingGroupInvitationsResponse>({
      success: false,
      invitations: [],
      count: 0,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
