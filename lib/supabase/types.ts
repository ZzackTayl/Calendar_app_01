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
  relationship_type: 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'other'
  start_date?: string
  color?: string
  notes?: string
  default_privacy_level?: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
  privacy_level?: 'full_access' | 'limited_access' | 'no_access'
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface RelationshipGroup {
  id: string
  user_id: string
  group_name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  relationship_id: string
  privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
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
  privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
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