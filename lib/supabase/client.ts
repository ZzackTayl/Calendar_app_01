import { createBrowserClient } from '@supabase/ssr'

// Cache for Supabase client instances
let cachedClient: any = null
let cachedUrl: string | null = null
let cachedAnonKey: string | null = null

export const createSupabaseClient = () => {
  // Get environment variables with graceful fallback
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check if environment variables have changed and clear cache if needed
  if (cachedClient && (cachedUrl !== supabaseUrl || cachedAnonKey !== supabaseAnonKey)) {
    console.log('Supabase environment variables changed, clearing client cache')
    cachedClient = null
    cachedUrl = null
    cachedAnonKey = null
  }

  // Return cached client if available and environment hasn't changed
  if (cachedClient) {
    return cachedClient
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const msg = 'Supabase environment is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'

    // In development, provide a fallback mock client for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SUPABASE-CLIENT] Development mode: Using fallback client due to missing environment variables')

      // Create a minimal fallback client for development
      const fallbackClient = {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          signInWithPassword: async () => ({ data: null, error: { message: 'Development mode: Authentication disabled' } }),
          signUp: async () => ({ data: null, error: { message: 'Development mode: Registration disabled' } }),
          signOut: async () => ({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
        },
        from: () => ({
          select: () => ({
            eq: () => ({ single: async () => ({ data: null, error: { message: 'Development mode: Database disabled' } }) })
          })
        })
      }

      // Cache the fallback client
      cachedClient = fallbackClient as any
      cachedUrl = supabaseUrl
      cachedAnonKey = supabaseAnonKey
      return fallbackClient as any
    }

    // In production, fail gracefully with better error handling
    console.error('[SUPABASE-CLIENT] Production: Missing required environment variables')
    throw new Error(`${msg} Application cannot function without Supabase configuration.`)
  }

  // Create and cache the real client
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'X-Client-Info': 'polyharmony-web'
        }
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )

  // Cache the client and environment variables
  cachedClient = client
  cachedUrl = supabaseUrl
  cachedAnonKey = supabaseAnonKey
  return client
}

// Backward compatibility: export createSupabaseClient as createClient
export { createSupabaseClient as createClient }

// Function to clear cache (useful for testing or when environment changes)
export const clearSupabaseCache = () => {
  cachedClient = null
  cachedUrl = null
  cachedAnonKey = null
}

// Make cache clearing available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearSupabaseCache = clearSupabaseCache
}
