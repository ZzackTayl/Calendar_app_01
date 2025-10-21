# Authentication Quick Reference Card

**Print this or bookmark it** - Essential info at a glance

---

## The 3-Service Setup

| Service | Purpose | Free Tier | When to Upgrade |
|---------|---------|-----------|-----------------|
| **Supabase** | User accounts & auth | YES (up to 2GB storage) | 5,000+ users |
| **Google OAuth** | "Sign in with Google" + Calendar access | YES (unlimited) | 1M+ monthly requests |
| **Crash/Error monitoring (optional)** | Alerts you to production issues | FREE tiers available (e.g., Crashlytics) | When you need advanced reporting |

---

## One-Page Setup Checklist

### Phase 1: Create Accounts (15 min)

- [ ] Sign up at https://supabase.com (use GitHub)
- [ ] Create `myorbit-dev` project (save password!)
- [ ] Create `myorbit-staging` project  
- [ ] Create `myorbit-production` project
- [ ] Sign up at https://console.cloud.google.com
- [ ] Enable Google Calendar API
- [ ] Create OAuth credentials (iOS + Android)
- [ ] (Optional) Choose an error monitoring tool (e.g., Crashlytics) and create an account

### Phase 2: Get Credentials (30 min)

For **each project**, copy these from Supabase:
- Project URL (https://xxx.supabase.co)
- Anon Key (long string starting with eyJ...)

For **each environment**, get from Google Cloud:
- iOS Client ID
- Android Client ID

### Phase 3: Input Credentials (15 min)

Edit `.env` file in project root:

```env
# Development
FLUTTER_ENV=dev
DEV_SUPABASE_URL=https://xxx.supabase.co
DEV_SUPABASE_ANON_KEY=eyJ...

# Staging
STAGING_SUPABASE_URL=https://yyy.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJ...

# Production
PROD_SUPABASE_URL=https://zzz.supabase.co
PROD_SUPABASE_ANON_KEY=eyJ...

# Google OAuth (add for all envs)
GOOGLE_OAUTH_CLIENT_ID_IOS=1234567890-xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_ID_ANDROID=1234567890-yyy.apps.googleusercontent.com
```

### Phase 4: Platform-Specific (10 min)

**iOS:**
- Open `ios/Runner/GoogleOAuth.xcconfig`
- Replace: `GOOGLE_REVERSED_CLIENT_ID = com.googleusercontent.apps.YOUR_CLIENT_ID`

**Android:**
- Get signing certificate SHA1 (ask dev team)
- Update Google OAuth credential with fingerprint

---

## Where to Find Things

| What | Where |
|-----|-------|
| Supabase credentials | https://supabase.com → Settings → API |
| Google OAuth credentials | https://console.cloud.google.com → Credentials |
| Monitoring tool credentials | Refer to your provider's dashboard |
| App `.env` file | Project root directory |
| iOS config | `ios/Runner/GoogleOAuth.xcconfig` |
| Android config | `android/app/build.gradle.kts` |

---

## Running Tests

```bash
# Development
flutter run --dart-define=FLUTTER_ENV=dev

# Staging  
flutter run --dart-define=FLUTTER_ENV=staging

# Production build
flutter build ios --dart-define=FLUTTER_ENV=prod
```

---

## Costs (Monthly)

| Users | Supabase | Google | Monitoring | Total |
|-------|----------|--------|--------|-------|
| <1k | FREE | FREE | FREE | **$0** |
| 1-10k | FREE-$25 | FREE | FREE-$30 | **$0-55** |
| 10-100k | $25+ | FREE | $0-$50 | **$60+** |
| 100k+ | $100+ | FREE | $50+ | **$200+** |

---

## Critical Security Rules

✅ **DO:**
- Store `.env` in `.gitignore` (keep secrets off GitHub)
- Use Supabase "anon" key in app (safer than service key)
- Rotate credentials quarterly
- Keep database password in secure password manager

❌ **DON'T:**
- Commit `.env` to GitHub
- Embed API keys in your code
- Use service role key in mobile app
- Share production credentials via email/Slack

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Supabase connection failed" | Check URL spelling and copy exact key from Settings → API |
| "Google Sign-In doesn't work" | Verify iOS Bundle ID and Android package name match exactly |
| "App crashes on sign-in" | Check your monitoring tool for errors; ask dev team for logs |
| "Can't remember a credential" | Check your password manager (1Password, Keeper, LastPass) |

---

## Emergency: If Credentials Leak

1. **STOP** - Don't panic, credentials can be rotated
2. **ROTATE** - Generate new keys in each service (15 min)
3. **UPDATE** - Replace in `.env` and redeploy app (30 min)
4. **REVIEW** - Check database logs for unauthorized access

---

## How to Share With Your Team

1. **Never** email credentials
2. **Always** use your password manager to share (most have team features)
3. **Alternative:** Create separate logins for each team member in Supabase/Google

---

## Key Passwords You Need to Save

| What | Where to Save | Example |
|-----|--------------|---------|
| Supabase DB password | Password manager | `Tr0picM00n$2025!` |
| Google Cloud project | Password manager | Your Google account |
| Monitoring tool account | Password manager | Provider login |

---

## One-Time Checklist Before Launch

- [ ] All 3 environments created (dev/staging/prod)
- [ ] `.env` is in `.gitignore`
- [ ] `.env` is NOT in Git history
- [ ] Google OAuth configured for iOS + Android
- [ ] Monitoring tool receiving error reports (if configured)
- [ ] Database backups enabled
- [ ] Tested sign-in on test device
- [ ] Credentials in secure password manager
- [ ] Team members trained on where to find credentials

---

## Resource Links (Save These!)

- **Supabase Admin:** https://app.supabase.com
- **Google Cloud Console:** https://console.cloud.google.com
- **Full Setup Guide:** See `FOUNDER_AUTH_SETUP_GUIDE.md`
- **Security Status:** See `AUTH_IMPLEMENTATION_STATUS.md`

---

## SOS: Quick Help

**Question:** "Where's the setup guide?"  
**Answer:** Read `docs/setup/FOUNDER_AUTH_SETUP_GUIDE.md` - it's step-by-step

**Question:** "Are we secure?"  
**Answer:** Check `docs/setup/AUTH_IMPLEMENTATION_STATUS.md` for security status

**Question:** "My app crashes on sign-in"
**Answer:** Review your monitoring tool for error details and share logs with the dev team

**Question:** "Need to add a developer?"  
**Answer:** Create new logins in Supabase and Google Cloud. Share via password manager.

---

## Dev Team Notes

**For developers setting up the app:**

1. Check that `FLUTTER_ENV` is set correctly
2. Verify all required dart-define variables are present
3. Run: `flutter pub get`
4. Build with: `flutter run --dart-define=FLUTTER_ENV=dev`

**If something breaks:**
- Check `.env` file is in project root
- Verify Supabase URL format: `https://xxx.supabase.co`
- Verify Supabase key is correct (copy from Settings → API)
- Check internet connection
- Clear build: `flutter clean && flutter pub get`

---

## Monthly Maintenance

Every month, do this:
1. ✓ Review monitoring dashboards for error spikes
2. ✓ Verify database is responsive
3. ✓ Test login on both platforms
4. ✓ Look for security updates

Every quarter:
1. ✓ Rotate API keys in Supabase
2. ✓ Rotate Google OAuth credentials (create new ones)
3. ✓ Update team on security practices

---

**Bookmark this page!** ⭐  
Last Updated: October 2025  
Version: 1.0
