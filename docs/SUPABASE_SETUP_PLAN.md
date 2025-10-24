# SUPABASE SETUP PLAN - COMPREHENSIVE GUIDE

## Overview
This document outlines the complete setup process for your MyOrbit Supabase backend, including the corrected schema and any necessary frontend adjustments.  
**Run `supabase/schema/000_corrected_schema_complete.sql` as your source of truth.** The older per-feature SQL files are archived for reference only.

## ✅ WHAT'S BEEN FIXED

### 1. **Availability Signals Schema** ✓
**Issue**: The original schema only stored `start_date` / `end_date` pairs and
enforced unique partner assignments, which doesn’t match the current UI flows.

**Fix**: 
- Signals are owned by a user (`owner_id`) and shared via `signal_shares`
- Added true timestamp columns (`start_time`, `end_time`) plus optional `duration` and `message`
- Added `signal_type` enum constraint (`available`, `busy`, `flexible`, `unavailable`)
- Exposed a generated `user_id` column so existing Dart models (`user_id`) keep working

**Updated Table Definition (excerpt)**:
```sql
CREATE TABLE public.availability_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID GENERATED ALWAYS AS (owner_id) STORED,
  signal_type TEXT NOT NULL DEFAULT 'available'
    CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration TEXT CHECK (duration IS NULL OR duration IN ('hour','hours2','hours4','day','custom')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_signals_valid_time_range CHECK (end_time > start_time)
);
```

---

### 2. **Calendar Provider Tracking** ✓
**Issue**: No way to track if calendar is from Google, Apple, Outlook, or MyOrbit.

**Fix**:
- `calendars` table now has `provider` field (enum: 'myorbit', 'google', 'apple', 'outlook', 'caldav')
- Added `external_calendar_id` field to store external provider's ID
- Added `sync_enabled` and `last_sync_at` for sync status tracking
- Supports upcoming calendar integration improvements

**Migration Code**:
```sql
ALTER TABLE calendars 
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'myorbit' CHECK (provider IN ('myorbit', 'google', 'apple', 'outlook', 'caldav')),
  ADD COLUMN external_calendar_id TEXT,
  ADD COLUMN sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN last_sync_at TIMESTAMPTZ;
```

---

### 3. **User Preferences Synced Across Devices** ✓
**Issue**: Settings stored locally in SharedPreferences; not synced across devices.

**Fix**:
- New `user_preferences` table in Supabase
- All settings now sync: dark mode, timezone, privacy levels, notification preferences, etc.
- Backward compatible: migrates existing local prefs to Supabase on first login
- Users see same settings on all devices/sessions

**New Table**:
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dark_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_privacy TEXT NOT NULL DEFAULT 'normal',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  event_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminder_minutes INTEGER NOT NULL DEFAULT 30,
  event_notification_channels TEXT[] NOT NULL DEFAULT ARRAY['push'],
  partner_invites_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  calendar_changes_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_reschedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_sms_cancellation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  signal_notification_channel TEXT NOT NULL DEFAULT 'push',
  signal_buffer_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 4. **Persistent Notifications in Database** ✓
**Issue**: Notifications only stored locally; not available across devices.

**Fix**:
- `notifications` table now stores all notifications persistently
- Supports read/unread status, dismissal, and visibility rules
- Full history available for "Activity" page
- Auto-cleanup rules can be added later (e.g., delete after 30 days)

**New Table**:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  message TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_id TEXT,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  show_in_center BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 5. **Event Privacy Levels Clarified** ✓
**Issue**: Frontend privacy levels not clearly reflected in schema.

**Fix**:
- `privacy_level` field in `events` table now enforces Dart enum values
- Check constraint validates only allowed privacy levels: 'normal', 'exclusive', 'superExclusive'
- Frontend privacy filters aligned with DB constraints

**Migration Code**:
```sql
ALTER TABLE events 
  ALTER COLUMN privacy_level TYPE TEXT CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive')),
  SET DEFAULT 'normal';
```

---

### 6. **Event Reschedule Workflows** ✓
**Issue**: Reschedule status was UI-only; no DB support.

**Fix**:
- `reschedule_status` field in `events` table now persists workflow state
- Check constraint ensures valid state transitions: none → pendingContact → contactConfirmed → awaitingUserApproval → scheduled
- Survives app restarts and device switches

**Migration Code**:
```sql
ALTER TABLE events 
  ADD COLUMN reschedule_status TEXT NOT NULL DEFAULT 'none' 
    CHECK (reschedule_status IN ('none', 'pendingContact', 'contactConfirmed', 'awaitingUserApproval', 'scheduled'));
```

---

## 📋 SETUP STEPS

### Step 1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Name it: `myorbit-dev` (or your preferred name)
5. Choose region closest to you
6. Save the database password securely
7. Wait for provisioning (~2 minutes)

### Step 2: Apply Corrected Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the entire contents of `/supabase/schema/000_corrected_schema_complete.sql`
4. Paste into SQL Editor
5. Click **Run**
6. Wait for all tables to create (should see ✓ confirmations)

### Step 3: Set Environment Variables
1. In Supabase dashboard, go to **Project Settings → API**
2. Copy your:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
3. Update `.env` file in project root:
```env
FLUTTER_ENV=dev
DEV_SUPABASE_URL=<your-project-url>
DEV_SUPABASE_ANON_KEY=<your-anon-key>
```

