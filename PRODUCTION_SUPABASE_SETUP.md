# 🚀 Production Supabase Setup

**For: Development Team**  
**Status:** After PRE_BACKEND_SETUP_CHECKLIST.md is complete  
**Estimated Time:** 4-6 hours total  

---

## 📋 Overview

This guide sets up your production Supabase project, separate from development, with proper security and backups.

**Timeline:**
1. **Phase 1: Production Project Creation** (30 min)
2. **Phase 2: Schema & Security** (1.5 hours)
3. **Phase 3: Testing** (1 hour)
4. **Phase 4: Environment Configuration** (30 min)
5. **Phase 5: Backup & Monitoring** (30 min)
6. **Phase 6: Final Verification** (1 hour)

---

## ✅ Phase 1: Production Project Creation (30 minutes)

### Step 1.1: Create Production Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Configure:
   - **Name:** `myorbit-production`
   - **Database Password:** STRONG password (30+ chars, mix case/numbers/symbols)
   - **Region:** Same as your development project (or closer to your users)
   - **Pricing Plan:** Pro ($25/month minimum)
4. Wait 2-3 minutes for initialization

**Action:**
- [ ] Production project created
- [ ] Project URL copied securely
- [ ] Database password saved to password manager (NOT in code!)

### Step 1.2: Get Production Credentials

1. In Supabase Dashboard, go to Settings > API
2. Copy:
   - **Project URL:** https://xxxxx.supabase.co
   - **Anon Key:** eyJhbGciOi... (public key)
   - **Service Role Key:** (secret - save securely but separately)
3. Save to secure location:
   - Password manager
   - Secure note
   - NOT in Git repo

**Action:**
- [ ] Production credentials retrieved
- [ ] Stored securely (password manager)
- [ ] Team lead has copies

### Step 1.3: Create Production `.env` File

```bash
# IMPORTANT: Do NOT commit this file!
# Store in secure location, not in Git

cat > .env.production << 'EOF'
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key-here
SENTRY_DSN=your-sentry-production-dsn
SENTRY_ENV=production
SENTRY_RELEASE=1.0.0+1
EOF

# Verify file is NOT committed
git check-ignore .env.production
# Should output: .env.production (if in .gitignore)
```

**Action:**
- [ ] Production .env created
- [ ] Stored securely (not in Git)
- [ ] Different from development .env

---

## ✅ Phase 2: Schema & Security (1.5 hours)

### Step 2.1: Apply Schema to Production

```bash
# Option A: Using Supabase CLI
supabase link --project-ref PRODUCTION_PROJECT_REF
supabase db push  # Push from production config

# Option B: Manual via Dashboard
# (Same as development - apply each migration file)
```

**Action:**
- [ ] All 5 migration files applied to production
- [ ] No SQL errors
- [ ] Schema matches development exactly

### Step 2.2: Verify Production Schema

```bash
# Run in Supabase Dashboard > SQL Editor
# Copy contents of: supabase/schema/validate_schema.sql
# Click Run

# Should output: All validations passed ✓
```

**Action:**
- [ ] Validation script runs successfully
- [ ] All 13 tables exist
- [ ] All indexes in place
- [ ] Functions created

### Step 2.3: Enable & Verify RLS Policies

```bash
# In Supabase Dashboard > Database > Tables
# For each table, verify:
# - RLS Enabled toggle is ON
# - Policies are present in "Security Policies" tab

# Tables and their policies:
# - profiles: Users can only access own profile
# - contacts: Users can only access contacts they own/are connected to
# - calendars: Users can only access own calendars
# - events: Users can only access own events + shared
# - availability_signals: Users can only access shared signals
# - notifications: Users can only access own notifications
```

**Action:**
- [ ] RLS enabled on all tables
- [ ] Policies reviewed and correct
- [ ] No policies disabled

### Step 2.4: Configure Authentication Settings

1. Go to Supabase Dashboard > Authentication > Providers
2. Verify:
   - [ ] Email provider enabled
   - [ ] Email confirmation enabled
   - [ ] JWT expiry: 3600 seconds (1 hour) - GOOD
   - [ ] Refresh token rotation enabled
3. Configure email provider:
   - [ ] Sender email: Use Supabase default or custom SMTP

