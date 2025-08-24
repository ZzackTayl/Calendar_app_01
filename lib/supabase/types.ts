// Base privacy and relationship types
export type PrivacyLevel = 'full_access' | 'limited_access' | 'busy_only' | 'hidden';
export type RelationshipType = 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'other';

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
  color?: string
  notes?: string
  default_privacy_level?: PrivacyLevel
  privacy_level?: PrivacyLevel | 'no_access'
  is_active?: boolean
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
  owner_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  privacy_level: 'public' | 'private' | 'custom'
  visible_to_relationships?: string[]
  visible_to_groups?: string[]
  relationship_id?: string
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
  members?: Array<GroupMember & { relationship: Relationship }>
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
// DATABASE TABLES (for Supabase)
// ===================================================================

export interface Database {
  // ... existing tables ...
  
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