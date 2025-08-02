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
  partner_name: string
  partner_email?: string
  partner_user_id?: string
  relationship_type: 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'other'
  start_date?: string
  color: string
  notes?: string
  privacy_level: 'full_access' | 'limited_access' | 'no_access'
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
  privacy_level: 'public' | 'private' | 'custom'
  visible_to_relationships?: string[]
  relationship_id?: string
  created_at: string
  updated_at: string
}

export interface EventPrivacy {
  id: string
  event_id: string
  relationship_id: string
  can_see_details: boolean
  can_see_title: boolean
  can_see_time: boolean
  can_see_location: boolean
  created_at: string
}