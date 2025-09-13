import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Define schemas for validation
const contactUpdateSchema = z.object({
  partner_name: z.string().min(1, { message: 'Name is required' }).optional(),
  partner_email: z.string().email({ message: 'Invalid email' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship_type: z.enum(['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other']).optional(),
  start_date: z.string().optional().nullable(),
  color: z.string().min(1, { message: 'Color is required' }).optional(),
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(), // Legacy - for backward compatibility
  is_active: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  contact_frequency: z.enum(['frequent', 'regular', 'occasional', 'rare']).optional().nullable(),
  tags: z.array(z.string()).optional().nullable()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  // Initialize Supabase client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }
    
    // Fetch the contact
    const { data, error } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return api.error(ErrorCode.NOT_FOUND)
      }
      console.error('Database error:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    // In a real implementation, we would also fetch related data like tags
    // and merge them with the contact data
    
    return api.success({ contact: data })
    
  } catch (error) {
    console.error('Error fetching contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          }
        }
      }
    )
    
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = contactUpdateSchema.parse(body)
    
    // Add updated_at timestamp
    const updateData = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }
    
    // Update in database
    const { data, error } = await supabase
      .from('relationships')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    if (data.length === 0) {
      return api.error(ErrorCode.NOT_FOUND)
    }
    
    // Handle tags update (in a real implementation)
    // This would update tags in a separate table related to the contact
    
    return api.success({ contact: data[0] })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.success({ error: error.issues }, { status: 400 })
    }
    
    console.error('Error updating contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  // Initialize Supabase client
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        }
      }
    }
  )
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }
    
    // Delete the contact
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)
    
    if (error) {
      console.error('Database error:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }
    
    // In a real implementation, we would also delete related data
    // like tags, communication history, etc.
    
    return api.success({ success: true })
    
  } catch (error) {
    console.error('Error deleting contact:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
