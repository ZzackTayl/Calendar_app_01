# MyOrbit Calendar - Supabase Database Schema

This directory contains the complete database schema for the MyOrbit Calendar app, organized as sequential migration files.

## 📁 Migration Files

| File | Description | Tables Created |
|------|-------------|----------------|
| `001_profiles_contacts.sql` | User profiles and contacts | `profiles`, `contacts` |
| `002_calendars_events.sql` | Calendars, events, and recurrence | `calendars`, `calendar_visibility`, `recurrence_rules`, `events`, `event_invites` |
| `003_availability_signals.sql` | Availability sharing system | `availability_signals`, `signal_shares`, `signal_timeline_entries`, `notifications` |
| `004_functions.sql` | Database functions and business logic | Functions: `set_updated_at()`, `get_user_events()`, `compute_availability()`, etc. |
| `005_realtime.sql` | Realtime subscriptions setup | Enables realtime for key tables |

## 🚀 Quick Start

### Prerequisites
- Supabase CLI installed (`brew install supabase/tap/supabase`)
- Supabase project created (see [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md))
- `.env` file with `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Applying Migrations

#### Option 1: Via Supabase CLI (Recommended)

```bash
# Initialize Supabase locally (if not done)
cd /path/to/calendar_app
supabase init

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply all migrations
supabase db push
```

#### Option 2: Manual Application

Apply each migration file in order through the Supabase Dashboard:

1. Go to **Database** → **SQL Editor**
2. Copy contents of `001_profiles_contacts.sql`
3. Click **Run**
4. Repeat for `002`, `003`, `004`, `005`

## 🔍 Verification

After applying migrations, verify your setup:

```bash
# Check all tables exist
supabase db dump --schema public | grep "CREATE TABLE"

# Should see 13 tables:
# - profiles
# - contacts
# - calendars
# - calendar_visibility
# - recurrence_rules
# - events
# - event_invites
# - availability_signals
# - signal_shares
# - signal_timeline_entries
# - notifications
```

## 📊 Schema Overview

### Core Tables

**profiles** (User accounts)
- `id` - UUID, primary key
- `email` - Unique email
- `display_name` - User's name
- `avatar_url` - Profile picture
- `preferences` - JSONB for settings

**calendars** (User calendars)
- `id` - UUID, primary key
- `owner_id` - FK to profiles
- `name` - Calendar name
- `color_value` - Flutter Color int
- `is_primary` - Only one per user

**events** (Calendar events)
- `id` - UUID, primary key
- `owner_id` - FK to profiles
- `calendar_id` - Calendar identifier
- `start`, `end` - Timestamps (matches Dart models)
- `privacy_level` - 'normal', 'exclusive', 'superExclusive'
- `reschedule_status` - workflow state (`none`, `pendingContact`, `contactConfirmed`, `awaitingUserApproval`, `scheduled`)
- `recurrence_rule_id` - FK to recurrence_rules (optional)

**Reschedule workflow**
- Mirrors the Flutter `EventRescheduleStatus` state machine
- Keeps AI/automation in sync with manual approvals
- Status index (`events_reschedule_status_idx`) speeds up dashboards and inbox views

### Availability System

**availability_signals** (Share availability with partners)
- `id` - UUID, primary key
- `owner_id` - FK to profiles (who's sharing)
- `partner_user_id` - FK to profiles (who's receiving)
- `start_date`, `end_date` - Date range
- `preferred_times` - JSONB for time preferences

**signal_timeline_entries** (Computed free/busy slots)
- `id` - UUID, primary key
- `signal_id` - FK to availability_signals
- `date` - Specific date
- `time_start`, `time_end` - Time range
- `status` - 'free', 'busy', 'tentative', 'out-of-office'

## 🔒 Security (RLS)

All tables have Row Level Security (RLS) enabled with policies:

- **Users can only see/modify their own data**
- **Shared data** (signals, invites) has special policies:
  - Users can view signals shared WITH them
  - Users can view invites for events they're invited to

Example RLS policy:
```sql
CREATE POLICY "Users can select own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = owner_id);
```

## 🔄 Realtime Configuration

The following tables have realtime enabled (via `005_realtime.sql`):

- ✅ `events` - Live calendar updates
- ✅ `contacts` - Contact status changes
- ✅ `availability_signals` - New availability shares
- ✅ `notifications` - Instant notifications
- ✅ `event_invites` - Invite responses

**Flutter Usage:**
```dart
supabase
  .from('notifications')
  .stream(primaryKey: ['id'])
  .eq('user_id', currentUserId)
  .listen((data) {
    print('New notification: $data');
  });
