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
4. **Update Supabase config** to enable Turnstile
5. **Implement CAPTCHA widget** in signin/signup forms

## After the Fix

Once you disable CAPTCHA in the Supabase dashboard, you should be able to sign in normally without any CAPTCHA verification process.
