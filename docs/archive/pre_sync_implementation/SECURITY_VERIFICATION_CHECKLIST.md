# 🔐 Security Verification Checklist for MyOrbit

**Before Launch: Ensure Your Users' Data is Protected**

---

## 🎯 Overview

This checklist verifies that:
- User data is private (only they can see it)
- Shared data is protected (only intended recipients can see)
- API keys are not exposed
- Authentication is secure
- Database access is controlled

**Time Required:** 1-2 hours  
**Importance:** CRITICAL - Do not skip

---

## 🔑 Section 1: API Key Security

### Check 1.1: `.env` File Not in Git

```bash
# Run this command
git check-ignore .env

# Expected output: ".env"
# If blank or error, run: echo ".env" >> .gitignore
```

✅ **Verification:** `.env` should be listed in `.gitignore`

### Check 1.2: No Secrets in Code

```bash
# Search for hardcoded credentials
grep -r "DEV_SUPABASE_URL\|PROD_SUPABASE_URL\|STAGING_SUPABASE_URL" lib/
grep -r "DEV_SUPABASE_ANON_KEY\|PROD_SUPABASE_ANON_KEY\|STAGING_SUPABASE_ANON_KEY" lib/

# Expected: No matches (credentials only in .env)
```

✅ **Verification:** No API keys should appear in Dart code

### Check 1.3: Environment Variable Reading

Open `lib/core/env.dart` and verify:

```dart
// Should look like this:
class Env {
  static String get supabaseUrl {
    switch (flutterEnv) {
      case 'prod':
        return _value('PROD_SUPABASE_URL');
      case 'staging':
        return _value('STAGING_SUPABASE_URL');
      default:
        return _value('DEV_SUPABASE_URL');
    }
  }

  static String get supabaseAnonKey {
    switch (flutterEnv) {
      case 'prod':
        return _value('PROD_SUPABASE_ANON_KEY');
      case 'staging':
        return _value('STAGING_SUPABASE_ANON_KEY');
      default:
        return _value('DEV_SUPABASE_ANON_KEY');
    }
  }
}
```

✅ **Verification:** Credentials loaded from environment only

---

## 👤 Section 2: User Data Privacy (Row Level Security)

### What is RLS (Row Level Security)?

Think of it like a security guard at a nightclub:
- **Without RLS:** Anyone can read/write anyone's data (security guard asleep)
- **With RLS:** Only the owner can read/write their data (security guard checking ID)

MyOrbit has RLS configured. We need to verify it works.

### Check 2.1: Verify RLS is Enabled

1. **Open Supabase Dashboard**
   - https://app.supabase.com
   - Select your production project

2. **Go to SQL Editor > New Query**

3. **Run this SQL:**
   ```sql
   -- Check if RLS is enabled on each table
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY tablename;
   ```

4. **Expected Results:** All tables should show `rowsecurity = true`

✅ **Verification:** All 11 tables have RLS enabled

### Check 2.2: Test User Isolation

1. **Create two test users in Supabase**
   - User A: test-a@example.com
   - User B: test-b@example.com

2. **Sign in as User A**
   - Create event "My Private Event"
   - Note the event ID

3. **Sign in as User B**
   - Try to view/edit User A's events
   - **Expected:** Cannot see or modify

✅ **Verification:** Users can only see their own data

### Check 2.3: Test Shared Data (Contacts)

1. **Sign in as User A**
   - Add User B as contact (visibility level: "Semi-Visible")

2. **Sign in as User B**
   - Can see User A in contacts: ✅
   - Can see User A's semi-visible events: ✅
   - Cannot see User A's private events: ✅

✅ **Verification:** Shared data respects privacy levels

---

## 🔐 Section 3: Authentication Security

### Check 3.1: Password Requirements

1. **Open Supabase Dashboard > Authentication > Settings**
2. **Verify Password Requirements:**
   - [ ] Minimum length: 6+ characters
   - [ ] Complexity: Optional (up to you)

✅ **Verification:** Password policy is reasonable

### Check 3.2: Email Verification

1. **Open Supabase > Authentication > Email Templates**
2. **Verify:**
   - [ ] Confirmation email template exists
   - [ ] Email template is customized (not generic)
   - [ ] Confirmation link works

✅ **Verification:** Email verification is enabled and working

### Check 3.3: Password Reset Flow

1. **As a test user:**
   - Request password reset
   - Check email for reset link
   - Verify reset email is legitimate
   - Complete password reset
   - Sign in with new password

✅ **Verification:** Password reset works securely

### Check 3.4: No SQL Injection Risk

Your app uses Supabase ORM (Dart SDK), which is safe from SQL injection.

✅ **Verification:** No SQL injection risk

---

## 📊 Section 4: Database Access Patterns

### Check 4.1: Verify API Functions Use RLS

1. **Go to Supabase > SQL Editor > New Query**

2. **Run this command:**
   ```sql
   -- List all database functions
   SELECT 
     routine_schema,
     routine_name,
     routine_definition
   FROM information_schema.routines
   WHERE routine_schema = 'public';
   ```

3. **For each function, verify it:**
   - Uses `current_user_id()` or `auth.uid()`
   - Includes user ID checks in WHERE clause
   - Doesn't bypass RLS

