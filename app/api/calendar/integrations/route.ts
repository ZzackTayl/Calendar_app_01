import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch calendar integrations for the user
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

    // Transform the data to match the frontend interface
    const transformedIntegrations = integrations?.map(integration => ({
      id: integration.id,
      provider: integration.provider,
      accountEmail: integration.account_email,
      calendarName: integration.calendar_name || `${integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)} Calendar`,
      isActive: integration.is_active,
      lastSyncAt: integration.last_sync_at,
      syncError: integration.sync_error,
      syncEnabled: integration.sync_enabled,
    })) || [];

    return NextResponse.json({
      success: true,
      integrations: transformedIntegrations
    });

  } catch (error) {
    console.error('Error in calendar integrations API:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
