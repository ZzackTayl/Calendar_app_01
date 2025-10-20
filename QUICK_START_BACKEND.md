# 🚀 Quick Start: Backend Integration

**5-Minute Setup Guide**

---

## ✅ You're Ready!

Your database schema is complete. Follow these steps to integrate the backend:

---

## Step 1: Apply Database Migrations (2 minutes)

### Option A: Automated (Recommended)
```bash
cd <project-root>
./supabase/schema/apply_migrations.sh   # macOS/Linux
# or on Windows (PowerShell):
# ./supabase/schema/apply_migrations.ps1
```

### Option B: Supabase CLI
```bash
cd <project-root>
supabase db push
```

### Option C: Manual (via Dashboard)
1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID
2. Navigate to **Database** → **SQL Editor**
3. Apply each file in order:
   - `supabase/schema/001_profiles_contacts.sql`
   - `supabase/schema/002_calendars_events.sql`
   - `supabase/schema/003_availability_signals.sql`
   - `supabase/schema/004_functions.sql`
   - `supabase/schema/005_realtime.sql`

---

## Step 2: Verify Schema (1 minute)

Run validation script via Supabase Dashboard SQL Editor:

```bash
# Copy contents of this file and run in SQL Editor:
supabase/schema/validate_schema.sql
```

**Expected output:**
```
✅ All 11 tables exist!
✅ All tables have RLS enabled!
✅ All 8 functions exist!
✅ Total indexes: 20+
```

---

## Step 3: Update Environment (30 seconds)

Ensure your `.env` file has the following keys configured (no secrets are committed to the repo):

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# OAuth / Deep Link configuration
APP_DEEP_LINK_SCHEME=myorbit
OAUTH_REDIRECT_URI=myorbit://callback
PASSWORD_RESET_REDIRECT_URI=myorbit://reset-password

# Google OAuth client IDs from Google Cloud Console
GOOGLE_OAUTH_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
```

- `APP_DEEP_LINK_SCHEME` should match the custom URL scheme you register in iOS/Android (default: `myorbit`).
- `OAUTH_REDIRECT_URI` and `PASSWORD_RESET_REDIRECT_URI` must share that scheme (`myorbit://callback`, `myorbit://reset-password`).
- Google client IDs are platform-specific; copy them from Google Cloud Console credentials.
- For iOS builds, set the reversed client ID (e.g. `com.googleusercontent.apps.your-ios-client-id`) in `ios/Runner/GoogleOAuth.xcconfig` so that `Info.plist` receives the correct scheme.

Supabase credentials are available in **Supabase Dashboard** → **Settings** → **API**.

---

## Step 4: Test Integration (1 minute)

```bash
# Run the app
flutter run

# Try creating a test user via the app UI
# Then check Supabase Dashboard > Database > profiles table
```

---

## 🎉 You're Done!

Your backend is live. The schema includes:

- ✅ **11 tables** (events, contacts, signals, etc.)
- ✅ **8 business logic functions**
- ✅ **Full security (RLS)**
- ✅ **Realtime enabled**
- ✅ **Optimized indexes**

---

## 🔍 Troubleshooting

### Issue: Migrations fail
**Solution:** Apply them in order (001 → 005). They have dependencies!

### Issue: RLS blocking queries
**Solution:** Ensure `auth.uid()` matches `owner_id` in your queries.

### Issue: Realtime not working
**Solution:** Check **Dashboard** → **Database** → **Replication** → Ensure tables are enabled.

---

## 📖 More Details

- **Full Documentation:** [supabase/schema/README.md](./supabase/schema/README.md)
- **Backend Summary:** [BACKEND_READY_SUMMARY.md](./BACKEND_READY_SUMMARY.md)
- **Supabase Setup:** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

---

**Questions?** Check the docs above or reach out!

**Happy building! 🚀**
