import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's timezone preference
    const { data: userData, error } = await supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user timezone:', error)
      return NextResponse.json({ error: 'Failed to fetch timezone preference' }, { status: 500 })
    }

    return NextResponse.json({ 
      timezone: userData?.timezone || 'UTC' 
    })
    
  } catch (error) {
    console.error('Error in timezone GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request)
    if (!csrfValidation.valid) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    const body = await request.json()
    const { timezone } = body

    if (!timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 })
    }

    // Update user's timezone preference
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ timezone })
      .eq('id', user.id)
      .select('timezone')
      .single()

    if (error) {
      console.error('Error updating user timezone:', error)
      return NextResponse.json({ error: 'Failed to update timezone preference' }, { status: 500 })
    }

    return NextResponse.json({ 
      timezone: updatedUser?.timezone 
    })
    
  } catch (error) {
    console.error('Error in timezone PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
