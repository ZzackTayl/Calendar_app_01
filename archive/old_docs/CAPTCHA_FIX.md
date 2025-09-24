# CAPTCHA Issue Fix

## Problem
You're getting "captcha verification process failed" error because your production Supabase instance has CAPTCHA enabled, but no CAPTCHA widget is implemented in your signin form.

## Quick Fix (Recommended)

**Disable CAPTCHA in your production Supabase instance:**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/projects
2. **Select your Calendar App project**
3. **Navigate to**: `Authentication` → `Settings` → `Security` 
4. **Find the "Bot Protection" or "CAPTCHA" section**
5. **Disable/Turn off CAPTCHA protection**
6. **Click "Save" or "Update"**

## Alternative: Implement CAPTCHA (Future Enhancement)

If you want to keep CAPTCHA enabled for security:

1. **Sign up for Cloudflare Turnstile**: https://www.cloudflare.com/products/turnstile/
2. **Get your Site Key and Secret Key**
3. **Add to environment variables:**
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
   SUPABASE_TURNSTILE_SECRET_KEY=your_secret_key
   ```
4. **Update Supabase config to enable Turnstile CAPTCHA**
5. **Include Turnstile client script** in your HTML head:
   ```html
   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
   ```
6. **Add CAPTCHA widget markup** to your forms where you want to render the CAPTCHA:
   ```html
   <div class="cf-turnstile" data-sitekey="your_site_key_here"></div>
   ```
7. **⚠️ CRITICAL: Implement server-side token validation** - You MUST validate the CAPTCHA token on your server against Cloudflare's siteverify API for every form submission:
   ```javascript
   // Server-side validation example
   const validateTurnstileToken = async (token, secretKey) => {
     const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
       },
       body: new URLSearchParams({
         secret: secretKey,
         response: token,
       }),
     });
     
     const result = await response.json();
     return result.success;
   };
   ```
   **Important Notes:**
   - Tokens expire after **300 seconds** (5 minutes)
   - Each token can only be validated **once**
   - **Always validate on the server** - never trust client-side validation alone
   - Store your secret key securely as an environment variable, never expose it in client code

## After the Fix

Once you disable CAPTCHA in the Supabase dashboard, you should be able to sign in normally without any CAPTCHA verification process.
