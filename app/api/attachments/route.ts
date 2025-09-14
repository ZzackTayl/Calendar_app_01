import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { checkRateLimit, getClientIP } from '@/lib/rate-limiting';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { EventAttachmentSchema } from '@/lib/validation/enhanced-schemas';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { ATTACHMENT_BUCKET } from '@/lib/storage/constants';

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    // File size limit check (5MB max)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'File size exceeds 5MB limit'
      });
    }
    
    // Apply rate limiting for file uploads
    const ip = getClientIP(request);
    const rateLimitConfig = {
      maxRequests: 10,
      windowMs: 3600000 // 10 uploads per hour
    };
    
    const rateLimitResult = checkRateLimit(ip, rateLimitConfig);
    if (rateLimitResult.isLimited) {
      return api.rateLimitExceeded(
        rateLimitResult.retryAfter || 60,
        {
          remaining: rateLimitResult.remaining,
          limit: rateLimitConfig.maxRequests,
          reset: rateLimitResult.resetTime
        }
      );
    }
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }

    // Parse the form data
    const formData = await request.formData();
    const eventId = formData.get('event_id') as string;
    const file = formData.get('file') as File;

    if (!eventId || !file) {
      return api.error(ErrorCode.VALIDATION_ERROR);
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
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: `File too large. Maximum size is ${maxSizeLabel}.${!isPremium ? ' Upgrade to premium for 10MB uploads.' : ''}`,
        details: {
          maxSize: maxSize,
          currentSize: file.size
        }
      })
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
      return api.error(ErrorCode.VALIDATION_ERROR);
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
      return api.error(ErrorCode.INTERNAL_ERROR);
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
      
      return api.error(ErrorCode.VALIDATION_ERROR);
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
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    return api.success(newAttachment, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/attachments:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    // Fetch attachments for the specific event
    const { data: attachments, error } = await supabase
      .from('event_attachments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    return api.success(attachments);
  } catch (error) {
    console.error('Unexpected error in GET /api/attachments:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}
