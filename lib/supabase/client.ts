import { createBrowserClient } from '@supabase/ssr'

// Cache for Supabase client instances
let cachedClient: any = null

export const createSupabaseClient = () => {
  // Return cached client if available
  if (cachedClient) {
    console.log('Supabase: Returning cached client');
    return cachedClient
  }

  // Check if environment variables are properly set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase: Environment variables check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlIncludesPlaceholder: supabaseUrl?.includes('placeholder'),
    keyIncludesPlaceholder: supabaseAnonKey?.includes('placeholder')
  });
  
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl.includes('placeholder') || 
      supabaseAnonKey.includes('placeholder')) {
    console.warn('Supabase not configured. Please set up your Supabase project.');
    // Return a mock client to prevent crashes during development
    const mockClient = {
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
    
    cachedClient = mockClient
    return mockClient
  }
  
  // Create and cache the real client
  console.log('Supabase: Creating real client with URL:', supabaseUrl);
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Enable connection pooling for better performance
      db: {
        schema: 'public'
      },
      // Add request timeout
      global: {
        headers: {
          'X-Client-Info': 'polyharmony-web'
        }
      }
    }
  )
  
  cachedClient = client
  return client
}

// Function to clear cache (useful for testing or when environment changes)
export const clearSupabaseCache = () => {
  cachedClient = null
}