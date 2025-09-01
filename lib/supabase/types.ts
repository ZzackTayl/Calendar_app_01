// Base privacy and relationship types
export type PrivacyLevel = 'no_access' | 'private' | 'visible' | 'semi_private' | 'public';
export type RelationshipType = 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'friendship' | 'other';
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

// Types for our database
export interface User {
  id: string
  email?: string
  phone?: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Relationship {
  id: string
  user_id: string
  partner_id?: string
  partner_name?: string
  partner_email?: string
  relationship_type: RelationshipType
  start_date?: string
  birthday?: string
  anniversary_date?: string
  color?: string
  notes?: string
  default_privacy_level?: PrivacyLevel
  privacy_level?: PrivacyLevel
  is_active?: boolean
  // Invitation tracking
  invitation_id?: string
  invitation_status?: 'pending' | 'sent' | 'accepted' | 'declined' | null
  invitation_sent_at?: string
  created_at: string
  updated_at: string
}

export interface RelationshipGroup {
  id: string
  user_id: string
  group_name: string
  description?: string
  color?: string
  created_at: string
  updated_at: string
}

// For relationship-based group members (relationship_group_members table)
export interface RelationshipGroupMember {
  id: string
  group_id: string
  relationship_id: string
  privacy_level: PrivacyLevel
  created_at: string
  updated_at: string
  // Joined relationship data
  relationship?: Relationship
}

// For user-based group members (group_members table)
export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: 'creator' | 'admin' | 'member'
  joined_at: string
  left_at?: string
  can_invite_members: boolean
  can_edit_group_info: boolean
  can_remove_members: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  time_zone?: string
  is_all_day?: boolean
  privacy_level: PrivacyLevel
  visible_to_relationships?: string[]
  visible_to_groups?: string[]
  relationship_id?: string
  color?: string
  recurrence_rule?: string
  status?: EventStatus
  created_at: string
  updated_at: string
}

export interface EventPrivacy {
  id: string
  event_id: string
  relationship_id?: string
  group_id?: string
  privacy_level: PrivacyLevel
  created_at: string
}

// Extended types for UI components
export interface RelationshipWithGroups extends Relationship {
  groups?: RelationshipGroup[]
}

export interface GroupWithMembers extends RelationshipGroup {
  members?: RelationshipGroupMember[]
  member_count?: number
}

// ===================================================================
// INVITATION SYSTEM TYPES
// ===================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
export type InvitationType = 'friend_request' | 'group_invitation' | 'relationship_invitation';
export type ConnectionSetupStatus = 'pending' | 'completed' | 'skipped';

export interface Invitation {
  id: string;
  created_at: string;
  updated_at: string;
  invitation_type: InvitationType;
  sender_id: string;
  recipient_email: string;
  recipient_phone?: string;
  message?: string;
  expires_at: string;
  status: InvitationStatus;
  accepted_at?: string;
  declined_at?: string;
  recipient_user_id?: string;
}

export interface ConnectionSetup {
  id: string;
  created_at: string;
  updated_at: string;
  user_a_id: string;
  user_b_id: string;
  setup_status: ConnectionSetupStatus;
  completed_at?: string;
  // Individual permissions (separate from group permissions)
  user_a_to_b_individual_permission: PrivacyLevel;
  user_b_to_a_individual_permission: PrivacyLevel;
  // Group permissions (if assigned to group)
  user_a_to_b_group_permission?: PrivacyLevel;
  user_b_to_a_group_permission?: PrivacyLevel;
  assigned_group_id?: string;
  relationship_type?: RelationshipType;
  custom_relationship_name?: string;
}

export interface InvitationToken {
  id: string;
  created_at: string;
  expires_at: string;
  invitation_id: string;
  token_hash: string;
  used_at?: string;
  used_by_ip?: string;
  used_by_user_agent?: string;
}

export interface InvitationNotificationPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  auto_accept_from_contacts: boolean;
  auto_accept_from_groups: boolean;
  allow_invitations_from_public: boolean;
  require_approval_for_connections: boolean;
  created_at: string;
  updated_at: string;
}

// ===================================================================
// INVITATION API TYPES
// ===================================================================

export interface CreateInvitationRequest {
  recipient_email: string;
  recipient_phone?: string;
  message?: string;
  invitation_type?: InvitationType;
}