**Action:**
- [ ] Authentication properly configured
- [ ] Email verification enabled
- [ ] Security settings optimized

### Step 2.5: Set Up Database Backups

1. Go to Supabase Dashboard > Settings > Backups
2. Verify:
   - [ ] Backups enabled (should be automatic)
   - [ ] Daily backup frequency
   - [ ] Backup retention: 30 days minimum

**Action:**
- [ ] Automatic daily backups enabled
- [ ] Retention period: 30+ days

---

## ✅ Phase 3: Testing (1 hour)

### Step 3.1: Test Authentication

Using production credentials:

```bash
# Update .env temporarily with production credentials
# (or create .env.production for testing)

flutter run --dart-define=SUPABASE_URL=production_url \
             --dart-define=SUPABASE_ANON_KEY=production_key
```

**Test Steps:**
1. Sign up with new email: test-prod-1@example.com
2. Verify in Supabase > Database > profiles
3. Sign in successfully
4. Create event
5. Verify in Supabase > events table
6. Sign out

**Action:**
- [ ] Sign up works
- [ ] Data persists to production
- [ ] Sign in works
- [ ] Sign out works

### Step 3.2: Test RLS Policies

```bash
# Create two test users in production:
# User A: prod-test-a@example.com
# User B: prod-test-b@example.com

# Test 1: User isolation
# - Sign in as User A
# - Create private event
# - Sign in as User B
# - Verify: Cannot see User A's events

# Test 2: Shared data access
# - Sign in as User A
# - Create contact for User B
# - Share calendar with User B
# - Sign in as User B
# - Verify: Can see User A's shared calendar
```

**Action:**
- [ ] User isolation working (RLS enforced)
- [ ] Shared data accessible to intended recipients
- [ ] RLS policies functioning correctly

### Step 3.3: Test Error Handling

```bash
# Test 1: Offline behavior
# - Turn off internet
# - Try to create event
# - Verify: Appropriate error message
# - Turn internet back on
# - Retry successful

# Test 2: Database constraint violation
# - Create event with invalid data (if possible)
# - Verify: Proper error handling
# - User sees friendly error message
```

**Action:**
- [ ] Offline mode handled gracefully
- [ ] Error messages user-friendly
- [ ] No app crashes

---

## ✅ Phase 4: Environment Configuration (30 minutes)

### Step 4.1: Store Production Credentials Securely

**DO NOT commit to Git. Use ONE of these methods:**

#### Method 1: Secure Password Manager
```
Store in 1Password, LastPass, etc:
- Supabase URL
- Anon Key
- Database password
- Service Role Key
```

#### Method 2: Environment Variables (CI/CD)
```
For deployment pipeline:
SUPABASE_PRODUCTION_URL
SUPABASE_PRODUCTION_ANON_KEY
SENTRY_PRODUCTION_DSN
```

#### Method 3: Secret Management Service
```
AWS Secrets Manager, GitHub Secrets, etc.
```

**Action:**
- [ ] Choose storage method
- [ ] Credentials stored securely
- [ ] NOT in code/Git
- [ ] Team has access

### Step 4.2: Configure Build Flavors (Optional)

For easier development/production switching:

```dart
// In pubspec.yaml or build.yaml
# Define development and production flavors
```

**Action:**
- [ ] (Optional) Build flavors configured
- [ ] Or manual .env switching documented

### Step 4.3: Set Up Sentry for Production Errors

1. Go to https://sentry.io
2. Create or select production project
3. Copy Production DSN
4. Add to production .env:
   ```
   SENTRY_ENV=production
   SENTRY_DSN=your-production-dsn
   ```

**Action:**
- [ ] Sentry configured for production
- [ ] Error alerts enabled
- [ ] Team notified of alerts

---

## ✅ Phase 5: Backup & Monitoring (30 minutes)

### Step 5.1: Test Backup Restoration

1. Go to Supabase Dashboard > Settings > Backups
2. Review available backups
3. (Recommended) Download a backup to test restoration

**Action:**
- [ ] Backups visible in Supabase
- [ ] Backup restoration process understood
- [ ] Recovery plan documented

### Step 5.2: Set Up Monitoring

