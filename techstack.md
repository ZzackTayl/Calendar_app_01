# MyOrbit – Tech Stack

**Target Platforms:** iOS & Android
**Mobile Framework:** Flutter
**Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
**Build Assist:** Cursor (dev), Vibe Studio (build/release assistance)

---

## 1) Goals & Guardrails

**Primary goal:** Ship an MVP that proves value while keeping long‑term flexibility.
**Non‑negotiables:** Privacy‑first defaults, consent controls, reliable notifications.
**Design ethos:** Start small, keep logic in well‑named modules, avoid vendor lock‑in.

**Why Supabase first?**

* Native Postgres for relational data (events ↔ partners ↔ invites), easy growth later.
* Built‑in Auth (Google now; Apple later), Storage, Row‑Level Security (RLS), Realtime, Edge Functions.
* Smooth path to analytics/reporting and policy‑level enforcement if/when needed.

> If needed, we can swap to Appwrite later. Current schema and service boundaries keep that option open.

---

## 2) High‑Level Architecture

```
Flutter (UI + ViewModels)
  └─ Services (Auth, Contacts, Events, Signals, Visibility)
      └─ Supabase (Auth, PostgREST, Storage, Edge Functions)
          ├─ Postgres (tables: profiles, contacts, events, event_invites, signals, signal_shares)
          ├─ RLS Policies (owner‑scoped now)
          ├─ Edge Functions (webhooks, cron, SMS/email triggers)
          └─ Storage (attachments, optional)
External integrations
  ├─ Google OAuth (login) & Google Calendar API (MVP sync)
  ├─ Push: FCM (APNs under the hood for iOS)
  └─ SMS: Twilio (opt‑in features; later)
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

**App Structure (suggested)**

```
lib/
  main.dart
  core/    (theme, utils, env)
  data/    (dto, repositories, supabase adapters)
  domain/  (entities, value objects)
  logic/   (services: auth, events, visibility, signals)
  ui/      (screens, widgets, hooks)
```

---

## 4) Backend (Supabase)

**Components**

* **Auth:** Google OAuth (now), Apple Sign‑in (later), optional email for admin flows.
* **Database:** Postgres with UUID keys; minimal normalized schema.
* **Policies:** Owner‑scoped RLS (users see and edit only their data) — simple and safe.
* **Edge Functions:** TypeScript for webhooks/cron (calendar sync, SMS nudges, cleanup jobs).
* **Realtime:** Optional; enable after MVP if live updates are desired.
* **Storage:** Optional for images/attachments (events, profiles).

**MVP Tables (summary)**

* `profiles (id PK ↔ auth.users)`: display_name, timezone
* `contacts (owner_id, name, email, status, permission, external_user_id)`
* `labels`, `contact_labels` (private taxonomy, optional)
* `events (owner_id, title, start_ts, end_ts, privacy, external_provider, external_event_id)`
* `event_invites (event_id, contact_id, status)`
* `signals (owner_id, start_ts, end_ts)`
* `signal_shares (signal_id, contact_id, state, notify)`

> Full SQL is in the **“Supabase MVP Starter Kit”** document. Keep DB logic lean for MVP; enforce the visibility override hierarchy in the app service first.

**Visibility Override Hierarchy (service layer now)**

```
if invited → FULL
else if event.privacy in {super‑exclusive, exclusive} → NONE
else if relationship.permission == visible → FULL
else if relationship.permission == semi‑visible → BUSY‑ONLY
else → NONE
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

## 11) Roadmap

**Now (MVP):** Google login → Contacts & Partner states → Events + Invites → Visibility rules (client) → Signals + Shares → Basic notifications (push stub).
**Next:** Apple login → Google Calendar write‑back & webhooks → SMS reschedule → Offline cache → Realtime updates → In‑depth analytics.
**Later:** Field‑level encryption, policy‑level visibility in SQL, multi‑calendar providers.

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
