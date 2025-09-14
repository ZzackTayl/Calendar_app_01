import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { z } from 'zod'
import { createPermissionService } from '@/lib/permissions/permission-service'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Event update validation schema
const eventUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Title contains invalid characters' }
  ),
  description: z.string().max(2000).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Description contains invalid characters' }
  ),
  start_time: z.string().optional().refine(dateStr => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid start date/time format"),
  end_time: z.string().optional().refine(dateStr => {
    if (!dateStr) return true;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }, "Invalid end date/time format"),
  location: z.string().max(500).optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Location contains invalid characters' }
  ),
  time_zone: z.string().max(100).optional(),
  is_all_day: z.boolean().optional(),
  privacy_level: z.enum(['private', 'busy_only', 'details']).optional(),
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  visible_to_groups: z.array(z.string().uuid()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  recurrence_rule: z.string().optional().refine(
    (val) => !val || !/[<>'"]/.test(val),
    { message: 'Recurrence rule contains invalid characters' }
  ),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
}).refine(data => {
  // Check if end_time is after start_time (only if both are provided)
  if (data.start_time && data.end_time) {
    const startDate = new Date(data.start_time);
    const endDate = new Date(data.end_time);
    return endDate > startDate;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['end_time']
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    const supabase = createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED)
    }

    const eventId = params.id

    if (!eventId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Check if user has permission to view this event
    const permissionService = createPermissionService(supabase)
    const permission = await permissionService.canViewEvent(user.id, eventId)

    if (!permission.allowed) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Get the event with related data
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        *,
        relationship:relationship_id(
          id,
          partner_name,
          relationship_type,
          color
        ),
        event_permissions(
          id,
          relationship_id,
          group_id,
          permission_level,
          relationship:relationship_id(
            id,
            partner_name,
            relationship_type
          ),
          relationship_group:group_id(
            id,
            group_name,
            color
          )
        ),
        event_attachments(
          id,
          file_name,
          file_type,
          file_url,
          file_size,
          created_at
        ),
        reminders(
          id,
          reminder_time,
          type,
          sent
        )
      `)
      .eq('id', eventId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return api.error(ErrorCode.NOT_FOUND)
      }
      console.error('Error fetching event:', error)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Apply visibility rules based on permission level
    let visibleEvent = event
    if (permission.level === 'busy_only' && event.user_id !== user.id) {
      // Mask sensitive details for busy_only access
      visibleEvent = {
        ...event,
        title: 'Busy',
        description: null,
        location: null,
        event_attachments: [],
        _visibility_level: 'busy_only'
      }
    }

    return api.success({ event: visibleEvent })
  } catch (error) {
    console.error('Error in event GET:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }

    const user = csrfValidation.user;
    const supabase = createRouteHandlerClient();

    const eventId = params.id
    if (!eventId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    const body = await request.json()
    const validatedData = eventUpdateSchema.parse(body)

    // Extract fields that need separate handling
    const { 
      visible_to_relationships, 
      visible_to_groups, 
      ...eventData 
    } = validatedData

    // First, verify the user has permission to modify this event
    const permissionService = createPermissionService(supabase)
    const modifyPermission = await permissionService.canModifyEvent(user.id, eventId)

    if (!modifyPermission.allowed) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Update the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (eventError) {
      console.error('Error updating event:', eventError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    // Handle explicit relationship/group permissions for private events
    // In the new privacy model, only private events can have explicit permissions
    if (validatedData.privacy_level === 'private') {
      // Clear existing permissions
      await supabase
        .from('event_permissions')
        .delete()
        .eq('event_id', eventId)

      // Add new relationship permissions for private events
      if (visible_to_relationships && visible_to_relationships.length > 0) {
        const relationshipPermissions = visible_to_relationships.map(relationshipId => ({
          event_id: eventId,
          relationship_id: relationshipId,
          permission_level: 'private_override' // Special permission to override private event
        }))

        const { error: permissionsError } = await supabase
          .from('event_permissions')
          .insert(relationshipPermissions)

        if (permissionsError) {
          console.error('Error updating relationship permissions:', permissionsError)
        }
      }

      // Add new group permissions for private events
      if (visible_to_groups && visible_to_groups.length > 0) {
        const groupPermissions = visible_to_groups.map(groupId => ({
          event_id: eventId,
          group_id: groupId,
          permission_level: 'private_override' // Special permission to override private event
        }))

        const { error: groupPermissionsError } = await supabase
          .from('event_permissions')
          .insert(groupPermissions)

        if (groupPermissionsError) {
          console.error('Error updating group permissions:', groupPermissionsError)
        }
      }
    } else if (validatedData.privacy_level && (validatedData.privacy_level === 'busy_only' || validatedData.privacy_level === 'details')) {
      // Clear explicit permissions if switching away from private (busy_only/details use connection tier logic)
      await supabase
        .from('event_permissions')
        .delete()
        .eq('event_id', eventId)
    }

    return api.success({ event })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    console.error('Error in event PUT:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const api = createApiResponse();

  try {
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN);
    }

    const user = csrfValidation.user;
    const supabase = createRouteHandlerClient();

    const eventId = params.id
    if (!eventId) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }

    // Verify the user has permission to delete this event
    const permissionService = createPermissionService(supabase)
    const deletePermission = await permissionService.canModifyEvent(user.id, eventId)

    if (!deletePermission.allowed) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Get event info for logging before deletion
    const { data: event } = await supabase
      .from('events')
      .select('title, start_time')
      .eq('id', eventId)
      .single()

    if (!event) {
      return api.error(ErrorCode.NOT_FOUND)
    }

    // Delete the event (cascade will handle related records like permissions, attachments, reminders)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return api.error(ErrorCode.INTERNAL_ERROR)
    }

    return api.success({ 
      success: true,
      message: `Event "${event.title}" deleted successfully` 
    })
  } catch (error) {
    console.error('Error in event DELETE:', error)
    return api.error(ErrorCode.INTERNAL_ERROR)
  }
}