# MyOrbit Authentication Setup Guide for Founders

**Purpose:** This guide walks you through setting up secure authentication for your calendar app across staging and production environments.

**Time Required:** 1-2 hours (one-time setup)  
**Technical Level:** No coding required—just following steps and copying values

---

## What You're Setting Up

Your app needs **three main pieces** to work:

1. **Supabase** - Where user accounts are created and passwords are verified (the "brain" of auth)
2. **Google Integration** - Allows users to sign in with Google and sync their Google Calendar
3. **Error Monitoring** (optional) - Helps you catch bugs and errors in production

Think of it like this:
- **Supabase** = Your own secure bank vault for user accounts
- **Google Integration** = A trusted partner who can verify "yes, this person is really John from Google"
- **Error monitoring** = Your security camera that alerts you when something goes wrong

---

## Part 1: Create Your Supabase Account (Foundation)

**What this does:** Creates the secure backend where all user accounts are stored and protected.

### Step 1.1: Sign Up for Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Choose **"Sign up with GitHub"** (fastest option)
   - Sign in to GitHub if needed
   - Authorize Supabase to access your GitHub

**Why GitHub?** Supabase will use your GitHub identity to keep your account secure. No new password to remember.

### Step 1.2: Create Your Development Project

Once logged into Supabase:

1. Click **"New Project"** (or **"+ New Project"** button)
2. Fill in these details:

