import { createRouteHandlerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Validation schemas for onboarding data
const onboardingDataSchema = z.object({
  onboarding_step: z.number().min(0).max(10),
  relationship_style: z.enum(['polyamorous', 'relationship_anarchy', 'swinging', 'other']).optional(),
  custom_relationship_style: z.string().min(1).max(200).optional(),
  primary_use_case: z.enum(['schedule_coordination', 'privacy_management', 'communication', 'all']).optional(),
  default_privacy_preference: z.enum(['full_access', 'limited_access', 'busy_only', 'hidden']).default('limited_access'),
  allow_partner_calendar_sync: z.boolean().default(false),
  email_notifications_onboarding: z.boolean().default(true),
  calendar_reminders_onboarding: z.boolean().default(true),
  partner_request_notifications: z.boolean().default(true),
  beta_testing_consent: z.boolean().default(false),
  beta_feedback_consent: z.boolean().default(false),
  anonymous_usage_analytics: z.boolean().default(false),
  wants_google_calendar_sync: z.boolean().default(false),
  wants_apple_calendar_sync: z.boolean().default(false),
  wants_outlook_calendar_sync: z.boolean().default(false),
}).refine((data) => {
  // If relationship_style is 'other', custom_relationship_style is required
  if (data.relationship_style === 'other' && !data.custom_relationship_style) {
    return false;
  }
  return true;
}, {
  message: "Custom relationship style is required when 'other' is selected",
  path: ["custom_relationship_style"],
});

const profileUpdateSchema = z.object({
  preferred_pronouns: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  relationship_preferences: z.record(z.any()).optional(),
  calendar_color_scheme: z.enum(['default', 'colorblind_friendly', 'high_contrast']).default('default'),
  onboarding_source: z.enum(['web', 'mobile', 'referral', 'social_media']).optional(),
  marketing_consent: z.boolean().default(false),
  newsletter_consent: z.boolean().default(false),
});

const emailPreferencesSchema = z.object({
  welcome_emails: z.boolean().default(true),
  event_reminders: z.boolean().default(true),
  partner_requests: z.boolean().default(true),
  schedule_conflicts: z.boolean().default(true),
  app_updates: z.boolean().default(true),
  product_updates: z.boolean().default(false),
  feature_announcements: z.boolean().default(false),
  community_updates: z.boolean().default(false),
  research_participation: z.boolean().default(false),
  reminder_frequency: z.enum(['immediate', 'daily', 'weekly', 'none']).default('daily'),
  digest_frequency: z.enum(['daily', 'weekly', 'monthly', 'none']).default('weekly'),
  email_delivery_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).default('09:00:00'),
  timezone_for_emails: z.string().default('UTC'),
});

const betaConsentSchema = z.object({
  general_beta_consent: z.boolean().default(false),
  crash_reporting_consent: z.boolean().default(false),
  feature_usage_tracking: z.boolean().default(false),
  feedback_surveys_consent: z.boolean().default(false),
  user_interviews_consent: z.boolean().default(false),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  preferred_contact_method: z.enum(['email', 'phone', 'app_notification']).default('email'),
  available_weekdays: z.boolean().default(true),
  available_weekends: z.boolean().default(false),
  available_evenings: z.boolean().default(true),
  timezone_for_contact: z.string().default('UTC'),
});

// Analytics tracking function
async function trackOnboardingStep(
  supabase: any,
  userId: string,
  stepName: string,
  stepNumber: number,
  action: string,
  timeSpent?: number,
  errorMessage?: string,
  userAgent?: string,
  ipAddress?: string
) {
  try {
    await supabase
      .from('onboarding_analytics')
      .insert({
        user_id: userId,
        step_name: stepName,
        step_number: stepNumber,
        time_spent_seconds: timeSpent,
        action_taken: action,
        error_message: errorMessage,
        user_agent: userAgent,
        ip_address: ipAddress,
      });
  } catch (error) {
    console.error('Failed to track onboarding analytics:', error);
    // Don't throw - analytics shouldn't break onboarding flow
  }
}

