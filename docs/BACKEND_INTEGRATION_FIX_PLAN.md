# Backend Readiness: Findings and Fix Plan

This document captures the current gaps for Supabase/backend readiness and a split work plan for two assisting developers to execute in parallel with minimal file conflicts.

## Executive summary

The app is largely wired for Supabase (client init, CRUD services, **realtime subscriptions implemented**, offline cache/queue, Google/Apple imports). Production blockers remain: **realtime dashboard enablement** (5-min task), env credentials, schema/RLS mismatches (notifications types, event_invites RLS for invitees, availability_signals shape), missing `calendar_migrations` table, and unimplemented edge functions for email/SMS invites. Recurrence/timezone and import de-duplication need hardening.

**🆕 REALTIME SUBSCRIPTIONS STATUS (October 21, 2025):** All Flutter code is **COMPLETE and production-ready**. Code handles events, contacts, signals, and shares realtime sync. **Remaining task:** Enable 4 tables in Supabase Dashboard (5 minutes). See [`REALTIME_SUBSCRIPTIONS_SETUP.md`](REALTIME_SUBSCRIPTIONS_SETUP.md).

## Workstream A — Client Auth/Platforms (Developer A)

**Status: Complete (January 2025)**  
Platform deep links, Supabase OAuth wiring, profile bootstrap, and primary calendar seeding now ship in main. The deployment checklist below summarizes the work delivered and where to configure per-environment secrets.

### Delivered
- **iOS deep link config**  
  - `ios/Runner/Info.plist` registers the custom scheme (`APP_DEEP_LINK_SCHEME`, default `myorbit`) and now references a build-configured Google reversed client ID exposed via the new `ios/Runner/GoogleOAuth.xcconfig`.
- **Android deep link config**  
  - `android/app/src/main/AndroidManifest.xml` contains VIEW intent filters for `callback` and `reset-password` hosts under the custom scheme.
- **OAuth flows & UI**  
  - `AuthApi.signInWithGoogle/Apple` read redirect URIs from `Env`.  
  - `AuthController` hooks “Continue with Google” and defers bootstrapping until the session is ready, showing an offline message when Supabase isn’t configured.
- **Profile bootstrap**  
  - `ProfileApi.upsertCurrentUserProfile()` upserts `public.profiles` with normalized name, email, avatar, and timezone metadata.  
  - Invoked from `AuthController` after successful email/password and OAuth flows.
- **Primary calendar seeding**  
  - `CalendarApi.ensurePrimaryCalendarForCurrentUser()` inserts a primary calendar when none exists and runs immediately after profile bootstrap.
- **Environment & docs**  
  - `.env` expectations captured in `QUICK_START_BACKEND.md`, including the pointer to populate `GOOGLE_REVERSED_CLIENT_ID` in `ios/Runner/GoogleOAuth.xcconfig`.  
  - Lightweight test hooks (`debug*`) gate side effects so integration tests can assert payloads without real Supabase calls.
- **Coverage**  
  - `test/logic/providers/auth_bootstrap_integration_test.dart` validates OAuth redirect wiring and bootstrap sequencing via the new hooks.

### Acceptance criteria (met)
- Supabase Google sign-in returns to the app using the configured deep link scheme.
- Fresh accounts receive both a `profiles` row and a primary `calendars` row automatically.
- No schema migrations were required for this workstream.

### Operational checklist
- Provide platform-specific client IDs in `.env` (see `QUICK_START_BACKEND.md`).
- Update `ios/Runner/GoogleOAuth.xcconfig` with the environment’s reversed client ID.  
- Confirm `APP_DEEP_LINK_SCHEME`, `OAUTH_REDIRECT_URI`, and `PASSWORD_RESET_REDIRECT_URI` match Supabase settings.

## Workstream B — Schema/RLS/Functions Alignment (Developer B)

**Status: EDGE FUNCTIONS COMPLETE (October 21, 2025); Schema items in progress**

Scope: Supabase schema migrations, RLS fixes, and edge function implementation. No Flutter UI changes to avoid overlap.

### ✅ Edge Functions (COMPLETE)
- **send-contact-invitation-email** — ✅ COMPLETE
  - Full Resend integration with HTML templates
  - Auth validation, error handling, logging
  - Ready for deployment (requires Resend API key)
  - File: `supabase/functions/send-contact-invitation-email/index.ts`
  
- **send-contact-invitation-sms** — ✅ COMPLETE
  - Twilio integration with E.164 phone validation
  - Conversation logging to `sms_conversations` table
  - Ready for deployment (requires Twilio credentials)
  - File: `supabase/functions/send-contact-invitation-sms/index.ts`

- **send-ai-agent-sms** — ✅ COMPLETE
  - Outbound SMS for AI agents with context support
  - Conversation tracking with flexible metadata
  - Support for agent types (outreach, availability, confirmation)
  - File: `supabase/functions/send-ai-agent-sms/index.ts`

- **handle-inbound-sms** — ✅ COMPLETE
  - Twilio webhook handler for inbound SMS replies
  - Two-way conversation support
  - Agent dispatch for specialized handling
  - File: `supabase/functions/handle-inbound-sms/index.ts`

- **sms_conversations table** — ✅ COMPLETE
  - Full schema with proper indexes and RLS
  - Supports agent types, direction, status tracking
  - Flexible context_data (JSONB) for agent coordination
  - Dart API (`AiAgentSmsApi`) complete with send/history/streaming
  - Migration: `supabase/migrations/20250421_create_sms_conversations.sql`

