import { createSupabaseServer } from '@/lib/supabase/server';
import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { z } from 'zod';
import { NextResponse } from 'next/server';

const calendarSetupSchema = z.object({
  provider: z.enum(['google', 'apple', 'outlook']),
  action: z.enum(['initialize', 'cancel', 'retry']).default('initialize'),
  redirect_uri: z.string().url().optional(),
});

// Configuration for OAuth providers (these should be in environment variables in production)
const OAUTH_CONFIG = {
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID,
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
  const api = createApiResponse();

  try {
    const supabase = await createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    const body = await request.json();
    const { provider, action, redirect_uri } = calendarSetupSchema.parse(body);

    // Get the OAuth configuration for the provider
    const providerConfig = OAUTH_CONFIG[provider];
    if (!providerConfig || !providerConfig.client_id) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    // Get or create calendar integration setup record
    let { data: calendarSetup, error: setupError } = await supabase
      .from('calendar_integration_setup')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (setupError && setupError.code !== 'PGRST116') {
      console.error('Error fetching calendar setup:', setupError);
      return api.error(ErrorCode.INTERNAL_ERROR);
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
        return api.error(ErrorCode.INTERNAL_ERROR);
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
          return api.error(ErrorCode.INTERNAL_ERROR);
        }

        return api.success({
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
          return api.error(ErrorCode.INTERNAL_ERROR);
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
          return api.error(ErrorCode.INTERNAL_ERROR);
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

        return api.success({
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
      return api.error(ErrorCode.VALIDATION_ERROR);
    }
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

// GET - Get calendar integration setup status
export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Get calendar integration setup status
    const { data: calendarSetup, error: setupError } = await supabase
      .from('calendar_integration_setup')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (setupError && setupError.code !== 'PGRST116') {
      console.error('Error fetching calendar setup:', setupError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Check which providers are available (have client IDs configured)
    const availableProviders = Object.entries(OAUTH_CONFIG)
      .filter(([, config]) => config.client_id)
      .map(([provider]) => provider);

    return api.success({
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
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

// DELETE - Remove calendar integration setup
export async function DELETE(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

    if (!provider || !['google', 'apple', 'outlook'].includes(provider)) {
      return api.error(ErrorCode.VALIDATION_ERROR);
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
      return api.error(ErrorCode.INTERNAL_ERROR);
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

    return api.success({
      success: true,
      message: `${provider} calendar integration removed successfully`,
      provider: provider
    });

  } catch (error) {
    console.error('Remove calendar integration error:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}