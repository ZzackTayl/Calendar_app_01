import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import * as crypto from 'crypto'

// Validation schemas
const shareSchema = z.object({
  share_name: z.string().min(1).max(200),
  description: z.string().optional(),
  share_type: z.enum(['public', 'private', 'password_protected']).default('public'),
  password: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  permissions: z.array(z.object({
    permission_type: z.enum(['view', 'edit', 'manage']),
    scope: z.enum(['all', 'events', 'contacts', 'groups']).default('all')
  })).optional(),
  filters: z.array(z.object({
    filter_type: z.enum(['event_type', 'category', 'date_range', 'privacy_level']),
    filter_value: z.string(),
    filter_operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'in']).default('equals')
  })).optional()
})

const shareUpdateSchema = shareSchema.partial()

export async function GET(request: NextRequest) {
  try {
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const share_type = searchParams.get('type')
    const is_active = searchParams.get('active')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the query
    let query = supabase
      .from('calendar_shares')
      .select(`
        *,
        share_permissions(*),
        share_filters(*),
        share_subscriptions(count)
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (search) {
      query = query.or(`share_name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (share_type) {
      query = query.eq('share_type', share_type)
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    query = query.order('created_at', { ascending: false })

    const { data: shares, error } = await query

    if (error) {
      console.error('Error fetching shares:', error)
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
    }

    // Transform the data
    const transformedShares = shares?.map(share => ({
      id: share.id,
      share_name: share.share_name,
      description: share.description,
      share_type: share.share_type,
      access_token: share.access_token,
      expires_at: share.expires_at,
      is_active: share.is_active,
      view_count: share.view_count,
      last_accessed_at: share.last_accessed_at,
      created_at: share.created_at,
      updated_at: share.updated_at,
      permissions: share.share_permissions || [],
      filters: share.share_filters || [],
      subscriber_count: share.share_subscriptions?.[0]?.count || 0
    })) || []

    return NextResponse.json({ shares: transformedShares })
  } catch (error) {
    console.error('Error in sharing GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = shareSchema.parse(body)

    // Generate secure access token
    const access_token = 'cal_' + crypto.randomBytes(32).toString('base64url')

    // Hash password if provided
    let password_hash = null
    if (validatedData.password && validatedData.share_type === 'password_protected') {
      password_hash = crypto.createHash('sha256').update(validatedData.password).digest('hex')
    }

    // Insert the share
    const { data: share, error: shareError } = await supabase
      .from('calendar_shares')
      .insert({
        user_id: user.id,
        share_name: validatedData.share_name,
        description: validatedData.description,
        share_type: validatedData.share_type,
        access_token,
        password_hash,
        expires_at: validatedData.expires_at
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error creating share:', shareError)
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
    }

    // Handle permissions if provided
    if (validatedData.permissions && validatedData.permissions.length > 0) {
      const permissions = validatedData.permissions.map(permission => ({
        share_id: share.id,
        permission_type: permission.permission_type,
        scope: permission.scope
      }))

      await supabase
        .from('share_permissions')
        .insert(permissions)
    }

    // Handle filters if provided
    if (validatedData.filters && validatedData.filters.length > 0) {
      const filters = validatedData.filters.map(filter => ({
        share_id: share.id,
        filter_type: filter.filter_type,
        filter_value: filter.filter_value,
        filter_operator: filter.filter_operator
      }))

      await supabase
        .from('share_filters')
        .insert(filters)
    }

    return NextResponse.json({ 
      share: {
        ...share,
        access_token: access_token // Return the token for immediate use
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    
    console.error('Error in sharing POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 })
    }

    const validatedData = shareUpdateSchema.parse(updateData)

    // Hash password if provided
    let password_hash = undefined
    if (validatedData.password && validatedData.share_type === 'password_protected') {
      password_hash = crypto.createHash('sha256').update(validatedData.password).digest('hex')
    }

    // Update the share
    const { data: share, error: shareError } = await supabase
      .from('calendar_shares')
      .update({
        share_name: validatedData.share_name,
        description: validatedData.description,
        share_type: validatedData.share_type,
        password_hash,
        expires_at: validatedData.expires_at
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (shareError) {
      console.error('Error updating share:', shareError)
      return NextResponse.json({ error: 'Failed to update share' }, { status: 500 })
    }

    // Handle permissions if provided
    if (validatedData.permissions !== undefined) {
      // Remove existing permissions
      await supabase
        .from('share_permissions')
        .delete()
        .eq('share_id', id)

      // Add new permissions
      if (validatedData.permissions.length > 0) {
        const permissions = validatedData.permissions.map(permission => ({
          share_id: id,
          permission_type: permission.permission_type,
          scope: permission.scope
        }))

        await supabase
          .from('share_permissions')
          .insert(permissions)
      }
    }

    // Handle filters if provided
    if (validatedData.filters !== undefined) {
      // Remove existing filters
      await supabase
        .from('share_filters')
        .delete()
        .eq('share_id', id)

      // Add new filters
      if (validatedData.filters.length > 0) {
        const filters = validatedData.filters.map(filter => ({
          share_id: id,
          filter_type: filter.filter_type,
          filter_value: filter.filter_value,
          filter_operator: filter.filter_operator
        }))

        await supabase
          .from('share_filters')
          .insert(filters)
      }
    }

    return NextResponse.json({ share })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    
    console.error('Error in sharing PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Share ID is required' }, { status: 400 })
    }

    // Delete the share (cascading will handle related records)
    const { error } = await supabase
      .from('calendar_shares')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting share:', error)
      return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in sharing DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
