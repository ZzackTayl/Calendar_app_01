import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * ----------------------------------------------------------------------------
 * ### Supabase Client Factories for Next.js Server Environments
 * ----------------------------------------------------------------------------
 *
 * This module provides factory functions for creating Supabase clients in
 * different Next.js server-side rendering contexts.
 *
 * - `createServerComponentClient()`: For Server Components, Pages, and Layouts.
 * - `createRouteHandlerClient()`: For API Route Handlers.
 * - `createAdminClient()`: For admin-level operations requiring elevated privileges.
 *
 * It also includes helper functions for authentication and authorization:
 * - `getServerUser()`: Retrieves the authenticated user in a server context.
 * - `checkUserPermission()`: Checks if a user has permission to access a resource.
 *
 */

/**
 * ### createServerComponentClient
 *
 * Creates a Supabase client for use in **Server Components, Pages, and Layouts**.
 *
 * It automatically handles cookie-based authentication by reading from and
 * writing to the request's cookie store. This client is ideal for data
 * fetching and operations within the server-side rendering lifecycle.
 *
 * **Note:** Writing cookies from Server Components is only possible when using
 * middleware to refresh user sessions.
 *
 * @returns A Supabase client instance configured for Server Components.
 */
export async function createServerComponentClient() {
  const cookieStore = await cookies();

  // Enforce required environment variables (no placeholders)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase server environment not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.')
  }

  return createSSRServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This error is expected when `set` is called from a Server Component.
            // It can be safely ignored if you have middleware refreshing sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // This error is expected when `remove` is called from a Server Component.
            // It can be safely ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * ### createRouteHandlerClient
 *
 * Creates a Supabase client for use in **API Route Handlers**.
 *
 * This client is specifically designed for server-side logic within API routes.
 * It handles cookie-based authentication seamlessly, allowing you to interact
 * with Supabase as the authenticated user.
 *
 * @returns A Supabase client instance configured for API Route Handlers.
 */
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  // Enforce required environment variables (no placeholders)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase server environment not configured. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.')
  }

  return createSSRServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

/**
 * ### createAdminClient
 *
 * Creates a Supabase client with **admin privileges**.
 *
 * This client uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass Row-Level Security (RLS)
 * and perform administrative tasks. It should be used with extreme caution and
 * only in trusted server-side environments.
 *
 * **NEVER expose the service role key on the client-side.**
 *
 * @returns A Supabase admin client instance.
 */
export function createAdminClient() {
  // Enforce required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set.')
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * ### getServerUser
 *
 * Retrieves the currently authenticated user from the server context.
 *
 * This helper function uses the `createServerComponentClient` to get the user's
 * session data. It's a convenient way to protect routes and fetch user-specific
 * data in Server Components and Pages.
 *
 * @returns The authenticated user object.
 * @throws An error if the user is not authenticated.
 */
export async function getServerUser() {
  const supabase = await createServerComponentClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized: User not found.');
  }

  return user;
}

/**
 * ### checkUserPermission
 *
 * Checks if a user has permission to access a specific resource.
 *
 * This is a basic authorization helper that verifies if the user's ID matches
 * the resource owner's ID. You can extend this function to implement more
 * complex permission logic (e.g., role-based access control).
 *
 * @param userId - The ID of the user performing the action.
 * @param resourceOwnerId - The ID of the user who owns the resource.
 * @returns `true` if the user has permission, otherwise `false`.
 */
export async function checkUserPermission(
  userId: string,
  resourceOwnerId: string,
  resourceType?: 'event' | 'contact' | 'group' | 'relationship',
  resourceId?: string
): Promise<boolean> {
  // Owner always has permission
  if (userId === resourceOwnerId) {
    return true;
  }

  // For more sophisticated checks, we need to check relationships and permissions
  const supabase = await createServerComponentClient();
  
  try {
    // Check if users have an active relationship
    const { data: relationships } = await supabase
      .from('relationships')
      .select('id, status, user1_id, user2_id')
      .or(
        `and(user1_id.eq.${userId},user2_id.eq.${resourceOwnerId}),and(user1_id.eq.${resourceOwnerId},user2_id.eq.${userId})`
      )
      .eq('status', 'active');
    
    // Check if there's a direct relationship between the users
    const hasDirectRelationship = relationships?.some(rel => 
      (rel.user1_id === userId && rel.user2_id === resourceOwnerId) ||
      (rel.user1_id === resourceOwnerId && rel.user2_id === userId)
    ) || false;
    
    if (hasDirectRelationship) {
      // For events, check privacy settings
      if (resourceType === 'event' && resourceId) {
        const { data: event } = await supabase
          .from('events')
          .select('privacy_level, privacy_override')
          .eq('id', resourceId)
          .single();
        
        // Private events require explicit permissions
        if (event?.privacy_level === 'private' || event?.privacy_override === 'private') {
          const { data: permission } = await supabase
            .from('event_permissions')
            .select('id')
            .eq('event_id', resourceId)
            .or(
              `relationship_id.in.(${relationships?.map(r => r.id).join(',')})`
            )
            .single();
          
          return !!permission;
        }
        
        // Other privacy levels allow access to relationships
        return true;
      }
      
      // For other resources, having a relationship grants access
      return true;
    }
    
    // Check group memberships for shared access
    if (resourceType === 'group' && resourceId) {
      const { data: membershipCheck } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', resourceId)
        .eq('user_id', userId)
        .is('left_at', null)
        .single();
      
      return !!membershipCheck;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * ----------------------------------------------------------------------------
 * ### Deprecated Functions
 * ----------------------------------------------------------------------------
 *
 * The following functions are deprecated and will be removed in a future version.
 * They are kept for backward compatibility.
 *
 * - `createSupabaseServer`: Renamed to `createServerComponentClient`.
 * - `createSupabaseClient`: Renamed to `createRouteHandlerClient`.
 *
 */
export const createSupabaseServer = createServerComponentClient;
export const createSupabaseClient = createRouteHandlerClient;
