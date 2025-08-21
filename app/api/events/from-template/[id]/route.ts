import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EnhancedEventSchema } from '@/lib/validation/enhanced-schemas';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body for additional event data
    const body = await request.json();
    const { start_time, end_time, ...additionalData } = body;

    // Fetch the template
    const { data: template, error: templateError } = await supabase
      .from('event_templates')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      console.error('Error fetching template:', templateError);
      return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
    }

    // Create event data from template
    const eventData = {
      user_id: user.id,
      title: template.title,
      description: template.description,
      location: template.location,
      color: template.color,
      privacy_level: template.privacy_level,
      relationship_id: template.relationship_id,
      visible_to_relationships: template.visible_to_relationships,
      visible_to_contacts: template.visible_to_contacts,
      visible_to_groups: template.visible_to_groups,
      start_time: start_time,
      end_time: end_time,
      ...additionalData,
    };

    // Validate the event data
    const validationResult = EnhancedEventSchema.safeParse(eventData);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid event data', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const validatedEventData = validationResult.data;

    // Insert the event into the database
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert([validatedEventData])
      .select()
      .single();

    if (eventError) {
      console.error('Error creating event from template:', eventError);
      return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }

    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/events/from-template/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
