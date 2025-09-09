import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateCSRFProtection } from '@/lib/security/csrf';

const completeOnboardingSchema = z.object({
  force_complete: z.boolean().default(false), // Allow forcing completion even if steps are missing
  skip_validation: z.boolean().default(false), // Skip validation of required fields
});

// POST - Mark onboarding as completed
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
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
      return NextResponse.json({ 
        error: 'Failed to fetch onboarding status' 
      }, { status: 500 });
    }

    // If no onboarding record exists, create one
    if (!onboardingData) {
      const { error: createError } = await supabase
        .rpc('create_default_onboarding_record', { user_id_param: user.id });

      if (createError) {
        console.error('Error creating default onboarding record:', createError);
        return NextResponse.json({ 
          error: 'Failed to initialize onboarding data' 
        }, { status: 500 });
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
        return NextResponse.json({ 
          error: 'Required onboarding fields are missing',
          missing_fields: missingFields,
          can_force_complete: true
        }, { status: 400 });
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
      return NextResponse.json({ 
        error: 'Failed to complete onboarding',
        details: updateError.message
      }, { status: 500 });
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

    return NextResponse.json({
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
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check if onboarding can be completed
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get onboarding status using helper function
    const { data: completionStatus, error: statusError } = await supabase
      .rpc('get_onboarding_completion_status', { user_id_param: user.id });

    if (statusError) {
      console.error('Error checking completion status:', statusError);
      return NextResponse.json({ 
        error: 'Failed to check onboarding status' 
      }, { status: 500 });
    }

    const status = completionStatus?.[0];

    return NextResponse.json({
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
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}