import { z } from 'zod';
import type { 
  RelationshipStyle, 
  PrimaryUseCase, 
  PrivacyLevel, 
  EmailFrequency, 
  DigestFrequency,
  ContactMethod,
  CalendarColorScheme,
  OnboardingSource,
} from '@/lib/supabase/types';

// ===================================================================
// BASE VALIDATION SCHEMAS
// ===================================================================

export const privacyLevelSchema = z.enum(['full_access', 'limited_access', 'busy_only', 'hidden'] as const);

export const relationshipStyleSchema = z.enum(['polyamorous', 'relationship_anarchy', 'swinging', 'other'] as const);

export const primaryUseCaseSchema = z.enum(['schedule_coordination', 'privacy_management', 'communication', 'all'] as const);

export const emailFrequencySchema = z.enum(['immediate', 'daily', 'weekly', 'none'] as const);

export const digestFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'none'] as const);

export const contactMethodSchema = z.enum(['email', 'phone', 'app_notification'] as const);

export const calendarColorSchemeSchema = z.enum(['default', 'colorblind_friendly', 'high_contrast'] as const);

export const onboardingSourceSchema = z.enum(['web', 'mobile', 'referral', 'social_media'] as const);

export const calendarProviderSchema = z.enum(['google', 'apple', 'outlook'] as const);

// ===================================================================
// ONBOARDING DATA VALIDATION SCHEMAS
// ===================================================================

export const userOnboardingSchema = z.object({
  onboarding_step: z.number().int().min(0).max(10).default(0),
  relationship_style: relationshipStyleSchema.optional(),
  custom_relationship_style: z.string().min(1).max(200).optional(),
  primary_use_case: primaryUseCaseSchema.optional(),
  default_privacy_preference: privacyLevelSchema.default('limited_access'),
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
  // If relationship_style is 'other', custom_relationship_style must be provided
  if (data.relationship_style === 'other' && !data.custom_relationship_style?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Custom relationship style is required when 'other' is selected",
  path: ["custom_relationship_style"],
});

export const userProfileUpdateSchema = z.object({
  preferred_pronouns: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  relationship_preferences: z.record(z.any()).optional(),
  calendar_color_scheme: calendarColorSchemeSchema.default('default'),
  onboarding_source: onboardingSourceSchema.optional(),
  marketing_consent: z.boolean().default(false),
  newsletter_consent: z.boolean().default(false),
  full_name: z.string().min(1).max(100).optional(),
  time_zone: z.string().min(1).max(50).optional(),
  default_calendar_view: z.enum(['month', 'week', 'day', 'agenda']).optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
});

export const emailPreferencesSchema = z.object({
  welcome_emails: z.boolean().default(true),
  event_reminders: z.boolean().default(true),
  partner_requests: z.boolean().default(true),
  schedule_conflicts: z.boolean().default(true),
  app_updates: z.boolean().default(true),
  product_updates: z.boolean().default(false),
  feature_announcements: z.boolean().default(false),
  community_updates: z.boolean().default(false),
  research_participation: z.boolean().default(false),
  reminder_frequency: emailFrequencySchema.default('daily'),
  digest_frequency: digestFrequencySchema.default('weekly'),
  email_delivery_time: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, 'Invalid time format. Use HH:MM:SS')
    .default('09:00:00'),
  timezone_for_emails: z.string().min(1).max(50).default('UTC'),
});

export const betaConsentSchema = z.object({
  general_beta_consent: z.boolean().default(false),
  crash_reporting_consent: z.boolean().default(false),
  feature_usage_tracking: z.boolean().default(false),
  feedback_surveys_consent: z.boolean().default(false),
  user_interviews_consent: z.boolean().default(false),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().min(10).max(20).optional(),
  preferred_contact_method: contactMethodSchema.default('email'),
  available_weekdays: z.boolean().default(true),
  available_weekends: z.boolean().default(false),
  available_evenings: z.boolean().default(true),
  timezone_for_contact: z.string().min(1).max(50).default('UTC'),
}).refine((data) => {
  // If any beta consent is true, contact method should be provided
  if (data.general_beta_consent || data.crash_reporting_consent || 
      data.feature_usage_tracking || data.feedback_surveys_consent || 
      data.user_interviews_consent) {
    
    if (data.preferred_contact_method === 'email' && !data.contact_email) {
      return false;
    }
    if (data.preferred_contact_method === 'phone' && !data.contact_phone) {
      return false;
    }
  }
  return true;
}, {
  message: "Contact information is required when beta testing consent is given",
  path: ["contact_email", "contact_phone"],
});

// ===================================================================
// API REQUEST/RESPONSE SCHEMAS
// ===================================================================

// Create a partial version of the onboarding schema without the refine constraints
const userOnboardingSchemaPartial = z.object({
  onboarding_step: z.number().int().min(0).max(10).default(0),
  relationship_style: relationshipStyleSchema.optional(),
  custom_relationship_style: z.string().min(1).max(200).optional(),
  primary_use_case: primaryUseCaseSchema.optional(),
  default_privacy_preference: privacyLevelSchema.default('limited_access'),
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
}).partial();

