# Deployment Checklist

This document outlines the critical steps required before deploying code changes to production.

## Pre-Deployment Verification

### ⚠️ CRITICAL: Enable Realtime Subscriptions

**Before deploying to production, you MUST enable realtime subscriptions in Supabase Dashboard!**

See: [`REALTIME_SUBSCRIPTIONS_SETUP.md`](REALTIME_SUBSCRIPTIONS_SETUP.md) for detailed instructions.

**Required tables to enable:**
- [ ] `public.events` – Enable realtime for calendar events
- [ ] `public.contacts` – Enable realtime for contacts
- [ ] `public.availability_signals` – Enable realtime for signals
- [ ] `public.signal_shares` – Enable realtime for shares

**Without this step, users won't see real-time updates across devices.** Changes will still sync via the sync queue, but latency will be significantly higher (minutes instead of seconds).

### Database Migrations

Before deploying code that depends on new database tables or schema changes, ensure all migrations have been applied in the correct order:

#### SMS/AI Agent Feature (if enabled)
- [ ] Apply migration: `supabase/migrations/20250421_create_sms_conversations.sql`
- [ ] Verify table exists: `SELECT * FROM sms_conversations LIMIT 1;`
- [ ] Confirm RLS policies are active: `SELECT tablename, policyname FROM pg_policies WHERE tablename = 'sms_conversations';`
- [ ] Deploy edge functions:
  - [ ] `send-ai-agent-sms`
  - [ ] `handle-inbound-sms`
- [ ] Configure environment variables:
  - [ ] `TWILIO_ACCOUNT_SID`
  - [ ] `TWILIO_AUTH_TOKEN`
  - [ ] `TWILIO_PHONE_NUMBER`
  - [ ] `TWILIO_WEBHOOK_URL` (for inbound SMS)

### Code Quality Checks

- [ ] Run `flutter analyze` - must return "No issues found"
- [ ] Run all tests: `flutter test`
- [ ] Verify no unsafe type casts (all fixed as of latest commit)
- [ ] Check for TODO/FIXME comments in critical paths

### Known Issues and Workarounds

#### Sync Queue Service
The offline sync queue is currently **disabled on macOS** due to secure storage hanging issues:
- Location: `lib/logic/services/sync_queue_service.dart`
- Impact: Offline changes are not queued for later sync
- Status: Documented with TODO for future fix
- Action: None required - feature is safely disabled

#### Account Recovery
Phone/SMS recovery has been removed:
- Only email recovery is supported
- UI updated to reflect this change
- No action required

### Environment Configuration

Ensure all required environment variables are set in `.env` or platform-specific configuration:

#### Required for all deployments:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_DEEP_LINK_SCHEME`
- `OAUTH_REDIRECT_URI`
- `PASSWORD_RESET_REDIRECT_URI`

#### Required for email features:
- `RESEND_API_KEY`

#### Required for SMS features (if enabled):
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `TWILIO_WEBHOOK_URL`

#### Platform-specific (iOS):
- Update `ios/Runner/GoogleOAuth.xcconfig` with `GOOGLE_REVERSED_CLIENT_ID`

### Deployment Order

1. **Apply database migrations** (Supabase dashboard or CLI)
2. **Deploy edge functions** (if changed)
3. **Verify environment variables** are set
4. **Deploy application code** (Flutter build)
5. **Run smoke tests** on staging environment

### Post-Deployment Verification

- [ ] Test authentication flow (email, Google, Apple)
- [ ] Verify profile creation for new users
- [ ] Check calendar creation on first login
- [ ] Test SMS sending (if feature enabled)
- [ ] Monitor error logs for 24 hours
- [ ] Check database for any RLS policy violations

### Rollback Plan

If issues are detected post-deployment:

1. **Code rollback**: Deploy previous working version
2. **Database rollback**: Migrations are forward-only; disable features via feature flags
3. **Edge functions**: Revert to previous deployment
4. **Environment variables**: Restore previous values

### Emergency Contacts

Document who to contact for:
- Database issues
- Supabase/backend issues
- Twilio/SMS issues
- General application issues

## Notes

- SMS/AI Agent features are under active development - deploy with caution
- Offline sync queue is disabled on desktop - document for users if needed
- All type safety issues have been addressed in recent commits
