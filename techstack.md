# MyOrbit – Tech Stack

**Target Platforms:** iOS & Android
**Mobile Framework:** Flutter
**Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
**Build Assist:** Cursor (dev), Vibe Studio (build/release assistance)

---

## 1) Goals & Guardrails

**Primary goal:** Create a sophisticated, privacy-first calendar for complex social networks with advanced availability sharing.
**Non‑negotiables:** Privacy‑first defaults, sophisticated consent controls, reliable notifications, and advanced availability signals.
**Design ethos:** Comprehensive architecture with clean separation of concerns, advanced privacy controls, and sophisticated scheduling features.

**Why Supabase first?**

* Native Postgres for relational data (events ↔ contacts ↔ signals ↔ permissions), with advanced query capabilities.
* Built‑in Auth (Google now; Apple later), Storage, Row‑Level Security (RLS), Realtime, Edge Functions.
* Advanced path to analytics/reporting, policy‑level enforcement, and sophisticated scheduling algorithms.

> If needed, we can swap to Appwrite later. Current schema and service boundaries keep that option open.

## 2) High‑Level Architecture

```
Flutter (UI + ViewModels)
  └─ Services (Auth, Contacts, Events, Availability Signals, Visibility, Permissions)
      └─ Supabase (Auth, PostgREST, Storage, Edge Functions)
          ├─ Postgres (tables: profiles, contacts, events, event_invites, availability_signals, signal_shares, calendar_visibility)
          ├─ RLS Policies (advanced permission-based now)
          ├─ Edge Functions (webhooks, cron, SMS/email triggers, complex scheduling)
          └─ Storage (attachments, optional)
External integrations
  ├─ Google OAuth (login) & Google Calendar API (sync)
  ├─ Push: FCM (APNs under the hood for iOS)
  ├─ SMS: Twilio (opt‑in features for rescheduling; later)
  └─ Timezone: Comprehensive timezone handling with user preferences
```

---

## 3) Mobile App (Flutter)

**Language/Tooling**: Dart 3, Flutter stable channel

**Core Packages**

* **State mgmt:** `riverpod`, `hooks_riverpod`
* **Routing:** `go_router`
* **Models/Serialization:** `freezed`, `json_serializable`, `build_runner`
* **Networking:** `dio`
* **Supabase Client:** `supabase_flutter`
* **Env/Config:** `flutter_dotenv`
* **IDs/Utils:** `uuid`, `intl`
* **Push Notifications:** `firebase_messaging`, `flutter_local_notifications`
* **(Optional) Crash/Analytics:** `sentry_flutter` (default) or Firebase Crashlytics as an alternative

**Local Data Strategy**

* **Phase 1 (MVP):** Keep it simple; rely on live fetch + light in‑memory caching.
* **Phase 2 (offline):** Add `drift` (SQL) for offline events/signal cache if needed.

**App Structure (actual implementation)**

```
lib/
  main.dart
  core/    (theme, utils, env, timezone, supabase client)
  domain/  (entities: events, contacts, availability_signals, recurrence_rules, calendars)
  logic/   (services: auth, calendar, contacts, signals, providers: events, contacts, signals, settings)
  ui/      (screens, widgets, app_shell)
```

**Rescheduling Workflow**

* Event reschedule lifecycle captured by `EventRescheduleStatus` (none → pendingContact → contactConfirmed → awaitingUserApproval → scheduled).
* `EventRescheduleStateMachine` enforces valid transitions so AI/SMS assistants can drive updates without bypassing consent checks.
* UI/assistant code should use `CalendarEvent.transitionRescheduleStatus()` when moving between states.
* AI SMS assistant is a planned enhancement; initial release uses these states for manual workflows only.

---

## 4) Backend (Supabase)

**Components**

* **Auth:** Google OAuth (now), Apple Sign‑in (later), optional email for admin flows.
* **Database:** Postgres with UUID keys; minimal normalized schema.
* **Policies:** Owner‑scoped RLS (users see and edit only their data) — simple and safe.
* **Edge Functions:** TypeScript for webhooks/cron (calendar sync, SMS nudges, cleanup jobs).
* **Realtime:** Optional; enable after MVP if live updates are desired.
* **Storage:** Optional for images/attachments (events, profiles).

**Tables (sophisticated implementation)**

* `profiles (id PK ↔ auth.users)`: display_name, timezone, preferences
* `contacts (owner_id, name, email, status, permission, external_user_id, created_at, updated_at)`
* `contact_labels`, `contact_labels_rel` (private taxonomy, optional)
* `events (owner_id, title, description, start_ts, end_ts, privacy_level, invited_contact_ids, owner_id, calendar_id, recurrence_rule_id)`
* `event_invites (event_id, contact_id, status)`
* `availability_signals (id, user_id, signal_type, start_time, end_time, duration, message, created_at)`
* `signal_shares (id, signal_id, shared_with_user_id, shared_by_user_id, created_at, notify, auto_accept)`
* `calendar_visibility (owner_id, visible_calendar_ids, updated_at)`
* `calendars (id, owner_id, name, color_value, is_primary, created_at, updated_at)`
* `recurrence_rules (id, pattern, interval, days_of_week, monthly_pattern, end_type, occurrence_count, end_date, exceptions, created_at)`

> Full SQL is in the **“Supabase MVP Starter Kit”** document. Keep DB logic lean for MVP; enforce the visibility override hierarchy in the app service first.

**Sophisticated Visibility Override Hierarchy (service layer)**

