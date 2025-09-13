import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Fetch user's timezone preference
    const { data: userData, error } = await supabase
      .from('users')
      .select('time_zone')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user timezone:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ 
      timezone: userData?.time_zone || 'UTC' 
    })
    
  } catch (error) {
    console.error('Error in timezone GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
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
    const { timezone } = body

    if (!timezone) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Update user's timezone preference
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ time_zone: timezone })
      .eq('id', user.id)
      .select('time_zone')
      .single()

    if (error) {
      console.error('Error updating user timezone:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ 
      timezone: updatedUser?.time_zone 
    })
    
  } catch (error) {
    console.error('Error in timezone PUT:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