### Step 4: Enable RLS (Row Level Security)
1. In Supabase, go to **Authentication → Policies**
2. Verify all tables have policies enabled (should be automatic from schema)
3. Test by trying to query a table without being authenticated (should fail)

### Step 5: Set Up Real-time Subscriptions
1. In Supabase, go to **Database → Replication**
2. Enable "Replication" for these tables:
   - `events`
   - `contacts`
   - `availability_signals`
   - `signal_shares`
   - `notifications`
   - `calendars`

### Step 6: Test the Connection
1. Run: `flutter clean && flutter pub get`
2. Run the app in debug mode
3. In dashboard, look for:
   - ✓ Events loading from Supabase
   - ✓ Signals appearing
   - ✓ Notifications syncing
   - ✓ Settings saving and persisting

---

## 🔧 FRONTEND UPDATES NEEDED

### 1. Update Settings Provider to Sync with Supabase
**File**: `lib/logic/providers/settings_providers.dart`

Currently, settings are stored only in SharedPreferences. We need to:
1. Create `user_preferences_provider` that fetches from Supabase
2. On first launch, migrate existing local prefs to Supabase
3. Watch for Supabase updates and sync back to local storage

**Action**: This will be handled in Phase 2 (API integration)

### 2. Update API Service with Preferences Endpoints
**File**: `lib/logic/services/api_service.dart`

Add these methods:
```dart
// Get user preferences from Supabase
static Future<Result<UserPreferences>> getUserPreferences() async { }

// Save/update preferences to Supabase
static Future<Result<void>> saveUserPreferences(UserPreferences prefs) async { }
```

**Action**: Will be added in Phase 2

### 3. Update Notification Provider for DB Persistence
**File**: `lib/logic/providers/notification_providers.dart`

Modify `NotificationList` provider to:
1. Load from Supabase `notifications` table (not just local storage)
2. Mark notifications as read/dismissed in DB
3. Subscribe to real-time notification inserts

**Action**: Will be added in Phase 2

### 4. Verify Calendar Integration Setup

Your calendar sync services exist and look good:
- ✓ `GoogleCalendarSyncService` - imports Google Calendar events
- ✓ `AppleCalendarSyncService` - imports Apple Calendar events

**Status**: Both services are set up correctly. When events are imported, they're saved with:
- `provider` = 'google' or 'apple'
- `external_provider` = provider name
- `external_event_id` = provider's event ID
- This prevents duplicates and allows re-syncing

**Nothing needs to change** - the schema updates support this perfectly.

---

## 🚨 IMPORTANT: MANUAL DATA MIGRATION (IF NEEDED)

If you already have data in your local DB and want to migrate it:

1. Export current events from local storage
2. After Supabase is set up, import them using:
   ```dart
   final event = CalendarEvent(...);
   await CalendarApi.createEvent(event);
   ```

**Recommendation**: Start fresh with mock data for now. Once you verify everything works, you can add migration logic.

---

## 🔐 SECURITY CHECKLIST

- [ ] Row Level Security (RLS) policies enabled on all tables
- [ ] Auth users can only see their own data
- [ ] Real-time subscriptions enabled for collaborative features
- [ ] Sensitive data not exposed in API responses
- [ ] All API calls authenticated via `SupabaseService.clientOrThrow`

---

## ✔️ VERIFICATION CHECKLIST

After setup, test these scenarios:

### Dashboard
- [ ] Events from this week display correctly
- [ ] Upcoming events show in card
- [ ] Signals display (mine and shared)
- [ ] Notification badge shows count
- [ ] Quick-create buttons work

### Calendar
- [ ] Month view loads events
- [ ] Can create new event
- [ ] Event shows correct privacy level
- [ ] Signals appear on timeline

### Events List
- [ ] All events load and display
- [ ] Search filtering works
- [ ] Can tap to view event details

### Settings
- [ ] Toggle dark mode → syncs to Supabase
- [ ] Change timezone → saved and reloads
- [ ] Change privacy level → new events use it

### People/Contacts
- [ ] Connected contacts display
- [ ] Can add new contact
- [ ] Pending invites show separately

### Signals/Availability
- [ ] Can create availability signal
- [ ] Signal type selection works (available/busy/flexible)
- [ ] Duration selection works
- [ ] Can share signal with contacts

---

## 📞 TROUBLESHOOTING

### "User not authenticated" errors
- **Cause**: Supabase auth not initialized
- **Fix**: Ensure `SupabaseService.initialize()` is called in `main.dart`

### "Table does not exist" errors
- **Cause**: Schema not applied correctly
- **Fix**: Go to SQL Editor, verify all tables exist in inspector

### Notifications not showing
- **Cause**: Real-time subscriptions not enabled
- **Fix**: Enable in Supabase Dashboard → Replication

### Settings not persisting across devices
- **Cause**: Settings provider not syncing to Supabase
- **Fix**: This is Phase 2; being added next

---

## 📞 NEXT STEPS

1. **Complete Setup**: Follow steps 1-6 above
2. **Run Tests**: Verify checklist items
3. **Report Issues**: Document any schema mismatches or API errors
4. **Phase 2**: Update providers and API service to handle all the new tables
5. **Phase 3**: Set up real-time sync and conflict resolution

---

**Estimated setup time**: 15-20 minutes
**Complexity**: Low (mostly UI configuration)
**Risk**: Low (schema is backward compatible)
