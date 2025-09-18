# 🔧 Complete Environment Setup Guide
*A Step-by-Step Guide for Non-Developers*

This guide will help you properly configure all the secret keys and settings your Calendar app needs to work correctly across different platforms. Think of environment variables as "passwords and settings" that your app needs to connect to various services.

## 📋 What You'll Need

Before starting, gather these accounts and information:

1. **Supabase Account** (your database service)
2. **Vercel Account** (where your app will be hosted)
3. **GitHub Account** (where your code is stored)
4. **Email Service Account** (optional, for sending emails)
5. **Google Developer Account** (optional, for Google Calendar integration)

---

## 🎯 Part 1: Understanding Your Environment Variables

### Required Variables (Must Have)
These are absolutely necessary for your app to work:

| Setting Name | What It Does | Where You Get It |
|--------------|--------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your database website address | Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key to read your database | Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Private key for admin access | Supabase dashboard |
| `ENCRYPTION_KEY` | Secret key to protect sensitive data | Generated automatically |
| `NEXTAUTH_SECRET` | Security key for user logins | Generated automatically |

### Optional Variables (Nice to Have)
These add extra features but aren't required:

| Setting Name | What It Does | Where You Get It |
|--------------|--------------|------------------|
| `SENDGRID_API_KEY` | Sends emails through SendGrid | SendGrid dashboard |
| `RESEND_API_KEY` | Sends emails through Resend | Resend dashboard |
| `GOOGLE_CLIENT_ID` | Connects to Google Calendar | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Password for Google Calendar | Google Cloud Console |

---

## 🏠 Part 2: Setting Up Local Development

This is for testing on your own computer.

### Step 1: Create Your Local Settings File

1. **Open your project folder** in your file manager
2. **Look for a file called** `.env.example`
3. **Copy this file** and rename the copy to `.env.local`
4. **Open** `.env.local` in any text editor (like Notepad or TextEdit)

### Step 2: Get Your Supabase Information