export const onboardingSubmissionRequestSchema = z.object({
  onboarding_data: userOnboardingSchemaPartial.optional(),
  profile_data: userProfileUpdateSchema.optional(),
  email_preferences: emailPreferencesSchema.optional(),
  beta_consent: betaConsentSchema.optional(),
  step_name: z.string().min(1).max(100).optional(),
  step_number: z.number().int().min(0).max(20).optional(),
  time_spent: z.number().int().min(0).max(3600).optional(), // Max 1 hour per step
});

export const onboardingCompletionSchema = z.object({
  force_complete: z.boolean().default(false),
  skip_validation: z.boolean().default(false),
});

export const onboardingStepUpdateSchema = z.object({
  field: z.string().min(1),
  value: z.any(),
  step_name: z.string().min(1).max(100).optional(),
  step_number: z.number().int().min(0).max(20).optional(),
});

// ===================================================================
// CALENDAR INTEGRATION SCHEMAS
// ===================================================================

export const calendarOAuthSetupSchema = z.object({
  provider: calendarProviderSchema,
  action: z.enum(['initialize', 'cancel', 'retry']).default('initialize'),
  redirect_uri: z.string().url().optional(),
});

export const calendarIntegrationUpdateSchema = z.object({
  google_calendar_requested: z.boolean().optional(),
  google_calendar_setup_completed: z.boolean().optional(),
  apple_calendar_requested: z.boolean().optional(),
  apple_calendar_setup_completed: z.boolean().optional(),
  outlook_calendar_requested: z.boolean().optional(),
  outlook_calendar_setup_completed: z.boolean().optional(),
  setup_status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  setup_error_message: z.string().optional(),
});

// ===================================================================
// ANALYTICS AND TRACKING SCHEMAS
// ===================================================================

export const onboardingAnalyticsSchema = z.object({
  step_name: z.string().min(1).max(100),
  step_number: z.number().int().min(0).max(20),
  time_spent_seconds: z.number().int().min(0).max(3600).optional(),
  action_taken: z.enum(['completed', 'skipped', 'abandoned', 'error']),
  error_message: z.string().max(500).optional(),
  variant_id: z.string().max(50).optional(),
  cohort_id: z.string().max(50).optional(),
});

// ===================================================================
// VALIDATION HELPER FUNCTIONS
// ===================================================================

export function validateOnboardingData(data: unknown) {
  return userOnboardingSchema.parse(data);
}

export function validateEmailPreferences(data: unknown) {
  return emailPreferencesSchema.parse(data);
}

export function validateBetaConsent(data: unknown) {
  return betaConsentSchema.parse(data);
}

export function validateProfileUpdate(data: unknown) {
  return userProfileUpdateSchema.parse(data);
}

// Validate onboarding completion requirements
export function validateOnboardingCompletion(onboardingData: any): { 
  isValid: boolean; 
  missingFields: string[];
  errors: string[];
} {
  const missingFields: string[] = [];
  const errors: string[] = [];

  // Check required fields
  if (!onboardingData.relationship_style) {
    missingFields.push('relationship_style');
  }

  if (!onboardingData.primary_use_case) {
    missingFields.push('primary_use_case');
  }

  // Validate conditional requirements
  if (onboardingData.relationship_style === 'other' && !onboardingData.custom_relationship_style?.trim()) {
    missingFields.push('custom_relationship_style');
    errors.push('Custom relationship style is required when "other" is selected');
  }

  // Validate privacy preference is set
  if (!onboardingData.default_privacy_preference) {
    missingFields.push('default_privacy_preference');
  }

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}

// Generate onboarding progress score (0-100)
export function calculateOnboardingProgress(onboardingData: any, profileData: any): number {
  let completedFields = 0;
  const totalFields = 10; // Adjust based on required fields

  // Core onboarding fields
  if (onboardingData?.relationship_style) completedFields++;
  if (onboardingData?.primary_use_case) completedFields++;
  if (onboardingData?.default_privacy_preference) completedFields++;
  
  // Profile fields
  if (profileData?.full_name) completedFields++;
  if (profileData?.time_zone && profileData.time_zone !== 'UTC') completedFields++;
  if (profileData?.preferred_pronouns) completedFields++;
  if (profileData?.bio) completedFields++;
  
  // Preferences
  if (onboardingData?.email_notifications_onboarding !== undefined) completedFields++;
  if (onboardingData?.calendar_reminders_onboarding !== undefined) completedFields++;
  if (onboardingData?.allow_partner_calendar_sync !== undefined) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

// ===================================================================
// ERROR HANDLING SCHEMAS
// ===================================================================

export const validationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional(),
  value: z.any().optional(),
});

export const onboardingErrorResponseSchema = z.object({
  error: z.string(),
  details: z.array(validationErrorSchema).optional(),
  missing_fields: z.array(z.string()).optional(),
  can_force_complete: z.boolean().optional(),
});

// Export all schemas as a collection for easy import
export const onboardingSchemas = {
  userOnboarding: userOnboardingSchema,
  profileUpdate: userProfileUpdateSchema,
  emailPreferences: emailPreferencesSchema,
  betaConsent: betaConsentSchema,
  submission: onboardingSubmissionRequestSchema,
  completion: onboardingCompletionSchema,
  stepUpdate: onboardingStepUpdateSchema,
  calendarOAuth: calendarOAuthSetupSchema,
  analytics: onboardingAnalyticsSchema,
} as const;