**In Supabase Dashboard:**

1. Go to Reports > Database Health
2. Set alerts for:
   - [ ] High query count
   - [ ] High connection count
   - [ ] Database errors

**Action:**
- [ ] Database monitoring configured
- [ ] Alert thresholds set
- [ ] Email alerts enabled

### Step 5.3: Document Incident Response

Create `INCIDENT_RESPONSE.md`:

```markdown
# Incident Response Plan

## If database is down:
1. Check Supabase status: https://status.supabase.com
2. Check error logs in Sentry
3. If our issue: Contact Supabase support
4. If data corruption: Restore from backup

## If app crashes on production:
1. Check Sentry dashboard
2. Review stack trace
3. Build hotfix
4. Submit to app stores
5. Users auto-update (after 24-48 hours)

## If data is lost:
1. Stop app
2. Restore from daily backup
3. Notify users of incident
4. Identify root cause
```

**Action:**
- [ ] Incident response plan documented
- [ ] Team knows escalation path
- [ ] Contact info available

---

## ✅ Phase 6: Final Verification (1 hour)

### Step 6.1: Security Audit Checklist

```bash
# Final security verification

# ✓ No credentials in Git
git log --all | grep -i 'supabase_key\|api_key'

# ✓ .env files in .gitignore
grep '.env' .gitignore

# ✓ Production URL is correct
grep 'SUPABASE_URL=' .env.production

# ✓ Anon key (not service role key)
grep 'SUPABASE_ANON_KEY=' .env.production
```

**Action:**
- [ ] All security checks pass
- [ ] No credentials exposed
- [ ] Environment properly configured

### Step 6.2: Production Readiness Sign-Off

**Checklist:**

- [ ] Phase 1: Production project created
- [ ] Phase 2: Schema applied & RLS verified
- [ ] Phase 3: Authentication & RLS tested
- [ ] Phase 4: Credentials stored securely
- [ ] Phase 5: Backups & monitoring configured
- [ ] Phase 6: Security audit passed

### Step 6.3: Document Production Setup

Create `PRODUCTION_DEPLOYMENT_NOTES.md`:

```markdown
# Production Deployment Notes

## Production Project Details
- Supabase Project: myorbit-production
- Region: [your region]
- Plan: Pro ($25/month)
- Created: [date]

## Credentials Location
- Supabase URL: [stored in password manager name]
- Anon Key: [stored in password manager name]
- Database password: [stored in password manager name]

## Key Dates
- First backup: [date]
- Last verified: [date]
- Next review: [date]

## Contact Info
- Supabase Support: support@supabase.com
- Team Lead: [name]
- On-call: [name]
```

**Action:**
- [ ] Deployment notes documented
- [ ] Shared with team
- [ ] Stored with credentials

---

## ✅ Ready for Launch!

**When all phases complete:**

1. Update app build with production .env
2. Build release versions (APK/IPA)
3. Submit to app stores
4. See `PRODUCTION_LAUNCH_GUIDE.md` for next steps

---

## 🚨 Troubleshooting

### Issue: Credentials Not Working
```
- Verify copied correctly from Supabase Dashboard
- Check for extra spaces or line breaks
- Verify .env file format is correct
- Try regenerating keys in Supabase
```

### Issue: RLS Preventing All Access
```
- This is correct! RLS should be restrictive
- Verify policies are configured correctly
- Check policy SQL in Supabase Dashboard
- Test with simple query first
```

### Issue: Tests Fail with Production Credentials
```
- This is expected - production vs development data is different
- Create test users in production database
- Update test fixtures for production
- Run integration tests against production
```

### Issue: Backup Not Available
```
- Backups start after 24 hours
- Check Supabase status page
- Contact Supabase support if issue persists
```

---

## 📊 Status

**Prerequisites:**
- ✅ PRE_BACKEND_SETUP_CHECKLIST.md completed

**Timeline:**
- Total: 4-6 hours
- Can be completed in 1-2 days

**Next Steps:**
1. Complete this guide
2. Update app with production .env
3. Follow PRODUCTION_LAUNCH_GUIDE.md
4. Submit to app stores

---

**Status: ✅ READY TO IMPLEMENT**
