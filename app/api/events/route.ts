import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'
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
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']),
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
  title: z.string().min(1).max(200).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Title contains invalid characters' }
  ).optional(),
  description: z.string().max(2000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ).optional(),
  start_time: z.string().refine(dateStr => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid start date/time format").optional(),
  end_time: z.string().refine(dateStr => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid end date/time format").optional(),
  location: z.string().max(500).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Location contains invalid characters' }
  ).optional(),
  time_zone: z.string().max(100).optional(),
  is_all_day: z.boolean().optional(),
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(),
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  visible_to_groups: z.array(z.string().uuid()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  recurrence_rule: z.string().optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Recurrence rule contains invalid characters' }
  ).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    const ip = getClientIP(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      
      return NextResponse.json(
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
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the base query
    let query = supabase
      .from('events')
      .select(`
        *,
        relationship:relationship_id(
          id,
          partner_name,
          relationship_type,
          color
        ),
        event_permissions(
          relationship_id,
          group_id,
          permission_level
        )
      `)
      .eq('user_id', user.id)
      .order('start_time', { ascending: true })

    // Apply filters with proper sanitization
    if (search) {
      const sanitizedSearch = search.replace(/[<>'"]/g, '').trim()
      if (sanitizedSearch) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,location.ilike.%${sanitizedSearch}%`)
      }
    }

    if (start_date) {
      query = query.gte('start_time', start_date)
    }

    if (end_date) {
      query = query.lte('end_time', end_date)
    }

    if (relationship_id) {
      query = query.eq('relationship_id', relationship_id)
    }

    if (privacy_level) {
      const validPrivacyLevels = ['private', 'visible', 'semi_private', 'public']
      if (validPrivacyLevels.includes(privacy_level)) {
        query = query.eq('privacy_level', privacy_level)
      }
    }

    if (status) {
      const validStatuses = ['confirmed', 'tentative', 'cancelled']
      if (validStatuses.includes(status)) {
        query = query.eq('status', status)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    // Create successful response with rate limit headers
    const response = NextResponse.json({ 
      events: events || [], 
      total: events?.length || 0 
    })
    
    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    console.error('Error in events GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ 
        error: 'CSRF validation failed',
        details: csrfValidation.error 
      }, { status: 403 });
    }

    const user = csrfValidation.user;
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
      
      return NextResponse.json(
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

    // Insert the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...eventData,
        user_id: user.id
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }

    // Handle semi_private and public privacy permissions  
    if (validatedData.privacy_level === 'semi_private' || validatedData.privacy_level === 'public') {
      // Handle relationship permissions
      if (visible_to_relationships && visible_to_relationships.length > 0) {
        const relationshipPermissions = visible_to_relationships.map(relationshipId => ({
          event_id: event.id,
          relationship_id: relationshipId,
          permission_level: validatedData.privacy_level === 'public' ? 'public' : 'visible'
        }))

        const { error: permissionsError } = await supabase
          .from('event_permissions')
          .insert(relationshipPermissions)

        if (permissionsError) {
          console.error('Error creating relationship permissions:', permissionsError)
          // Don't fail the entire request, just log the error
        }
      }

      // Handle group permissions
      if (visible_to_groups && visible_to_groups.length > 0) {
        const groupPermissions = visible_to_groups.map(groupId => ({
          event_id: event.id,
          group_id: groupId,
          permission_level: validatedData.privacy_level === 'public' ? 'public' : 'visible'
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

    // Create successful response with rate limit headers
    const response = NextResponse.json({ event }, { status: 201 })
    
    // Add rate limit headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error in events POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}