### Remaining Schema Items (Pending)
- Notifications type alignment
  - Update `public.notifications.type` CHECK to include app-used values: `event-update`, `event-reminder`, `calendar-shared`, `migration-started`, plus existing types; or loosen to a whitelist superset.
  - Migration: `supabase/schema/007_notifications_types.sql`.
- Event invites RLS (invitee responses)
  - Allow an invitee to update their own `event_invites` row (respond accept/maybe/decline).
  - Policy: permit UPDATE when `EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = event_invites.contact_id AND c.external_user_id = auth.uid())`.
  - Migration: `supabase/schema/008_event_invites_rls_invitee_update.sql`.
- Calendar migrations table
  - Create `public.calendar_migrations` to match API fields used in `CalendarMigrationApi` (id, user_id, source, include_past_events, include_shared_calendars, merge_duplicates, notify_partners, status, created_at, completed_at, error_message).
  - Add RLS (user owns their rows) and indexes on `user_id` and `created_at`.
  - Migration: `supabase/schema/009_calendar_migrations.sql`.
- Availability signals model alignment
  - Current schema requires `partner_user_id` and date-only; app creates owner-only signals with `start_time`/`end_time` and shares via `signal_shares`.
  - Make `partner_user_id` nullable (or remove), add `start_time TIMESTAMPTZ`, `end_time TIMESTAMPTZ` with range CHECK; keep existing date fields for backward compat (or create a view). Update policies to use owner id; viewing shared signals should pivot via `signal_shares` instead of `partner_user_id`.
  - Migration: `supabase/schema/010_availability_signals_rework.sql`.
- Uniqueness to prevent duplicate imports
  - Add unique index on `(owner_id, external_provider, external_event_id)` in `events`.
  - Migration: `supabase/schema/011_events_external_unique.sql`.
- Realtime/publication updates for any new tables.
  - Update `005_realtime.sql` or ensure publication includes new tables.

Acceptance criteria:
- Invitee can update their own invite; responding from the app succeeds under RLS.
- Notifications inserts work without CHECK violations for all app-used types.
- Calendar migration screens hit a real `calendar_migrations` table.
- Creating availability signals via app no longer fails due to NOT NULL mismatch.
- Duplicate external events are rejected at DB level.

Test plan:
- SQL smoke tests for policies; manual calls from psql or PostgREST with `auth.uid()` mocked.
- App flows: respond to invite; create availability signal; import same external event twice to verify unique index behavior.

Notes/risks:
- Coordinate on exact notification `type` strings used by the app; prefer schema superset to avoid frequent migrations.
- Changing `availability_signals` requires careful migration for existing rows; provide a migration path or keep both columns with triggers if needed.

## Workstream C — Lead (Owner): Edge cases and quality

Scope: recurrence/timezone, deduplication in import pipelines, conflict resolution, and minimal Notification mapping audit.

Tasks:
- Import de-duplication in clients
  - Before `CalendarApi.createEvent`, check for existing `(owner_id, external_provider, external_event_id)`; skip or update.
  - Files: `lib/logic/services/google_calendar_sync_service.dart`, `lib/logic/services/apple_calendar_sync_service.dart`.
- Conflict resolution
  - Extend `ConflictResolutionService.intelligentMerge` to handle title vs time changes and preserve `is_floating` semantics.
  - Files: `lib/logic/services/conflict_resolution_service.dart`.
- Timezone/floating events
  - Verify `EventTimezoneConverter` across DST boundaries and all-day events; adjust as needed.
  - Files: `lib/core/event_timezone_converter.dart` (+ tests).
- Notification mapping audit
  - Ensure `NotificationApi._mapNotificationType` covers all used values; align with Workstream B’s schema superset (no schema change here).

Acceptance criteria:
- Re-importing does not create duplicates; conflict resolution remains stable.
- Floating/fixed events display correctly across DST changes.

## Coordination and sequencing

- No file conflicts expected: A touches platform config, auth UI, and new Profile/Calendar bootstrap methods; B touches only `supabase/schema/**` and Edge Functions; C limits to services listed above.
- Order: B can start immediately. A can proceed in parallel (redirect URIs can be `.env` driven). C can start now; de-dup relies on B’s unique index but can ship optimistic checks first.

## Branching/PRs

- A: `feature/auth-deeplink-bootstrap` — PR “feat(auth): deep links + profile/calendar bootstrap”.
- B: `chore/schema-rls-alignment` — PR “chore(db): RLS + schema alignment; migrations 007–011”.
- C: `feat/import-dedupe-conflicts` — PR “feat(import): dedupe + conflict/timezone edge cases”.

## Success checklist

- [x] OAuth and password reset deep links work on iOS/Android.
- [x] Profiles and primary calendars auto-create on first login.
- [x] **SMS/Email edge functions implemented and ready for deployment** (Oct 21, 2025)
  - [x] send-contact-invitation-email with Resend integration
  - [x] send-contact-invitation-sms with Twilio integration
  - [x] send-ai-agent-sms for AI agent outreach
  - [x] handle-inbound-sms webhook for two-way messaging
  - [x] sms_conversations table schema with RLS
  - [x] AiAgentSmsApi Dart class with full functionality
- [ ] Invitee can respond to invites under RLS.
- [ ] Notifications insert without type errors.
- [ ] Availability signals create/read without schema mismatch.
- [ ] Duplicate external events prevented.
- [ ] Imports dedupe and conflict resolution upgraded; DST/floating verified.
- [ ] SMS/Email services deployed to production Supabase.
- [ ] End-to-end testing of SMS contact invitations and AI agent flows.