export interface AcceptInvitationRequest {
  invitation_id: string;
  setup_permissions?: boolean;
  create_relationship?: boolean;
  relationship_type?: RelationshipType;
  custom_relationship_name?: string;
  assign_to_group?: boolean;
  group_id?: string;
  create_new_group?: boolean;
  new_group_name?: string;
  new_group_description?: string;
  // Individual permissions
  user_a_to_b_individual_permission?: PrivacyLevel;
  user_b_to_a_individual_permission?: PrivacyLevel;
  // Group permissions (if assigned to group)
  user_a_to_b_group_permission?: PrivacyLevel;
  user_b_to_a_group_permission?: PrivacyLevel;
}

export interface ConnectionSetupRequest {
  user_a_id: string;
  user_b_id: string;
  user_a_to_b_permission: PrivacyLevel;
  user_b_to_a_permission: PrivacyLevel;
  relationship_type?: RelationshipType;
  custom_relationship_name?: string;
  assigned_group_id?: string;
}

// ===================================================================
// INVITATION RESPONSE TYPES
// ===================================================================

export interface InvitationResponse {
  success: boolean;
  invitation?: Invitation;
  error?: string;
  message?: string;
}

export interface ConnectionSetupResponse {
  success: boolean;
  connection_setup?: ConnectionSetup;
  relationship_created?: boolean;
  group_assigned?: boolean;
  error?: string;
  message?: string;
}

export interface PendingInvitationsResponse {
  success: boolean;
  invitations: Invitation[];
  count: number;
  error?: string;
}

// ===================================================================
// CONFLICT DETECTION TYPES
// ===================================================================

export interface SchedulingConflict {
  partner_id: string;
  partner_name: string;
  conflicting_events: Array<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    overlap_minutes: number;
  }>;
}

export interface ConflictCheckRequest {
  event_start: string;
  event_end: string;
  partner_ids: string[];
  exclude_event_id?: string; // For editing existing events
}

export interface ConflictCheckResponse {
  success: boolean;
  conflicts: SchedulingConflict[];
  has_conflicts: boolean;
  error?: string;
}

// ===================================================================
// ENHANCED MULTI-PARTNER AVAILABILITY TYPES
// ===================================================================

export type ConflictType = 'hard_overlap' | 'soft_buffer' | 'travel_time' | 'privacy_restricted';
export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BufferQuality = 'excellent' | 'good' | 'minimal' | 'insufficient';

export interface BatchConflictCheckRequest {
  event_start: string;
  event_end: string;
  partner_ids: string[];
  exclude_event_id?: string;
  buffer_time_minutes?: number;
  location?: string;
  consider_travel_time?: boolean;
  alternative_slots_count?: number;
  max_duration_hours?: number;
  preferred_times?: string[]; // ISO time strings like "09:00", "14:00"
}

export interface EnhancedSchedulingConflict {
  partner_id: string;
  partner_name: string;
  conflict_type: ConflictType;
  severity: ConflictSeverity;
  conflicting_events: ConflictingEventDetails[];
  privacy_filtered: boolean;
  suggested_alternatives?: AlternativeTimeSlot[];
  resolution_suggestions: string[];
}

export interface ConflictingEventDetails {
  id: string;
  title: string; // Privacy-filtered based on permission level
  start_time: string;
  end_time: string;
  overlap_minutes: number;
  buffer_conflict_minutes?: number;
  travel_conflict_minutes?: number;
  privacy_level: PrivacyLevel;
  visible_details: {
    title: boolean;
    description: boolean;
    location: boolean;
    attendees: boolean;
  };
}

export interface AlternativeTimeSlot {
  start_time: string;
  end_time: string;
  confidence_score: number; // 0-1 based on partner availability
  conflicts_resolved: string[]; // Partner IDs with conflicts resolved
  remaining_conflicts: string[]; // Partner IDs still conflicted
  buffer_quality: BufferQuality;
  travel_feasible: boolean;
  time_preference_score: number; // How well it matches preferred times
}

export interface BatchConflictCheckResponse {
  success: boolean;
  conflicts: EnhancedSchedulingConflict[];
  has_conflicts: boolean;
  performance_metrics: {
    processing_time_ms: number;
    partners_checked: number;
    cache_hit_ratio: number;
    database_queries: number;
    privacy_filtered_events: number;
  };
  smart_suggestions?: {
    alternative_slots: AlternativeTimeSlot[];
    optimal_duration?: number;
    best_time_windows: string[];
    scheduling_insights: string[];
  };
  privacy_summary: {
    total_events_checked: number;
    privacy_filtered_events: number;
    visible_conflict_details: number;
  };
  error?: string;
}

