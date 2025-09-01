import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { z } from 'zod'

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
  try {
    const supabase = createRouteHandlerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = params.id

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
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
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      console.error('Error fetching event:', error)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Error in event GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ 
        error: 'CSRF validation failed',
        details: csrfValidation.error 
      }, { status: 403 });
    }

    const user = csrfValidation.user;
    const supabase = createRouteHandlerClient();

    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = eventUpdateSchema.parse(body)

    // Extract fields that need separate handling
    const { 
      visible_to_relationships, 
      visible_to_groups, 
      ...eventData 
    } = validatedData

    // First, verify the event exists and user has permission
    const { data: existingEvent, error: checkError } = await supabase
      .from('events')
      .select('id, user_id')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (checkError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
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
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
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
    } else if (validatedData.privacy_level && validatedData.privacy_level !== 'private') {
      // Clear explicit permissions if switching away from private (busy_only/details use connection tier logic)
      await supabase
        .from('event_permissions')
        .delete()
        .eq('event_id', eventId)
    }

    return NextResponse.json({ event })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error in event PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return NextResponse.json({ 
        error: 'CSRF validation failed',
        details: csrfValidation.error 
      }, { status: 403 });
    }

    const user = csrfValidation.user;
    const supabase = createRouteHandlerClient();

    const eventId = params.id
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    // Get event info for logging before deletion
    const { data: event } = await supabase
      .from('events')
      .select('title, start_time')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single()

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }

    // Delete the event (cascade will handle related records like permissions, attachments, reminders)
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Error deleting event:', deleteError)
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Event "${event.title}" deleted successfully` 
    })
  } catch (error) {
    console.error('Error in event DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}