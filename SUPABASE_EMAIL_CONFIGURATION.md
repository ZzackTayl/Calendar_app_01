# Supabase Email Configuration Guide

## Current Issue
Email confirmations are disabled in the current Supabase project configuration, preventing proper user authentication flow for the 4 developer test emails.

## Required Configuration Changes

### 1. Supabase Dashboard Settings

Go to your Supabase Dashboard: https://supabase.com/dashboard/project/mqmtsiqalclkfeursrsa

Navigate to **Authentication > Settings** and update:

#### Email Settings
- ✅ **Enable email confirmations**: `true`
- ✅ **Enable email change confirmations**: `true`
- ❌ **Mailer autoconfirm**: `false` (disable for security)
- ✅ **Enable signup**: `true`

#### URL Configuration
- **Site URL**: `https://calendar-app-01.vercel.app`
- **Redirect URLs**: Add the following URLs:
  ```
  https://calendar-app-01.vercel.app/auth/callback
  https://calendar-app-01.vercel.app/auth/signin
  https://calendar-app-01.vercel.app/dashboard
  ```

#### JWT Settings
- **JWT expiry**: `3600` (1 hour)
- **Refresh token rotation**: Enabled

### 2. Email Templates (Optional)

Configure custom email templates in **Authentication > Email Templates**:

#### Confirmation Email
```html
<h2>Welcome to PolyHarmony!</h2>
<p>Thank you for signing up. Please click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Email Address</a></p>
<p>If you didn't create an account with us, you can safely ignore this email.</p>
<p>Best regards,<br>The PolyHarmony Team</p>
```

#### Password Recovery Email
```html
<h2>Reset Your Password</h2>
<p>We received a request to reset your PolyHarmony password. Click the link below to create a new password:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
<p>If you didn't request this password reset, you can safely ignore this email.</p>
<p>Best regards,<br>The PolyHarmony Team</p>
```

## Code Changes Made

### 1. Auth Callback Route
Created `/app/auth/callback/route.ts` to handle:
- Email confirmation redirects
- Error handling
- Pending invitation processing
- Proper session establishment

### 2. Middleware Updates
Created `/middleware.ts` to handle:
- Auth state management
- Protected route access
- Email confirmation error handling
- Proper redirects for authenticated/unauthenticated users

### 3. Configuration Script
Updated `/setup-supabase-auth.js` to enable email confirmations:
- Changed `enable_confirmations: true`
- Changed `mailer_autoconfirm: false`
- Updated redirect URLs for production

## Testing the Configuration

### Developer Test Emails
Configure these 4 email addresses for testing:

1. **Primary Developer**: Your main development email
2. **Test Email 1**: Secondary testing email
3. **Test Email 2**: Third testing email  
4. **Test Email 3**: Fourth testing email

### Test Flow
1. Go to `/auth/signup`
2. Create account with test email
3. Check email for confirmation link
4. Click confirmation link
5. Should redirect to `/auth/callback` then `/dashboard`
6. Verify user can sign in normally

## Current Status

✅ **Code Implementation**: Complete
- Auth callback route created
- Middleware configured
- Signup flow updated for confirmations

❌ **Supabase Configuration**: Manual setup required
- Email confirmations need to be enabled in dashboard
- URL redirects need to be configured
- Email templates should be customized

## Next Steps

1. **Manual Dashboard Configuration** (5 minutes):
   - Log into Supabase dashboard
   - Update authentication settings as specified above
   - Save configuration

2. **Test Email Flow** (10 minutes):
   - Test signup with developer email
   - Verify confirmation email received
   - Test confirmation link functionality

3. **Verify Production Setup** (5 minutes):
   - Test all 4 developer emails
   - Confirm auth flow works end-to-end
   - Document any remaining issues

## Configuration Verification

After making dashboard changes, run:
```bash
node scripts/test-email-system.js
```

This will verify:
- ✅ Email service provider (Resend) configured
- ✅ Environment variables set correctly
- ✅ Email sender configured

## Troubleshooting

### Common Issues:

1. **"Invalid signature" errors**: 
   - Management API requires different authentication
   - Use dashboard configuration instead

2. **Emails not sending**:
   - Verify Resend API key is valid
   - Check sender email is verified in Resend

3. **Confirmation links not working**:
   - Verify callback URL is properly added to redirect list
   - Check middleware is not blocking auth routes

4. **Redirects not working**:
   - Confirm site URL matches production domain
   - Verify middleware configuration

## Success Criteria

Configuration is complete when:
- ✅ New signups require email confirmation
- ✅ Confirmation emails are sent and received
- ✅ Confirmation links redirect properly to dashboard
- ✅ All 4 test developer emails work correctly
- ✅ Auth flow is secure and user-friendly