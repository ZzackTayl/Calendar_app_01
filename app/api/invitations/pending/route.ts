import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { PendingInvitationsResponse } from '@/lib/supabase/types';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<PendingInvitationsResponse>({
        success: false,
        invitations: [],
        count: 0,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get pending invitations for this user
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select(`
        *,
        sender:users!invitations_sender_id_fkey(
          id,
          phone_number
        )
      `)
      .eq('recipient_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json<PendingInvitationsResponse>({
        success: false,
        invitations: [],
        count: 0,
        error: 'Failed to fetch invitations'
      }, { status: 500 });
    }

    // Also get invitations sent to user's email (for users who haven't signed up yet)
    const { data: emailInvitations, error: emailError } = await supabase
      .from('invitations')
      .select(`
        *,
        sender:users!invitations_sender_id_fkey(
          id,
          phone_number
        )
      `)
      .eq('recipient_email', user.email)
      .is('recipient_user_id', null)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (emailError) {
      console.error('Error fetching email invitations:', emailError);
    }

    // Combine both sets of invitations
    const allInvitations = [
      ...(invitations || []),
      ...(emailInvitations || [])
    ];

    return NextResponse.json<PendingInvitationsResponse>({
      success: true,
      invitations: allInvitations,
      count: allInvitations.length
    });

  } catch (error) {
    console.error('Error in get pending invitations:', error);
    return NextResponse.json<PendingInvitationsResponse>({
      success: false,
      invitations: [],
      count: 0,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
