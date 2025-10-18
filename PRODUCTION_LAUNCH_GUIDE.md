# 🚀 MyOrbit Production Launch Guide

**For Non-Developers: A Step-by-Step Guide to Safely Deploy Your App**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Pre-Launch Checklist](#pre-launch-checklist)
3. [Production Environment Setup](#production-environment-setup)
4. [Testing Procedure](#testing-procedure)
5. [Deployment Steps](#deployment-steps)
6. [Monitoring & Support](#monitoring--support)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide walks you through launching MyOrbit to real users safely. It assumes you're using **Supabase for your backend** (no DigitalOcean Kubernetes needed yet).

**Timeline:** 1-2 weeks from start to finish  
**Effort:** Mostly app store submission process  
**Technical Complexity:** Low to Medium

---

## ✅ Pre-Launch Checklist

### **1. Code & Quality Readiness** (1-2 days)

- [ ] **All tests passing**
  ```bash
  flutter test
  # Expected: 417+ tests passing, 0 failures
  ```

- [ ] **No analyzer errors**
  ```bash
  flutter analyze
  # Expected: "No issues found"
  ```

- [ ] **App builds successfully** (both debug & release)
  ```bash
  flutter build apk      # Android
  flutter build ios      # iOS (macOS only)
  flutter build appbundle  # For Play Store
  flutter build ipa      # For App Store (macOS only)
  ```

- [ ] **Versioning updated**
  - [ ] Update `pubspec.yaml`: `version: 1.0.0+1`
  - [ ] Update iOS: `ios/Runner.xcodeproj` build version
  - [ ] Update Android: `android/app/build.gradle` versionCode

- [ ] **Privacy policy created**
  - [ ] Your privacy policy URL (required by app stores)
  - [ ] Must explain: data collection, storage, user rights

- [ ] **Terms of Service created** (optional but recommended)

### **2. Supabase Production Project** (1 day)

- [ ] **Create separate production Supabase project**
  - **Why?** Keep development and production data separate
  - Login to supabase.com
  - Click "New Project"
  - Name: `myorbit-production` (or similar)
  - **SAVE the database password** securely

- [ ] **Apply database migrations to production**
  ```bash
  # After creating production project, get new credentials
  # Update credentials in secure location (don't commit to Git)
  
  # Copy migration files to new project:
  # Login to Supabase Dashboard > SQL Editor > New Query
  # Run each migration file in order (001 → 005)
  ```

- [ ] **Verify schema was applied**
  - [ ] 11 tables created
  - [ ] All indexes in place
  - [ ] RLS policies enabled

- [ ] **Test authentication in production**
  - [ ] Sign up with test user
  - [ ] Verify email confirmation works
  - [ ] Sign in with test credentials

### **3. Environment Configuration** (1 hour)

- [ ] **Create production `.env` file**
  - **Location:** Keep separate from Git
  - **Never commit** to GitHub
  - **Example:**
    ```env
    SUPABASE_URL=https://your-production-project.supabase.co
    SUPABASE_ANON_KEY=your-production-anon-key
    SENTRY_DSN=your-sentry-dsn
    SENTRY_ENV=production
    SENTRY_RELEASE=1.0.0
    ```

- [ ] **Verify `.env` is in `.gitignore`**
  ```bash
  cat .gitignore | grep .env
  # Should show: .env, *.env
  ```

- [ ] **Disable Sentry uploads for development** (improves build speed)
  ```yaml
  # In pubspec.yaml
  sentry:
    upload_debug_symbols: false  # Disable for dev builds
    upload_source_maps: false    # Disable for dev builds
  ```

### **4. Security Review** (2-3 hours)

- [ ] **RLS Policies verified** (prevents unauthorized data access)
  - [ ] Each user can only see their own data
  - [ ] Shared data (calendars, signals) accessible only to intended recipients
  - [ ] Events shared with specific contacts visible only to those contacts

- [ ] **API Keys secured**
  - [ ] Production API key not in code
  - [ ] Stored in `.env` only
  - [ ] Different from development key

- [ ] **Authentication flow tested**
  - [ ] New user can sign up
  - [ ] User can reset password
  - [ ] User can log out securely

---

## 🔧 Production Environment Setup

### **Step 1: Supabase Production Project**

1. **Login to Supabase**: https://app.supabase.com
2. **Create New Project**:
   - Name: `myorbit-production`
   - Region: Choose closest to your users
   - Pricing: Pro ($25/month) or Free for testing
   - **Save the password** - you won't see it again!

3. **Get Production Credentials**:
   - Go to **Settings > API**
   - Copy **Project URL**
   - Copy **Anon Key** (public key)
   - Save these securely (password manager recommended)

4. **Apply Database Schema**:
   - Go to **SQL Editor**
   - Create new query
   - Copy and run each migration file in order:
     1. `001_profiles_contacts.sql`
     2. `002_calendars_events.sql`
     3. `003_availability_signals.sql`
     4. `004_functions.sql`
     5. `005_realtime.sql`
   - Wait for each to complete before running next

5. **Verify Schema**:
   - Run `validate_schema.sql` in SQL Editor
   - Should complete without errors
   - Check **Database > Tables** - should show 11 tables

### **Step 2: Update App Configuration**

1. **Create production build config**:
   ```bash
   # Create a secure location for production .env
   # DO NOT COMMIT THIS FILE
   ```

2. **Update pubspec.yaml** (version only):
   ```yaml
   version: 1.0.0+1  # Increment for each release
   ```

3. **Update Sentry configuration**:
   ```yaml
   sentry:
     upload_debug_symbols: false  # Disable for dev builds
     upload_source_maps: false
     project: flutter
     org: spoonsavercom
   ```

### **Step 3: Build Release Versions**

**For Android (Google Play Store):**
```bash
flutter build appbundle
# Creates: build/app/outputs/bundle/release/app-release.aab
```

**For iOS (App Store):**
```bash
flutter build ipa
# Creates: build/ios/iphoneos/Runner.app
# (Note: Requires macOS and Apple developer account)
```

---

## 🧪 Testing Procedure

### **Phase 1: Local Testing** (30 minutes)

```bash
# 1. Run all tests
flutter test
# Expected: All 417+ tests passing

# 2. Run analyzer
flutter analyze
# Expected: No issues found

# 3. Build release APK (Android)
flutter build apk --release

# 4. Build release app bundle (Google Play)
flutter build appbundle --release
```

### **Phase 2: Manual Device Testing** (1-2 hours)

Test on real phone/tablet:

1. **Authentication Flow**
   - [ ] User can sign up
   - [ ] Verification email received
   - [ ] User can log in
   - [ ] User can reset password
   - [ ] User can log out

2. **Core Features**
   - [ ] User can create calendar
   - [ ] User can create event
   - [ ] Event appears on calendar
   - [ ] User can edit event
   - [ ] User can delete event
   - [ ] User can view calendar in different formats (month/week/day)

3. **Sharing Features**
   - [ ] User can add contact
   - [ ] User can share calendar with contact
   - [ ] Contact sees shared calendar
   - [ ] User can share availability signal
   - [ ] Contact receives signal notification

4. **Performance**
   - [ ] App loads quickly
   - [ ] Calendar scrolls smoothly
   - [ ] No crashes or errors
   - [ ] Data saves correctly

5. **Offline Mode**
   - [ ] Turn off internet
   - [ ] App still shows cached data
   - [ ] Turn internet back on
   - [ ] Data syncs correctly

### **Phase 3: Production Simulation** (1 hour)

1. **Create production build with production credentials**
   - Build app with production Supabase URL
   - Build app with production API key

2. **Install on test device**
   - Test full user flow
   - Test data persistence
   - Monitor performance

3. **Check logs in Supabase**
   - Go to **Logs** in Supabase Dashboard
   - Verify no errors
   - Check query performance

---

## 🚀 Deployment Steps

### **For Android (Google Play Store)**

1. **Create Google Play Developer Account** (one-time setup)
   - Go to https://play.google.com/console
   - Pay $25 registration fee
   - Complete required forms

2. **Create App Listing**
   - Click "Create App"
   - Language: English
   - App Name: MyOrbit Calendar
   - App Type: Free
   - Category: Productivity/Calendars
   - Content rating: Complete questionnaire

3. **Upload APK/AAB**
   - Go to **Release > Production**
   - Click "Create New Release"
   - Upload `app-release.aab` file
   - Fill in release notes

4. **Complete Store Listing**
   - [ ] Short description (80 chars)
   - [ ] Full description (4000 chars)
   - [ ] Screenshots (4-8 images)
   - [ ] Feature graphic (1024x500px)
   - [ ] Privacy policy URL
   - [ ] Contact email

5. **Submit for Review**
   - Click "Review and publish"
   - Google reviews: 2-4 hours typically
   - Once approved, live in Google Play Store

### **For iOS (App Store)**

1. **Create Apple Developer Account** (one-time setup)
   - Go to https://developer.apple.com
   - Pay $99/year
   - Complete required setup

2. **Create App in App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps"
   - Click "+"
   - Create new iOS app
   - Name: MyOrbit Calendar
   - Bundle ID: com.example.myorbit (unique)

3. **Configure App**
   - [ ] Privacy policy URL
   - [ ] Category: Productivity
   - [ ] Ratings: Answer IARC questionnaire
   - [ ] Screenshot (up to 5 sets for different devices)

4. **Upload Build**
   - Install Xcode (Apple development tool)
   - Build: `flutter build ipa`
   - Upload via Xcode Organizer or Transporter app

5. **Submit for Review**
   - Complete app information
   - Click "Submit for Review"
   - Apple reviews: 24-48 hours typically
   - Once approved, live in App Store

### **Rollout Strategy**

**Recommended Approach:**

```
Week 1: Closed Beta (Internal Testing)
├─ Share with small team (5-10 people)
├─ Gather feedback
├─ Fix critical bugs

Week 2: Open Beta (TestFlight/Google Play Beta)
├─ Expand to 100-500 testers
├─ Run for 1-2 weeks
├─ Monitor for crashes

Week 3: Soft Launch (Selected Markets)
├─ Release to 1-2 countries
├─ Monitor for 2-3 days
├─ Watch error rates closely

Week 4: Full Release (All Regions)
├─ Release globally
├─ Monitor closely for first week
├─ Be ready to push hot fixes if needed
```

---

## 📊 Monitoring & Support

### **Daily Monitoring (First Month)**

1. **Check Sentry for Errors**
   - Go to https://sentry.io
   - Review new errors
   - Fix critical issues immediately

2. **Monitor Supabase**
   - Check **Database > Logs** for errors
   - Monitor query performance
   - Check authentication logs

3. **Watch for Crashes**
   - Firebase Console (if using Firebase)
   - Sentry dashboard
   - App Store/Google Play analytics

### **Weekly Review (First Month)**

- [ ] Review user feedback
- [ ] Check app ratings/reviews
- [ ] Monitor database size
- [ ] Check API usage
- [ ] Review error trends

### **Monthly Review (Ongoing)**

- [ ] Supabase usage and costs
- [ ] Sentry error trends
- [ ] User growth metrics
- [ ] Feature requests
- [ ] Performance metrics

### **Setup Alert Notifications**

1. **Sentry Alerts** (Email on critical errors)
   - Go to Settings > Alerts
   - Create alert for error threshold
   - Notify on new critical errors

2. **Supabase Alerts** (Monitor database)
   - Enable database connection monitoring
   - Set up email alerts for high query times

---

## 🆘 Troubleshooting

### **Common Issues & Solutions**

#### **"Supabase Connection Failed"**
**Symptom:** App can't connect to database  
**Cause:** Wrong credentials or Supabase down  
**Solution:**
- [ ] Verify credentials in `.env`
- [ ] Check Supabase status: https://status.supabase.com
- [ ] Restart app
- [ ] Check internet connection

#### **"Authentication Failed"**
**Symptom:** Users can't sign up or log in  
**Cause:** Email service issue or RLS policies  
**Solution:**
- [ ] Check Supabase Auth settings
- [ ] Verify RLS policies allow auth
- [ ] Check email provider (Supabase default or custom?)

#### **"Events Not Syncing"**
**Symptom:** Events don't appear on all devices  
**Cause:** Real-time sync not working  
**Solution:**
- [ ] Verify real-time is enabled in Supabase
- [ ] Check RLS policies for events table
- [ ] Monitor Supabase logs

#### **"Database Full/Quota Exceeded"**
**Symptom:** App stops working after few users  
**Cause:** Hit storage/connection limit  
**Solution:**
- [ ] Upgrade Supabase plan
- [ ] Review data storage (delete old data if needed)
- [ ] Monitor usage patterns

#### **"High App Store Rejection Rate"**
**Symptom:** App rejected from App Store  
**Cause:** Privacy/functionality issues  
**Solution:**
- [ ] Ensure privacy policy is complete
- [ ] Verify all permissions are documented
- [ ] Test on multiple devices
- [ ] Review app store guidelines

---

## 📈 Success Metrics

After launching, track these:

- ✅ **App Store Rating:** Target 4.0+ stars
- ✅ **Crash Rate:** Keep below 0.1%
- ✅ **User Retention:** 25%+ DAU/MAU ratio
- ✅ **Performance:** App load < 2 seconds
- ✅ **Error Rate:** Sentry errors < 100/day

---

## 🎯 Quick Reference: Command Cheat Sheet

```bash
# Testing
flutter test                           # Run all tests
flutter analyze                        # Check for lint issues
flutter test test/widgets/accessibility/  # Run accessibility tests

# Building
flutter build apk --release            # Android release APK
flutter build appbundle --release      # Android for Play Store
flutter build ios --release            # iOS release (macOS only)
flutter build ipa                      # iOS app package

# Database
# (In Supabase Dashboard > SQL Editor)
./supabase/schema/apply_migrations.sh  # Apply all migrations
# Run validate_schema.sql to verify

# Cleanup
flutter clean                          # Clean build cache
flutter pub get                        # Refresh dependencies
```

---

## 📞 Getting Help

If you get stuck:

1. **Check the docs:**
   - [Supabase Docs](https://supabase.com/docs)
   - [Flutter Docs](https://flutter.dev/docs)
   - [App Store Connect Help](https://help.apple.com/app-store-connect)
   - [Google Play Console Help](https://support.google.com/googleplay/android-developer)

2. **Monitor Logs:**
   - Supabase: Dashboard > Logs
   - Flutter: `flutter logs`
   - Sentry: sentry.io dashboard

3. **Ask Your Development Team:**
   - Come back to this guide if issues arise

---

## ✅ Final Launch Checklist

Before clicking "Submit" on app stores:

- [ ] All tests passing
- [ ] No analyzer errors
- [ ] Production Supabase project created and tested
- [ ] Schema applied to production database
- [ ] Privacy policy URL added
- [ ] Screenshots and descriptions complete
- [ ] Version number updated
- [ ] Credentials are production (not development)
- [ ] Sentry configured for error tracking
- [ ] Team members notified of launch

---

**You're ready to launch! Good luck, and congratulations on building MyOrbit! 🎉**
