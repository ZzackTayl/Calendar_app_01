import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS 
} from '@/lib/rate-limiting'
import { z } from 'zod'
import { NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schemas
const contactSchema = z.object({
  first_name: z.string().min(1).max(100).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'First name contains invalid characters' }
  ),
  last_name: z.string().min(1).max(100).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Last name contains invalid characters' }
  ),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')).refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Phone contains invalid characters' }
  ),
  company: z.string().max(200).optional().or(z.literal('')).refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Company contains invalid characters' }
  ),
  job_title: z.string().max(200).optional().or(z.literal('')).refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Job title contains invalid characters' }
  ),
  notes: z.string().optional().or(z.literal('')).refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Notes contains invalid characters' }
  ),
  avatar_url: z.string().url().optional().or(z.literal('')),
  is_favorite: z.boolean().optional(),
  tags: z.array(z.string().refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Tag contains invalid characters' }
  )).optional(),
  groups: z.array(z.string().refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Group contains invalid characters' }
  )).optional()
})

const contactUpdateSchema = contactSchema.partial()

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    const ip = getClientIP(request)
    
    // Enhanced authentication with session validation and recovery
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity
        }
      })
    }
    
    const user = authValidation.user

    // Apply user-based rate limiting for API calls
    const isAdmin = await isAdminUser(user.id)
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin)
    
    // Create headers for response
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'contacts GET',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      )
      
      return api.success(
        { 
          error: 'API rate limit exceeded. Please slow down your requests.',
          retryAfter: rateLimitResult.retryAfter
        },
        { 
          status: 429,
          headers
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',')
    const groups = searchParams.get('groups')?.split(',')
    const favorites = searchParams.get('favorites') === 'true'
    const company = searchParams.get('company')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the query
    let query = supabase
      .from('contacts')
      .select(`
        *,
        contact_tag_relationships!inner(
          contact_tags!inner(name)
        ),
        contact_group_relationships!inner(
          contact_groups!inner(name)
        )
      `)
      .eq('user_id', user.id)

    // Apply filters with proper escaping
    if (search) {
      // Sanitize search parameter to prevent SQL injection
      const sanitizedSearch = search.replace(/[<>'"]/g, '').trim()
      if (sanitizedSearch) {
        query = query.or(`first_name.ilike.%${sanitizedSearch}%,last_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,company.ilike.%${sanitizedSearch}%`)
      }
    }

    if (favorites) {
      query = query.eq('is_favorite', true)
    }

    if (company) {
      // Sanitize company parameter
      const sanitizedCompany = company.replace(/[<>'"]/g, '').trim()
      if (sanitizedCompany) {
        query = query.eq('company', sanitizedCompany)
      }
    }

    if (tags && tags.length > 0) {
      // Sanitize tags array
      const sanitizedTags = tags
        .map(tag => tag.replace(/[<>'"]/g, '').trim())
        .filter(tag => tag.length > 0)
      if (sanitizedTags.length > 0) {
        query = query.in('contact_tag_relationships.contact_tags.name', sanitizedTags)
      }
    }

    if (groups && groups.length > 0) {
      // Sanitize groups array
      const sanitizedGroups = groups
        .map(group => group.replace(/[<>'"]/g, '').trim())
        .filter(group => group.length > 0)
      if (sanitizedGroups.length > 0) {
        query = query.in('contact_group_relationships.contact_groups.name', sanitizedGroups)
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    query = query.order('created_at', { ascending: false })

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching contacts:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Transform the data to flatten the relationships
    const transformedContacts = contacts?.map(contact => ({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      job_title: contact.job_title,
      notes: contact.notes,
      avatar_url: contact.avatar_url,
      is_favorite: contact.is_favorite,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      tags: contact.contact_tag_relationships?.map((r: any) => r.contact_tags.name) || [],
      groups: contact.contact_group_relationships?.map((r: any) => r.contact_groups.name) || []
    })) || []

    return api.success({ contacts: transformedContacts })
  } catch (error) {
    console.error('Error in contacts GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
    // Enhanced authentication with session validation and recovery
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity
        }
      })
    }
    
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }
    
    const user = authValidation.user

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    // Extract tags and groups for separate handling
    const { tags, groups, ...contactData } = validatedData

    // Insert the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        ...contactData,
        user_id: user.id
      })
      .select()
      .single()

    if (contactError) {
      console.error('Error creating contact:', contactError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create the tag
        let { data: tag } = await supabase
          .from('contact_tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', tagName)
          .single()

        if (!tag) {
          const { data: newTag } = await supabase
            .from('contact_tags')
            .insert({
              user_id: user.id,
              name: tagName
            })
            .select('id')
            .single()
          tag = newTag
        }

        if (tag) {
          // Create the relationship
          await supabase
            .from('contact_tag_relationships')
            .insert({
              contact_id: contact.id,
              tag_id: tag.id
            })
        }
      }
    }

    // Handle groups if provided
    if (groups && groups.length > 0) {
      for (const groupName of groups) {
        // Get or create the group
        let { data: group } = await supabase
          .from('contact_groups')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', groupName)
          .single()

        if (!group) {
          const { data: newGroup } = await supabase
            .from('contact_groups')
            .insert({
              user_id: user.id,
              name: groupName
            })
            .select('id')
            .single()
          group = newGroup
        }

        if (group) {
          // Create the relationship
          await supabase
            .from('contact_group_relationships')
            .insert({
              contact_id: contact.id,
              group_id: group.id
            })
        }
      }
    }

    // Log the activity
    await supabase
      .from('contact_activity_log')
      .insert({
        contact_id: contact.id,
        user_id: user.id,
        activity_type: 'created',
        description: `Created contact ${contact.first_name} ${contact.last_name}`
      })

    return api.success({ contact }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in contacts POST:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
    // Enhanced authentication with session validation and recovery
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity
        }
      })
    }
    
    const user = authValidation.user

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    const validatedData = contactUpdateSchema.parse(updateData)

    // Extract tags and groups for separate handling
    const { tags, groups, ...contactData } = validatedData

    // Update the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .update(contactData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (contactError) {
      console.error('Error updating contact:', contactError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Handle tags if provided
    if (tags !== undefined) {
      // Remove existing tag relationships
      await supabase
        .from('contact_tag_relationships')
        .delete()
        .eq('contact_id', id)

      // Add new tag relationships
      if (tags.length > 0) {
        for (const tagName of tags) {
          // Get or create the tag
          let { data: tag } = await supabase
            .from('contact_tags')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', tagName)
            .single()

          if (!tag) {
            const { data: newTag } = await supabase
              .from('contact_tags')
              .insert({
                user_id: user.id,
                name: tagName
              })
              .select('id')
              .single()
            tag = newTag
          }

          if (tag) {
            // Create the relationship
            await supabase
              .from('contact_tag_relationships')
              .insert({
                contact_id: id,
                tag_id: tag.id
              })
          }
        }
      }
    }

    // Handle groups if provided
    if (groups !== undefined) {
      // Remove existing group relationships
      await supabase
        .from('contact_group_relationships')
        .delete()
        .eq('contact_id', id)

      // Add new group relationships
      if (groups.length > 0) {
        for (const groupName of groups) {
          // Get or create the group
          let { data: group } = await supabase
            .from('contact_groups')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', groupName)
            .single()

          if (!group) {
            const { data: newGroup } = await supabase
              .from('contact_groups')
              .insert({
                user_id: user.id,
                name: groupName
              })
              .select('id')
              .single()
            group = newGroup
          }

          if (group) {
            // Create the relationship
            await supabase
              .from('contact_group_relationships')
              .insert({
                contact_id: id,
                group_id: group.id
              })
          }
        }
      }
    }

    // Log the activity
    await supabase
      .from('contact_activity_log')
      .insert({
        contact_id: id,
        user_id: user.id,
        activity_type: 'updated',
        description: `Updated contact ${contact.first_name} ${contact.last_name}`
      })

    return api.success({ contact })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in contacts PUT:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
    // Enhanced authentication with session validation and recovery
    const authValidation = await requireAuthentication(request)
    if (!authValidation.valid || !authValidation.user) {
      return api.success({ 
        error: 'Authentication required',
        details: authValidation.error,
        contextIntegrity: authValidation.contextIntegrity
      }, { 
        status: 401,
        headers: {
          'X-Auth-Context': authValidation.contextIntegrity
        }
      })
    }
    
    const user = authValidation.user

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Get contact info for logging
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    // Delete the contact (cascading will handle relationships)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting contact:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Log the activity
    if (contact) {
      await supabase
        .from('contact_activity_log')
        .insert({
          contact_id: id,
          user_id: user.id,
          activity_type: 'deleted',
          description: `Deleted contact ${contact.first_name} ${contact.last_name}`
        })
    }

    return api.success({ success: true })
  } catch (error) {
    console.error('Error in contacts DELETE:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}
