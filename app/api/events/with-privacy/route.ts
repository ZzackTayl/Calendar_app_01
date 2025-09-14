import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { 

  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS 
} from '@/lib/rate-limiting'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    const ip = getClientIP(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
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
        'events with-privacy GET',
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
    const viewer_id = searchParams.get('viewer_id') // User ID of the person viewing the events
    const start_date = searchParams.get('start_date')
    const end_date = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // If no viewer_id provided, use the authenticated user
    const targetUserId = viewer_id || user.id

    // Use the privacy-aware view from our migration
    let query = supabase
      .from('events_with_privacy')
      .select(`
        *,
        relationship:relationship_id(
          id,
          partner_name,
          relationship_type,
          color
        )
      `)
      .eq('user_id', targetUserId)
      .eq('viewer_id', user.id) // The person requesting the events
      .order('start_time', { ascending: true })

    // Apply date filters
    if (start_date) {
      query = query.gte('start_time', start_date)
    }

    if (end_date) {
      query = query.lte('end_time', end_date)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events with privacy:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
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
    console.error('Error in events with-privacy GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}