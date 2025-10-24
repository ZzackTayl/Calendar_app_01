# MyOrbit Supabase Schema (Canonical)

The Flutter app is wired to the schema defined in
`supabase/schema/000_corrected_schema_complete.sql`.  
Run **that** file end‑to‑end whenever you bootstrap or re-sync a Supabase
project. The numbered SQL files that follow (`001_…`, `002_…`, etc.) are kept
for historical reference only.

---

## 🚀 Quick Apply

1. Open the Supabase Dashboard → **Database → SQL Editor**  
2. Paste the entire contents of `000_corrected_schema_complete.sql`  
3. Click **Run** (watch for ✅ on each statement)  
4. Verify tables were created:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```
5. Update your `.env` with the project URL + anon key and run the Flutter app

---

## 📦 Table Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | Supabase-auth users + avatar metadata | `email`, `display_name`, `avatar_url`, `profile_picture_source` |
| `user_preferences` | Device-sync’d settings | `default_privacy`, `event_notification_channels`, `signal_notification_channel` |
| `calendars` | Connected calendars (MyOrbit, Google, etc.) | `provider`, `external_calendar_id`, `sync_enabled` |
| `calendar_visibility` | Which calendars are visible in UI | `visible_calendar_ids` |
| `recurrence_rules` | Reusable recurrence definitions | `pattern`, `interval`, `monthly_pattern`, `end_type` |
| `contacts` | Address book entries | `status`, `permission`, `external_user_id`, `labels` |
| `events` | Calendar events | `calendar_id`, `privacy_level`, `reschedule_status`, `invited_partner_ids` |
| `event_invites` | Contact-based event invites | `event_id`, `contact_id`, `status`, `responded_at` |
| `availability_signals` | Shared availability windows | `signal_type`, `start_time`, `end_time`, `duration`, `message` |
| `signal_shares` | Who sees each signal | `signal_id`, `shared_with_user_id`, `notify`, `auto_accept` |
| `signal_timeline_entries` | Optional denormalised availability timeline | `date`, `time_start`, `status` |
| `notifications` | Persistent notification center | `type`, `body`, `data`, `is_read`, `is_dismissed`, `show_in_center` |
| `data_export_requests` | GDPR/self-service exports | `include_events`, `status`, `download_url` |
| `calendar_migrations` | Import/export job tracking | `source`, `status`, `error_message` |
| `contact_invitations` | Email/SMS invitations | `method`, `status`, `expires_at`, `personal_message` |
| `sms_conversations` | AI assistant SMS history | `direction`, `agent_type`, `status`, `context_data` |
| `rate_limit_log` | Edge-function throttling | `user_id`, `action`, `created_at` |

All tables have Row Level Security enabled. Policies restrict rows to the
auth’d user except where sharing is intentional (signals, invites).

---

## 🔐 Security & Realtime Notes

- RLS is enabled everywhere; run queries as an authenticated user.
- `availability_signals` exposes rows shared with you via `signal_shares`.
- Realtime streams are expected for: `events`, `contacts`,
  `availability_signals`, `signal_shares`, `notifications`, `sms_conversations`.

---

## ✅ After Running the Schema

- [ ] Tables above exist (`SELECT count(*) FROM information_schema.tables …`)
- [ ] Policies show under **Database → Policies** (no red ❌)
- [ ] Sample insert works:
  ```sql
  INSERT INTO public.profiles (id, email)
  VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test@example.com')
  ON CONFLICT (id) DO NOTHING;
  ```
- [ ] Flutter app logs `✅ Supabase initialized successfully`

---

## 🧭 Legacy Migration Files

Files prefixed with `001_…` through `013_…` remain for auditing and historical
diffs. They should **not** be applied to a fresh project—the canonical schema
already includes their fixes plus the newest features (data exports, calendar
migrations, SMS conversations, rate limiting, profile picture policies, etc.).

If you need to diff past work, reference those files, but rely on
`000_corrected_schema_complete.sql` for live environments.
