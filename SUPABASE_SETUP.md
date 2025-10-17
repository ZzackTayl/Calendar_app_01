# Supabase Setup Guide for MyOrbit

**Time Required:** 30-45 minutes  
**Difficulty:** Beginner-friendly

This guide will walk you through setting up the Supabase backend for MyOrbit Calendar.

---

## Table of Contents

1. [Create Supabase Account & Project](#step-1-create-supabase-account--project)
2. [Get API Credentials](#step-2-get-api-credentials)
3. [Configure Environment Variables](#step-3-configure-environment-variables)
4. [Create Database Tables](#step-4-create-database-tables)
5. [Set Up Row Level Security](#step-5-set-up-row-level-security)
6. [Enable Google OAuth (Optional)](#step-6-enable-google-oauth-optional)
7. [Test the Connection](#step-7-test-the-connection)

---

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up for Supabase

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"Sign in"**
3. Sign up using:
   - **GitHub** (recommended - fastest)
   - Google
   - Email

### 1.2 Create a New Project

1. Once logged in, click **"New Project"**
2. Fill in the details:
   - **Name:** `myorbit-dev` (or any name you prefer)
   - **Database Password:** Create a strong password (SAVE THIS!)
     - Example: `MyOrbit2024!SecurePass`
     - **⚠️ IMPORTANT:** Store this password securely - you'll need it later
   - **Region:** Choose the closest to your users:
     - `us-east-1` (N. Virginia) - East Coast US
     - `us-west-1` (N. California) - West Coast US
     - `eu-west-1` (Ireland) - Europe
     - `ap-southeast-1` (Singapore) - Asia
   - **Pricing Plan:** Free (sufficient for development)

3. Click **"Create new project"**
4. Wait 2-3 minutes for project to initialize ☕

---

## Step 2: Get API Credentials

### 2.1 Navigate to Project Settings

1. In your Supabase dashboard, click **Settings** (gear icon) in the left sidebar
2. Click **API** under "Configuration"

### 2.2 Copy Your Credentials

You'll need TWO pieces of information:

#### A. Project URL
- Look for **"Project URL"** section
- Copy the URL (looks like: `https://abcdefghijklmnop.supabase.co`)
- **Example:** `https://xyzproject123.supabase.co`

#### B. API Key (anon/public)
- Look for **"Project API keys"** section
- Find **"anon"** or **"anon public"** key
- Click the **copy icon** to copy the key
- It's a long string like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2.3 Store These Safely

Create a temporary note with:
```
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_ANON_KEY=your-long-anon-key-here
```

**⚠️ NEVER commit these to Git without the .env file protection!**

---

## Step 3: Configure Environment Variables

### 3.1 Update the `.env` File

1. Open the project in your code editor
2. Find the `.env` file in the root directory
3. Replace the placeholder values:

**Before:**
```env
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

**After:**
```env
SUPABASE_URL=https://xyzproject123.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.2 Verify .env is in .gitignore

Check that `.gitignore` contains:
```
.env
*.env
```

This prevents accidentally committing secrets to GitHub.

---

## Step 4: Create Database Tables

### 4.1 Open SQL Editor

1. In Supabase dashboard, click **SQL Editor** in left sidebar
2. Click **"New query"**

### 4.2 Run the Database Setup Script

Copy and paste this ENTIRE script into the SQL editor, then click **"Run"**:

```sql
-- ============================================
-- MyOrbit Sophisticated Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Extends Supabase auth.users with app-specific data

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC / GMT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies: users can only see/edit their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. CONTACTS TABLE
-- ============================================
-- Stores partner/contact relationships with sophisticated permissions

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'contact-only' CHECK (status IN ('pending', 'accepted', 'contact-only')),
  permission TEXT NOT NULL DEFAULT 'private' CHECK (permission IN ('private', 'semi-visible', 'visible')),
  external_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  labels TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Contacts policies: users can only manage their own contacts
CREATE POLICY "Users can view own contacts"
  ON public.contacts FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE
  USING (auth.uid() = owner_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS contacts_owner_id_idx ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON public.contacts(status);
CREATE INDEX IF NOT EXISTS contacts_permission_idx ON public.contacts(permission);

-- ============================================
-- 3. CALENDARS TABLE
-- ============================================
-- Supports multiple calendars per user

CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_value INTEGER NOT NULL DEFAULT 4282795530, -- Default blue color
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

-- Calendar policies: users can only manage their own calendars
CREATE POLICY "Users can view own calendars"
  ON public.calendars FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calendars"
  ON public.calendars FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own calendars"
  ON public.calendars FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own calendars"
  ON public.calendars FOR DELETE
  USING (auth.uid() = owner_id);

-- Ensure only one primary calendar per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_primary_calendar 
  ON public.calendars(owner_id) 
  WHERE is_primary = TRUE;

-- ============================================
-- 4. CALENDAR_VISIBILITY TABLE
-- ============================================
-- Tracks which calendars are visible to the user

CREATE TABLE IF NOT EXISTS public.calendar_visibility (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visible_calendar_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.calendar_visibility ENABLE ROW LEVEL SECURITY;

-- Calendar visibility policies: users can only manage their own visibility
CREATE POLICY "Users can view own calendar visibility"
  ON public.calendar_visibility FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own calendar visibility"
  ON public.calendar_visibility FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own calendar visibility"
  ON public.calendar_visibility FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- 5. RECURRENCE_RULES TABLE
-- ============================================
-- Stores recurrence patterns for recurring events

CREATE TABLE IF NOT EXISTS public.recurrence_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL CHECK (pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER NOT NULL DEFAULT 1 CHECK (interval > 0),
  days_of_week INTEGER[], -- 0=Sunday, 1=Monday, etc.
  monthly_pattern TEXT CHECK (monthly_pattern IN ('same-date', 'same-weekday', 'last-day')),
  end_type TEXT NOT NULL DEFAULT 'never' CHECK (end_type IN ('never', 'after-occurrences', 'on-date')),
  occurrence_count INTEGER CHECK (occurrence_count > 0),
  end_date DATE,
  exceptions DATE[], -- Dates to skip in the pattern
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recurrence_rules ENABLE ROW LEVEL SECURITY;

-- Recurrence rules policies: users can only manage their own rules
CREATE POLICY "Users can view own recurrence rules"
  ON public.recurrence_rules FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own recurrence rules"
  ON public.recurrence_rules FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own recurrence rules"
  ON public.recurrence_rules FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own recurrence rules"
  ON public.recurrence_rules FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- 6. EVENTS TABLE
-- ============================================
-- Stores sophisticated calendar events with recurrence support

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  privacy_level TEXT NOT NULL DEFAULT 'normal' CHECK (privacy_level IN ('normal', 'exclusive', 'super-exclusive')),
  reschedule_status TEXT NOT NULL DEFAULT 'none'
    CHECK (
      reschedule_status IN (
        'none',
        'pendingContact',
        'contactConfirmed',
        'awaitingUserApproval',
        'scheduled'
      )
    ),
  invited_contact_ids UUID[] DEFAULT '{}', -- Array of contact IDs invited to the event
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE DEFAULT 'primary_calendar_id', -- Will need to be set properly
  recurrence_rule_id UUID REFERENCES public.recurrence_rules(id) ON DELETE SET NULL,
  external_provider TEXT,
  external_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure end is after start
  CONSTRAINT valid_time_range CHECK (end_ts > start_ts)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events policies: users can only manage their own events
CREATE POLICY "Users can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE
  USING (auth.uid() = owner_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS events_owner_id_idx ON public.events(owner_id);
CREATE INDEX IF NOT EXISTS events_start_ts_idx ON public.events(start_ts);
CREATE INDEX IF NOT EXISTS events_time_range_idx ON public.events(start_ts, end_ts);
CREATE INDEX IF NOT EXISTS events_calendar_id_idx ON public.events(calendar_id);
CREATE INDEX IF NOT EXISTS events_privacy_level_idx ON public.events(privacy_level);
CREATE INDEX IF NOT EXISTS events_reschedule_status_idx ON public.events(reschedule_status) WHERE reschedule_status <> 'none';

-- ============================================
-- 7. AVAILABILITY_SIGNALS TABLE
-- ============================================
-- Stores availability signals that users can share with contacts

CREATE TABLE IF NOT EXISTS public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration TEXT CHECK (duration IN ('hour', '2hours', '4hours', 'day', 'custom')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure end is after start
  CONSTRAINT valid_signal_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.availability_signals ENABLE ROW LEVEL SECURITY;

-- Availability signals policies: users can only manage their own signals
CREATE POLICY "Users can view own signals"
  ON public.availability_signals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals"
  ON public.availability_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signals"
  ON public.availability_signals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON public.availability_signals FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS signals_user_id_idx ON public.availability_signals(user_id);
CREATE INDEX IF NOT EXISTS signals_time_range_idx ON public.availability_signals(start_time, end_time);
CREATE INDEX IF NOT EXISTS signals_signal_type_idx ON public.availability_signals(signal_type);

-- ============================================
-- 8. SIGNAL_SHARES TABLE
-- ============================================
-- Tracks which contacts can see which availability signals

CREATE TABLE IF NOT EXISTS public.signal_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES public.availability_signals(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify BOOLEAN NOT NULL DEFAULT TRUE,
  auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent sharing signal with same user multiple times
  UNIQUE(signal_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.signal_shares ENABLE ROW LEVEL SECURITY;

-- Signal shares policies: users can manage shares they created or were shared with them
CREATE POLICY "Users can view signal shares involving them"
  ON public.signal_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

CREATE POLICY "Users can insert signal shares they create"
  ON public.signal_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Users can delete signal shares they created"
  ON public.signal_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS signal_shares_signal_id_idx ON public.signal_shares(signal_id);
CREATE INDEX IF NOT EXISTS signal_shares_shared_with_idx ON public.signal_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS signal_shares_shared_by_idx ON public.signal_shares(shared_by_user_id);

-- ============================================
-- 9. EVENT_INVITES TABLE
-- ============================================
-- Tracks which contacts are invited to events

CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  
  -- Prevent duplicate invites
  UNIQUE(event_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- Event invites policies: users can manage invites for their own events or as contacts
CREATE POLICY "Users can view invites for own events or as contacts"
  ON public.event_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = event_invites.contact_id
      AND contacts.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invites for own events"
  ON public.event_invites FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_invites.event_id
    AND events.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update invites for events they own or contacts they manage"
  ON public.event_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_invites.event_id
      AND events.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = event_invites.contact_id
      AND contacts.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete invites for own events"
  ON public.event_invites FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_invites.event_id
    AND events.owner_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS event_invites_event_id_idx ON public.event_invites(event_id);
CREATE INDEX IF NOT EXISTS event_invites_contact_id_idx ON public.event_invites(contact_id);

-- ============================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================
-- Auto-update updated_at timestamps

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER calendars_updated_at
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER calendar_visibility_updated_at
  BEFORE UPDATE ON public.calendar_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER recurrence_rules_updated_at
  BEFORE UPDATE ON public.recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER availability_signals_updated_at
  BEFORE UPDATE ON public.availability_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SETUP COMPLETE!
-- ============================================
```

> ℹ️ **Reschedule workflow:** the `reschedule_status` column keeps the mobile app and future AI SMS assistant in sync during rescheduling. Starting launch treats this as manual-only; the AI helper will hook into these states later when we roll it out.

### 4.3 Verify Tables Were Created

1. In Supabase dashboard, click **Table Editor** in left sidebar
2. You should see 4 new tables:
   - ✅ `profiles`
   - ✅ `contacts`
   - ✅ `events`
   - ✅ `event_invites`

---

## Step 5: Set Up Row Level Security (RLS)

**Good news!** The SQL script in Step 4 already set up RLS policies. Let's verify:

### 5.1 Check RLS is Enabled

1. Go to **Table Editor**
2. Click on any table (e.g., `events`)
3. Look for **"RLS enabled"** badge at the top
4. Should say: ✅ **"Row Level Security is enabled"**

### 5.2 What RLS Does

Row Level Security ensures that:
- ✅ Users can ONLY see their own data
- ✅ Users CANNOT access other users' events/contacts
- ✅ All data is automatically filtered by `owner_id`
- ✅ No user can bypass security rules

---

## Step 6: Enable Google OAuth (Optional)

**Note:** This is required for the "Sign in with Google" feature.

### 6.1 Create Google OAuth Credentials

1. Go to **https://console.cloud.google.com**
2. Create a new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure:
   - Application type: **Web application**
   - Name: `MyOrbit OAuth`
   - Authorized redirect URIs: Add your Supabase callback URL
     - Format: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
     - Example: `https://xyzproject123.supabase.co/auth/v1/callback`
6. Click **"Create"**
7. Copy the **Client ID** and **Client Secret**

### 6.2 Configure in Supabase

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle **"Enable Google provider"** to ON
4. Paste your:
   - **Client ID**
   - **Client Secret**
5. Click **"Save"**

### 6.3 Update .env File

Add these lines to your `.env`:
```env
GOOGLE_OAUTH_CLIENT_ID_IOS=your-google-client-id-here
GOOGLE_OAUTH_CLIENT_ID_ANDROID=your-google-client-id-here
```

---

## Step 7: Test the Connection

### 7.1 Test from Flutter App

1. Open your project in your IDE
2. Ensure `.env` is updated with your credentials
3. Run the app:
   ```bash
   flutter pub get
   flutter run -d chrome
   ```

4. Check the console for:
   - ✅ `Supabase initialized successfully`
   - ❌ If you see errors, double-check your `.env` file

### 7.2 Test API Connection Manually

Create a test file to verify connection:

**`lib/test_supabase.dart`:**
```dart
import 'package:flutter/material.dart';
import 'core/supabase_client.dart';

Future<void> testSupabaseConnection() async {
  try {
    // Test health check
    final response = await SupabaseService.client
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
    
    print('✅ Supabase connection successful!');
    print('Response: $response');
  } catch (e) {
    print('❌ Supabase connection failed: $e');
  }
}
```

---

## Troubleshooting

### Issue: "Invalid API key"
**Solution:** 
- Verify you copied the **anon/public** key, not the **service_role** key
- Check for extra spaces in `.env` file
- Ensure `.env` file is in the root directory

### Issue: "Connection timeout"
**Solution:**
- Check your internet connection
- Verify the Supabase project URL is correct
- Make sure the project is not paused (free tier projects pause after inactivity)

### Issue: "Row Level Security policy violation"
**Solution:**
- User must be authenticated before accessing data
- Check that auth.uid() is properly set
- Verify RLS policies were created correctly (re-run Step 4.2)

### Issue: "Table does not exist"
**Solution:**
- Re-run the SQL script from Step 4.2
- Check the **Table Editor** to see if tables exist
- Look for errors in the SQL editor output

---

## Future Work (Planned Enhancements)

- **AI SMS assistant:** not part of the first launch. When we introduce it later, it will read/update `events.reschedule_status` through secure Edge Functions so automated reschedules stay in sync with manual approvals.
- **DigitalOcean Kubernetes workers:** earmarked for cron jobs and long-running sync tasks; no action needed until the AI service is greenlit.

---

## Next Steps

Once Supabase is set up:

1. ✅ **Test authentication** - Try signing in with Google
2. ✅ **Create test data** - Add a profile, contact, and event
3. ✅ **Verify RLS** - Ensure you can only see your own data
4. ✅ **Start building UI** - Rebuild screens with Riverpod

---

## Important Security Notes

### ⚠️ DO NOT COMMIT:
- `.env` file
- Database passwords
- Service role keys
- OAuth secrets

### ✅ SAFE TO COMMIT:
- `SUPABASE_URL` (in documentation only)
- `SUPABASE_ANON_KEY` (in documentation only - it's designed to be public)

### 🔒 Keep Secret:
- `SUPABASE_SERVICE_ROLE_KEY` - NEVER expose this!
- Database password
- OAuth Client Secrets

---

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Flutter Integration:** https://supabase.com/docs/guides/getting-started/tutorials/with-flutter
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **API Reference:** https://supabase.com/docs/reference/dart/introduction

---

## Support

If you encounter issues:
1. Check Supabase logs: **Dashboard → Logs**
2. Review this guide again
3. Check `.env` file configuration
4. Verify all SQL scripts ran successfully

**Setup complete! 🎉 You're ready to build!**
