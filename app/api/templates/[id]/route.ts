import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Template update validation schema
const templateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Template name contains invalid characters' }
  ),
  description: z.string().max(1000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ),
  title_template: z.string().min(1).max(200).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
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
  default_privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']).optional(), // Legacy - for backward compatibility
  default_connection_tier: z.enum(['private', 'busy_only', 'details']).optional(),
  default_relationship_id: z.string().uuid().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_active: z.boolean().optional(),
  tags: z.array(z.string().refine(
    (val) => !/[<>'"]/.test(val),
    { message: 'Tag contains invalid characters' }
  )).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    const templateId = params.id

    if (!templateId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // NOTE: Since the event_templates table was removed, we'll return a helpful error
    return api.success({ 
      error: 'Event templates table does not exist',
      message: 'The event_templates table was removed in a previous migration. To use templates, you would need to recreate the table first.'
    }, { status: 501 })

    // This is what the code would look like if the table existed:
    /*
    // Get the template with related data
    const { data: template, error } = await supabase
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
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return api.error(ErrorCode.NOT_FOUND)
      }
      console.error('Error fetching template:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ template })
    */
  } catch (error) {
    console.error('Error in template GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    const templateId = params.id
    if (!templateId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    const body = await request.json()
    const validatedData = templateUpdateSchema.parse(body)

    // NOTE: Since the event_templates table was removed, we'll return a helpful error
    return api.success({ 
      error: 'Event templates table does not exist',
      message: 'The event_templates table was removed in a previous migration. To use templates, you would need to recreate the table first.'
    }, { status: 501 })

    // This is what the code would look like if the table existed:
    /*
    // Extract tags for separate handling
    const { tags, ...templateData } = validatedData

    // First, verify the template exists and user has permission
    const { data: existingTemplate, error: checkError } = await supabase
      .from('event_templates')
      .select('id, user_id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingTemplate) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Update the template
    const { data: template, error: templateError } = await supabase
      .from('event_templates')
      .update({
        ...templateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (templateError) {
      console.error('Error updating template:', templateError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Handle tags if provided (would require a template_tags system)
    if (tags !== undefined) {
      // Implementation would depend on your tag system design
    }

    return api.success({ template })
    */
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in template PUT:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    const templateId = params.id
    if (!templateId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // NOTE: Since the event_templates table was removed, we'll return a helpful error
    return api.success({ 
      error: 'Event templates table does not exist',
      message: 'The event_templates table was removed in a previous migration. To use templates, you would need to recreate the table first.'
    }, { status: 501 })

    // This is what the code would look like if the table existed:
    /*
    // Get template info for logging before deletion
    const { data: template } = await supabase
      .from('event_templates')
      .select('name')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single()

    if (!template) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Delete the template (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('event_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting template:', deleteError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ 
      success: true,
      message: `Template "${template.name}" deleted successfully` 
    })
    */
  } catch (error) {
    console.error('Error in template DELETE:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}