import { createBrowserClient } from '@supabase/ssr'

// Cache for Supabase client instances
let cachedClient: any = null
let cachedUrl: string | null = null
let cachedAnonKey: string | null = null

export const createSupabaseClient = () => {
  // Enforce required environment variables (fail fast in production)
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
    // In production builds, never continue silently
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.error(msg)
    throw new Error(msg)
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
