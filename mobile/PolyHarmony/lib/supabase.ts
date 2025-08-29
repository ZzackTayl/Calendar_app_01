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
}