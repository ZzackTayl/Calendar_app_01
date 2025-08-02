import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createSupabaseClient = () => {
  // Check if environment variables are properly set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder')) {
    console.warn('Supabase not configured. Please set up your Supabase project.')
    // Return a mock client to prevent crashes during development
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
        signUp: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        insert: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
        delete: () => ({ eq: () => Promise.resolve({ error: { message: 'Supabase not configured' } }) })
      })
    } as any
  }
  
  return createClientComponentClient()
}