# Backend Readiness: Findings and Fix Plan

This document captures the current gaps for Supabase/backend readiness and a split work plan for two assisting developers to execute in parallel with minimal file conflicts.

## Executive summary

The app is largely wired for Supabase (client init, CRUD services, realtime, offline cache/queue, Google/Apple imports). Production blockers remain: platform OAuth/password reset deep links, env credentials, profile/primary calendar bootstrapping, schema/RLS mismatches (notifications types, event_invites RLS for invitees, availability_signals shape), missing `calendar_migrations` table, and unimplemented edge functions for email/SMS invites. Recurrence/timezone and import de-duplication need hardening.

## Workstream A — Client Auth/Platforms (Developer A)

Scope: platform deep links, OAuth wiring, profile/calendar bootstrap, and auth UI hookups. Avoids DB/schema edits to minimize overlap.

Deliverables:
- iOS deep link config
  - Add CFBundleURLTypes for custom scheme `myorbit` (or from `.env`), and handle `myorbit://callback` and `myorbit://reset-password`.
  - Add Google Sign-In reversed client ID if used.
  - Files: `ios/Runner/Info.plist`.
- Android deep link config
  - Add VIEW intent-filters for scheme `myorbit` (hosts: `callback`, `reset-password`).
  - Files: `android/app/src/main/AndroidManifest.xml`.
- Wire OAuth buttons and flows
  - In `lib/ui/screens/auth_screen.dart`, hook “Continue with Google” to `AuthService.signInWithGoogle()`; show graceful offline message when `SupabaseService.isConfigured == false`.
  - Ensure `AuthApi.signInWithGoogle/Apple` use redirect URIs that match the scheme (move URIs to `Env` so they’re not hardcoded).
- Profile bootstrap on first auth
  - Create `ProfileApi.upsertCurrentUserProfile()` using `auth.currentUser` to upsert into `public.profiles` with display name, email, timezone.
  - Call this after successful sign-in/sign-up in `AuthController`.
  - Files: new `lib/logic/services/profile_api.dart`; update `lib/logic/providers/auth_providers.dart` minimally.
- Primary calendar seeding
  - On first-run for a user with no calendars, create a primary `calendars` row.
  - Implement as `CalendarApi.ensurePrimaryCalendarForCurrentUser()` and call right after profile upsert.
  - Files: `lib/logic/services/api_service.dart` (add method only; no behavioral changes to existing methods).
- Env and config
  - Document required `.env` keys (SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_OAUTH_CLIENT_ID_*). No secrets in code.

Acceptance criteria:
- Tapping Google sign-in starts Supabase OAuth and returns to app; email/password reset deep link works.
- New users get a `profiles` row and a primary `calendars` row automatically.
- No changes to DB schema files in this workstream.

Test plan:
- Run on iOS/Android; verify deep link callback lands in app and session is set.
- Post-auth, select from `profiles` and `calendars` shows one profile row and exactly one primary calendar.

Notes/risks:
- Keep redirect URIs configurable via `Env` to avoid hardcoding. Coordinate chosen custom scheme with Developer B’s policies that may reference URLs in notifications.

## Workstream B — Schema/RLS/Functions Alignment (Developer B)

Scope: Supabase schema migrations, RLS fixes, and edge function stubs. No Flutter UI changes to avoid overlap.

Deliverables:
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
- Edge functions scaffolding
  - Create Supabase Edge Functions: `send-contact-invitation-email`, `send-contact-invitation-sms` (stub: validate input, log, return 200). Provide deploy instructions; no secrets committed.

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

- [ ] OAuth and password reset deep links work on iOS/Android.
- [ ] Profiles and primary calendars auto-create on first login.
- [ ] Invitee can respond to invites under RLS.
- [ ] Notifications insert without type errors.
- [ ] Availability signals create/read without schema mismatch.
- [ ] Duplicate external events prevented.
- [ ] Imports dedupe and conflict resolution upgraded; DST/floating verified.
