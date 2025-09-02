# 🔧 Complete Email Verification Setup Guide

This guide will walk you through setting up email verification properly with Resend and Supabase. Follow each step carefully and verify before moving to the next.

## 📋 Prerequisites

Before starting, make sure you have:
- A Resend account (https://resend.com)
- Access to your Supabase project dashboard
- Your domain (or a verified domain in Resend)

## 🚀 Step 1: Resend Setup

### 1.1 Create Resend Account
1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

### 1.2 Get Your API Key
1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it something like "PolyHarmony Production"
4. Copy the API key (starts with `re_`)

### 1.3 Domain Verification
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records as instructed:
   - **TXT record** for domain verification
   - **MX record** for email routing
   - **SPF record** for sender authentication
5. Wait for verification (can take up to 24 hours)

### 1.4 Test Domain
1. Once verified, go to **Domains**
2. Click on your domain
3. Note the **From Email** address (e.g., `noreply@yourdomain.com`)

## 🔧 Step 2: Environment Variables

### 2.1 Create .env.local File
Create a file called `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mqmtsiqalclkfeursrsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbXRzaXFhbGNsa2ZldXJzcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDczMDYsImV4cCI6MjA2OTY4MzMwNn0.x4dDfut5BGlMXlhwtJM0-T_zDftHYK80mcEnG62TFfA

# Supabase Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
INVITATION_FROM_EMAIL=noreply@yourdomain.com
INVITATION_FROM_NAME=PolyHarmony

# App Configuration
NEXT_PUBLIC_APP_URL=https://calendar-app-01.vercel.app
```

### 2.2 Get Service Role Key
1. Go to your Supabase dashboard
2. Navigate to **Settings > API**
3. Copy the **service_role** key (not the anon key)
4. Replace `your_service_role_key_here` in .env.local

## 🔐 Step 3: Supabase Configuration

### 3.1 Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `mqmtsiqalclkfeursrsa`

### 3.2 Configure Authentication Settings
1. Go to **Authentication > Settings**
2. Update these settings:

#### Email Settings:
- ✅ **Enable email confirmations**: `ON`
- ❌ **Mailer autoconfirm**: `OFF` (critical!)
- ✅ **Enable signup**: `ON`
- ✅ **Enable email change confirmations**: `ON`

#### URL Configuration:
- **Site URL**: `https://calendar-app-01.vercel.app`
- **Redirect URLs** (add these):
  ```
  https://calendar-app-01.vercel.app/auth/callback
  https://calendar-app-01.vercel.app/auth/signin
  https://calendar-app-01.vercel.app/dashboard
  https://calendar-app-01.vercel.app/calendar
  ```

#### JWT Settings:
- **JWT expiry**: `3600` (1 hour)
- **Refresh token rotation**: `Enabled`

### 3.3 Configure SMTP Settings
1. In **Authentication > Settings**, scroll to **SMTP Settings**
2. Configure:
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: Leave empty
   - **Password**: Your Resend API key
   - **Sender Name**: `PolyHarmony`
   - **Sender Email**: `noreply@yourdomain.com`

### 3.4 Email Templates (Optional)
1. Go to **Authentication > Email Templates**
2. Customize the **Confirmation Email** template:

```html
<h2>Welcome to PolyHarmony!</h2>
<p>Thank you for signing up. Please click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Confirm Email Address</a></p>
<p>If you didn't create an account with us, you can safely ignore this email.</p>
<p>Best regards,<br>The PolyHarmony Team</p>
```

## 🧪 Step 4: Testing

### 4.1 Test Email Configuration
Run this command to test your setup:

```bash
node test-email-verification.js
```

Expected output:
```
✅ Email service is properly configured
✅ Resend confirmation API is functional
```

### 4.2 Test Signup Flow
1. Go to your app: https://calendar-app-01.vercel.app
2. Click **Sign Up**
3. Enter a test email address
4. You should see: "Check your email for confirmation link"
5. Check your email (and spam folder)
6. Click the confirmation link
7. You should be redirected to the dashboard

### 4.3 Test Event Creation
1. After confirming email, try creating an event
2. It should work without CSRF errors

## 🔍 Step 5: Troubleshooting

### 5.1 Common Issues

#### Issue: "Email rate limit exceeded"
- **Solution**: Wait a few minutes between signup attempts
- **Prevention**: Use different email addresses for testing

#### Issue: Emails going to spam
- **Solution**: Check spam folder
- **Prevention**: Verify your domain properly in Resend

#### Issue: "CSRF validation failed"
- **Solution**: Ensure email is verified before creating events
- **Check**: Run `node check-user-verification.js your-email@example.com`

#### Issue: "Invalid signature" in configuration script
- **Solution**: Check your service role key is correct
- **Check**: Ensure .env.local has the right SUPABASE_SERVICE_ROLE_KEY

### 5.2 Verification Commands

Test email verification status:
```bash
node check-user-verification.js your-email@example.com
```

Test email service:
```bash
node test-email-verification.js
```

### 5.3 Manual Verification (Emergency)
If email verification isn't working, you can manually verify a user:

```bash
node check-user-verification.js your-email@example.com
```

When prompted, type `y` to manually verify the email.

## ✅ Step 6: Final Verification

After completing all steps:

1. **Test signup flow** with a new email
2. **Check email delivery** (inbox and spam)
3. **Confirm email** by clicking the link
4. **Test event creation** - should work without CSRF errors
5. **Test signin flow** with existing verified account

## 🚨 Important Notes

- **Never enable "Mailer autoconfirm"** - this bypasses email verification
- **Always verify your domain** in Resend before using in production
- **Keep your API keys secure** - never commit them to git
- **Test with real email addresses** - don't use fake emails for testing

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure your domain is verified in Resend
4. Check Supabase logs for authentication errors

---

**Next Steps**: Once email verification is working, you'll be able to create events without CSRF errors!