// GET - Retrieve current onboarding status
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get onboarding status using helper function
    const { data: onboardingStatus, error: statusError } = await supabase
      .rpc('get_onboarding_completion_status', { user_id_param: user.id });

    if (statusError) {
      console.error('Error fetching onboarding status:', statusError);
      return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 });
    }

    // Get detailed onboarding data
    const { data: onboardingData, error: dataError } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get email preferences
    const { data: emailPrefs, error: emailError } = await supabase
      .from('user_email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get calendar integration setup
    const { data: calendarSetup, error: calendarError } = await supabase
      .from('calendar_integration_setup')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get beta consent data
    const { data: betaConsent, error: betaError } = await supabase
      .from('beta_testing_consent')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        completion_status: onboardingStatus?.[0] || { onboarding_completed: false, onboarding_step: 0, missing_steps: [] },
        onboarding_data: onboardingData,
        profile_data: profileData,
        email_preferences: emailPrefs,
        calendar_setup: calendarSetup,
        beta_consent: betaConsent,
      }
    });

  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Submit onboarding data
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      onboarding_data, 
      profile_data, 
      email_preferences, 
      beta_consent,
      step_name,
      step_number,
      time_spent,
    } = body;

    // Get user agent and IP for analytics
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : request.headers.get('x-real-ip') || undefined;

    // Start a transaction for data consistency
    const promises = [];

    // Validate and update onboarding data if provided
    if (onboarding_data) {
      const validatedOnboarding = onboardingDataSchema.parse(onboarding_data);
      
      promises.push(
        supabase
          .from('user_onboarding')
          .upsert({
            user_id: user.id,
            ...validatedOnboarding,
            updated_at: new Date().toISOString(),
          })
          .select()
      );
    }

    // Validate and update profile data if provided
    if (profile_data) {
      const validatedProfile = profileUpdateSchema.parse(profile_data);
      
      promises.push(
        supabase
          .from('users')
          .update({
            ...validatedProfile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
      );
    }

    // Validate and update email preferences if provided
    if (email_preferences) {
      const validatedEmailPrefs = emailPreferencesSchema.parse(email_preferences);
      
      promises.push(
        supabase
          .from('user_email_preferences')
          .upsert({
            user_id: user.id,
            ...validatedEmailPrefs,
            updated_at: new Date().toISOString(),
          })
          .select()
      );
    }

    // Validate and update beta consent if provided
    if (beta_consent) {
      const validatedBetaConsent = betaConsentSchema.parse(beta_consent);
      
      promises.push(
        supabase
          .from('beta_testing_consent')
          .upsert({
            user_id: user.id,
            ...validatedBetaConsent,
            last_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
      );
    }

    // Execute all database operations
    const results = await Promise.all(promises);
    
    // Check for errors in any of the operations
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Database operation errors:', errors);
      
      // Track failed step
      if (step_name && step_number) {
        await trackOnboardingStep(
          supabase, 
          user.id, 
          step_name, 
          step_number, 
          'error',
          time_spent,
          errors[0].error?.message,
          userAgent,
          ipAddress
        );
      }
      
      return NextResponse.json({ 
        error: 'Failed to update onboarding data',
        details: errors.map(e => e.error?.message).filter(Boolean)
      }, { status: 500 });
    }

    // Track successful completion of step
    if (step_name && step_number) {
      await trackOnboardingStep(
        supabase, 
        user.id, 
        step_name, 
        step_number, 
        'completed',
        time_spent,
        undefined,
        userAgent,
        ipAddress
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding data updated successfully',
      data: results.map(r => r.data).filter(Boolean)
    });

  } catch (error) {
    console.error('Onboarding POST error:', error);
    
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

// PATCH - Update specific onboarding fields
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { field, value, step_name, step_number } = body;

    if (!field) {
      return NextResponse.json({ error: 'Field is required' }, { status: 400 });
    }

    let updateResult;

    // Determine which table to update based on field
    if (['onboarding_step', 'relationship_style', 'primary_use_case', 'default_privacy_preference'].includes(field)) {
      updateResult = await supabase
        .from('user_onboarding')
        .upsert({
          user_id: user.id,
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .select();
    } else if (['preferred_pronouns', 'bio', 'calendar_color_scheme'].includes(field)) {
      updateResult = await supabase
        .from('users')
        .update({
          [field]: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select();
    } else {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    if (updateResult.error) {
      console.error('Field update error:', updateResult.error);
      return NextResponse.json({ 
        error: 'Failed to update field',
        details: updateResult.error.message
      }, { status: 500 });
    }

    // Track the field update
    if (step_name && step_number) {
      await trackOnboardingStep(
        supabase, 
        user.id, 
        step_name, 
        step_number, 
        'completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: `${field} updated successfully`,
      data: updateResult.data
    });

  } catch (error) {
    console.error('Onboarding PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}