1. **Go to** [supabase.com](https://supabase.com)
2. **Sign in** to your account
3. **Click on your project** (the calendar app database)
4. **Click "Settings"** in the left sidebar
5. **Click "API"** under Settings

You'll see a page with your project information:

6. **Copy the "Project URL"** (looks like `https://abc123.supabase.co`)
7. **In your** `.env.local` **file, replace** `your-supabase-url` **with this URL**
8. **Copy the "anon public" key** (a long string starting with `eyJ`)
9. **Replace** `your-supabase-anon-key` **with this key**
10. **Copy the "service_role" key** (another long string)
11. **Replace** `your-supabase-service-role-key` **with this key**

### Step 3: Generate Security Keys

The easiest way is to use the automatic setup:

1. **Open your terminal/command prompt**
2. **Navigate to your project folder**
3. **Type:** `npm run setup:env:dev`
4. **Press Enter**

This will automatically generate secure keys for you. If this doesn't work, you can generate them manually:

**For Windows:**
1. **Press** `Windows + R`
2. **Type** `cmd` **and press Enter**
3. **Type:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Copy the result** (64 characters) and use it for `ENCRYPTION_KEY`

**For Mac:**
1. **Press** `Cmd + Space`
2. **Type** `Terminal` **and press Enter**
3. **Type:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. **Copy the result** and use it for `ENCRYPTION_KEY`

### Step 4: Test Your Setup

1. **In your terminal, type:** `npm run dev`
2. **Open your browser** and go to `http://localhost:3000`
3. **If you see your app**, you're ready! If not, check for error messages.

---

## ☁️ Part 3: Setting Up Vercel (Production Hosting)

This is where your live app will run that others can access.

### Step 1: Connect Your Project to Vercel

1. **Go to** [vercel.com](https://vercel.com)
2. **Sign in** with your GitHub account
3. **Click "Add New"** then **"Project"**
4. **Find your calendar app** in the list and click **"Import"**
5. **Click "Deploy"** (it will fail at first - that's okay!)

### Step 2: Add Environment Variables to Vercel

1. **Go to your Vercel dashboard**
2. **Click on your project** (the calendar app)
3. **Click "Settings"** at the top
4. **Click "Environment Variables"** in the left sidebar

Now you'll add each variable:

5. **Click "Add New"**
6. **In "Name" field:** Type `NEXT_PUBLIC_SUPABASE_URL`
7. **In "Value" field:** Paste your Supabase URL (from Part 2)
8. **Select "Production, Preview, and Development"**
9. **Click "Save"**

Repeat this process for each variable:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your Supabase anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (your Supabase service role key)
- `ENCRYPTION_KEY` (the 64-character string you generated)
- `NEXTAUTH_SECRET` (generate another 64-character string)
- `NEXTAUTH_URL` (set to your Vercel app URL, like `https://your-app.vercel.app`)

### Step 3: Deploy Your App

1. **Go back to the "Deployments" tab**
2. **Click "Redeploy"** on the latest deployment
3. **Wait for it to finish** (usually 2-3 minutes)
4. **Click "Visit"** to see your live app

---

## 🔐 Part 4: Setting Up GitHub Secrets

This ensures your automated tests work properly.

### Step 1: Access GitHub Secrets

1. **Go to** [github.com](https://github.com)
2. **Sign in** to your account
3. **Go to your calendar app repository**
4. **Click "Settings"** at the top of the repository
5. **Click "Secrets and variables"** in the left sidebar
6. **Click "Actions"**

### Step 2: Add Repository Secrets

You'll add the same variables as Vercel, but as "secrets":

1. **Click "New repository secret"**
2. **In "Name" field:** Type `NEXT_PUBLIC_SUPABASE_URL`
3. **In "Secret" field:** Paste your Supabase URL
4. **Click "Add secret"**

Repeat for all these secrets:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

---

## 📧 Part 5: Setting Up Email (Optional)

If you want your app to send emails (like invitations), choose one option:

### Option A: Resend (Recommended for beginners)

1. **Go to** [resend.com](https://resend.com)
2. **Sign up** for a free account
3. **Click "API Keys"** in the dashboard
4. **Click "Create API Key"**
5. **Give it a name** like "Calendar App"
6. **Copy the key** (starts with `re_`)
7. **Add this to all your environments** as `RESEND_API_KEY`

### Option B: SendGrid (More features)

1. **Go to** [sendgrid.com](https://sendgrid.com)
2. **Sign up** for a free account
3. **Go to Settings > API Keys**
4. **Click "Create API Key"**
5. **Choose "Restricted Access"**
6. **Give it "Mail Send" permissions**
7. **Copy the key** (starts with `SG.`)
8. **Add this to all your environments** as `SENDGRID_API_KEY`

---

## 🗓️ Part 6: Google Calendar Integration (Optional)

### Step 1: Create Google Cloud Project

1. **Go to** [console.cloud.google.com](https://console.cloud.google.com)
2. **Sign in** with your Google account
3. **Click "Select a Project"** at the top
4. **Click "New Project"**
5. **Name it** "Calendar App"
6. **Click "Create"**

### Step 2: Enable Calendar API

1. **Click "APIs & Services"** in the left menu
2. **Click "Enable APIs and Services"**
3. **Search for** "Google Calendar API"
4. **Click on it** and then **"Enable"**

### Step 3: Create Credentials

1. **Click "Credentials"** in the left menu
2. **Click "Create Credentials"** > **"OAuth client ID"**
3. **Choose "Web application"**
4. **Name it** "Calendar App"
5. **Add your URLs:**
   - Authorized origins: `http://localhost:3000` and `https://your-app.vercel.app`
   - Redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://your-app.vercel.app/api/auth/callback/google`
6. **Click "Create"**
7. **Copy the Client ID and Client Secret**
8. **Add these to all your environments** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

## ✅ Part 7: Testing Everything

### Test Local Development
1. **Run:** `npm run dev`
2. **Visit:** `http://localhost:3000`
3. **Try creating an account**
4. **Try logging in**

### Test Production
1. **Visit your Vercel app URL**
2. **Try the same features**
3. **Check that everything works**

### Run Security Tests
1. **In your terminal:** `npm run security:validate`
2. **Check for any errors**
3. **Fix any issues reported**

---

## 🚨 Troubleshooting Common Issues

### "Missing Environment Variable" Error
- **Check spelling** of variable names (they're case-sensitive)
- **Make sure** there are no extra spaces
- **Verify** you added the variable in the right place

### "Authentication Failed" Error
- **Double-check** your Supabase keys
- **Make sure** you copied the complete keys (they're very long)
- **Verify** your Supabase project is active

### "Database Connection Error"
- **Check** your Supabase URL is correct
- **Ensure** your database is running
- **Verify** your service role key has the right permissions

### App Won't Deploy on Vercel
- **Check** all required environment variables are set
- **Look at** the deployment logs for specific errors
- **Make sure** your build passes locally first

---

## 🔒 Security Best Practices

### Do's:
- ✅ **Keep your `.env.local` file private** (never share it)
- ✅ **Use different keys** for development and production
- ✅ **Regularly update** your API keys
- ✅ **Use strong, unique passwords** for all accounts

### Don'ts:
- ❌ **Never commit** `.env` files to GitHub
- ❌ **Don't share** your secret keys with anyone
- ❌ **Don't use** the same password everywhere
- ❌ **Don't ignore** security warnings

---

## 📞 Getting Help

If you run into issues:

1. **Check the error message** carefully
2. **Run:** `npm run security:validate` to check your setup
3. **Look for typos** in your environment variables
4. **Make sure** all required variables are set
5. **Try** restarting your development server

Remember: Environment variables are like passwords for your app. Keep them secure, and your app will work smoothly!

---

## 📝 Quick Reference Checklist

### Local Development Setup
- [ ] Created `.env.local` file
- [ ] Added Supabase URL and keys
- [ ] Generated encryption key
- [ ] Generated NextAuth secret
- [ ] App runs on `localhost:3000`

### Vercel Production Setup
- [ ] Project connected to Vercel
- [ ] All environment variables added
- [ ] App deploys successfully
- [ ] Live app works correctly

### GitHub Secrets Setup
- [ ] All secrets added to repository
- [ ] GitHub Actions run successfully
- [ ] Tests pass automatically

### Optional Integrations
- [ ] Email service configured (if desired)
- [ ] Google Calendar integration (if desired)
- [ ] All features tested

Your app should now be fully configured and ready to use!