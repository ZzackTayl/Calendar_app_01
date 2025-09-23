import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { checkRateLimit, getClientIP } from '@/lib/rate-limiting'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { isAfter } from 'date-fns'
import * as crypto from 'crypto'

// POST /api/sharing/token - Access a share via token
export async function POST(request: NextRequest) {
  const api = createApiResponse();

  const supabase = await createRouteHandlerClient()
  
  try {
    // Apply rate limiting to prevent token generation abuse
    const ip = getClientIP(request);
    const rateLimitConfig = {
      maxRequests: 20,
      windowMs: 3600000 // 20 tokens per hour
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
    // Parse the request body
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    // Find the share by token
    const { data: shareData, error: shareError } = await supabase
      .from('calendar_shares')
      .select(`
        *,
        owner:user_id(*),
        calendars:selected_calendars(
          calendar_id,
          calendar:calendar_id(id, name, color, description)
        )
      `)
      .eq('share_token', token)
      .eq('share_type', 'link')
      .single()
    
    if (shareError) {
      if (shareError.code === 'PGRST116') {
        return api.error(ErrorCode.NOT_FOUND)
      }
      console.error('Database error:', shareError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    // Check if the share has expired
    if (shareData.expires_at && isAfter(new Date(), new Date(shareData.expires_at))) {
      return api.error(ErrorCode.FORBIDDEN)
    }
    
    // Update last accessed timestamp
    await supabase
      .from('calendar_shares')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', shareData.id)
    
    // Prepare the response
    const share = {
      id: shareData.id,
      owner: {
        id: shareData.owner.id,
        name: shareData.owner.full_name || 'User',
      },
      created: shareData.created_at,
      expires: shareData.expires_at,
      privacyLevel: shareData.privacy_level,
      allowResharing: shareData.allow_resharing,
      showPrivateEvents: shareData.privacy_level === 'full_access',
    }
    
    // Format the calendars
    const calendars = shareData.calendars?.map((cal: any) => ({
      id: cal.calendar?.id || cal.calendar_id,
      name: cal.calendar?.name || 'Calendar',
      color: cal.calendar?.color || '#3b82f6',
      owner: shareData.owner.full_name || 'User',
      description: cal.calendar?.description,
      privacyLevel: shareData.privacy_level
    })) || []
    
    // Return the share data
    return api.success({
      share,
      calendars
    })
    
  } catch (error) {
    console.error('Error accessing shared calendar:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

// PUT /api/sharing/token - Generate a new token for a share
export async function PUT(request: NextRequest) {
  const api = createApiResponse();

  const supabase = await createRouteHandlerClient()
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }
    
    // Parse the request body
    const body = await request.json()
    const { shareId } = body
    
    if (!shareId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    // Check if the share exists and belongs to the user
    const { data: shareData, error: shareError } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('id', shareId)
      .eq('user_id', session.user.id)
      .eq('share_type', 'link')
      .single()
    
    if (shareError) {
      if (shareError.code === 'PGRST116') {
        return api.error(ErrorCode.NOT_FOUND)
      }
      console.error('Database error:', shareError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    // Generate a new token
    const newToken = crypto.randomBytes(16).toString('hex')
    
    // Update the share with the new token
    const { error: updateError } = await supabase
      .from('calendar_shares')
      .update({ 
        share_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareId)
    
    if (updateError) {
      console.error('Error updating share token:', updateError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    return api.success({ token: newToken })
    
  } catch (error) {
    console.error('Error regenerating token:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

