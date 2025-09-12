# 🔧 Fix Email Confirmation Redirect Issue

## ❌ **Current Problem**
When you click the email confirmation link, you get "error: requested path is invalid" because the Supabase project is configured with the wrong redirect URLs.

## ✅ **Solution Steps**

### 1. Access Your Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: `lkkmhmeywoczjskqvljh` (or the one that matches your project)

### 2. Navigate to Authentication Settings
1. Click on **"Authentication"** in the left sidebar
2. Click on **"URL Configuration"**

### 3. Update the URL Configuration
Update the following settings:

**Site URL:**
```
https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app
```

**Redirect URLs** (add all of these):
```
https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app/auth/callback
http://localhost:3000/auth/callback
https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app/auth/confirm-email
https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app/**
```

### 4. Additional Configuration
Make sure these settings are also configured:

**Email Templates:**
- Go to **Authentication > Email Templates**
- For **"Confirm signup"** template, make sure the redirect URL is: 
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`

### 5. Test the Fix
1. Go to your production site: https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app
2. Sign up with a new email address
3. Check your email for the confirmation link
4. Click the confirmation link - it should now redirect properly to your app

## 🔍 **Why This Happened**
The Supabase project was configured with the old URL format (`https://calendar-app-01.vercel.app`) but your actual Vercel deployment uses a different URL format (`https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app`).

Supabase only allows redirects to URLs that are explicitly configured in the project settings for security reasons.

## ⚡ **Alternative: Update Vercel Deployment URL**
If you prefer to keep the original URL format, you can also:

1. Go to your Vercel dashboard
2. Add a custom domain or configure the deployment to use a consistent URL
3. Update the Supabase settings to match that URL instead

## 🧪 **Testing Checklist**
After making the changes:

- [ ] Can sign up with a new email
- [ ] Receive confirmation email 
- [ ] Click confirmation link successfully
- [ ] Get redirected to the app (not an error page)
- [ ] Can sign in with the confirmed account

## 💡 **Future Prevention**
To prevent this issue in the future:
1. Use consistent URLs in Vercel deployments
2. Keep Supabase URL configuration updated when deploying to new URLs
3. Test the complete authentication flow after any URL changes
