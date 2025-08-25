import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const calendarSetupSchema = z.object({
  provider: z.enum(['google', 'apple', 'outlook']),
  action: z.enum(['initialize', 'cancel', 'retry']).default('initialize'),
  redirect_uri: z.string().url().optional(),
});

// Configuration for OAuth providers (these should be in environment variables in production)
const OAUTH_CONFIG = {
  google: {
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    auth_url: 'https://accounts.google.com/o/oauth2/auth',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
  },
  apple: {
    client_id: process.env.APPLE_CALENDAR_CLIENT_ID,
    auth_url: 'https://appleid.apple.com/auth/authorize',
    scopes: ['calendar:read-write'],
  },
  outlook: {
    client_id: process.env.OUTLOOK_CALENDAR_CLIENT_ID,
    auth_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    scopes: ['https://graph.microsoft.com/calendars.readwrite'],
  },
};

// POST - Initialize OAuth setup for calendar integration
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, action, redirect_uri } = calendarSetupSchema.parse(body);

    // Get the OAuth configuration for the provider
    const providerConfig = OAUTH_CONFIG[provider];
    if (!providerConfig || !providerConfig.client_id) {
      return NextResponse.json({ 
        error: `${provider} calendar integration is not configured` 
      }, { status: 400 });
    }

    // Get or create calendar integration setup record
    let { data: calendarSetup, error: setupError } = await supabase
      .from('calendar_integration_setup')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (setupError && setupError.code !== 'PGRST116') {
      console.error('Error fetching calendar setup:', setupError);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar setup status' 
      }, { status: 500 });
    }

    // Create default setup record if it doesn't exist
    if (!calendarSetup) {
      const { data: newSetup, error: createError } = await supabase
        .from('calendar_integration_setup')
        .insert({
          user_id: user.id,
          setup_status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating calendar setup:', createError);
        return NextResponse.json({ 
          error: 'Failed to initialize calendar setup' 
        }, { status: 500 });
      }

      calendarSetup = newSetup;
    }

    // Handle different actions
    switch (action) {
      case 'cancel':
        // Mark the specific provider setup as cancelled
        const cancelUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        
        if (provider === 'google') {
          cancelUpdate.google_calendar_requested = false;
        } else if (provider === 'apple') {
          cancelUpdate.apple_calendar_requested = false;
        } else if (provider === 'outlook') {
          cancelUpdate.outlook_calendar_requested = false;
        }

        const { error: cancelError } = await supabase
          .from('calendar_integration_setup')
          .update(cancelUpdate)
          .eq('user_id', user.id);

        if (cancelError) {
          console.error('Error cancelling calendar setup:', cancelError);
          return NextResponse.json({ 
            error: 'Failed to cancel calendar setup' 
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `${provider} calendar integration cancelled`,
          action: 'cancelled'
        });

      case 'retry':
        // Reset error state and retry setup
        const retryUpdate: any = {
          setup_error_message: null,
          setup_retry_count: (calendarSetup.setup_retry_count || 0) + 1,
          setup_status: 'pending',
          updated_at: new Date().toISOString(),
        };

        const { error: retryError } = await supabase
          .from('calendar_integration_setup')
          .update(retryUpdate)
          .eq('user_id', user.id);

        if (retryError) {
          console.error('Error retrying calendar setup:', retryError);
          return NextResponse.json({ 
            error: 'Failed to retry calendar setup' 
          }, { status: 500 });
        }

        // Fall through to initialize logic
        
      case 'initialize':
      default:
        // Mark the provider as requested and setup in progress
        const initializeUpdate: any = {
          setup_status: 'in_progress',
          updated_at: new Date().toISOString(),
        };

        if (provider === 'google') {
          initializeUpdate.google_calendar_requested = true;
        } else if (provider === 'apple') {
          initializeUpdate.apple_calendar_requested = true;
        } else if (provider === 'outlook') {
          initializeUpdate.outlook_calendar_requested = true;
        }

        const { error: initError } = await supabase
          .from('calendar_integration_setup')
          .update(initializeUpdate)
          .eq('user_id', user.id);

        if (initError) {
          console.error('Error initializing calendar setup:', initError);
          return NextResponse.json({ 
            error: 'Failed to initialize calendar setup' 
          }, { status: 500 });
        }

        // Generate OAuth URL
        const baseUrl = new URL(request.url).origin;
        const callbackUrl = redirect_uri || `${baseUrl}/api/calendar/oauth/callback`;
        
        const state = Buffer.from(JSON.stringify({
          user_id: user.id,
          provider: provider,
          timestamp: Date.now(),
        })).toString('base64');

        const oauthParams = new URLSearchParams({
          client_id: providerConfig.client_id!,
          response_type: 'code',
          scope: providerConfig.scopes.join(' '),
          redirect_uri: callbackUrl,
          state: state,
          access_type: 'offline', // For Google to get refresh token
          prompt: 'consent', // Force consent screen to ensure refresh token
        });

        const oauthUrl = `${providerConfig.auth_url}?${oauthParams.toString()}`;

        return NextResponse.json({
          success: true,
          message: `${provider} calendar integration initialized`,
          oauth_url: oauthUrl,
          provider: provider,
          callback_url: callbackUrl,
          expires_in: 300, // OAuth state expires in 5 minutes
        });
    }

  } catch (error) {
    console.error('Calendar OAuth setup error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Get calendar integration setup status
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get calendar integration setup status
    const { data: calendarSetup, error: setupError } = await supabase
      .from('calendar_integration_setup')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (setupError && setupError.code !== 'PGRST116') {
      console.error('Error fetching calendar setup:', setupError);
      return NextResponse.json({ 
        error: 'Failed to fetch calendar setup status' 
      }, { status: 500 });
    }

    // Check which providers are available (have client IDs configured)
    const availableProviders = Object.entries(OAUTH_CONFIG)
      .filter(([, config]) => config.client_id)
      .map(([provider]) => provider);

    return NextResponse.json({
      success: true,
      data: {
        setup_status: calendarSetup || null,
        available_providers: availableProviders,
        provider_capabilities: {
          google: {
            name: 'Google Calendar',
            supports_read: true,
            supports_write: true,
            supports_sync: true,
          },
          apple: {
            name: 'Apple Calendar (iCloud)',
            supports_read: true,
            supports_write: true,
            supports_sync: true,
          },
          outlook: {
            name: 'Outlook/Microsoft Calendar',
            supports_read: true,
            supports_write: true,
            supports_sync: true,
          },
        },
        setup_requirements: {
          redirect_required: true,
          consent_required: true,
          offline_access: true,
        }
      }
    });

  } catch (error) {
    console.error('Calendar setup status error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove calendar integration setup
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider || !['google', 'apple', 'outlook'].includes(provider)) {
      return NextResponse.json({ 
        error: 'Valid provider parameter is required' 
      }, { status: 400 });
    }

    // Remove the specific provider setup
    const removeUpdate: any = {
      updated_at: new Date().toISOString(),
    };

    if (provider === 'google') {
      removeUpdate.google_calendar_requested = false;
      removeUpdate.google_calendar_setup_completed = false;
      removeUpdate.google_calendar_setup_completed_at = null;
    } else if (provider === 'apple') {
      removeUpdate.apple_calendar_requested = false;
      removeUpdate.apple_calendar_setup_completed = false;
      removeUpdate.apple_calendar_setup_completed_at = null;
    } else if (provider === 'outlook') {
      removeUpdate.outlook_calendar_requested = false;
      removeUpdate.outlook_calendar_setup_completed = false;
      removeUpdate.outlook_calendar_setup_completed_at = null;
    }

    const { error: removeError } = await supabase
      .from('calendar_integration_setup')
      .update(removeUpdate)
      .eq('user_id', user.id);

    if (removeError) {
      console.error('Error removing calendar setup:', removeError);
      return NextResponse.json({ 
        error: 'Failed to remove calendar integration' 
      }, { status: 500 });
    }

    // Also remove OAuth tokens from users table if they exist
    const tokenUpdate: any = {};
    if (provider === 'google') {
      tokenUpdate.google_calendar_access_token = null;
      tokenUpdate.google_calendar_refresh_token = null;
      tokenUpdate.google_calendar_token_expires_at = null;
    } else if (provider === 'apple') {
      tokenUpdate.apple_calendar_access_token = null;
      tokenUpdate.apple_calendar_refresh_token = null;
      tokenUpdate.apple_calendar_token_expires_at = null;
    }

    if (Object.keys(tokenUpdate).length > 0) {
      await supabase
        .from('users')
        .update(tokenUpdate)
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      message: `${provider} calendar integration removed successfully`,
      provider: provider
    });

  } catch (error) {
    console.error('Remove calendar integration error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}