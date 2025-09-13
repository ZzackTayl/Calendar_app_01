import { NextResponse } from 'next/server';

import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { CalDAVClient } from '@/lib/caldav-client';
import { validateCSRFProtection } from '@/lib/security/csrf';
import { encrypt, decrypt } from '@/lib/encryption';

// Apple ID validation
const validateAppleId = (appleId: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(appleId);
};

// App-specific password validation (Apple generates these as xxxx-xxxx-xxxx-xxxx format)
const validateAppSpecificPassword = (password: string): boolean => {
  // Apple app-specific passwords are 16 characters with dashes: xxxx-xxxx-xxxx-xxxx
  const appPasswordRegex = /^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i;
  return appPasswordRegex.test(password) && password.length === 19;
};

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  // Validate CSRF protection for state-changing operations
  const csrfValidation = await validateCSRFProtection(request);
  if (!csrfValidation.valid) {
    return api.error(ErrorCode.FORBIDDEN);
  }

  const user = csrfValidation.user;
  const supabase = createRouteHandlerClient();

  let requestData;
  try {
    requestData = await request.json();
  } catch {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  const { appleId, appSpecificPassword } = requestData;

  // Validate required fields
  if (!appleId || !appSpecificPassword) {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  // Validate Apple ID format
  if (!validateAppleId(appleId)) {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  // Validate app-specific password format
  if (!validateAppSpecificPassword(appSpecificPassword)) {
    return api.error(ErrorCode.VALIDATION_ERROR);
  }

  try {
    // Test CalDAV connection BEFORE storing credentials
    console.log('Testing CalDAV connection for Apple ID:', appleId.substring(0, 3) + '***');
    
    const caldavClient = new CalDAVClient(
      'https://caldav.icloud.com',
      {
        username: appleId,
        password: appSpecificPassword
      }
    );
    
    // Test connection by attempting to discover calendars
    let calendars: string[] = [];
    try {
      calendars = await caldavClient.discoverCalendars();
      console.log(`Successfully discovered ${calendars.length} calendars`);
    } catch (caldavError: any) {
      console.error('CalDAV connection test failed:', caldavError.message);
      
      // Provide specific error messages based on common failures
      if (caldavError.message.includes('401') || caldavError.message.includes('Unauthorized')) {
        return api.error(ErrorCode.UNAUTHORIZED);
      } else if (caldavError.message.includes('403') || caldavError.message.includes('Forbidden')) {
        return api.error(ErrorCode.FORBIDDEN);
      } else if (caldavError.message.includes('network') || caldavError.message.includes('ENOTFOUND')) {
        return api.success({ 
          error: 'Network error',
          details: 'Unable to connect to iCloud CalDAV server. Please check your internet connection.'
        }, { status: 503 });
      } else {
        return api.success({ 
          error: 'CalDAV connection failed',
          details: `Unable to connect to Apple Calendar: ${caldavError.message}`
        }, { status: 502 });
      }
    }

    // Only proceed if we successfully connected
    if (calendars.length === 0) {
      return api.error(ErrorCode.NOT_FOUND);
    }

    // Encrypt credentials with proper AES-256-GCM encryption
    let encryptedAppleId: string;
    let encryptedAppSpecificPassword: string;
    
    try {
      encryptedAppleId = await encrypt(appleId);
      encryptedAppSpecificPassword = await encrypt(appSpecificPassword);
    } catch (encryptionError: any) {
      console.error('Encryption failed:', encryptionError.message);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Store credentials in database with proper field usage
    const { error: updateError } = await supabase
      .from('users')
      .update({
        // Store encrypted Apple ID in access token field
        apple_calendar_access_token: encryptedAppleId,
        // Store encrypted app-specific password in refresh token field  
        apple_calendar_refresh_token: encryptedAppSpecificPassword,
        // Set expiration (Apple app-specific passwords don't expire, but we set a far future date)
        apple_calendar_token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Database update failed:', updateError);
      return api.error(ErrorCode.INTERNAL_ERROR);
    }

    // Also update the calendar integration setup status
    const { error: setupError } = await supabase
      .from('calendar_integration_setup')
      .upsert({
        user_id: user.id,
        apple_calendar_requested: true,
        apple_calendar_setup_completed: true,
        apple_calendar_setup_completed_at: new Date().toISOString(),
        setup_status: 'completed',
        setup_error_message: null,
        setup_retry_count: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (setupError) {
      console.warn('Failed to update calendar integration setup:', setupError);
      // Don't fail the request since credentials were saved successfully
    }

    console.log('Successfully connected Apple Calendar for user:', user.id);

    return api.success({ 
      message: 'Successfully connected to Apple Calendar',
      calendars_found: calendars.length,
      connection_tested: true
    });
    
  } catch (error: any) {
    console.error('Unexpected error in Apple Calendar auth:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}
