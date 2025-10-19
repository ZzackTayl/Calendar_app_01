# 🔧 Pre-Backend Integration Checklist

**For: Development Team**  
**Status:** Ready to implement  
**Estimated Time:** 6-8 hours total  

---

## ✅ Phase 1: Security Verification (2 hours)

### Step 1.1: Verify No Credentials in Git

```bash
# Search for any leaked credentials
git log --all --patch -- '*.dart' | grep -i 'supabase_url\|supabase_key\|password\|api_key'

# Expected result: NO MATCHES
# If found: 🚨 STOP - credentials leaked, need to rotate immediately
```

**Action:**
- [ ] Run command above
- [ ] Confirm: No matches
- [ ] If matches found: Contact Supabase, rotate all keys

### Step 1.2: Verify .env Protection

```bash
# Check .gitignore includes .env
cat .gitignore | grep -E '^\.env$|^\*\.env$'

# Expected output:
# .env
# *.env
```

**Action:**
- [ ] Verify both patterns present in .gitignore
- [ ] If missing: Add them
- [ ] Commit: `git add .gitignore && git commit -m "Ensure .env files ignored"`

### Step 1.3: Search for Hardcoded Credentials

```bash
# Search entire codebase
grep -r "https://" lib/ | grep -E 'supabase|amazonaws|google|firebase'
grep -r "AIza|AKIA|ghp_" lib/
grep -r "const String" lib/ | grep -E 'url|key|token|secret'

# Expected result: NO MATCHES for URLs/keys/tokens
# (Legitimate results like theme URLs are OK)
```

**Action:**
- [ ] Run all three searches
- [ ] Confirm no API credentials found
- [ ] If found: Move to env.dart and update code

### Step 1.4: Verify Environment Variable Handling

**Check: `lib/core/env.dart`**

Should look like:
```dart
static String get supabaseUrl => _value('SUPABASE_URL');
static String get supabaseAnonKey => _value('SUPABASE_ANON_KEY');

// NOT like this:
// static const String supabaseUrl = "https://...";  ❌
```

**Action:**
- [ ] Review env.dart
- [ ] Verify: Uses `_value()` function
- [ ] Verify: No hardcoded URLs or keys
- [ ] Verify: All env vars documented

---

## ✅ Phase 2: Development Environment Setup (3 hours)

### Step 2.1: Create Development Supabase Project

**If not already done:**

1. Go to https://app.supabase.com
2. Click "New Project"
3. Configure:
   - Name: `myorbit-dev`
   - Database Password: Strong password (save it!)
   - Region: Closest to you (or us-east-1)
   - Pricing: Free tier OK
4. Wait 2-3 minutes for project to initialize
5. Copy credentials:
   - Project URL: https://xxxxx.supabase.co
   - Anon Key: eyJhbGciOi...

**Action:**
- [ ] Supabase dev project created
- [ ] Credentials copied securely
- [ ] Saved to password manager

### Step 2.2: Create Local `.env` File for Development

```bash
# Create .env in project root (DO NOT COMMIT)
cat > .env << 'EOF'
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key-here
SENTRY_DSN=your-sentry-dsn
SENTRY_ENV=development
SENTRY_RELEASE=1.0.0+1
EOF

# Verify it's in .gitignore
git check-ignore .env
# Should output: .env
```

**Action:**
- [ ] .env file created with development credentials
- [ ] File is in .gitignore (verify with git check-ignore)
- [ ] Credentials from Supabase dev project

### Step 2.3: Apply Database Schema to Development

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Link to development project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Verify
supabase db dump --schema public | grep "CREATE TABLE" | wc -l
# Should output: 13 (or close to it)
```

**Option B: Manual via Dashboard**

1. Go to Supabase Dashboard
2. Click "SQL Editor" > "New Query"
3. Copy `001_profiles_contacts.sql` and run
4. Copy `002_calendars_events.sql` and run
5. Copy `003_availability_signals.sql` and run
6. Copy `004_functions.sql` and run
7. Copy `005_realtime.sql` and run
8. Wait for each to complete before next

**Action:**
- [ ] Schema migrations applied to dev Supabase
- [ ] All 5 migration files executed
- [ ] No SQL errors

### Step 2.4: Verify Schema Was Applied

```bash
# Open Supabase Dashboard > Database > Tables
# Should see these tables:
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

