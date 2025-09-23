import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Fetch user's timezone preference
    console.log('[TIMEZONE-API-DEBUG] Fetching timezone for user:', user.id, {
      timestamp: new Date().toISOString()
    });

    const { data: userData, error } = await supabase
      .from('user_profiles')
      .select('time_zone')
      .eq('id', user.id)
      .single()

    console.log('[TIMEZONE-API-DEBUG] Fetch result:', {
      hasData: !!userData,
      data: userData,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[TIMEZONE-API-DEBUG] Error fetching user timezone:', {
        error,
        userId: user.id,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });

      // Check for PGRST116 (column not found) errors
      if (error.code === 'PGRST116' || error.message?.includes('column')) {
        console.error('[TIMEZONE-API-DEBUG] SCHEMA MISMATCH DETECTED - Column not found:', {
          column: 'time_zone',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Check for PGRST116 (relation not found) errors - profile doesn't exist
      if (error.code === 'PGRST116' && error.message?.includes('user_profiles')) {
        console.log('[TIMEZONE-API-DEBUG] PROFILE MISSING - Attempting to create profile:', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });

        // Try to create the profile using direct upsert
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              time_zone: 'UTC',
              default_calendar_view: 'month',
              email_notifications: true,
              push_notifications: true,
              calendar_color_scheme: 'default',
              onboarding_source: 'web',
              marketing_consent: false,
              newsletter_consent: false
            }, { onConflict: 'id' });

          if (profileError) {
            console.error('[TIMEZONE-API-DEBUG] Failed to create profile:', profileError);
            return api.error(ErrorCode.INTERNAL_ERROR);
          }

          console.log('[TIMEZONE-API-DEBUG] Profile creation completed');

          // Retry the original query after profile creation
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .select('time_zone')
            .eq('id', user.id)
            .single();

          if (retryError) {
            console.error('[TIMEZONE-API-DEBUG] Retry failed:', retryError);
            return api.error(ErrorCode.INTERNAL_ERROR);
          }

          return api.success({
            timezone: retryData?.time_zone || 'UTC'
          });
        } catch (createError) {
          console.error('[TIMEZONE-API-DEBUG] Profile creation failed:', createError);
          return api.error(ErrorCode.INTERNAL_ERROR);
        }
      }

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
    const { timezone } = body

    if (!timezone) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Update user's timezone preference
    console.log('[TIMEZONE-API-DEBUG] Updating timezone for user:', user.id, {
      newTimezone: timezone,
      timestamp: new Date().toISOString()
    });

    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        time_zone: timezone
      })
      .select('time_zone')
      .single()

    console.log('[TIMEZONE-API-DEBUG] Update result:', {
      hasData: !!updatedUser,
      data: updatedUser,
      hasError: !!error,
      errorCode: error?.code,
      errorMessage: error?.message,
      timestamp: new Date().toISOString()
    });

    if (error) {
      console.error('[TIMEZONE-API-DEBUG] Error updating user timezone:', {
        error,
        userId: user.id,
        errorCode: error.code,
        errorMessage: error.message,
        newTimezone: timezone,
        timestamp: new Date().toISOString()
      });

      // Check for 409 conflicts
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('conflict')) {
        console.log('[TIMEZONE-API-DEBUG] 409 CONFLICT DETECTED - Profile may already exist:', {
          userId: user.id,
          newTimezone: timezone,
          timestamp: new Date().toISOString()
        });

        // Try to update instead of upsert
        try {
          const { data: updateData, error: updateError } = await supabase
            .from('user_profiles')
            .update({ time_zone: timezone })
            .eq('id', user.id)
            .select('time_zone')
            .single();

          if (updateError) {
            console.error('[TIMEZONE-API-DEBUG] Update after conflict failed:', updateError);
            return api.error(ErrorCode.INTERNAL_ERROR);
          }

          console.log('[TIMEZONE-API-DEBUG] Successfully updated timezone after conflict:', {
            userId: user.id,
            newTimezone: updateData?.time_zone
          });

          return api.success({
            timezone: updateData?.time_zone
          });
        } catch (updateErr) {
          console.error('[TIMEZONE-API-DEBUG] Update after conflict failed:', updateErr);
          return api.error(ErrorCode.INTERNAL_ERROR);
        }
      }

      // Check for schema issues
      if (error.code === 'PGRST116' || error.message?.includes('column')) {
        console.error('[TIMEZONE-API-DEBUG] SCHEMA MISMATCH DETECTED:', {
          column: 'time_zone',
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      }

      // Check for PGRST116 (relation not found) errors - profile doesn't exist
      if (error.code === 'PGRST116' && error.message?.includes('user_profiles')) {
        console.log('[TIMEZONE-API-DEBUG] PROFILE MISSING - Attempting to create profile:', {
          userId: user.id,
          newTimezone: timezone,
          timestamp: new Date().toISOString()
        });

        // Try to create the profile using direct upsert
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: user.id,
              time_zone: timezone,
              default_calendar_view: 'month',
              email_notifications: true,
              push_notifications: true,
              calendar_color_scheme: 'default',
              onboarding_source: 'web',
              marketing_consent: false,
              newsletter_consent: false
            }, { onConflict: 'id' });

          if (profileError) {
            console.error('[TIMEZONE-API-DEBUG] Failed to create profile:', profileError);
            return api.error(ErrorCode.INTERNAL_ERROR);
          }

          console.log('[TIMEZONE-API-DEBUG] Profile creation completed');

          // Retry the update after profile creation
          const { data: retryData, error: retryError } = await supabase
            .from('user_profiles')
            .update({ time_zone: timezone })
            .eq('id', user.id)
            .select('time_zone')
            .single();

          if (retryError) {
            console.error('[TIMEZONE-API-DEBUG] Retry update failed:', retryError);
            return api.error(ErrorCode.INTERNAL_ERROR);
          }

          return api.success({
            timezone: retryData?.time_zone
          });
        } catch (createError) {
          console.error('[TIMEZONE-API-DEBUG] Profile creation failed:', createError);
          return api.error(ErrorCode.INTERNAL_ERROR);
        }
      }

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
