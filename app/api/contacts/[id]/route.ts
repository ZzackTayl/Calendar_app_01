import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS
} from '@/lib/rate-limiting'
import { z } from 'zod'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Define schemas for validation
const contactUpdateSchema = z.object({
  partner_name: z.string().min(1, { message: 'Name is required' }).optional(),
  partner_email: z.string().email({ message: 'Invalid email' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship_type: z.enum(['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other']).optional(),
  start_date: z.string().optional().nullable(),
  color: z.string().min(1, { message: 'Color is required' }).optional(),
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(), // Legacy - for backward compatibility
  is_active: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  contact_frequency: z.enum(['frequent', 'regular', 'occasional', 'rare']).optional().nullable(),
  tags: z.array(z.string()).optional().nullable()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Enhanced authentication with session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required',
        details: authValidation.error
      });
    }

    const user = authValidation.user;
    const supabase = await createRouteHandlerClient();

    // Apply rate limiting for contact operations
    const isAdmin = await isAdminUser(user.id);
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'contacts/[id] GET',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    // Validate and sanitize the ID parameter
    if (!params.id || typeof params.id !== 'string' || !/^[a-f0-9-]+$/i.test(params.id)) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'Invalid contact ID format'
      });
    }
    
    // Fetch the contact
    const { data, error } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return api.error(ErrorCode.NOT_FOUND);
      }
      console.error('Database error:', error);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // In a real implementation, we would also fetch related data like tags
    // and merge them with the contact data

    return api.success({ contact: data }, { headers });
    
  } catch (error) {
    console.error('Error fetching contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Enhanced authentication with session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required',
        details: authValidation.error
      });
    }

    const user = authValidation.user;

    // SECURITY: Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN, {
        message: 'CSRF validation failed',
        details: csrfValidation.error
      });
    }

    const supabase = await createRouteHandlerClient();

    // Apply rate limiting for contact operations
    const isAdmin = await isAdminUser(user.id);
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'contacts/[id] PUT',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    // Validate and sanitize the ID parameter
    if (!params.id || typeof params.id !== 'string' || !/^[a-f0-9-]+$/i.test(params.id)) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'Invalid contact ID format'
      });
    }
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = contactUpdateSchema.parse(body)
    
    // Add updated_at timestamp
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }
    
    // Update in database
    const { data, error } = await supabase
      .from('relationships')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      console.error('Database error:', error);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    if (data.length === 0) {
      return api.error(ErrorCode.NOT_FOUND);
    }

    // Handle tags update (in a real implementation)
    // This would update tags in a separate table related to the contact

    return api.success({ contact: data[0] }, { headers });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.success({ error: error.issues }, { status: 400 })
    }
    
    console.error('Error updating contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Enhanced authentication with session validation
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required',
        details: authValidation.error
      });
    }

    const user = authValidation.user;

    // SECURITY: Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN, {
        message: 'CSRF validation failed',
        details: csrfValidation.error
      });
    }

    const supabase = await createRouteHandlerClient();

    // Apply rate limiting for contact operations
    const isAdmin = await isAdminUser(user.id);
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'contacts/[id] DELETE',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    // Validate and sanitize the ID parameter
    if (!params.id || typeof params.id !== 'string' || !/^[a-f0-9-]+$/i.test(params.id)) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'Invalid contact ID format'
      });
    }
    
    // Delete the contact
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Database error:', error);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // In a real implementation, we would also delete related data
    // like tags, communication history, etc.

    return api.success({ success: true }, { headers });
    
  } catch (error) {
    console.error('Error deleting contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
