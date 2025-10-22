# SUPABASE SETUP CHECKLIST - QUICK REFERENCE

## 🎯 GOAL
Set up Supabase backend and connect your Flutter app. Estimated time: **20-30 minutes**.

---

## ✅ PRE-SETUP (5 minutes)

- [ ] Have a code editor open to `/supabase/schema/000_corrected_schema_complete.sql`
- [ ] Create Supabase account at https://supabase.com
- [ ] Have `.env` file open and ready to edit

---

## ✅ STEP 1: CREATE SUPABASE PROJECT (3 minutes)

- [ ] Go to https://supabase.com/dashboard
- [ ] Click **"New Project"**
- [ ] Fill in project details:
  - **Name**: `myorbit-dev` (or your preference)
  - **Database Password**: Create strong password, save it somewhere safe
  - **Region**: Pick closest to your location
- [ ] Click **Create new project**
- [ ] Wait 2-3 minutes for provisioning...
- [ ] When ready, you'll see the dashboard

---

## ✅ STEP 2: GET CREDENTIALS (2 minutes)

In Supabase dashboard:
- [ ] Click on **project name** (top left) → **Settings**
- [ ] Go to **API** tab
- [ ] Copy these values:
  - [ ] **Project URL** → save as `SUPABASE_URL`
  - [ ] **anon public** (under "Project API keys") → save as `SUPABASE_ANON_KEY`

---

## ✅ STEP 3: UPDATE .ENV FILE (1 minute)

In your project, edit `.env`:

```env
FLUTTER_ENV=dev
DEV_SUPABASE_URL=<paste-project-url-here>
DEV_SUPABASE_ANON_KEY=<paste-anon-key-here>
```

- [ ] Replace `<paste-project-url-here>` with your URL
- [ ] Replace `<paste-anon-key-here>` with your anon key
- [ ] Save the file
- [ ] Do NOT commit this to git (should be in .gitignore)

---

## ✅ STEP 4: APPLY SCHEMA (5 minutes)

In Supabase dashboard:
- [ ] Go to **SQL Editor** (left sidebar)
- [ ] Click **"New Query"**
- [ ] Open file: `/supabase/schema/000_corrected_schema_complete.sql`
- [ ] Copy **ALL** contents
- [ ] Paste into SQL Editor
- [ ] Click **Run** (or Cmd+Enter)
- [ ] Wait for all queries to complete
- [ ] Look for green ✓ checkmarks for each statement

If you see errors:
- [ ] Check error message
- [ ] Common issue: extensions already exist (this is OK, safe to ignore)
- [ ] Scroll down to verify all tables created successfully

---

## ✅ STEP 5: ENABLE REAL-TIME (2 minutes)

In Supabase dashboard:
- [ ] Go to **Database** (left sidebar)
- [ ] Click **Replication** tab
- [ ] Under "Replication" toggle, enable these tables:
  - [ ] `events`
  - [ ] `contacts`
  - [ ] `availability_signals`
  - [ ] `signal_shares`
  - [ ] `notifications`
  - [ ] `calendars`
  - [ ] `user_preferences`
- [ ] Each should show a green toggle when enabled

---

## ✅ STEP 6: TEST CONNECTION (5 minutes)

In your Flutter project:
- [ ] Run: `flutter clean`
- [ ] Run: `flutter pub get`
- [ ] Run the app on an emulator or device
- [ ] Watch the console for startup logs

Expected console output:
```
🚀 Starting bootstrapApp...
📡 Initializing SupabaseService...
✅ SupabaseService initialized
🌍 Initializing TimezoneService...
✅ TimezoneService initialized
... (more services) ...
✅ App started successfully!
```

If you see errors:
- [ ] Check `.env` file has correct credentials
- [ ] Verify Supabase project is fully provisioned
- [ ] Check internet connection
- [ ] Run `flutter clean && flutter pub get` again

---

## ✅ STEP 7: VERIFY EACH PAGE (10 minutes)

### Dashboard
- [ ] App loads without errors
- [ ] Events display (should show mock data → Supabase data)
- [ ] Notification bell shows
- [ ] Quick-create button works

### Calendar
- [ ] Opens without errors
- [ ] Month/week view renders
- [ ] Can see events on calendar
- [ ] Can create new event (try it)

### Events List
- [ ] All events load
- [ ] Search works
- [ ] Can tap on event

### Settings
- [ ] Settings page loads
- [ ] Toggle dark mode (changes immediately)
- [ ] Change timezone (should reload calendar)
- [ ] See all preference options