// ===================================================================
// GROUP AVAILABILITY TYPES
// ===================================================================

export interface GroupAvailabilityRequest {
  group_ids: string[];
  time_range: {
    start: string;
    end: string;
  };
  duration_minutes: number;
  buffer_minutes?: number;
  preferred_times?: string[];
}

export interface GroupAvailabilityResult {
  group_id: string;
  group_name: string;
  member_count: number;
  available_members: string[];
  conflicted_members: string[];
  availability_score: number;
  best_time_slots: Array<{
    start_time: string;
    end_time: string;
    available_members: string[];
    confidence_score: number;
  }>;
}

export interface GroupAvailabilityResponse {
  success: boolean;
  group_availability: GroupAvailabilityResult[];
  optimal_time_slots: Array<{
    start_time: string;
    end_time: string;
    confidence_score: number;
    available_groups: string[];
    total_available_members: number;
  }>;
  conflict_summary: {
    total_groups_checked: number;
    total_members_checked: number;
    groups_with_conflicts: number;
    overall_availability_score: number;
  };
  performance_metrics?: {
    processing_time_ms: number;
    groups_checked: number;
    database_queries: number;
    cache_hit_ratio: number;
  };
  error?: string;
}

// ===================================================================
// ENHANCED PERMISSION TYPES
// ===================================================================

