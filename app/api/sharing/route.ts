import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'

// Schema for share creation
const shareSchema = z.object({
  shareType: z.enum(['contact', 'group', 'email', 'link']),
  recipient: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  privacyLevel: z.enum(['full_access', 'limited_access', 'busy_only', 'hidden', 'no_access']),
  expirationEnabled: z.boolean(),
  expirationDate: z.string().optional(),
  notifyRecipient: z.boolean(),
  message: z.string().optional(),
  allowResharing: z.boolean(),
  calendarType: z.enum(['all', 'selected']),
  selectedCalendars: z.array(z.string()).optional(),
})

// Function to generate a secure sharing token
function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex')
}

// GET /api/sharing - List shares
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const direction = searchParams.get('direction') || 'outgoing'
    
    // Fetch shares based on direction
    const query = direction === 'incoming' 
      ? supabase
          .from('calendar_shares')
          .select(`
            *,
            calendars:selected_calendars(calendar_id),
            recipient:recipient_id(id, name, email)
          `)
          .eq('recipient_id', session.user.id)
      : supabase
          .from('calendar_shares')
          .select(`
            *,
            calendars:selected_calendars(calendar_id),
            recipient_details:recipient_id(id, name, email),
            group_details:group_id(id, group_name)
          `)
          .eq('owner_id', session.user.id)
    
    // Add any additional filters
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
    }
    
    // Process the shares into a friendlier format
    const shares = data.map((share: any) => {
      // Determine recipient based on share type
      let recipient
      if (share.share_type === 'contact') {
        recipient = share.recipient_details
      } else if (share.share_type === 'group') {
        recipient = share.group_details
      } else if (share.share_type === 'email') {
        recipient = { 
          id: share.recipient_email,
          name: share.recipient_email,
          email: share.recipient_email
        }
      } else if (share.share_type === 'link') {
        recipient = {
          id: 'link',
          name: 'Shareable Link'
        }
      }
      
      return {
        id: share.id,
        shareType: share.share_type,
        recipient: {
          ...recipient,
          type: share.share_type
        },
        created: share.created_at,
        expires: share.expires_at,
        lastAccessed: share.last_accessed_at,
        privacyLevel: share.privacy_level,
        allowResharing: share.allow_resharing,
        token: share.share_token,
        calendars: share.calendars?.map((cal: any) => cal.calendar_id) || []
      }
    })
    
    return NextResponse.json({ shares })
    
  } catch (error) {
    console.error('Error fetching shares:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/sharing - Create a new share
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = shareSchema.parse(body)
    
    // Generate a share token for link shares
    const shareToken = validatedData.shareType === 'link' 
      ? generateShareToken() 
      : null
    
    // Prepare the share data
    const shareData = {
      owner_id: session.user.id,
      share_type: validatedData.shareType,
      recipient_id: validatedData.shareType === 'contact' ? validatedData.recipient : null,
      group_id: validatedData.shareType === 'group' ? validatedData.recipient : null,
      recipient_email: validatedData.shareType === 'email' ? validatedData.recipientEmail : null,
      privacy_level: validatedData.privacyLevel,
      expires_at: validatedData.expirationEnabled && validatedData.expirationDate 
        ? validatedData.expirationDate 
        : null,
      allow_resharing: validatedData.allowResharing,
      share_token: shareToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    // Insert the share
    const { data: shareInsertData, error: shareInsertError } = await supabase
      .from('calendar_shares')
      .insert(shareData)
      .select()
    
    if (shareInsertError) {
      console.error('Error creating share:', shareInsertError)
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
    }
    
    // Handle selected calendars
    if (validatedData.calendarType === 'selected' && validatedData.selectedCalendars?.length) {
      // Prepare calendar selection data
      const calendarSelections = validatedData.selectedCalendars.map(calendarId => ({
        share_id: shareInsertData[0].id,
        calendar_id: calendarId
      }))
      
      // Insert calendar selections
      const { error: calendarSelectError } = await supabase
        .from('selected_calendars')
        .insert(calendarSelections)
      
      if (calendarSelectError) {
        console.error('Error adding calendars to share:', calendarSelectError)
        // Delete the share if calendar selection fails
        await supabase
          .from('calendar_shares')
          .delete()
          .eq('id', shareInsertData[0].id)
        
        return NextResponse.json({ error: 'Failed to add calendars to share' }, { status: 500 })
      }
    }
    
    // Handle notification (in a real implementation)
    if (validatedData.notifyRecipient && 
       (validatedData.shareType === 'email' || validatedData.shareType === 'contact')) {
      // Here you would send an email notification
      // For now, we'll skip this part
    }
    
    // Return the share data
    return NextResponse.json({ 
      share: {
        id: shareInsertData[0].id,
        shareType: validatedData.shareType,
        token: shareToken
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error creating share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
