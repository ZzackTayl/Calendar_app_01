import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { validateCSRFProtection } from '@/lib/security/csrf'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Template validation schemas
const templateSchema = z.object({
  name: z.string().min(1).max(200).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Template name contains invalid characters' }
  ),
  description: z.string().max(1000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ),
  title_template: z.string().min(1).max(200).refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Title template contains invalid characters' }
  ),
  description_template: z.string().max(2000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description template contains invalid characters' }
  ),
  location_template: z.string().max(500).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Location template contains invalid characters' }
  ),
  default_duration_minutes: z.number().int().min(1).max(1440).optional(), // Max 24 hours
  default_connection_tier: z.enum(['private', 'busy_only', 'details']).optional().default('private'),
  default_relationship_id: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional().default(true),
  tags: z.array(z.string().refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Tag contains invalid characters' }
  )).optional(),
});

const templateUpdateSchema = templateSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const is_active = searchParams.get('is_active')
    const relationship_id = searchParams.get('relationship_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // NOTE: Since the event_templates table was removed, we'll return a helpful message
    // In a real implementation, you would first need to create the table
    
    // For now, return an empty response with information about the missing table
    console.log('Templates API called but event_templates table does not exist')
    
    // This is what the query would look like if the table existed:
    /*
    let query = supabase
      .from('event_templates')
      .select(`
        *,
        relationship:default_relationship_id(
          id,
          partner_name,
          relationship_type,
          color
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters with proper sanitization
    if (search) {
      const sanitizedSearch = search.replace(/[<>'"]/g, '').trim()
      if (sanitizedSearch) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%,title_template.ilike.%${sanitizedSearch}%`)
      }
    }

    if (is_active !== null) {
      query = query.eq('is_active', is_active === 'true')
    }

    if (relationship_id) {
      query = query.eq('default_relationship_id', relationship_id)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: templates, error } = await query
    */

    // Return empty templates array since table doesn't exist
    return NextResponse.json({ 
      templates: [], 
      total: 0,
      message: 'Event templates table does not exist. Please create the table first or consider this feature as deprecated.'
    })
  } catch (error) {
    console.error('Error in templates GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Check authentication
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
    const validatedData = templateSchema.parse(body)

    // Extract tags for separate handling
    const { tags, ...templateData } = validatedData

    // NOTE: Since the event_templates table was removed, we'll return a helpful error
    return NextResponse.json({ 
      error: 'Event templates table does not exist',
      message: 'The event_templates table was removed in a previous migration. To use templates, you would need to recreate the table first.'
    }, { status: 501 })

    // This is what the code would look like if the table existed:
    /*
    // Insert the template
    const { data: template, error: templateError } = await supabase
      .from('event_templates')
      .insert({
        ...templateData,
        user_id: user.id
      })
      .select()
      .single()

    if (templateError) {
      console.error('Error creating template:', templateError)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    // Handle tags if provided (would require a template_tags table)
    if (tags && tags.length > 0) {
      // Implementation would depend on your tag system design
    }

    return NextResponse.json({ template }, { status: 201 })
    */
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error in templates POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}