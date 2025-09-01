# SUPABASE DASHBOARD CONFIGURATION GUIDE

## CRITICAL: Production Email Verification Setup

**This guide provides step-by-step instructions to configure your Supabase project for email verification. The local `config.toml` file does NOT affect production - only dashboard settings do.**

---

## STEP 1: ACCESS YOUR SUPABASE PROJECT

🔗 **Direct Link**: https://supabase.com/dashboard/project/mqmtsiqalclkfeursrsa

1. Log into your Supabase account
2. Select the **Calendar_app_01** project
3. Navigate to **Authentication** (left sidebar)
4. Click **Settings** (sub-navigation)

---

## STEP 2: CONFIGURE AUTHENTICATION SETTINGS

### Core Authentication Settings

**Locate the "General" section:**

✅ **Enable signup**: `ON`
- Allows new users to register
- Should already be enabled

✅ **Confirm email before allowing login**: `ON` ⚠️ **CRITICAL**
- This is the key setting that enables email verification
- If this is OFF, users get auto-confirmed (root cause of the issue)

✅ **Enable email confirmations**: `ON` ⚠️ **CRITICAL**  
- Enables the confirmation email system
- Must be ON for verification emails to send

✅ **Double confirm email changes**: `ON`
- Requires confirmation for email address changes
- Recommended security setting

✅ **Secure password change**: `ON`
- Requires recent authentication for password changes
- Recommended security setting

### Rate Limiting Settings

**In the "Rate Limiting" section:**

📧 **Email sent (per hour)**: `10` (increase from 2 for testing)
🔐 **Sign up and sign-in (per 5 minutes)**: `30`
✅ **Token verifications (per 5 minutes)**: `30`

---

## STEP 3: CONFIGURE SMTP SETTINGS ⚠️ **CRITICAL**

**Scroll down to the "SMTP Settings" section:**

### Enable Custom SMTP
✅ **Enable Custom SMTP**: `ON` ⚠️ **CRITICAL**
- This must be enabled or no emails will send

### SMTP Configuration
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: re_4ETbnTcY_AZt3ZtGPHFjatzajZNjEJudE
```

### Email Identity
```
Sender email: zacks@anthropologica.tech
Sender name: PolyHarmony Productions Test
```

### ⚠️ **IMPORTANT SMTP NOTES**:
- The password is your **RESEND_API_KEY** (starts with `re_`)
- Username is always `resend` for Resend SMTP
- Port 587 uses STARTTLS encryption
- Use the exact domain verified in your Resend account

---

## STEP 4: CONFIGURE URL SETTINGS

**Navigate to Authentication → URL Configuration**

### Site URL
```
https://your-production-domain.vercel.app
```
**OR** if testing locally:
```
http://localhost:3000
```

### Additional Redirect URLs
Add **BOTH** of these URLs (one per line):
```
https://your-production-domain.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

**Note**: Replace `your-production-domain` with your actual Vercel deployment URL.

---

## STEP 5: CUSTOMIZE EMAIL TEMPLATES (OPTIONAL)

**Navigate to Authentication → Email Templates**

### Confirmation Email Template
**Subject**: `Confirm Your PolyHarmony Account`

**HTML Template** (use custom styling):
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your PolyHarmony Account</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 32px; }
        h1 { color: #1f2937; font-size: 28px; margin-bottom: 16px; }
        p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
        .button:hover { background-color: #2563eb; }
        .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">PolyHarmony</div>
            <h1>Welcome to PolyHarmony!</h1>
            <p>Thank you for signing up. Please click the link below to confirm your email address and activate your account:</p>
            <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
            <p>If you didn't create an account with us, you can safely ignore this email.</p>
            <div class="footer">
                <p>Best regards,<br>The PolyHarmony Team</p>
                <p>This email was sent to {{ .Email }}. If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </div>
</body>
</html>
```

### Password Recovery Template
**Subject**: `Reset Your PolyHarmony Password`

Use similar styling but replace the content to focus on password reset.

---

## STEP 6: SAVE AND VALIDATE CONFIGURATION

### Save Changes
1. Click **Save** on each section you modified
2. Wait for confirmation messages
3. Refresh the page to verify settings persisted

### Test Configuration
1. **Wait 2-3 minutes** for settings to propagate
2. Run: `node test-integration-flow.js`
3. Test with real email signup
4. Check email delivery (including spam folder)

---

## STEP 7: AUTOMATED CONFIGURATION BACKUP

**Optional**: Run the automated configuration script:
```bash
node configure-supabase-email.js
```

This script will attempt to configure settings via the Management API and validate the setup.

---

## TROUBLESHOOTING

### If Emails Still Don't Send:

#### Check Resend Dashboard
1. Log into: https://resend.com/dashboard
2. Verify domain status: **Verified** ✅
3. Check API key status: **Active** ✅
4. Review sending statistics for errors

#### Verify SMTP Connectivity
```bash
# Test SMTP connection
node -e "
const net = require('net');
const client = net.createConnection(587, 'smtp.resend.com');
client.on('connect', () => { console.log('✅ SMTP connection successful'); client.end(); });
client.on('error', (err) => { console.log('❌ SMTP connection failed:', err.message); });
"
```

#### Check Supabase Logs
1. Go to: Supabase Dashboard → Logs
2. Filter by: Auth logs  
3. Look for email-related errors
4. Check for SMTP authentication failures

#### Alternative SMTP Providers
If Resend fails, use SendGrid backup:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [SendGrid API Key]
```

---

## VALIDATION CHECKLIST

After completing configuration:

- [ ] **Authentication Settings**: All critical settings enabled
- [ ] **SMTP Settings**: Custom SMTP enabled with correct Resend credentials
- [ ] **URL Configuration**: Site URL and redirect URLs set correctly
- [ ] **Email Templates**: Custom templates configured (optional)
- [ ] **Rate Limiting**: Appropriate limits set for testing
- [ ] **Test Script**: `test-integration-flow.js` passes all tests
- [ ] **Real Email Test**: Signup with personal email receives confirmation
- [ ] **Email Delivery**: Confirmation email arrives within 5 minutes
- [ ] **Link Functionality**: Confirmation link works correctly
- [ ] **Sign-in Flow**: Verified users can sign in successfully

---

## EXPECTED RESULTS

### Immediate Effects:
- New signups require email confirmation
- Users receive styled confirmation emails
- Unverified users cannot access protected routes
- Email delivery typically within 1-2 minutes

### Integration Benefits:
- Invitation system uses same SMTP settings
- Consistent email branding and deliverability
- Single point of configuration management
- Unified monitoring and logging

---

## EMERGENCY ROLLBACK

If configuration causes issues:

### Quick Disable (Emergency Only):
1. Authentication Settings → **Confirm email before allowing login**: `OFF`
2. This allows immediate access but removes security
3. **Use only temporarily while troubleshooting**

### Full Rollback:
1. Authentication Settings → Restore to previous values
2. SMTP Settings → Disable custom SMTP
3. URL Configuration → Reset to defaults
4. Run: `node test-integration-flow.js` to verify rollback

---

## SUPPORT RESOURCES

- **Supabase Documentation**: https://supabase.com/docs/guides/auth/auth-email
- **Resend Documentation**: https://resend.com/docs
- **Project-specific Support**: Check existing configuration files in `/supabase/` directory
- **Emergency Contact**: Have admin credentials ready for critical issues

---

**🎯 NEXT ACTION**: Follow this guide step-by-step, then run `node test-integration-flow.js` to validate the complete setup.