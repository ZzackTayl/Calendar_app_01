import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Define schemas for validation
const contactSchema = z.object({
  partner_name: z.string().min(1, { message: 'Name is required' }),
  partner_email: z.string().email({ message: 'Invalid email' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  relationship_type: z.enum(['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'other']),
  start_date: z.string().optional().nullable(),
  color: z.string().min(1, { message: 'Color is required' }),
  privacy_level: z.enum(['full_access', 'limited_access', 'no_access']).default('limited_access'),
  is_active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  contact_frequency: z.enum(['frequent', 'regular', 'occasional', 'rare']).optional().nullable(),
  tags: z.array(z.string()).optional().nullable()
})

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tag = searchParams.get('tag')
  const searchTerm = searchParams.get('search')
  const privacyLevel = searchParams.get('privacy')
  
  // Initialize Supabase client
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Start building the query
    let query = supabase
      .from('relationships')
      .select('*')
      .eq('user_id', session.user.id)
    
    // Apply filters
    if (searchTerm) {
      query = query.or(`partner_name.ilike.%${searchTerm}%,partner_email.ilike.%${searchTerm}%`)
    }
    
    if (privacyLevel) {
      query = query.eq('privacy_level', privacyLevel)
    }
    
    // Execute the query
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }
    
    // Filter by tag if provided (would be done in database in a real implementation)
    let filteredData = data
    if (tag && filteredData) {
      // This is just a placeholder since we don't have actual tag storage in database yet
      // In a real implementation, this would be a database query with join to a tags table
      filteredData = filteredData.filter(contact => 
        contact.notes && contact.notes.toLowerCase().includes(tag.toLowerCase())
      )
    }
    
    return NextResponse.json({ contacts: filteredData })
    
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const validatedData = contactSchema.parse(body)
    
    // Add user_id and timestamps
    const contact = {
      ...validatedData,
      user_id: session.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Store in database
    const { data, error } = await supabase
      .from('relationships')
      .insert(contact)
      .select()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }
    
    // Handle tags (in a real implementation)
    // This would store tags in a separate table with a relationship to the contact
    
    return NextResponse.json({ contact: data[0] })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
