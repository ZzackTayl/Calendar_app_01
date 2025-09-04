import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get calendar integrations for the user
    const { data: integrations, error: integrationsError } = await supabase
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (integrationsError) {
      console.error('Error fetching calendar integrations:', integrationsError);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar integrations' 
      }, { status: 500 });
    }

    // Transform the data to include only necessary information
    const transformedIntegrations = integrations?.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      account_email: integration.account_email,
      calendar_name: integration.calendar_name || `${integration.provider} Calendar`,
      is_active: integration.is_active,
      last_sync_at: integration.last_sync_at,
      sync_error: integration.sync_error,
      created_at: integration.created_at,
    })) || [];

    return NextResponse.json({
      success: true,
      integrations: transformedIntegrations,
      count: transformedIntegrations.length
    });

  } catch (error) {
    console.error('Error in calendar integrations API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}