✅ **Verification:** All functions respect RLS

### Check 4.2: Critical Tables Review

Verify these tables have proper RLS:

| Table | Expected RLS Policy |
|-------|-------------------|
| `profiles` | Users can only access own profile |
| `calendars` | Users can only access own calendars |
| `events` | Users can only access own events (unless shared) |
| `contacts` | Users can only see contacts they created or who added them |
| `availability_signals` | Users can only see signals shared with them |
| `notifications` | Users can only see own notifications |

✅ **Verification:** All critical tables have appropriate RLS

---

## 🔒 Section 5: Sensitive Data Protection

### Check 5.1: What Data is Sensitive?

For MyOrbit, these are sensitive:
- ❌ User email addresses (should be private)
- ❌ User phone numbers (if stored)
- ❌ Event details of private events
- ❌ Availability signals not intended to be shared
- ❌ Personal notes in events

✅ Keep encrypted or RLS protected

### Check 5.2: Verify Data is Not Over-Shared

1. **Get one user's data via API:**
   ```bash
   # This will show what data that user can access
   ```

2. **Review:**
   - [ ] Only sees own data
   - [ ] Only sees data shared with them
   - [ ] Cannot see other users' email addresses
   - [ ] Cannot see other users' private events

✅ **Verification:** Data sharing is minimal and intentional

### Check 5.3: Check Audit Logs (Optional)

If your team has audit requirements:

1. **Supabase > Settings > Audit Logs**
2. Verify you can see:
   - Authentication events
   - Database access logs
   - RLS policy enforcement

✅ **Verification:** Audit logs are available for compliance

---

## 🚨 Section 6: Common Vulnerabilities

### Vulnerability 6.1: Exposed API Key

❌ **Bad:** 
```dart
const String supabaseUrl = "https://abc.supabase.co"; // In code!
```

✅ **Good:**
```dart
// In .env file
DEV_SUPABASE_URL=https://abc.supabase.co

// In code
final url = Env.supabaseUrl; // Resolves based on FLUTTER_ENV
```

✅ **Verification:** Do `grep -r "supabase.co" lib/` - should return nothing

### Vulnerability 6.2: RLS Bypass

❌ **Risk:** Using Admin Key in app (should only use Anon Key)

✅ **Verification:** In `.env`, verify you're using:
```env
DEV_SUPABASE_ANON_KEY=eyJ...  # This is correct (public key)
# NOT: PROD_SUPABASE_SERVICE_ROLE_KEY=... (admin key - never in app!)
```

### Vulnerability 6.3: Unencrypted Sensitive Data

❌ **Risk:** Storing passwords, full SSNs, credit cards unencrypted

✅ **Check:** MyOrbit doesn't store these, so you're safe ✅

### Vulnerability 6.4: CORS/CSRF Issues

❌ **Risk:** Request from wrong origin accepted

✅ **Check:** Supabase handles this automatically ✅

---

## 🧪 Section 7: Penetration Testing Checklist

**For advanced users / security teams:**

- [ ] Can an attacker modify someone else's event?
  - [ ] Test: Sign in, modify event ID in request
  - [ ] Expected: Permission denied

- [ ] Can an attacker read someone else's data?
  - [ ] Test: Query with another user's ID
  - [ ] Expected: No results

- [ ] Can an attacker delete someone else's data?
  - [ ] Test: Delete request for another user's event
  - [ ] Expected: Permission denied

- [ ] Can an attacker bypass authentication?
  - [ ] Test: Make API request without token
  - [ ] Expected: "Unauthorized" error

✅ **Verification:** All should fail as expected

---

## 📋 Pre-Launch Security Checklist

**Before releasing to app store, verify:**

- [ ] `.env` file with secrets not committed
- [ ] All API keys use environment variables
- [ ] RLS enabled on all 11 tables
- [ ] Test user cannot access another user's data
- [ ] RLS tested for shared data (contacts, signals)
- [ ] Password reset flow works securely
- [ ] Email verification enabled
- [ ] No hardcoded credentials in code
- [ ] API functions use RLS correctly
- [ ] Audit logs available (if needed)
- [ ] Sentry configured for error monitoring
- [ ] Privacy policy written and linked

---

## 🚨 If You Find a Security Issue

1. **DO NOT commit credentials to Git**
   - If you did: Rotate immediately
   - If in Git history: Contact Supabase support

2. **If RLS is disabled:**
   - Re-enable immediately
   - Test all tables
   - Verify data wasn't accessed

3. **If API key leaked:**
   - Rotate the key immediately
   - Create new key in Supabase
   - Update all apps with new key

4. **If critical vulnerability found:**
   - Do not release
   - Fix before launching
   - Re-test thoroughly

---

## 📞 Security Questions?

If you're uncertain about anything:

1. **Ask your development team** - they can verify
2. **Supabase security docs:** https://supabase.com/docs/guides/security
3. **OWASP guidelines:** https://owasp.org/www-project-top-ten/

---

**IMPORTANT: Your users are trusting you with their calendar data (which can be personal/private). Take this seriously.**

**✅ Once you've verified all these items, your app is secure for production!**
