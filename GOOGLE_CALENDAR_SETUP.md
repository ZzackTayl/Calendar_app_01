# Google Calendar OAuth Setup Instructions

## Overview
This guide will help you set up Google Calendar integration for your calendar application. The implementation includes secure OAuth 2.0 authentication, token management, and automatic calendar synchronization.

## Prerequisites
- Google Cloud Console account
- Admin access to your calendar application
- Basic understanding of OAuth 2.0

## Step 1: Google Cloud Console Setup

### 1.1 Create a New Project (or select existing)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" and then "New Project"
3. Name your project (e.g., "Calendar App OAuth")
4. Click "Create"

### 1.2 Enable Google Calendar API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you're using Google Workspace)
3. Fill in the required fields:
   - **App name**: Your calendar application name
   - **User support email**: Your email (e.g., zacks@anthropologica.tech)
   - **Developer contact email**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add test users (including zacks@anthropologica.tech) if in testing mode
6. Save and continue

### 1.4 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Name it (e.g., "Calendar App Web Client")
5. Add authorized redirect URIs:
   - For local development: `http://localhost:3000/api/calendar/oauth/callback`
   - For production: `https://yourdomain.com/api/calendar/oauth/callback`
6. Click "Create"
7. **IMPORTANT**: Copy the Client ID and Client Secret immediately

## Step 2: Environment Configuration

### 2.1 Update .env.local
Replace the placeholder values in your `.env.local` file:

```env
# Google Calendar OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_from_google_console
GOOGLE_CLIENT_SECRET=your_actual_client_secret_from_google_console
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/oauth/callback

# For production, use:
# GOOGLE_REDIRECT_URI=https://yourdomain.com/api/calendar/oauth/callback
```

### 2.2 Security Notes
- **NEVER commit real credentials to version control**
- The current .env.local has placeholder values that MUST be replaced
- In production, set these as environment variables in your hosting platform

## Step 3: Database Requirements

### 3.1 Required Database Columns
Ensure your `users` table has these columns:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at TIMESTAMPTZ;
```

### 3.2 Calendar Integration Setup Table
Ensure you have the `calendar_integration_setup` table:
```sql
CREATE TABLE IF NOT EXISTS calendar_integration_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  setup_status TEXT DEFAULT 'pending',
  google_calendar_requested BOOLEAN DEFAULT false,
  google_calendar_setup_completed BOOLEAN DEFAULT false,
  google_calendar_setup_completed_at TIMESTAMPTZ,
  setup_error_message TEXT,
  setup_retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Step 4: Testing the Integration

### 4.1 Start Your Application
```bash
npm run dev
# Your app should be running on http://localhost:3000
```

### 4.2 Test OAuth Flow
1. Sign in to your application
2. Navigate to calendar settings or integration page
3. Click "Connect Google Calendar"
4. You should be redirected to Google's consent screen
5. Grant permissions
6. You should be redirected back with a success message

### 4.3 Verify Integration
Check that tokens are stored in your database:
```sql
SELECT 
  id, 
  email,
  google_calendar_access_token IS NOT NULL as has_access_token,
  google_calendar_refresh_token IS NOT NULL as has_refresh_token,
  google_calendar_token_expires_at
FROM users 
WHERE email = 'your_test_email@domain.com';
```

## Step 5: Using the Integration

### 5.1 Available API Endpoints

**Initialize OAuth Flow:**
```
POST /api/calendar/oauth/setup
Content-Type: application/json

{
  "provider": "google",
  "action": "initialize"
}
```

**Sync Google Calendar:**
```
POST /api/calendar/google/sync
```

**Get Auth URL (alternative method):**
```
GET /api/auth/google
```

### 5.2 Frontend Integration Example
```javascript
// Initialize Google Calendar connection
const connectGoogleCalendar = async () => {
  try {
    const response = await fetch('/api/calendar/oauth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        provider: 'google', 
        action: 'initialize' 
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Redirect user to Google OAuth
      window.location.href = data.oauth_url;
    } else {
      console.error('Failed to initialize OAuth:', data.error);
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
};

// Sync calendars after connection
const syncGoogleCalendar = async () => {
  try {
    const response = await fetch('/api/calendar/google/sync', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Sync successful:', data.message);
    } else {
      console.error('Sync failed:', data.error);
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
};
```

## Step 6: Production Deployment

### 6.1 Environment Variables
Set these in your production environment:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REDIRECT_URI` (with your production domain)

### 6.2 Update OAuth Redirect URIs
In Google Cloud Console, add your production redirect URI:
`https://yourdomain.com/api/calendar/oauth/callback`

### 6.3 Publish OAuth App
1. In Google Cloud Console, go to "OAuth consent screen"
2. Click "Publish App" to remove testing restrictions
3. This may require Google verification for sensitive scopes

## Troubleshooting

### Common Issues

**1. "Client ID not configured" Error**
- Verify GOOGLE_CLIENT_ID is set correctly in .env.local
- Restart your development server after changing environment variables

**2. "Redirect URI Mismatch" Error**
- Ensure the redirect URI in Google Cloud Console exactly matches your GOOGLE_REDIRECT_URI
- Check for http vs https mismatch

**3. "Invalid State" Error**
- This usually indicates the OAuth flow was interrupted or expired
- Try the connection process again

**4. "Token Exchange Failed" Error**
- Check that GOOGLE_CLIENT_SECRET is correct
- Verify the redirect URI configuration

### Debug Steps
1. Check browser console for errors
2. Check server logs for detailed error messages
3. Verify all environment variables are set
4. Test with a fresh OAuth flow (clear cookies if needed)

### Security Considerations
- Tokens are automatically refreshed when expired
- Refresh tokens are securely stored in the database
- All OAuth state includes timestamp validation
- CSRF protection via state parameter

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Google Cloud Console configuration
3. Ensure all environment variables are correctly set
4. Test with a simple OAuth flow first

For user zacks@anthropologica.tech specifically:
- Ensure your email is added as a test user in Google Cloud Console
- Verify your redirect URIs match your development/production environment
- The callback route has been created and should handle the OAuth response properly

## Security Notes

- Never commit real OAuth credentials to version control
- Use strong, unique client secrets
- Regularly rotate credentials if compromised
- Monitor OAuth usage in Google Cloud Console
- Implement proper error handling to prevent information leakage