# Run validation script
# In Supabase Dashboard > SQL Editor > New Query
# Copy and run: supabase/schema/validate_schema.sql
```

**Action:**
- [ ] All 13 tables exist in Supabase
- [ ] Validation script runs without errors
- [ ] Schema is correct

### Step 2.5: Enable Row Level Security (RLS)

**Verify in Supabase:**

1. Go to Database > Tables
2. For each table, check "RLS Enabled" toggle
3. Verify all tables have RLS enabled (should be by default from migrations)

**Action:**
- [ ] RLS enabled on all 13 tables
- [ ] Policies visible in Supabase Dashboard
- [ ] No warnings about RLS

---

## ✅ Phase 3: Code Integration Verification (2 hours)

### Step 3.1: Verify Supabase Client Initialization

**Check: `lib/core/supabase_client.dart`**

Should properly initialize Supabase:

```dart
static Future<void> initialize() async {
  // Skip if not configured
  if (Env.supabaseUrl.isEmpty || Env.supabaseUrl.contains('your')) {
    debugPrint('⚠️ Supabase not configured');
    return;
  }

  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
    debug: Env.isDevelopment,
  );
  _client = Supabase.instance.client;
}
```

**Action:**
- [ ] Review supabase_client.dart
- [ ] Verify: Uses environment variables
- [ ] Verify: Graceful fallback if not configured
- [ ] Verify: Debug mode for development

### Step 3.2: Verify API Service Uses Real Supabase

**Check: `lib/logic/services/api_service.dart`**

Should use real Supabase (not mock):

```dart
class CalendarApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  static Future<Result<List<CalendarEvent>>> getEvents() async {
    // Uses real Supabase queries
    final response = await _client
        .from('events')
        .select()
        .eq('owner_id', userId);
    // ...
  }
}
```

**Action:**
- [ ] Review api_service.dart (first 100 lines)
- [ ] Verify: Uses real Supabase client
- [ ] Verify: Not using mock/dev data service
- [ ] Verify: Error handling in place

### Step 3.3: Verify No Mock Data Services

```bash
# Search for any mock/dev data services being used in providers
grep -r "DevDataService\|MockCalendarApi\|FakeApi" lib/logic/providers/

# Expected: NO MATCHES (or only in tests)
# If found in lib/: Need to remove and use real API
```

**Action:**
- [ ] Search confirms no mock services in production code
- [ ] API providers use real CalendarApi
- [ ] Contact/Event/Signal providers use real services

### Step 3.4: Verify Error Handling

Check that API methods handle:
- [ ] Authentication errors (user not logged in)
- [ ] Network errors (offline, slow connection)
- [ ] Database errors (RLS violations, constraint failures)
- [ ] Timeout errors

**Example:**
```dart
catch (e) on SocketException {
  return Failure('Connection failed');
} on PostgrestException {
  return Failure('Database error');
}
```

**Action:**
- [ ] Review error handling in api_service.dart
- [ ] Verify: Uses Result<T> pattern
- [ ] Verify: Specific error types handled
- [ ] Verify: User-friendly error messages

---

## ✅ Phase 4: Testing & Validation (2 hours)

### Step 4.1: Run Full Test Suite

```bash
flutter test

# Expected:
# ✅ 417+ tests passing
# ✅ 0 failures
# ✅ 0 skipped
```

**Action:**
- [ ] All tests pass
- [ ] No failures or skipped tests
- [ ] No new warnings

### Step 4.2: Run Analysis

```bash
flutter analyze

