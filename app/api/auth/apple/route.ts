
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { CalDAVClient } from '@/lib/caldav-client';
import { validateCSRFProtection } from '@/lib/security/csrf';
import * as crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';

// Validate encryption key at runtime
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return key;
};

// Real encryption using AES-256-GCM
const encrypt = (text: string): string => {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

const decrypt = (encryptedData: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  
  const encryptionKey = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

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

  let requestData;
  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const { appleId, appSpecificPassword } = requestData;

  // Validate required fields
  if (!appleId || !appSpecificPassword) {
    return NextResponse.json({ 
      error: 'Apple ID and app-specific password are required',
      details: 'Both appleId and appSpecificPassword must be provided'
    }, { status: 400 });
  }

  // Validate Apple ID format
  if (!validateAppleId(appleId)) {
    return NextResponse.json({ 
      error: 'Invalid Apple ID format',
      details: 'Apple ID must be a valid email address'
    }, { status: 400 });
  }

  // Validate app-specific password format
  if (!validateAppSpecificPassword(appSpecificPassword)) {
    return NextResponse.json({ 
      error: 'Invalid app-specific password format',
      details: 'App-specific password must be in format: xxxx-xxxx-xxxx-xxxx'
    }, { status: 400 });
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
        return NextResponse.json({ 
          error: 'Authentication failed',
          details: 'Invalid Apple ID or app-specific password. Please check your credentials and ensure you\'re using an app-specific password, not your regular Apple ID password.'
        }, { status: 401 });
      } else if (caldavError.message.includes('403') || caldavError.message.includes('Forbidden')) {
        return NextResponse.json({ 
          error: 'Access forbidden',
          details: 'Your Apple ID may not have iCloud Calendar enabled, or two-factor authentication is not set up properly.'
        }, { status: 403 });
      } else if (caldavError.message.includes('network') || caldavError.message.includes('ENOTFOUND')) {
        return NextResponse.json({ 
          error: 'Network error',
          details: 'Unable to connect to iCloud CalDAV server. Please check your internet connection.'
        }, { status: 503 });
      } else {
        return NextResponse.json({ 
          error: 'CalDAV connection failed',
          details: `Unable to connect to Apple Calendar: ${caldavError.message}`
        }, { status: 502 });
      }
    }

    // Only proceed if we successfully connected
    if (calendars.length === 0) {
      return NextResponse.json({ 
        error: 'No calendars found',
        details: 'Successfully connected to iCloud, but no calendars were found. Please ensure you have at least one calendar in your iCloud account.'
      }, { status: 404 });
    }

    // Encrypt credentials with proper AES-256-GCM encryption
    let encryptedAppleId: string;
    let encryptedAppSpecificPassword: string;
    
    try {
      encryptedAppleId = encrypt(appleId);
      encryptedAppSpecificPassword = encrypt(appSpecificPassword);
    } catch (encryptionError: any) {
      console.error('Encryption failed:', encryptionError.message);
      return NextResponse.json({ 
        error: 'Failed to encrypt credentials',
        details: 'Server configuration error. Please try again later.'
      }, { status: 500 });
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
      return NextResponse.json({ 
        error: 'Failed to save credentials',
        details: 'Database error occurred while saving your credentials. Please try again.'
      }, { status: 500 });
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

    return NextResponse.json({ 
      message: 'Successfully connected to Apple Calendar',
      calendars_found: calendars.length,
      connection_tested: true
    });
    
  } catch (error: any) {
    console.error('Unexpected error in Apple Calendar auth:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: 'An unexpected error occurred. Please try again later.'
    }, { status: 500 });
  }
}
