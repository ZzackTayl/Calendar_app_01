import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EventTemplateSchema } from '@/lib/validation/enhanced-schemas';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch templates for the current user
    const { data: templates, error } = await supabase
      .from('event_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Unexpected error in GET /api/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate the request body
    const body = await request.json();
    
    // Validate the template data
    const validationResult = EventTemplateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid template data', 
        details: validationResult.error.errors 
      }, { status: 400 });
    }

    const templateData = validationResult.data;
    
    // Ensure the user_id matches the authenticated user
    templateData.user_id = user.id;

    // Insert the template into the database
    const { data: newTemplate, error } = await supabase
      .from('event_templates')
      .insert([templateData])
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
