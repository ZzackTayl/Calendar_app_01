import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { isAfter } from 'date-fns'

// POST /api/sharing/token - Access a share via token
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Parse the request body
    const body = await request.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    
    // Find the share by token
    const { data: shareData, error: shareError } = await supabase
      .from('calendar_shares')
      .select(`
        *,
        owner:owner_id(*),
        calendars:selected_calendars(
          calendar_id,
          calendar:calendar_id(id, name, color, description)
        )
      `)
      .eq('share_token', token)
      .eq('share_type', 'link')
      .single()
    
    if (shareError) {
      if (shareError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invalid or expired share token' }, { status: 404 })
      }
      console.error('Database error:', shareError)
      return NextResponse.json({ error: 'Failed to access share' }, { status: 500 })
    }
    
    // Check if the share has expired
    if (shareData.expires_at && isAfter(new Date(), new Date(shareData.expires_at))) {
      return NextResponse.json({ error: 'Share has expired' }, { status: 403 })
    }
    
    // Update last accessed timestamp
    await supabase
      .from('calendar_shares')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', shareData.id)
    
    // Prepare the response
    const share = {
      id: shareData.id,
      owner: {
        id: shareData.owner.id,
        name: shareData.owner.full_name || 'User',
      },
      created: shareData.created_at,
      expires: shareData.expires_at,
      privacyLevel: shareData.privacy_level,
      allowResharing: shareData.allow_resharing,
      showPrivateEvents: shareData.privacy_level === 'full_access',
    }
    
    // Format the calendars
    const calendars = shareData.calendars?.map((cal: any) => ({
      id: cal.calendar?.id || cal.calendar_id,
      name: cal.calendar?.name || 'Calendar',
      color: cal.calendar?.color || '#3b82f6',
      owner: shareData.owner.full_name || 'User',
      description: cal.calendar?.description,
      privacyLevel: shareData.privacy_level
    })) || []
    
    // Return the share data
    return NextResponse.json({
      share,
      calendars
    })
    
  } catch (error) {
    console.error('Error accessing shared calendar:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/sharing/token - Generate a new token for a share
export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  
  try {
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse the request body
    const body = await request.json()
    const { shareId } = body
    
    if (!shareId) {
      return NextResponse.json({ error: 'Missing share ID' }, { status: 400 })
    }
    
    // Check if the share exists and belongs to the user
    const { data: shareData, error: shareError } = await supabase
      .from('calendar_shares')
      .select('*')
      .eq('id', shareId)
      .eq('owner_id', session.user.id)
      .eq('share_type', 'link')
      .single()
    
    if (shareError) {
      if (shareError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Share not found' }, { status: 404 })
      }
      console.error('Database error:', shareError)
      return NextResponse.json({ error: 'Failed to fetch share' }, { status: 500 })
    }
    
    // Generate a new token
    const newToken = crypto.randomBytes(16).toString('hex')
    
    // Update the share with the new token
    const { error: updateError } = await supabase
      .from('calendar_shares')
      .update({ 
        share_token: newToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', shareId)
    
    if (updateError) {
      console.error('Error updating share token:', updateError)
      return NextResponse.json({ error: 'Failed to update share token' }, { status: 500 })
    }
    
    return NextResponse.json({ token: newToken })
    
  } catch (error) {
    console.error('Error regenerating token:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Import crypto at the top
import crypto from 'crypto'
