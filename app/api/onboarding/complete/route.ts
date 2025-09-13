import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { z } from 'zod';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { NextResponse } from 'next/server';

const completeOnboardingSchema = z.object({
  force_complete: z.boolean().default(false), // Allow forcing completion even if steps are missing
  skip_validation: z.boolean().default(false), // Skip validation of required fields
});

// POST - Mark onboarding as completed
export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }

    const body = await request.json();
    const { force_complete, skip_validation } = completeOnboardingSchema.parse(body);

    // Check current onboarding status
    const { data: onboardingData, error: onboardingError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (onboardingError && onboardingError.code !== 'PGRST116') {
      console.error('Error fetching onboarding data:', onboardingError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // If no onboarding record exists, create one
    if (!onboardingData) {
      const { error: createError } = await supabase
        .rpc('create_default_onboarding_record', { user_id_param: user.id });

      if (createError) {
        console.error('Error creating default onboarding record:', createError);
        return api.error(ErrorCode.INTERNAL_ERROR);
      }
    }

    // Validate required fields unless skipping validation or forcing completion
    if (!skip_validation && !force_complete) {
      const missingFields = [];

      if (!onboardingData?.relationship_style) {
        missingFields.push('relationship_style');
      }

      if (!onboardingData?.primary_use_case) {
        missingFields.push('primary_use_case');
      }

      if (onboardingData?.relationship_style === 'other' && !onboardingData?.custom_relationship_style) {
        missingFields.push('custom_relationship_style');
      }

      if (missingFields.length > 0) {
        return api.error(ErrorCode.VALIDATION_ERROR);
      }
    }

    // Mark onboarding as completed
    const { data: updateData, error: updateError } = await supabase
      .from('user_onboarding')
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (updateError) {
      console.error('Error completing onboarding:', updateError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Track completion in analytics
    try {
      await supabase
        .from('onboarding_analytics')
        .insert({
          user_id: user.id,
          step_name: 'onboarding_completion',
          step_number: 999,
          action_taken: force_complete ? 'forced_complete' : 'completed',
          user_agent: request.headers.get('user-agent'),
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip'),
        });
    } catch (analyticsError) {
      console.error('Failed to track onboarding completion:', analyticsError);
      // Don't fail the request for analytics errors
    }

    // Initialize calendar integration setup if user requested any integrations
    if (onboardingData?.wants_google_calendar_sync || 
        onboardingData?.wants_apple_calendar_sync || 
        onboardingData?.wants_outlook_calendar_sync) {
      
      try {
        await supabase
          .from('calendar_integration_setup')
          .upsert({
            user_id: user.id,
            google_calendar_requested: onboardingData.wants_google_calendar_sync || false,
            apple_calendar_requested: onboardingData.wants_apple_calendar_sync || false,
            outlook_calendar_requested: onboardingData.wants_outlook_calendar_sync || false,
            setup_status: 'pending',
            updated_at: new Date().toISOString(),
          });
      } catch (calendarSetupError) {
        console.error('Failed to initialize calendar setup:', calendarSetupError);
        // Don't fail the main request for calendar setup errors
      }
    }

    return api.success({
      success: true,
      message: 'Onboarding completed successfully',
      data: updateData?.[0],
      next_steps: {
        calendar_integration: onboardingData?.wants_google_calendar_sync || 
                            onboardingData?.wants_apple_calendar_sync || 
                            onboardingData?.wants_outlook_calendar_sync,
        dashboard_redirect: true,
      }
    });

  } catch (error) {
    console.error('Complete onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

// GET - Check if onboarding can be completed
export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Get onboarding status using helper function
    const { data: completionStatus, error: statusError } = await supabase
      .rpc('get_onboarding_completion_status', { user_id_param: user.id });

    if (statusError) {
      console.error('Error checking completion status:', statusError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    const status = completionStatus?.[0];

    return api.success({
      success: true,
      data: {
        can_complete: !status || status.missing_steps.length === 0,
        is_completed: status?.onboarding_completed || false,
        current_step: status?.onboarding_step || 0,
        missing_steps: status?.missing_steps || [],
        completion_requirements: {
          relationship_style: 'Required',
          primary_use_case: 'Required',
          custom_relationship_style: 'Required if relationship_style is "other"',
        }
      }
    });

  } catch (error) {
    console.error('Check completion status error:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}