```

## 🛠️ Key Functions

### `get_user_events(user_id, start_date, end_date, calendar_ids)`
Optimized query for fetching user events in a date range.

### `compute_availability(user_id, start_date, end_date, excluded_dates)`
Calculates free/busy times from events (returns computed slots).

### `sync_signal_timeline(signal_id)`
Regenerates timeline entries for an availability signal (call after events change).

### `get_partner_availability(partner_user_id, start_date, end_date)`
Fetches a partner's shared availability (enforces permission check).

## 🤖 Future AI Assistant Integration

- Planned SMS assistant will use `reschedule_status` to drive conversations and approvals.
- Not part of the initial production launch—keep migrations in place so the future service can plug in without schema changes.

## 🧪 Testing Your Schema

### 1. Create a Test User
```sql
-- Insert test profile
INSERT INTO public.profiles (id, email, display_name)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test@example.com', 'Test User');
```

### 2. Create a Calendar
```sql
INSERT INTO public.calendars (owner_id, name, is_primary)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'My Calendar', TRUE);
```

### 3. Create an Event
```sql
INSERT INTO public.events (owner_id, calendar_id, title, start, "end")
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'primary',
  'Test Meeting',
  '2025-01-15 10:00:00+00',
  '2025-01-15 11:00:00+00'
);
```

### 4. Query Events
```sql
SELECT * FROM public.get_user_events(
  '123e4567-e89b-12d3-a456-426614174000',
  '2025-01-01 00:00:00+00',
  '2025-01-31 23:59:59+00',
  NULL
);
```

## 🚨 Common Issues

### Issue: RLS Blocking Queries
**Symptom:** Queries return 0 rows even though data exists.  
**Fix:** Ensure you're authenticated as the correct user:
```sql
-- Check current auth context
SELECT auth.uid();
```

### Issue: Foreign Key Violations
**Symptom:** `ERROR: insert or update on table "X" violates foreign key constraint`  
**Fix:** Ensure referenced records exist first (e.g., profile before calendar).

### Issue: Realtime Not Working
**Symptom:** No live updates in Flutter app.  
**Fix:** 
1. Verify realtime is enabled in Supabase Dashboard
2. Check `REPLICA IDENTITY FULL` is set (via `005_realtime.sql`)
3. Verify client subscription is correctly configured

## 📖 Related Documentation

- [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) - Full setup guide
- [DEVELOPER_GUIDE.md](../../DEVELOPER_GUIDE.md) - App architecture
- [lib/logic/services/api_service.dart](../../lib/logic/services/api_service.dart) - API implementation
- [lib/domain/](../../lib/domain/) - Dart models (match DB schema)

## 🔧 Maintenance

### Backing Up Schema
```bash
# Dump entire schema
supabase db dump -f backup_$(date +%Y%m%d).sql

# Dump specific table
pg_dump -h YOUR_DB_HOST -U postgres -t public.events > events_backup.sql
```

### Rolling Back a Migration
```bash
# If using Supabase CLI migrations
supabase db reset

# Manual rollback
DROP TABLE IF EXISTS public.events CASCADE;
```

### Adding a New Migration
```bash
# Create new migration file
supabase migration new add_new_feature

# Edit the file in supabase/migrations/
# Apply it
supabase db push
```

## ✅ Checklist for Developers

Before starting backend integration:

- [ ] All 5 migration files applied successfully
- [ ] All 13 tables exist (`supabase db dump --schema public | grep "CREATE TABLE"`)
- [ ] RLS policies are working (test with authenticated user)
- [ ] Realtime is enabled for key tables (test a subscription)
- [ ] Test data inserted and queried successfully
- [ ] `.env` file has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] `lib/core/supabase_client.dart` initializes without errors

---

**Need help?** Check [SUPABASE_SETUP.md](../../SUPABASE_SETUP.md) or reach out to the team!
