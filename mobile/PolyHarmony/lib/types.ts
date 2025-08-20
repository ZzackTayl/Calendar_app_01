// Shared types for PolyHarmony app - identical to lib/supabase/types.ts
// Database types matching MVP schema structure

// Core database interfaces based on mvp_schema.sql
export interface User {
  id: string
  phone_number: string
  email?: string
  display_name?: string
  profile_data?: string // JSON string of profile info
  public_key?: string // For future encryption
  subscription_tier: 'free' | 'premium' | 'enterprise'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RelationshipGroup {
  id: string
  user_id: string
  group_name: string
  description?: string
  created_at: string
}

export interface Relationship {
  id: string
  user_id: string
  partner_id: string
  group_id?: string
  relationship_type: string
  default_privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
  relationship_details?: string // JSON string of relationship info
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  owner_id: string
  title: string
  description?: string
  start_time: string
  end_time?: string
  location?: string
  event_data?: string // JSON string for additional event info
  status: 'confirmed' | 'tentative' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface EventPrivacy {
  id: string
  event_id: string
  relationship_id?: string
  group_id?: string
  privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
  created_at: string
}

// Utility types for parsed JSON data
export interface ProfileData {
  firstName?: string
  lastName?: string
  bio?: string
  pronouns?: string
  timezone?: string
  preferences?: Record<string, any>
}

export interface RelationshipDetails {
  anniversary?: string
  notes?: string
  boundaries?: string[]
  communication_style?: string
  meetup_frequency?: string
  [key: string]: any
}

export interface EventData {
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    end_date?: string
  }
  reminder_settings?: {
    minutes_before: number[]
    notify_relationships: string[]
  }
  attachments?: string[]
  color?: string
  [key: string]: any
}

// Database relationship types for Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      relationship_groups: {
        Row: RelationshipGroup
        Insert: Omit<RelationshipGroup, 'id' | 'created_at'>
        Update: Partial<Omit<RelationshipGroup, 'id' | 'created_at'>>
      }
      relationships: {
        Row: Relationship
        Insert: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Relationship, 'id' | 'created_at'>>
      }
      events: {
        Row: Event
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Event, 'id' | 'created_at'>>
      }
      event_privacy: {
        Row: EventPrivacy
        Insert: Omit<EventPrivacy, 'id' | 'created_at'>
        Update: Partial<Omit<EventPrivacy, 'id' | 'created_at'>>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// App-specific utility types
export interface CalendarEvent extends Event {
  parsedEventData?: EventData
  privacySettings?: EventPrivacy[]
}

export interface RelationshipWithDetails extends Relationship {
  parsedDetails?: RelationshipDetails
  partner?: User
  group?: RelationshipGroup
}

export interface UserProfile extends User {
  parsedProfileData?: ProfileData
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total?: number
  page?: number
  limit?: number
}

// Auth types
export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
  error: string | null
}

export interface SignUpData {
  phone_number: string
  password: string
  display_name?: string
  email?: string
}

export interface SignInData {
  phone_number: string
  password: string
}