```
if explicitly_invited_to_event → FULL_DETAILS
else if event.privacy_level == super_exclusive → HIDDEN
else if event.privacy_level == exclusive → HIDDEN
else if contact.permission == visible → FULL_DETAILS  
else if contact.permission == semi_visible → BUSY_ONLY
else if contact.permission == private → HIDDEN
else → HIDDEN

Availability Signals operate independently:
- Users explicitly select which contacts can see each signal
- Signal notifications and auto-accept settings configurable per contact
- Buffer management around events that conflict with signals
```

---

## 5) Integrations

**Google Auth (Login):** Supabase OAuth provider (fastest path).
**Apple Sign‑in:** Add after MVP; configure in Supabase + iOS entitlements.
**Google Calendar (MVP sync):** Edge Function handles OAuth 2.0 token exchange + import; store `external_provider`, `external_event_id` per event.

**Push Notifications:**

* **FCM** for Android & iOS (APNs via Firebase for iOS).
* In‑app Notification Center mirrors important messages; use `flutter_local_notifications` for foreground.

**SMS (later):** Twilio via Edge Functions (reschedule nudges, cancellation alerts). Gate behind explicit opt‑in.

**Email (optional):** Use Supabase’s built‑in email for magic links if needed; transactional mail (Postmark/Resend) later.

---

## 6) Security & Privacy

* **RLS on all tables**; principle of least privilege.
* **OAuth‑first** to reduce password handling.
* **Secrets** stored in Vibe Studio/GitHub Actions environment vars; never commit keys.
* **Audit trails** for consent‑affecting changes (permission changes, invitations, cancellations) via a simple `audit_log` table or Edge Function logs.
* **Transport security:** HTTPS everywhere; verify redirect URIs.
* **At‑rest:** Supabase encrypts disks; consider field‑level encryption later for sensitive event content.

---

## 7) Observability

* **Crash/Error:** **Sentry** (chosen) — privacy‑friendly defaults; scrub sensitive data.
* **Usage Analytics:** Start minimal (screen views, key actions). Consider PostHog or Amplitude later.
* **Logging:** Edge Functions log to Supabase; ship structured logs.

**Sentry Setup (MVP)**

1. Create a Sentry account → Create a **Flutter** project → copy your **DSN**.
2. Add `sentry_flutter` to `pubspec.yaml`.
3. In `main.dart`, wrap app startup with `SentryFlutter.init` using the DSN.
4. Enable PII scrubbing and set release/env tags (dev/staging/prod).
5. Verify with a test crash (Sentry provides a code snippet) and confirm it appears in the dashboard.

**Env vars (app/build)**

```
SENTRY_DSN=...
SENTRY_ENV=dev|staging|prod
SENTRY_RELEASE=app@1.0.0+1
```

---

## 8) Testing Strategy

* **Unit:** VisibilityService rules (happy paths + edge cases).
* **Widget/Golden:** Event modal, permissions UI, signals workflow.
* **Integration:** Supabase adapters (stubbed project), auth & basic CRUD.
* **Manual Scenarios:** Invite flow; privacy overrides; signal consumption + buffer.

---

## 9) CI/CD & Release

* **Repo:** GitHub (private).
* **Builds:** Vibe Studio for iOS/Android pipelines; set environment vars per env.
* **Signing:** iOS certificates/profiles; Android keystore (store in Vibe Studio secrets).
* **Tracks:** TestFlight (iOS), Internal/App Testing (Play Console).

---

## 10) Environments & Config

* **Envs:** `dev`, `staging`, `prod` (separate Supabase projects).
* **Config:** `.env` file per env, injected at build time.

**Environment Variables (app)**

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
FCM_SERVER_KEY=...(server side)
GOOGLE_OAUTH_CLIENT_ID=...(iOS & Android)
APPLE_SERVICES_ID=...(later)
TWILIO_ACCOUNT_SID=...(later)
TWILIO_AUTH_TOKEN=...(later)
```

---

## 11) Current Capabilities & Future Enhancements

**Currently Implemented:** Google login → Sophisticated contact management with 3-tier permissions → Events with privacy controls & recurrence → Advanced visibility rules → Availability Signals with sharing & buffer management → Comprehensive notification controls → Multi-calendar support → Timezone handling → Offline cache → Recurrence suggestions → Conflict detection.

**Next:** Apple login → Google Calendar write‑back & webhooks → SMS reschedule → Realtime updates → In‑depth analytics → Advanced recurrence patterns.

**Later:** Field‑level encryption, policy‑level visibility in SQL, multi‑calendar providers, advanced AI scheduling assistance.

---

## 12) Risks & Mitigations

* **Complex visibility rules** → Keep in one service; unit‑test thoroughly; promote to SQL later.
* **Time zones** → Store all timestamps in UTC; convert at the edge (client). Add robust TZ tests.
* **Notification deliverability** → FCM/APNs + in‑app tray; retries on server for critical events.
* **Calendar sync drift** → Keep external IDs; reconcile on changes; log conflicts.
* **Crash telemetry privacy** → Use Sentry’s PII scrubbing; avoid sending event descriptions or contact names in breadcrumbs.

---

## 13) Decision Log (initial)

* **Supabase over Appwrite** for long‑term relational needs.
* **Riverpod + go_router** for simplicity and testability.
* **Sentry selected** for crash/telemetry (privacy‑friendly); FCM kept for push only.
* **Google Calendar only in MVP**; iCloud later.
