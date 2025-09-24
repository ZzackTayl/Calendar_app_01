import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { validatePasswordStrength, hashPassword } from '@/lib/auth/password-utils'
import { validateCSRFProtection } from '@/lib/security/csrf'
import * as crypto from 'crypto'
import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schemas
const shareSchema = z.object({
  share_name: z.string().min(1).max(200).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Share name contains invalid characters' }
  ),
  description: z.string().optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ),
  share_type: z.enum(['public', 'private', 'password_protected']).default('public'),
  password: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  permissions: z.array(z.object({
    permission_type: z.enum(['view', 'edit', 'manage']),
    scope: z.enum(['all', 'events', 'contacts', 'groups']).default('all')
  })).optional(),
  filters: z.array(z.object({
    filter_type: z.enum(['event_type', 'category', 'date_range', 'privacy_level']),
    filter_value: z.string().refine(
      (val) => !/[<>'"]/.test(val),
      { message: 'Filter value contains invalid characters' }
    ),
    filter_operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'in']).default('equals')
  })).optional()
})

const shareUpdateSchema = shareSchema.partial()

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
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

    // Apply filters with proper escaping
    if (search) {
      // Sanitize search parameter to prevent SQL injection
      const sanitizedSearch = search.replace(/[<>'"]/g, '').trim()
      if (sanitizedSearch) {
        query = query.or(`share_name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`)
      }
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
      return api.error(ErrorCode.INTERNAL_ERROR)
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

    return api.success({ shares: transformedShares })
  } catch (error) {
    console.error('Error in sharing GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request)
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN)
    }

    const body = await request.json()
    const validatedData = shareSchema.parse(body)

    // Generate secure access token
    const access_token = 'cal_' + crypto.randomBytes(32).toString('base64url')

    // Hash password if provided using secure bcrypt
    let password_hash = null
    if (validatedData.password && validatedData.share_type === 'password_protected') {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(validatedData.password)
      if (!passwordValidation.isValid) {
        return api.error(ErrorCode.VALIDATION_ERROR)
      }
      
      password_hash = await hashPassword(validatedData.password)
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
      return api.error(ErrorCode.INTERNAL_ERROR)
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

    return api.success({ 
      share: {
        ...share,
        access_token: access_token // Return the token for immediate use
      }
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in sharing POST:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request)
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN)
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    const validatedData = shareUpdateSchema.parse(updateData)

    // Hash password if provided using secure bcrypt
    let password_hash = undefined
    if (validatedData.password && validatedData.share_type === 'password_protected') {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(validatedData.password)
      if (!passwordValidation.isValid) {
        return api.error(ErrorCode.VALIDATION_ERROR)
      }
      
      password_hash = await hashPassword(validatedData.password)
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
      return api.error(ErrorCode.INTERNAL_ERROR)
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

    return api.success({ share })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in sharing PUT:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    // Validate CSRF token
    const csrfValidation = await validateCSRFProtection(request)
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN)
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Delete the share (cascading will handle related records)
    const { error } = await supabase
      .from('calendar_shares')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting share:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ success: true })
  } catch (error) {
    console.error('Error in sharing DELETE:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
