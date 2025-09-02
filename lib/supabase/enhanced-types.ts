/**
 * Enhanced Supabase Database Types
 * 
 * This file extends the base types with additional interfaces for the
 * enhanced database schema. These types match the fields in the enhanced_mvp_schema.sql
 */

import { type User, type Relationship, type RelationshipGroup, type Event, type PrivacyOverride } from './types';

// Enhancede base types with new fields
export interface EnhancedUser extends User {
  time_zone?: string;
  default_calendar_view?: 'month' | 'week' | 'day' | 'agenda';
  email_notifications?: boolean;
  push_notifications?: boolean;
}

export interface EnhancedRelationship extends Relationship {
  // Note: privacy levels are now defined in the base Relationship type
}

export interface EnhancedRelationshipGroup extends RelationshipGroup {
  color?: string;
}

export interface EnhancedEvent extends Event {
  time_zone?: string;
  is_all_day?: boolean;
  recurrence_rule?: string;
  recurrence_exception_dates?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  external_calendar_id?: string;
  external_calendar_source?: string;
  color?: string;
  visible_to_contacts?: string[];
  visible_to_groups?: string[];
  privacy_override?: PrivacyOverride; // New privacy system field
}

// New types for additional tables

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactGroupMember {
  id: string;
  group_id: string;
  contact_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventAttachment {
  id: string;
  event_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface EventPermission {
  id: string;
  event_id: string;
  relationship_id?: string;
  contact_id?: string;
  group_id?: string;
  permission_level: 'visible' | 'private' | 'semi_private';
  custom_title?: string;
  custom_description?: string;
  created_at: string;
  updated_at: string;
}



export interface Reminder {
  id: string;
  event_id: string;
  user_id: string;
  reminder_time: string;
  type: 'notification' | 'email' | 'sms';
  sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomHoliday {
  id: string;
  user_id: string;
  name: string;
  date: string; // YYYY-MM-DD format
  recurring: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
}

// Extended composite types for UI components

export interface ContactWithGroups extends Contact {
  groups?: RelationshipGroup[];
}

export interface EnhancedEventWithPermissions extends EnhancedEvent {
  permissions?: EventPermission[];
  attachments?: EventAttachment[];
  reminders?: Reminder[];
}

export interface RelationshipWithContacts extends EnhancedRelationship {
  contacts?: Contact[];
}

export interface GroupWithContacts extends EnhancedRelationshipGroup {
  contacts?: Contact[];
}
