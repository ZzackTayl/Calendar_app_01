import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'

// Schema for share updates
const shareUpdateSchema = z.object({
  privacyLevel: z.enum(['full_access', 'limited_access', 'busy_only', 'hidden', 'no_access']).optional(),
  expirationEnabled: z.boolean().optional(),
  expirationDate: z.string().optional(),
  allowResharing: z.boolean().optional(),
  calendarType: z.enum(['all', 'selected']).optional(),
  selectedCalendars: z.array(z.string()).optional(),
})

// Function to generate a secure sharing token
function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

// GET /api/sharing/[id] - Get a specific share
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch the share
    const { data, error } = await supabase
      .from('calendar_shares')
      .select(`
        *,
        calendars:selected_calendars(calendar_id),
        recipient_details:recipient_id(id, name, email),
        group_details:group_id(id, group_name)
      `)
      .eq('id', params.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Share not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch share' }, { status: 500 })
    }
    
    // Ensure the user is the owner or recipient of the share
    if (data.owner_id !== session.user.id && data.recipient_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Process the share data
    let recipient
    if (data.share_type === 'contact') {
      recipient = data.recipient_details
    } else if (data.share_type === 'group') {
      recipient = data.group_details
    } else if (data.share_type === 'email') {
      recipient = { 
        id: data.recipient_email,
        name: data.recipient_email,
        email: data.recipient_email
      }
    } else if (data.share_type === 'link') {
      recipient = {
        id: 'link',
        name: 'Shareable Link'
      }
    }
    
    const share = {
      id: data.id,
      shareType: data.share_type,
      recipient: {
        ...recipient,
        type: data.share_type
      },
      created: data.created_at,
      expires: data.expires_at,
      lastAccessed: data.last_accessed_at,
      privacyLevel: data.privacy_level,
      allowResharing: data.allow_resharing,
      token: data.share_token,
      calendars: data.calendars?.map((cal: any) => cal.calendar_id) || []
    }
    
    return NextResponse.json({ share })
    
  } catch (error) {
    console.error('Error fetching share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/sharing/[id] - Update a share
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = shareUpdateSchema.parse(body)
    
    // Check if the share exists and belongs to the user
    const { data: shareData, error: shareError } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('id', params.id)
      .eq('owner_id', session.user.id)
      .single()
    
    if (shareError) {
      if (shareError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Share not found' }, { status: 404 })
      }
      console.error('Database error:', shareError)
      return NextResponse.json({ error: 'Failed to fetch share' }, { status: 500 })
    }
    
    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (validatedData.privacyLevel) {
      updateData.privacy_level = validatedData.privacyLevel
    }
    
    if (validatedData.expirationEnabled !== undefined) {
      updateData.expires_at = validatedData.expirationEnabled && validatedData.expirationDate 
        ? validatedData.expirationDate 
        : null
    }
    
    if (validatedData.allowResharing !== undefined) {
      updateData.allow_resharing = validatedData.allowResharing
    }
    
    // Update the share
    const { error: updateError } = await supabase
      .from('calendar_shares')
      .update(updateData)
      .eq('id', params.id)
    
    if (updateError) {
      console.error('Error updating share:', updateError)
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 })
    }
    
    // Handle calendar selections if needed
    if (validatedData.calendarType === 'selected' && validatedData.selectedCalendars) {
      // First, delete existing selections
      await supabase
        .from('selected_calendars')
        .delete()
        .eq('share_id', params.id)
      
      // Then, add new selections
      const calendarSelections = validatedData.selectedCalendars.map(calendarId => ({
        share_id: params.id,
        calendar_id: calendarId
      }))
      
      const { error: calendarSelectError } = await supabase
        .from('selected_calendars')
        .insert(calendarSelections)
      
      if (calendarSelectError) {
        console.error('Error updating calendars for share:', calendarSelectError)
        return NextResponse.json({ error: 'Failed to update calendars for share' }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error updating share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/sharing/[id] - Delete a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Delete calendar selections first (for referential integrity)
    await supabase
      .from('selected_calendars')
      .delete()
      .eq('share_id', params.id)
    
    // Then delete the share itself
    const { error } = await supabase
      .from('calendar_shares')
      .delete()
      .eq('id', params.id)
      .eq('owner_id', session.user.id)
    
    if (error) {
      console.error('Error deleting share:', error)
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
