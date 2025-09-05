import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// Custom storage implementation for React Native using SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper functions for common operations
export const authHelpers = {
  signUp: async (phone: string, password: string) => {
    return await supabase.auth.signUp({
      phone,
      password,
    })
  },

  signIn: async (phone: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      phone,
      password,
    })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  getCurrentSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },
}

// Database helpers with proper typing
export const dbHelpers = {
  // User operations
  getUser: async (userId: string) => {
    return await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
  },

  updateUser: async (userId: string, updates: any) => {
    return await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
  },

  // Relationship operations
  getUserRelationships: async (userId: string) => {
    return await supabase
      .from('relationships')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
  },

  createRelationship: async (relationship: any) => {
    return await supabase
      .from('relationships')
      .insert(relationship)
  },

  // Event operations
  getUserEvents: async (userId: string, startDate?: string, endDate?: string) => {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    return await query.order('start_time', { ascending: true })
  },

  createEvent: async (event: any) => {
    return await supabase
      .from('events')
      .insert(event)
  },

  updateEvent: async (eventId: string, updates: any) => {
    return await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
  },

  deleteEvent: async (eventId: string) => {
    return await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
  },

  // Event privacy operations
  getEventPrivacy: async (eventId: string) => {
    return await supabase
      .from('event_privacy')
      .select('*')
      .eq('event_id', eventId)
  },

  setEventPrivacy: async (privacy: any) => {
    return await supabase
      .from('event_privacy')
      .insert(privacy)
  },

  updateEventPrivacy: async (eventId: string, privacySettings: any[]) => {
    // First, delete existing privacy settings for this event
    await supabase
      .from('event_privacy')
      .delete()
      .eq('event_id', eventId)

    // Then insert new privacy settings
    if (privacySettings.length > 0) {
      return await supabase
        .from('event_privacy')
        .insert(privacySettings)
    }
    
    return { data: null, error: null }
  },

  // Advanced event operations with privacy filtering
  createEventWithPrivacy: async (eventData: any, privacySettings: any[]) => {
    try {
      // Create the event first
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single()

      if (eventError || !event) {
        return { data: null, error: eventError }
      }

      // Set privacy settings if provided
      if (privacySettings.length > 0) {
        const privacyWithEventId = privacySettings.map(setting => ({
          ...setting,
          event_id: event.id,
        }))

        const { error: privacyError } = await supabase
          .from('event_privacy')
          .insert(privacyWithEventId)

        if (privacyError) {
          // Rollback event creation if privacy setting fails
          await supabase
            .from('events')
            .delete()
            .eq('id', event.id)
          return { data: null, error: privacyError }
        }
      }

      return { data: event, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Get events with privacy filtering
  getUserEventsWithPrivacy: async (userId: string, startDate?: string, endDate?: string, includePrivacy = true) => {
    let query = supabase
      .from('events')
      .select(`
        *,
        ${includePrivacy ? 'event_privacy(*)' : ''}
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true })

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    return await query
  },

  // Get visible events for a user based on relationship privacy
  getVisibleEvents: async (viewerUserId: string, targetUserId: string, startDate?: string, endDate?: string) => {
    // First get the relationship between users to determine what they can see
    const { data: relationship } = await supabase
      .from('relationships')
      .select('*')
      .or(
        `and(user_id.eq.${viewerUserId},partner_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},partner_id.eq.${viewerUserId})`
      )
      .eq('is_active', true)
      .single()

    if (!relationship) {
      // No relationship exists, return empty array
      return { data: [], error: null }
    }

    // Build the query for events
    let query = supabase
      .from('events')
      .select(`
        *,
        event_privacy(*)
      `)
      .eq('user_id', targetUserId)

    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data: events, error } = await query.order('start_time', { ascending: true })

    if (error || !events) {
      return { data: [], error }
    }

    // Filter events based on privacy settings
    const visibleEvents = events.filter(event => {
      const privacySettings = event.event_privacy || []

      // If no privacy settings, it's private by default
      if (privacySettings.length === 0) {
        return false
      }

      return privacySettings.some(setting => {
        switch (setting.privacy_level) {
          case 'public':
            return true
          case 'visible':
            return setting.relationship_id === relationship.id
          case 'semi_private':
            // Semi-private logic can be customized based on relationship type
            return relationship.default_privacy_level !== 'private'
          case 'private':
          default:
            return false
        }
      })
    })

    return { data: visibleEvents, error: null }
  },

  // Check for event conflicts
  checkEventConflicts: async (userId: string, startTime: string, endTime: string, excludeEventId?: string) => {
    let query = supabase
      .from('events')
      .select('id, title, start_time, end_time')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .or(
        `and(start_time.lt.${endTime},end_time.gt.${startTime}),and(start_time.gte.${startTime},start_time.lt.${endTime})`
      )

    if (excludeEventId) {
      query = query.neq('id', excludeEventId)
    }

    return await query
  },

  // Check conflicts across relationships (respecting privacy)
  checkRelationshipConflicts: async (userId: string, startTime: string, endTime: string, relationshipIds?: string[]) => {
    if (!relationshipIds || relationshipIds.length === 0) {
      return { data: [], error: null }
    }

    // Get the partner IDs from relationships
    const { data: relationships } = await supabase
      .from('relationships')
      .select('partner_id')
      .in('id', relationshipIds)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!relationships || relationships.length === 0) {
      return { data: [], error: null }
    }

    const partnerIds = relationships.map(rel => rel.partner_id)
    const conflicts = []

    // Check each partner's events
    for (const partnerId of partnerIds) {
      const { data: partnerEvents } = await dbHelpers.getVisibleEvents(
        userId,
        partnerId,
        startTime,
        endTime
      )

      if (partnerEvents) {
        const conflictingEvents = partnerEvents.filter(event => {
          const eventStart = new Date(event.start_time)
          const eventEnd = event.end_time ? new Date(event.end_time) : new Date(eventStart.getTime() + 60 * 60 * 1000)
          const checkStart = new Date(startTime)
          const checkEnd = new Date(endTime)

          return (eventStart < checkEnd && eventEnd > checkStart)
        })

        conflicts.push(...conflictingEvents.map(event => ({
          ...event,
          partner_id: partnerId,
        })))
      }
    }

    return { data: conflicts, error: null }
  },

  // Batch operations for sync
  batchCreateEvents: async (events: any[]) => {
    if (events.length === 0) {
      return { data: [], error: null }
    }

    return await supabase
      .from('events')
      .insert(events)
      .select()
  },

  batchUpdateEvents: async (updates: Array<{ id: string; [key: string]: any }>) => {
    if (updates.length === 0) {
      return { data: [], error: null }
    }

    // Supabase doesn't support batch updates directly, so we do them individually
    const results = []
    const errors = []

    for (const update of updates) {
      const { id, ...updateData } = update
      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        errors.push({ id, error })
      } else {
        results.push(data)
      }
    }

    return {
      data: results,
      error: errors.length > 0 ? errors : null
    }
  },

  // Search events with filters
  searchEvents: async (userId: string, filters: any) => {
    let query = supabase
      .from('events')
      .select(`
        *,
        event_privacy(*)
      `)
      .eq('user_id', userId)

    // Apply filters
    if (filters.start_date) {
      query = query.gte('start_time', filters.start_date)
    }
    if (filters.end_date) {
      query = query.lte('start_time', filters.end_date)
    }
    if (filters.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }
    if (filters.search_term) {
      query = query.or(
        `title.ilike.%${filters.search_term}%,description.ilike.%${filters.search_term}%,location.ilike.%${filters.search_term}%`
      )
    }

    return await query.order('start_time', { ascending: true })
  },