export interface IndividualPermission {
  user_id: string;
  partner_id: string;
  permission_level: PrivacyLevel;
  can_see_details: boolean;
  can_see_location: boolean;
  can_see_description: boolean;
  can_see_attendees: boolean;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

export interface GroupPermission {
  group_id: string;
  user_id: string;
  permission_level: PrivacyLevel;
  can_see_details: boolean;
  can_see_location: boolean;
  can_see_description: boolean;
  can_see_attendees: boolean;
  notification_preferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// ===================================================================
// GROUP INVITATION SYSTEM TYPES
// ===================================================================

export type GroupInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
export type GroupMemberRole = 'creator' | 'admin' | 'member';

export interface GroupInvitation {
  id: string;
  created_at: string;
  updated_at: string;
  group_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_phone?: string;
  message?: string;
  status: GroupInvitationStatus;
  expires_at: string;
  accepted_at?: string;
  declined_at?: string;
  invitee_user_id?: string;
  // Joined data
  group?: {
    group_name: string;
    description?: string;
    color?: string;
  };
  inviter?: {
    phone_number: string;
  };
}

export interface GroupMember {
  id: string;
  created_at: string;
  updated_at: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  joined_at: string;
  left_at?: string;
  can_invite_members: boolean;
  can_edit_group_info: boolean;
  can_remove_members: boolean;
  // Joined data
  user?: {
    phone_number: string;
  };
  group?: {
    group_name: string;
    description?: string;
    color?: string;
  };
}

export interface GroupMemberPermission {
  id: string;
  created_at: string;
  updated_at: string;
  group_id: string;
  user_id: string;
  target_user_id: string;
  permission_level: PrivacyLevel;
  can_see_details: boolean;
  can_see_location: boolean;
  can_see_description: boolean;
  can_see_attendees: boolean;
  notify_on_events: boolean;
  notify_on_changes: boolean;
  // Joined data
  target_user?: {
    phone_number: string;
  };
}

export interface GroupInvitationToken {
  id: string;
  created_at: string;
  expires_at: string;
  invitation_id: string;
  token_hash: string;
  used_at?: string;
  used_by_ip?: string;
  used_by_user_agent?: string;
}

// ===================================================================
// GROUP INVITATION API TYPES
// ===================================================================

export interface CreateGroupInvitationRequest {
  group_id: string;
  invitee_email: string;
  invitee_phone?: string;
  message?: string;
}

export interface AcceptGroupInvitationRequest {
  invitation_id: string;
  member_permissions: Array<{
    target_user_id: string;
    permission_level: PrivacyLevel;
    can_see_details?: boolean;
    can_see_location?: boolean;
    can_see_description?: boolean;
    can_see_attendees?: boolean;
    notify_on_events?: boolean;
    notify_on_changes?: boolean;
  }>;
}

export interface GroupInvitationResponse {
  success: boolean;
  invitation?: GroupInvitation;
  error?: string;
  message?: string;
}

export interface PendingGroupInvitationsResponse {
  success: boolean;
  invitations: GroupInvitation[];
  count: number;
  error?: string;
}

export interface GroupMembersResponse {
  success: boolean;
  members: GroupMember[];
  count: number;
  error?: string;
}

export interface GroupMemberPermissionsResponse {
  success: boolean;
  permissions: GroupMemberPermission[];
  error?: string;
}

// ===================================================================
// ONBOARDING SYSTEM TYPES
// ===================================================================

export type RelationshipStyle = 'polyamorous' | 'relationship_anarchy' | 'swinging' | 'other';
export type PrimaryUseCase = 'schedule_coordination' | 'privacy_management' | 'communication' | 'all';
export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;
export type CalendarColorScheme = 'default' | 'colorblind_friendly' | 'high_contrast';
export type OnboardingSource = 'web' | 'mobile' | 'referral' | 'social_media';
export type EmailFrequency = 'immediate' | 'daily' | 'weekly' | 'none';
export type DigestFrequency = 'daily' | 'weekly' | 'monthly' | 'none';
export type ContactMethod = 'email' | 'phone' | 'app_notification';
export type CalendarIntegrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface UserOnboarding {
  id: string;
  user_id: string;
  onboarding_completed: boolean;
  onboarding_completed_at?: string;
  onboarding_step: OnboardingStep;
  relationship_style?: RelationshipStyle;
  custom_relationship_style?: string;
  primary_use_case?: PrimaryUseCase;
  default_privacy_preference: PrivacyLevel;
  allow_partner_calendar_sync: boolean;
  email_notifications_onboarding: boolean;
  calendar_reminders_onboarding: boolean;
  partner_request_notifications: boolean;
  beta_testing_consent: boolean;
  beta_feedback_consent: boolean;
  anonymous_usage_analytics: boolean;
  wants_google_calendar_sync: boolean;
  wants_apple_calendar_sync: boolean;
  wants_outlook_calendar_sync: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserEmailPreferences {
  id: string;
  user_id: string;
  welcome_emails: boolean;
  event_reminders: boolean;
  partner_requests: boolean;
  schedule_conflicts: boolean;
  app_updates: boolean;
  product_updates: boolean;
  feature_announcements: boolean;
  community_updates: boolean;
  research_participation: boolean;
  reminder_frequency: EmailFrequency;
  digest_frequency: DigestFrequency;
  email_delivery_time: string; // TIME format "HH:MM:SS"
  timezone_for_emails: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntegrationSetup {
  id: string;
  user_id: string;
  google_calendar_requested: boolean;
  google_calendar_setup_completed: boolean;
  google_calendar_setup_completed_at?: string;
  apple_calendar_requested: boolean;
  apple_calendar_setup_completed: boolean;
  apple_calendar_setup_completed_at?: string;
  outlook_calendar_requested: boolean;
  outlook_calendar_setup_completed: boolean;
  outlook_calendar_setup_completed_at?: string;
  setup_status: CalendarIntegrationStatus;
  setup_error_message?: string;
  setup_retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface BetaTestingConsent {
  id: string;
  user_id: string;
  general_beta_consent: boolean;
  crash_reporting_consent: boolean;
  feature_usage_tracking: boolean;
  feedback_surveys_consent: boolean;
  user_interviews_consent: boolean;
  contact_email?: string;
  contact_phone?: string;
  preferred_contact_method: ContactMethod;
  available_weekdays: boolean;
  available_weekends: boolean;
  available_evenings: boolean;
  timezone_for_contact: string;
  consented_at: string;
  withdrawn_at?: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingAnalytics {
  id: string;
  user_id: string;
  step_name: string;
  step_number: number;
  time_spent_seconds?: number;
  action_taken: string;
  error_message?: string;
  user_agent?: string;
  ip_address?: string;
  variant_id?: string;
  cohort_id?: string;
  created_at: string;
}

// Enhanced User Profile with onboarding fields
export interface EnhancedUserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  time_zone: string;
  default_calendar_view: string;
  email_notifications: boolean;
  push_notifications: boolean;
  preferred_pronouns?: string;
  bio?: string;
  relationship_preferences?: Record<string, any>;
  calendar_color_scheme: CalendarColorScheme;
  onboarding_source?: OnboardingSource;
  marketing_consent: boolean;
  newsletter_consent: boolean;
  created_at: string;
  updated_at: string;
}

// ===================================================================
// ONBOARDING API TYPES
// ===================================================================

export interface OnboardingSubmissionRequest {
  onboarding_data?: Partial<Omit<UserOnboarding, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
  profile_data?: Partial<Omit<EnhancedUserProfile, 'id' | 'created_at' | 'updated_at'>>;
  email_preferences?: Partial<Omit<UserEmailPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
  beta_consent?: Partial<Omit<BetaTestingConsent, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'consented_at' | 'last_updated_at'>>;
  step_name?: string;
  step_number?: number;
  time_spent?: number;
}

export interface OnboardingStatusResponse {
  success: boolean;
  data: {
    completion_status: {
      onboarding_completed: boolean;
      onboarding_step: number;
      missing_steps: string[];
    };
    onboarding_data?: UserOnboarding;
    profile_data?: EnhancedUserProfile;
    email_preferences?: UserEmailPreferences;
    calendar_setup?: CalendarIntegrationSetup;
    beta_consent?: BetaTestingConsent;
  };
  error?: string;
}

export interface CalendarOAuthSetupRequest {
  provider: 'google' | 'apple' | 'outlook';
  action: 'initialize' | 'cancel' | 'retry';
  redirect_uri?: string;
}

export interface CalendarOAuthSetupResponse {
  success: boolean;
  oauth_url?: string;
  provider?: string;
  callback_url?: string;
  expires_in?: number;
  message?: string;
  action?: string;
  error?: string;
}

// ===================================================================
// DATABASE TABLES (for Supabase)
// ===================================================================

export interface Database {
  // ... existing tables ...
  
  // Onboarding system tables
  user_onboarding: {
    Row: UserOnboarding;
    Insert: Omit<UserOnboarding, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<UserOnboarding, 'id' | 'created_at' | 'updated_at'>>;
  };

  user_email_preferences: {
    Row: UserEmailPreferences;
    Insert: Omit<UserEmailPreferences, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<UserEmailPreferences, 'id' | 'created_at' | 'updated_at'>>;
  };

  calendar_integration_setup: {
    Row: CalendarIntegrationSetup;
    Insert: Omit<CalendarIntegrationSetup, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<CalendarIntegrationSetup, 'id' | 'created_at' | 'updated_at'>>;
  };

  beta_testing_consent: {
    Row: BetaTestingConsent;
    Insert: Omit<BetaTestingConsent, 'id' | 'created_at' | 'updated_at' | 'consented_at' | 'last_updated_at'>;
    Update: Partial<Omit<BetaTestingConsent, 'id' | 'created_at' | 'updated_at' | 'consented_at' | 'last_updated_at'>>;
  };

  onboarding_analytics: {
    Row: OnboardingAnalytics;
    Insert: Omit<OnboardingAnalytics, 'id' | 'created_at'>;
    Update: Partial<Omit<OnboardingAnalytics, 'id' | 'created_at'>>;
  };

  user_profiles: {
    Row: EnhancedUserProfile;
    Insert: Omit<EnhancedUserProfile, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<EnhancedUserProfile, 'id' | 'created_at' | 'updated_at'>>;
  };

  // Invitation system tables
  invitations: {
    Row: Invitation;
    Insert: Omit<Invitation, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<Invitation, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  connection_setups: {
    Row: ConnectionSetup;
    Insert: Omit<ConnectionSetup, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<ConnectionSetup, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  invitation_tokens: {
    Row: InvitationToken;
    Insert: Omit<InvitationToken, 'id' | 'created_at'>;
    Update: Partial<Omit<InvitationToken, 'id' | 'created_at'>>;
  };
  
  invitation_notification_preferences: {
    Row: InvitationNotificationPreferences;
    Insert: Omit<InvitationNotificationPreferences, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<InvitationNotificationPreferences, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  // Group invitation system tables
  group_invitations: {
    Row: GroupInvitation;
    Insert: Omit<GroupInvitation, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<GroupInvitation, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  group_members: {
    Row: GroupMember;
    Insert: Omit<GroupMember, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<GroupMember, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  group_member_permissions: {
    Row: GroupMemberPermission;
    Insert: Omit<GroupMemberPermission, 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<Omit<GroupMemberPermission, 'id' | 'created_at' | 'updated_at'>>;
  };
  
  group_invitation_tokens: {
    Row: GroupInvitationToken;
    Insert: Omit<GroupInvitationToken, 'id' | 'created_at'>;
    Update: Partial<Omit<GroupInvitationToken, 'id' | 'created_at'>>;
  };
}