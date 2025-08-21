import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Define schemas for validation
const contactUpdateSchema = z.object({
  partner_name: z.string().min(1, { message: 'Name is required' }).optional(),
  partner_email: z.string().email({ message: 'Invalid email' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship_type: z.enum(['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'other']).optional(),
  start_date: z.string().optional().nullable(),
  color: z.string().min(1, { message: 'Color is required' }).optional(),
  privacy_level: z.enum(['full_access', 'limited_access', 'no_access']).optional(),
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
  // Initialize Supabase client
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
    }
    
    // In a real implementation, we would also fetch related data like tags
    // and merge them with the contact data
    
    return NextResponse.json({ contact: data })
    
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }
    
    if (data.length === 0) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    
    // Handle tags update (in a real implementation)
    // This would update tags in a separate table related to the contact
    
    return NextResponse.json({ contact: data[0] })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Initialize Supabase client
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete the contact
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }
    
    // In a real implementation, we would also delete related data
    // like tags, communication history, etc.
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