| Field | Value | Example |
|-------|-------|---------|
| **Name** | `myorbit-dev` | ← Easy to remember |
| **Database Password** | Create a strong 12+ character password | `Tr0picM00n$2025!` |
| **Region** | Pick closest to your users | US: `us-east-1` |
| **Pricing** | **FREE** tier (you'll upgrade later if needed) | Free → Production ready |

**⚠️ IMPORTANT - Save your database password somewhere safe** (like your password manager). You'll need it for backups later.

3. Click **"Create new project"**
4. Wait 2-3 minutes for setup ☕

### Step 1.3: Get Your Development Credentials

Once your project loads:

1. Click **⚙️ Settings** (gear icon, bottom left)
2. Click **API** in the left menu under "Configuration"
3. You'll see two important pieces:

**A. Copy your Project URL:**
- Find "Project URL" 
- Example: `https://xyzproject123.supabase.co`
- Click copy icon

**B. Copy your Anon Key:**
- Find "Project API Keys"
- Look for **"anon"** or **"public"** key (the safer one)
- Click copy icon
- It's a long string like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Save these somewhere safe** - you'll need them in 15 minutes.

---

## Part 2: Set Up Google Sign-In (Users Can Sign In With Google)

**What this does:** Lets your users sign in with their Google account instead of creating a password. Also needed to access their Google Calendar.

### Step 2.1: Create a Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. If you've never been here, Google will ask you to set up a project:
   - Click **"Create Project"**
   - Name it: `MyOrbit` (or any name)
   - Click **"Create"**
   - Wait 1-2 minutes

3. Once the project is created, you'll be on the dashboard

### Step 2.2: Enable Google Calendar API

1. At the top, find the search bar and search for **"Calendar API"**
2. Click on "Google Calendar API" in results
3. Click **"ENABLE"** button

### Step 2.3: Create OAuth Credentials

Now you need to tell Google "Hey, my app at MyOrbit will be calling you."

1. In the left menu, click **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Choose **"OAuth 2.0 Client ID"**
4. Google will ask you to first configure the consent screen:
   - Choose **"External"** user type
   - Click **"Create"**

### Step 2.4: Configure Consent Screen

This tells Google what to show users when they log in.

**Screen 1 - OAuth consent screen:**
- **App name:** `MyOrbit`
- **User support email:** Your email
- **Developer contact:** Your email
- Click **"Save and Continue"**

**Screen 2 - Scopes:**
- Click **"Add or Remove Scopes"**
- In the search box, type: **`calendar`**
- Check the box next to `../auth/calendar` 
- Scroll down and click **"Update"**
- Click **"Save and Continue"**

**Screen 3 - Test Users:**
- Click **"Add Users"**
- Add your own email
- Click **"Save and Continue"**

**Screen 4 - Summary:**
- Review everything
- Click **"Back to Dashboard"**

### Step 2.5: Create OAuth Credentials (For Real This Time)

1. In left menu, click **"Credentials"** again
2. Click **"+ CREATE CREDENTIALS"**
3. Choose **"OAuth 2.0 Client ID"**
4. Choose **"iOS"** (we'll do Android next)

**For iOS:**
- **Name:** `MyOrbit iOS`
- **Bundle ID:** `com.myorbit.calendar`
- Click **"Create"**
- Copy the "Client ID" (looks like: `1234567890-abcdefghi.apps.googleusercontent.com`)
- **Save this iOS Client ID** - you'll need it soon

5. Create another credential by clicking **"+ CREATE CREDENTIALS"** again
6. Choose **"OAuth 2.0 Client ID"** → **"Android"**

**For Android:**
- **Name:** `MyOrbit Android`
- **Package name:** `com.example.calendar_app`
- **Fingerprint:** Ask your development team for your app's signing certificate fingerprint
  - For now, you can use: `00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00` (we'll update this)
- Click **"Create"**
- Copy the "Client ID"
- **Save this Android Client ID**

### Step 2.6: Add Approved Domains to Supabase

1. Go back to **Supabase dashboard**
2. Click **⚙️ Settings** → **Authentication** (under "Product settings")
3. Scroll down to **"Authorized redirect URLs"**
4. Click **"Add a URL"**
5. Enter: `https://xyzproject123.supabase.co/auth/v1/callback`
   - (Replace `xyzproject123` with your actual Supabase project ID)

---

## Part 3: Populate Configuration for Development

You now have all the credentials. Time to input them into the app so it works.

### Step 4.1: Find or Create `.env` File

1. Open the project in your code editor
2. Look for a file called `.env` in the root folder
3. If it doesn't exist, create a new text file named `.env` (just that - no extension)

### Step 4.2: Add Development Credentials

Copy-paste these into your `.env` file and replace the placeholders:

```env
# Environment Selection
FLUTTER_ENV=dev

# Supabase (Dev)
DEV_SUPABASE_URL=https://xyzproject123.supabase.co
DEV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID_IOS=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_ID_ANDROID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com

```

**Replace these placeholders:**
- `xyzproject123` → Your Supabase project ID
- `eyJhbGc...` → Your Supabase Anon Key
- `YOUR_IOS_CLIENT_ID...` → Your Google iOS Client ID
- `YOUR_ANDROID_CLIENT_ID...` → Your Google Android Client ID

### Step 4.3: Verify `.env` is Protected

The `.env` file should **NOT** be uploaded to GitHub (it contains secrets).

Check your `.gitignore` file:
1. Open `.gitignore` in the root folder
2. Look for these lines:
   ```
   .env
   *.env
   ```
3. If they're not there, add them

---

## Part 4: Set Up Staging Environment

**Why staging?** Before launching to real users (production), test everything on a "practice version" first.

### Step 5.1: Create Staging Supabase Project

Repeat **Part 1** but call this project **`myorbit-staging`**:

1. Go to Supabase dashboard
2. Click **"New Project"**
3. Name: `myorbit-staging`
4. Create same strong database password
5. Use same region
6. Get staging credentials (Project URL and Anon Key)

### Step 5.2: Set Up Google Credentials for Staging

Repeat **Part 2** but create these OAuth credentials:
- **iOS:** Name it `MyOrbit Staging iOS` → Save the Client ID
- **Android:** Name it `MyOrbit Staging Android` → Save the Client ID

### Step 5.3: Add Staging Credentials to `.env`

Add these to your `.env` file:

```env
# Supabase (Staging)
STAGING_SUPABASE_URL=https://abc123staging.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (Staging)
STAGING_GOOGLE_OAUTH_CLIENT_ID_IOS=YOUR_STAGING_IOS_CLIENT_ID.apps.googleusercontent.com
STAGING_GOOGLE_OAUTH_CLIENT_ID_ANDROID=YOUR_STAGING_ANDROID_CLIENT_ID.apps.googleusercontent.com

```

---

## Part 5: Set Up Production Environment

**What is production?** The real, live version your customers use. Handle with care! 🔐

### Step 6.1: Decide: Free or Paid Supabase?

**For small launches (< 100,000 monthly users):** Stick with **FREE tier**
- Includes everything you need
- 500 MB database storage
- 2GB file storage
- Pay-as-you-go for extra

**When to upgrade?** After you hit ~5,000 active monthly users, consider their paid plans ($25/month).

### Step 6.2: Create Production Supabase Project

1. Go to Supabase
2. Click **"New Project"**
3. Name: `myorbit-production`
4. Choose **"Pro"** plan (or Free if you're just starting)
5. Use same region as development
6. Create an even **stronger database password** than development
   - Example: `MyOrb1t!Pr0d$3cur3#2025` (20+ characters, mix of everything)
   - **Store this in a secure location** (Keeper, 1Password, etc.)
7. Get your production credentials

### Step 6.3: Set Up Production Google OAuth

1. Repeat **Part 2** for production
2. Create:
   - **iOS:** Name it `MyOrbit Production iOS`
   - **Android:** Name it `MyOrbit Production Android`
3. Save the Client IDs

### Step 6.4: Add Production Credentials to `.env`

```env
# Supabase (Production)
PROD_SUPABASE_URL=https://abc123prod.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth (Production)
PROD_GOOGLE_OAUTH_CLIENT_ID_IOS=YOUR_PROD_IOS_CLIENT_ID.apps.googleusercontent.com
PROD_GOOGLE_OAUTH_CLIENT_ID_ANDROID=YOUR_PROD_ANDROID_CLIENT_ID.apps.googleusercontent.com

```

---

## Part 6: iOS-Specific Configuration

iOS requires a few extra steps to recognize your app.

### Step 7.1: Configure URL Scheme for iOS

1. Open `ios/Runner/Info.plist` in your code editor
2. Look for `CFBundleURLTypes` section
3. You'll see something like:
   ```
   <dict>
       <key>CFBundleURLName</key>
       <string>$(GOOGLE_REVERSED_CLIENT_ID)</string>
       <key>CFBundleURLSchemes</key>
       <array>
           <string>$(GOOGLE_REVERSED_CLIENT_ID)</string>
       </array>
   </dict>
   ```

4. Now open `ios/Runner/GoogleOAuth.xcconfig`
5. Replace this line:
   ```
   GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.your-ios-client-id
   ```
   
   With your **iOS Client ID reversed**. Here's how to reverse it:
   - Your iOS Client ID: `1234567890-abcdefghi.apps.googleusercontent.com`
   - Reversed: `com.googleusercontent.apps.1234567890-abcdefghi`

That's it! iOS is ready to recognize Google sign-ins.

---

## Part 8: Android-Specific Configuration

Android also needs configuration, but it's slightly different.

### Step 8.1: Update Package Name (If Needed)

1. Open `android/app/build.gradle.kts`
2. Look for `applicationId = "com.example.calendar_app"`
3. Change this to your actual app package name
   - Example: `applicationId = "com.myorbit.calendar"`

### Step 8.2: Get Your App's Signing Certificate

This is a special fingerprint Android uses to verify it's YOUR app:

1. Open Terminal/Command Prompt in your project folder
2. Run this command:
   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -list -v
   ```
3. When asked for a password, type: `android`
4. Look for "SHA1:" in the output
5. Copy the SHA1 value (looks like: `00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33`)

### Step 8.3: Update Google OAuth for Android

1. Go back to Google Cloud Console
2. Click on your Android OAuth credential
3. Replace the fingerprint with the SHA1 you just copied
4. Click **"Save"**

---

## How to Test Each Environment

### Testing Development

1. In Terminal, run:
   ```bash
   flutter run --dart-define=FLUTTER_ENV=dev
   ```

### Testing Staging

1. In Terminal, run:
   ```bash
   flutter run --dart-define=FLUTTER_ENV=staging \
               --dart-define=STAGING_SUPABASE_URL=https://your-staging-url \
               --dart-define=STAGING_SUPABASE_ANON_KEY=your-staging-key
   ```

### Building for Production

1. In Terminal, run:
   ```bash
   flutter build ios --dart-define=FLUTTER_ENV=prod \
                     --dart-define=PROD_SUPABASE_URL=https://your-prod-url \
                     --dart-define=PROD_SUPABASE_ANON_KEY=your-prod-key
   ```

---

## Security Checklist: Your Responsibility

Before launching to real users, verify these:

### ✅ Secrets Management
- [ ] `.env` file is in `.gitignore` (secrets stay off GitHub)
- [ ] `.env` file is NEVER uploaded to GitHub
- [ ] All production credentials are in a secure password manager (Keeper, 1Password, LastPass)
- [ ] You have backups of your database passwords

### ✅ Supabase Security
- [ ] Row-Level Security (RLS) is enabled on all tables in production
- [ ] Only use the **"anon"** key in your app (safer than the service role key)
- [ ] Service role key is **NEVER** in your app code

### ✅ Google OAuth Security
- [ ] Authorized redirect URLs are set correctly in Supabase
- [ ] Only redirect to your actual domain/app (not localhost)

### ✅ Database Backups
- [ ] Set up automatic daily backups in Supabase (in Settings)
- [ ] Test that you can restore from a backup

### ✅ Monitoring
- [ ] Your crash/error monitoring tool is configured and sending alerts
- [ ] Alert notifications are enabled for the team members who need them

---

## Costs: What You'll Actually Pay

### Monthly Costs (for 1-10k active users)

| Service | Free Tier | When You Pay |
|---------|-----------|--------------|
| **Supabase** | FREE | After 2GB storage or 50k monthly active users |
| **Google Cloud** | FREE for Calendar API | After 1 million requests/month (unlikely) |
| **Crash reporting (optional)** | FREE (Firebase Crashlytics) | Paid plans depend on provider |
| **Total for MVP** | **$0/month** | Upgrade when you grow |

### Cost After Growing

If you hit 10,000 active users:
- **Supabase Pro:** $25/month
- **Crash reporting:** Budget for paid plans only if you upgrade beyond free tiers
- **Total:** ~$54/month

This is **very affordable** compared to other solutions.

---

## Troubleshooting

### "Supabase connection failed"
- Check that your Supabase URL is correct (copy-paste from Settings)
- Check that your Anon Key is correct
- Make sure you're using `DEV_`, `STAGING_`, or `PROD_` prefix correctly

### "Google Sign-In doesn't work"
- Verify your Google Client IDs match what's in Google Cloud Console
- Check that your iOS Bundle ID and Android Package Name match exactly
- Verify your app is a "test user" in Google Cloud Console

### "Sign-in works but data isn't syncing"
- This usually means Supabase auth is working but the app code needs debugging
- Check your monitoring tool for errors
- Ask your development team to check the logs

---

## Support & Resources

### Official Documentation
- **Supabase:** https://supabase.com/docs
- **Google OAuth:** https://developers.google.com/identity/protocols/oauth2

### Getting Help
- **Supabase Community:** https://discord.gg/supabase
- **Google Cloud Support:** https://support.google.com/cloud

---

## Next Steps After Setup

1. **Test everything** - Create test accounts on dev, staging, and production
2. **Try Google Sign-In** - Make sure the Google button works
3. **Validate monitoring** - Trigger a test error to ensure alerts are working
4. **Secure your passwords** - Store all credentials in your password manager
5. **Tell your team** - Share credentials securely with developers who need them
6. **Set up monitoring** - Enable database backups and notifications from your monitoring tool

---

## Emergency: What to Do If Compromised

If you accidentally commit credentials to GitHub:

1. **Immediately rotate them:**
   - Supabase: Generate new API keys in Settings → API
   - Google: Delete and recreate OAuth credentials
   - Monitoring tool: Rotate any exposed keys or tokens

2. **Remove the commit:**
   - Contact your dev team to rewrite history
   - Use `git reset` to remove the commit with credentials

3. **Update your app:**
   - Replace old credentials with new ones
   - Rebuild and redeploy

---

## Appendix: Future Features (Don't Build Yet)

### Family Subscriptions (Post-MVP)

**Timeline:** Build after you have 500+ paying users  
**Complexity:** Medium (requires payment processor integration)  
**ROI:** Higher revenue per user

#### What It Enables

Currently, each user pays separately:
```
Sarah pays $9.99/month
John pays $9.99/month
Total: $19.98/month
```

With family plans:
```
Sarah pays $24.99/month for "Family Plan"
Invites John and 4 others
Total: $24.99/month for one family
(Higher revenue because more people use it)
```

#### What You'll Need to Add

**Database Changes:**
- New `family_groups` table (who owns the family, subscription details)
- New `family_members` table (who's in each family, their role)
- New `family_invite_links` table (for sending invite links)
- Update `profiles` table (add `family_id` field)

**Payment Processing:**
- Stripe or Paddle account (to charge families)
- Webhook handlers (to update status when payment succeeds/fails)

**App Features:**
- "Create Family" button
- "Invite Family Members" flow
- "Manage Subscription" for family owner
- Display family member list

#### Roles Needed

Only 2 simple roles (not complex RBAC):

```
Family Owner
├── Can invite members
├── Can remove members
├── Manages subscription (billing)
└── Sets family name/settings

Family Member
├── Uses the app normally
├── Sees other family members' calendars
└── Cannot invite or change billing
```

These are stored in **Supabase**, not in your app code:
- 🗄️ Supabase database stores roles
- 📱 App reads roles and shows/hides buttons

#### Where Things Live

| Component | Where | Why |
|-----------|-------|-----|
| Family groups | Supabase table | Is data |
| Member roles | Supabase table | Is data |
| Invite links | Supabase table | Is data |
| Billing details | Supabase + Stripe | Security requirement |
| UI screens | App code | User interface |
| Permission rules | Supabase RLS | Security enforcement |
| Invite validation | App code | User experience |

#### Implementation Approach (Recommended)

Use the **Hybrid approach** (Secure + Flexible):
1. Store family data in Supabase
2. Write database policies (RLS) to enforce security
3. App handles UI and user flows
4. Stripe handles billing

This keeps your data secure while staying flexible.

**See:** `FUTURE_FAMILY_SUBSCRIPTIONS_ROADMAP.md` for:
- Complete database schema
- Code examples in Dart/Flutter
- Three different implementation options (with pros/cons)
- Step-by-step timeline
- Cost breakdown
- When to actually build this

#### Decision: When to Build

**Don't build yet if:**
- ❌ You haven't launched MVP
- ❌ You have fewer than 100 paying users
- ❌ You're not sure users want family plans

**Build after you have:**
- ✅ MVP launched and working
- ✅ 100+ paying individual users
- ✅ Users requesting family/team features

**Focus now on:** Basic auth, individual subscriptions, core calendar features.

---

**Created:** October 2025  
**Last Updated:** [Today's Date]  
**Version:** 1.0

This guide is yours to customize. Update it with your actual project details and share it with your team.
