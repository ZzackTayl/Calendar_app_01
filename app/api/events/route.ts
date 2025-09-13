import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { paginatedQuery } from '@/lib/database-utils'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS 
} from '@/lib/rate-limiting'
import { z } from 'zod'
import { ConnectionTier, PrivacyOverride } from '@/lib/supabase/types';
import { createPermissionService } from '@/lib/permissions/permission-service';
import { 

  encryptEventDescription, 
  decryptEventDescription, 
  encryptLocation, 
  decryptLocation,
  encryptSensitiveFields,
  decryptSensitiveFields
} from '@/lib/encryption/field-encryption';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Event validation schemas
const eventSchema = z.object({
  title: z.string().min(1).max(200).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Title contains invalid characters' }
  ),
  description: z.string().max(2000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ),
  start_time: z.string().refine(dateStr => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid start date/time format"),
  end_time: z.string().refine(dateStr => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid end date/time format"),
  location: z.string().max(500).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Location contains invalid characters' }
  ),
  time_zone: z.string().max(100).optional(),
  is_all_day: z.boolean().optional().default(false),
  privacy_override: z.enum(['default', 'private']).optional(), // New unified privacy system
  privacy_level: z.enum(['private', 'busy_only', 'details']).optional(), // Legacy - for backward compatibility
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  visible_to_groups: z.array(z.string().uuid()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  recurrence_rule: z.string().optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Recurrence rule contains invalid characters' }
  ),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().default('confirmed'),
}).refine(data => {
  // Check if end_time is after start_time
  const startDate = new Date(data.start_time);
  const endDate = new Date(data.end_time);
  return endDate > startDate;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(200).optional().nullable(),
  time_zone: z.string().max(100).optional(),
  is_all_day: z.boolean().optional(),
  privacy_override: z.enum(['default', 'private']).optional(), // New unified privacy system
  privacy_level: z.enum(['private', 'busy_only', 'details']).optional(), // Legacy - for backward compatibility
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  visible_to_groups: z.array(z.string().uuid()).optional(),
  color: z.string().optional().nullable(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
  recurrence_rule: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    const ip = getClientIP(request)
    
    // Enhanced authentication with session validation and recovery
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity,
          'X-Session-Health': authValidation.contextIntegrity
        }
      })
    }
    
    const user = authValidation.user

    // Apply user-based rate limiting for API calls
    const isAdmin = await isAdminUser(user.id)
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin)
    
    // Create headers for response
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'events GET',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      )
      
      return api.success(
        { 
          error: 'API rate limit exceeded. Please slow down your requests.',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const relationship_id = searchParams.get('relationship_id')
    const privacy_level = searchParams.get('privacy_level')
    const status = searchParams.get('status')
    
    // Use standardized pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    
    // Legacy support for limit/offset
    const legacyLimit = parseInt(searchParams.get('limit') || '0')
    const legacyOffset = parseInt(searchParams.get('offset') || '0')
    
    // Convert legacy parameters to page-based if provided
    const effectivePage = legacyLimit > 0 ? Math.floor(legacyOffset / legacyLimit) + 1 : page
    const effectivePageSize = legacyLimit > 0 ? legacyLimit : pageSize

    // Build base query for events
    let baseQuery = supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
    
    // Apply filters
    if (start_date) {
      baseQuery = baseQuery.gte('start_time', start_date)
    }
    
    if (end_date) {
      baseQuery = baseQuery.lte('end_time', end_date)
    }
    
    if (relationship_id) {
      baseQuery = baseQuery.eq('relationship_id', relationship_id)
    }
    
    if (privacy_level) {
      baseQuery = baseQuery.eq('privacy_level', privacy_level)
    }
    
    if (status) {
      baseQuery = baseQuery.eq('status', status)
    }
    
    if (search) {
      const sanitizedSearch = search.replace(/[<>'"]/g, '').trim()
      if (sanitizedSearch) {
        baseQuery = baseQuery.or(
          `title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,location.ilike.%${sanitizedSearch}%`
        )
      }
    }
    
    // Apply pagination using standardized utility
    let paginationResult;
    try {
      paginationResult = await paginatedQuery(
        baseQuery,
        {
          page: effectivePage,
          pageSize: effectivePageSize,
          orderBy: 'start_time',
          orderDirection: 'asc'
        }
      )
    } catch (error) {
      console.error('Error fetching events:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    const { data: events, pagination } = paginationResult

    // Decrypt sensitive fields for each event
    const decryptedEvents = (events || []).map((event: any) =>
      decryptSensitiveFields(event, [
        { 
          field: 'description', 
          decryptor: decryptEventDescription, 
          args: [event.privacy_level || 'private'] 
        },
        { 
          field: 'location', 
          decryptor: decryptLocation 
        }
      ])
    );

    // Return standardized response with pagination metadata
    return api.success({
      events: decryptedEvents,
      pagination
    }, {
      headers
    });
  } catch (error) {
    console.error('Error in events GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const ip = getClientIP(request)
    
    // Enhanced authentication with session validation first
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity
        }
      })
    }
    
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }

    const user = authValidation.user;
    const supabase = createRouteHandlerClient();

    // Apply event-specific rate limiting (more restrictive for creation)
    const isAdmin = await isAdminUser(user.id)
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.EVENT_OPERATIONS, isAdmin)
    
    // Create headers for response
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.EVENT_OPERATIONS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'events POST',
        'EVENT_OPERATIONS',
        {
          attempts: RATE_LIMITS.EVENT_OPERATIONS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      )
      
      return api.success(
        { 
          error: 'Too many event operations. Please slow down.',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers
        }
      )
    }

    const body = await request.json()
    const validatedData = eventSchema.parse(body)

    // Extract fields that need separate handling
    const { 
      visible_to_relationships, 
      visible_to_groups, 
      ...eventData 
    } = validatedData

    // Set default timezone if not provided
    if (!eventData.time_zone) {
      eventData.time_zone = 'UTC'
    }

    // Encrypt sensitive fields based on privacy level
    const encryptedEventData = encryptSensitiveFields(eventData, [
      { 
        field: 'description', 
        encryptor: encryptEventDescription, 
        args: [eventData.privacy_level || 'private'] 
      },
      { 
        field: 'location', 
        encryptor: encryptLocation 
      }
    ]);

    // Insert the event with encrypted data
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...encryptedEventData,
        user_id: user.id
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Handle explicit relationship/group permissions for private events
    // In the new privacy model, only private events can have explicit permissions
    // busy_only and details events use connection tier logic (handled by database functions)
    if (validatedData.privacy_level === 'private') {
      // Handle relationship permissions for private events
      if (visible_to_relationships && visible_to_relationships.length > 0) {
        const relationshipPermissions = visible_to_relationships.map(relationshipId => ({
          event_id: event.id,
          relationship_id: relationshipId,
          permission_level: 'private_override' // Special permission to override private event
        }))

        const { error: permissionsError } = await supabase
          .from('event_permissions')
          .insert(relationshipPermissions)

        if (permissionsError) {
          console.error('Error creating relationship permissions:', permissionsError)
          // Don't fail the entire request, just log the error
        }
      }

      // Handle group permissions for private events
      if (visible_to_groups && visible_to_groups.length > 0) {
        const groupPermissions = visible_to_groups.map(groupId => ({
          event_id: event.id,
          group_id: groupId,
          permission_level: 'private_override' // Special permission to override private event
        }))

        const { error: groupPermissionsError } = await supabase
          .from('event_permissions')
          .insert(groupPermissions)

        if (groupPermissionsError) {
          console.error('Error creating group permissions:', groupPermissionsError)
          // Don't fail the entire request, just log the error
        }
      }
    }

    // Decrypt sensitive fields before returning to client
    const decryptedEvent = decryptSensitiveFields(event, [
      { 
        field: 'description', 
        decryptor: decryptEventDescription, 
        args: [event.privacy_level || 'private'] 
      },
      { 
        field: 'location', 
        decryptor: decryptLocation 
      }
    ]);

    // Create successful response with rate limit headers
    const response = NextResponse.json({ event: decryptedEvent }, { status: 201 })
    
    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in events POST:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}