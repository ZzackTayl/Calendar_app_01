import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiting'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    // Apply rate limiting
    const ip = getClientIP(request);
    const rateLimitConfig = {
      ...RATE_LIMITS.EMAIL,
      maxRequests: 10,
      windowMs: 60000
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
    
    const supabase = await createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch notifications for the user
    const { data: notifications, error } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching notifications:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ notifications: notifications || [] })
    
  } catch (error) {
    console.error('Error in notifications GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    // Apply rate limiting
    const ip = getClientIP(request);
    const rateLimitConfig = {
      ...RATE_LIMITS.EMAIL,
      maxRequests: 10,
      windowMs: 60000
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
    
    const supabase = await createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request)
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN)
    }

    const body = await request.json()
    
    // Insert notification
    const { data: notification, error } = await supabase
      .from('scheduled_notifications')
      .insert({
        ...body,
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ notification }, { status: 201 })
    
  } catch (error) {
    console.error('Error in notifications POST:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