# Expected:
# ✅ No issues found
```

**Action:**
- [ ] Analysis passes
- [ ] No lint issues
- [ ] No errors

### Step 4.3: Manual Testing - Development Flow

On your development machine with `.env` configured:

```bash
flutter run
```

**Test Flow:**

1. **Splash Screen**
   - [ ] App loads
   - [ ] Supabase client initializes (check debug logs)
   - [ ] No crashes

2. **Authentication**
   - [ ] Sign up: Create new account
   - [ ] Verify: User appears in Supabase Dashboard > Database > profiles
   - [ ] Sign in: Log in with same account
   - [ ] Verify: currentUser is not null in logs
   - [ ] Sign out: Logout successful

3. **Calendar Operations**
   - [ ] Create calendar
   - [ ] Verify: Appears in Supabase > calendars table
   - [ ] Create event
   - [ ] Verify: Appears in Supabase > events table
   - [ ] Edit event
   - [ ] Verify: Changes sync to Supabase
   - [ ] Delete event
   - [ ] Verify: Deleted from Supabase

4. **Data Persistence**
   - [ ] Create event while online
   - [ ] Restart app
   - [ ] Verify: Event still visible (loaded from Supabase)
   - [ ] Turn off internet
   - [ ] Offline mode works
   - [ ] Turn internet back on
   - [ ] Data syncs correctly

5. **Error Cases**
   - [ ] Turn off internet, try to create event
   - [ ] Get appropriate error message
   - [ ] App doesn't crash
   - [ ] Turn internet back on, retry works

**Action:**
- [ ] Complete all test scenarios above
- [ ] No crashes
- [ ] Data syncs correctly to Supabase

### Step 4.4: Verify Authentication Security

```bash
# Test RLS Policies

# Create two test users in Supabase:
# User A: test-a@example.com
# User B: test-b@example.com

# Sign in as User A in app
# Create event "Private Event A"
# Note event ID from Supabase

# Sign out, Sign in as User B
# Try to view User A's event via direct API call
# Result: Should get permission denied (RLS working!)
```

**Action:**
- [ ] Create test users
- [ ] Verify User B cannot see User A's private events
- [ ] RLS policies are working correctly

---

## ✅ Phase 5: Documentation & Handoff (1 hour)

### Step 5.1: Create Internal Setup Guide

```bash
# Document development environment setup
cat > docs/DEV_SETUP.md << 'EOF'
# Development Setup

## Prerequisites
- Flutter SDK
- Supabase CLI: `brew install supabase/tap/supabase`

## Setup Steps

1. Create .env file with development credentials
2. Run: `flutter pub get`
3. Run: `flutter run`

## Credentials

- Supabase Dev Project: myorbit-dev
- Ask team lead for .env file

EOF
```

**Action:**
- [ ] Create dev setup documentation
- [ ] Share with team
- [ ] Test that new developer can follow it

### Step 5.2: Create Production Checklist

Will be completed in next phase (production setup)

**Action:**
- [ ] Acknowledge: Production setup happens separately
- [ ] This is development verification only

### Step 5.3: Document Any Issues Found

```bash
# Create ISSUES_FOUND.md
# Document:
# - Any bugs discovered during testing
# - Any RLS policy adjustments needed
# - Any API improvements needed
# - Any missing features
```

**Action:**
- [ ] Document all findings
- [ ] Create GitHub issues if applicable
- [ ] Prioritize fixes

---

## ✅ Final Approval

**Checklist Summary:**

- [ ] Phase 1: Security verified (no credentials leaked)
- [ ] Phase 2: Supabase dev project set up and schema applied
- [ ] Phase 3: Code verified to use real Supabase
- [ ] Phase 4: All tests passing, manual testing complete
- [ ] Phase 5: Documentation complete

**Approval:**

When all items above are complete, development environment is ready for production backend setup.

Next steps: `PRODUCTION_SUPABASE_SETUP.md`

---

## 🚨 If Any Issues Found

### Issue: Tests Failing
```bash
flutter test --verbose
# Review output, fix issues before proceeding
```

### Issue: Supabase Connection Failed
```bash
# Verify .env file has correct credentials
# Check Supabase status: https://status.supabase.com
# Restart app
```

### Issue: RLS Preventing Data Access
```bash
# This is expected and correct!
# RLS should prevent unauthorized access
# Check RLS policies are configured correctly
```

### Issue: Build Failures
```bash
flutter clean
flutter pub get
flutter run
```

---

## ⏱️ Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Security verification | 2 hours | Ready |
| 2 | Supabase dev setup | 3 hours | Ready |
| 3 | Code verification | 2 hours | Ready |
| 4 | Testing & validation | 2 hours | Ready |
| 5 | Documentation | 1 hour | Ready |
| **Total** | | **10 hours** | **Ready to Start** |

---

**Status: ✅ READY TO IMPLEMENT**

Next document: `PRODUCTION_SUPABASE_SETUP.md` (for production backend after dev is verified)
