import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient as supabaseRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Server Component Client (for use in Server Components)
export function createServerClient() {
  return createServerComponentClient({ cookies })
}

// Route Handler Client (for use in API routes)
export function createRouteHandlerClient() {
  return supabaseRouteHandlerClient({ cookies })
}

// Alternative: Direct client with service role key (for admin operations)
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const { createClient } = require('@supabase/supabase-js')
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to get authenticated user in server context
export async function getServerUser() {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

// Helper function to check if user has permission to access resource
export async function checkUserPermission(
  userId: string, 
  resourceOwnerId: string
): Promise<boolean> {
  if (userId === resourceOwnerId) {
    return true
  }
  
  // Add additional permission logic here if needed
  // For example, check if user is in a shared group, etc.
  
  return false
}
