import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const supabase = createSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { groupId } = params;

    // Validate parameters
    if (!groupId) {
      return NextResponse.json({
        success: false,
        error: 'Group ID is required'
      }, { status: 400 });
    }

    // Check if user is the creator of the group
    const { data: groupMember, error: memberError } = await supabase
      .from('relationship_group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (memberError || !groupMember) {
      return NextResponse.json({
        success: false,
        error: 'You are not a member of this group'
      }, { status: 403 });
    }

    if (groupMember.role !== 'creator') {
      return NextResponse.json({
        success: false,
        error: 'Only the group creator can delete the group'
      }, { status: 403 });
    }

    // Delete the group (this will cascade to all related records)
    const { error: deleteError } = await supabase
      .from('relationship_groups')
      .delete()
      .eq('id', groupId)
      .eq('user_id', user.id); // Extra safety check

    if (deleteError) {
      console.error('Error deleting group:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete group'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete group:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
