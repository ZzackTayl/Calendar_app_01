import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { ATTACHMENT_BUCKET } from '@/lib/storage/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Fetch the specific attachment
    const { data: attachment, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return api.error(ErrorCode.NOT_FOUND);
      }
      console.error('Error fetching attachment:', error);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    return api.success(attachment);
  } catch (error) {
    console.error('Unexpected error in GET /api/attachments/[id]:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
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
        return api.error(ErrorCode.NOT_FOUND);
      }
      console.error('Error fetching attachment:', fetchError);
      return api.error(ErrorCode.INTERNAL_ERROR);
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
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    return api.success({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/attachments/[id]:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}