### People/Contacts
- [ ] Contacts page loads
- [ ] See "Connected" tab with mock contacts
- [ ] See "Pending" tab
- [ ] See "Contacts" tab

### Signals/Availability
- [ ] Availability card shows
- [ ] Can expand to see signals
- [ ] Can tap "Share availability"
- [ ] Can create new signal

---

## ✅ STEP 8: MONITOR LOGS (ongoing)

In Flutter console, look for patterns:

**Good signs** ✅:
```
Remote event inserted: event-xyz
Remote contact updated: contact-abc
Notification synced
```

**Bad signs** ❌:
```
Failed to create event: User not authenticated
Error fetching events: Permission denied
Connection refused
```

If bad signs appear:
- [ ] Check RLS policies are enabled (Supabase → Authentication → Policies)
- [ ] Verify user is authenticated
- [ ] Check `.env` credentials are correct

---

## 🎉 SUCCESS CRITERIA

You'll know it worked when:

1. ✅ App launches without crashing
2. ✅ Dashboard loads data (not just empty states)
3. ✅ Events appear from "This week" and "Upcoming" sections
4. ✅ Can create a new event
5. ✅ Can toggle dark mode and it persists
6. ✅ Can see signals on dashboard
7. ✅ Can navigate between all tabs without errors
8. ✅ No auth/permission errors in console

---

## 🚨 TROUBLESHOOTING

### "User not authenticated"
**Problem**: Can't connect to Supabase tables
**Solution**: 
- [ ] Check SupabaseService.initialize() is called in main.dart
- [ ] Verify .env file has correct credentials
- [ ] Restart the app

### "Table does not exist"
**Problem**: Schema didn't apply
**Solution**:
- [ ] Go to Supabase → Database Inspector
- [ ] Check if tables are listed
- [ ] If not, re-run SQL queries in SQL Editor
- [ ] Watch for error messages

### "Permission denied"
**Problem**: RLS policies blocking access
**Solution**:
- [ ] Go to Supabase → Authentication → Policies
- [ ] Verify policies exist on tables
- [ ] Check policy conditions

### "Connection timeout"
**Problem**: Network or Supabase project issue
**Solution**:
- [ ] Check your internet connection
- [ ] Verify Supabase dashboard is accessible
- [ ] Check if Supabase has service status page
- [ ] Try a different region

### "Events showing but blank"
**Problem**: Data loading but not displaying
**Solution**:
- [ ] Check domain model alignment (check AUDIT_FINDINGS_SUMMARY.md)
- [ ] Look at console for parsing errors
- [ ] Verify data types match schema

---

## 📞 NEXT STEPS AFTER VERIFICATION

Once all verification checks pass:

1. **Phase 2 - Provider Updates** (1-2 hours):
   - Update settings provider to sync with Supabase
   - Update notification provider for DB persistence
   - Add new API service methods

2. **Phase 3 - Real-time Sync** (1-2 hours):
   - Test real-time updates across devices
   - Verify conflict resolution works
   - Monitor sync queue

3. **Phase 4 - Production Readiness**:
   - Set up staging environment
   - Create automated backups
   - Document deployment process

---

## 📋 QUICK REFERENCE

| Task | Command | Where |
|---|---|---|
| Clean & reset | `flutter clean && flutter pub get` | Terminal |
| Check schema | Supabase → Database → Inspector | Browser |
| View logs | Run app → Watch console | IDE |
| Test query | Supabase → SQL Editor | Browser |
| Update env | Edit `.env` file | Your editor |

---

## 💾 BACKUP YOUR CREDENTIALS

Save these somewhere safe (password manager recommended):
- [ ] Supabase Project URL
- [ ] Supabase Anon Key
- [ ] Database Password (from project creation)
- [ ] Admin API Key (from Settings → API)

**Do NOT share these** or commit to version control.

---

## 🎯 TIME ESTIMATE

| Step | Time |
|---|---|
| Create Supabase project | 5 min |
| Get credentials | 2 min |
| Update .env | 1 min |
| Apply schema | 5 min |
| Enable real-time | 2 min |
| Test connection | 5 min |
| Verify each page | 10 min |
| **TOTAL** | **~30 min** |

---

## 📞 HELP RESOURCES

- [Supabase Docs](https://supabase.com/docs)
- [Flutter Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/flutter)
- Your code: Check `/docs/guides/` for implementation details

---

**Good luck! 🚀**

If you get stuck, check the AUDIT_FINDINGS_SUMMARY.md and SUPABASE_SETUP_PLAN.md for detailed explanations.
