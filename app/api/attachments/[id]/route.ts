import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { ATTACHMENT_BUCKET } from '@/lib/storage/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the specific attachment
    const { data: attachment, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
      }
      console.error('Error fetching attachment:', error);
      return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
    }

    return NextResponse.json(attachment);
  } catch (error) {
    console.error('Unexpected error in GET /api/attachments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the attachment details to find the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('id', params.id)
      .eq('uploaded_by', user.id) // Ensure user owns the attachment
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
      }
      console.error('Error fetching attachment:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch attachment' }, { status: 500 });
    }

    // Extract file path from URL for deletion
    const urlParts = attachment.file_url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = `events/${user.id}/${attachment.event_id}/${fileName}`;

    // Delete file from storage
const { error: storageError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete attachment record from database
    const { error: deleteError } = await supabase
      .from('event_attachments')
      .delete()
      .eq('id', params.id)
      .eq('uploaded_by', user.id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/attachments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
