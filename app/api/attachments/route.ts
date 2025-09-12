import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { EventAttachmentSchema } from '@/lib/validation/enhanced-schemas';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { ATTACHMENT_BUCKET } from '@/lib/storage/constants';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Parse the form data
    const formData = await request.formData();
    const eventId = formData.get('event_id') as string;
    const file = formData.get('file') as File;

    if (!eventId || !file) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user profile to check subscription tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    // Validate file size based on subscription tier
    const isPremium = profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'pro';
    const maxSize = isPremium ? 10 * 1024 * 1024 : 3 * 1024 * 1024; // 10MB for premium, 3MB for free
    const maxSizeLabel = isPremium ? '10MB' : '3MB';
    
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${maxSizeLabel}.${!isPremium ? ' Upgrade to premium for 10MB uploads.' : ''}`,
        maxSize: maxSize,
        currentSize: file.size
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not supported.' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `events/${user.id}/${eventId}/${fileName}`;

    // Upload file to Supabase Storage
const { data: uploadData, error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get the public URL
const { data: urlData } = supabase.storage
      .from(ATTACHMENT_BUCKET)
      .getPublicUrl(filePath);

    // Create attachment record in database
    const attachmentData = {
      event_id: eventId,
      file_name: file.name,
      file_type: file.type,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by: user.id,
    };

    // Validate attachment data
    const validationResult = EventAttachmentSchema.safeParse(attachmentData);
    if (!validationResult.success) {
      // Clean up uploaded file if validation fails
await supabase.storage.from(ATTACHMENT_BUCKET).remove([filePath]);
      
      return NextResponse.json({ 
        error: 'Invalid attachment data', 
        details: validationResult.error.issues 
      }, { status: 400 });
    }

    const { data: newAttachment, error: dbError } = await supabase
      .from('event_attachments')
      .insert([validationResult.data])
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database insert fails
await supabase.storage.from(ATTACHMENT_BUCKET).remove([filePath]);
      
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Failed to save attachment' }, { status: 500 });
    }

    return NextResponse.json(newAttachment, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Fetch attachments for the specific event
    const { data: attachments, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    return NextResponse.json(attachments);
  } catch (error) {
    console.error('Unexpected error in GET /api/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
