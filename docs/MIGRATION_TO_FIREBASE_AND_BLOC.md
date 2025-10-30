# Firebase & Bloc Migration Roadmap

This doc proposes a staged approach for moving the MyOrbit calendar stack from Supabase + Riverpod to Firebase services and Bloc/Cubit state management, while optionally layering Sentry for error tracking.

## 1. Guiding Principles

- **Ship in slices**: Deliver the Firestore schema/data bridge first, then Firebase Auth, then messaging/analytics/crash reporting. Keep the app usable between phases.
- **Treat Riverpod ➜ Bloc as a dedicated refactor track**: Avoid mixing state-management rewrites with backend swaps in the same PR unless strictly necessary.
- **Instrument everything**: Each phase should land with telemetry (Analytics events + Crashlytics + Sentry if enabled).
- **Back out plan**: Maintain feature parity with Supabase until Firebase data has parity, then cut over.

## 2. Phase Breakdown

### Phase 0 – Prep & Architecture
- Confirm product requirements: sign-in methods, data retention, notification flows.
- Map existing Supabase schemas & functions to Firestore collections + Cloud Functions.
- Define Firebase project environments (`dev`, `staging`, `prod`) and service accounts.
- Select Bloc scaffolding approach (e.g. `flutter_bloc` with feature-modular structure).
- Add technical spikes:
  - Prototype Firebase Auth + Firestore access layer.
  - Test Bloc in a single UI slice (e.g. auth flow) before global conversion.

### Phase 1 – Project & Dependency Setup
- Add packages: `firebase_core`, `firebase_auth`, `cloud_firestore`, `firebase_messaging`, `firebase_crashlytics`, `firebase_analytics`, `firebase_app_check` (if needed), `flutter_bloc`, `bloc`, `equatable`, `hydrated_bloc` (optional).
- Configure platform builds (iOS, Android, macOS, web) with Firebase options + Gradle/CocoaPods updates.
- Replace `.env` Supabase keys with Firebase `google-services.json`/`GoogleService-Info.plist` per target.
- Guard Sentry usage behind a feature flag or build flavor to remain optional.

### Phase 2 – Firestore Schema & Data Bridge
- Model Firestore collections for calendars, events, contacts, availability signals, shares, visibility, notifications, and audit logs.
- Design security rules + composite indexes in parallel so collection structure, tenant scoping, and `owner_id` filters are enforceable before writes land.
- Stand up a dual-write bridge:
  - Introduce repositories that write to both Supabase and Firestore and read from Supabase until parity is verified.
  - Create a deterministic UID mapping (`supabase_user_id` ↔ `firebase_uid`) stored in Firestore (e.g., `user_identity_links/{supabaseUid}`) and referenced by every migrated document.
  - Extend domain models to carry both IDs temporarily; add validation to ensure cross-store ownership checks pass.
- Migrate historical data behind a feature flag:
  - Export via Supabase SQL/APIs, transform to Firestore documents (Cloud Run job or scripts).
  - Backfill Firestore `created_at/updated_at` using Supabase timestamps to preserve ordering.
  - Reconcile counts & hashes post-import before enabling Firestore reads.
- Update repositories to emit Firestore streams in shadow mode (compare payloads against Supabase results, log diffs).
- Block Firebase Auth cutover until data parity metrics pass in staging.

### Phase 3 – Authentication Cutover
- Implement Firebase Auth repository (email/password, OAuth providers parity) that looks up the `user_identity_links` document to recover Supabase IDs during the dual-write window.
- Keep Riverpod auth providers reading Supabase for session management while Bloc spike proves replacement; Sequence: add Firebase session listeners, then flip reads once data migration is stable.
- Build Supabase → Firebase auth migration utility:
  - Export Supabase users, import into Firebase Auth with preserved emails/phone numbers/custom claims.
  - Populate `user_identity_links` entries and attach custom claims required by security rules.
  - For users onboarded mid-rollout, funnel Supabase auth webhooks into Firestore to keep mappings fresh.
- Rollout plan: enable Firebase Auth in staging while Supabase auth remains source of truth, monitor dual-write dashboards, then promote Firebase to primary and retire Supabase auth tokens.

### Phase 4 – Notifications & Realtime
- Configure Firebase Cloud Messaging (FCM) tokens & topic subscription strategy.
- Build Cloud Functions or Cloud Messaging rules for shared events + availability signals.
- Replace Supabase realtime listeners with Firestore snapshot listeners or Cloud Functions triggers.
- Update backend-driven notifications (SMS/email) to integrate with Firebase (Cloud Functions + Twilio/Resend if still required).

### Phase 5 – Crashlytics & Analytics
- Add Crashlytics initialization gates for every platform (with consent toggles).
- Define analytics events (calendar viewed, event created, share initiated, etc.) and wire via `FirebaseAnalytics`.
- Ensure Sentry remains opt-in, forwarding only non-PII breadcrumbs when enabled.

### Phase 6 – Bloc/Cubit Adoption
- Establish folder structure: `lib/app`, `lib/core`, `lib/features/<feature>/bloc`, etc.
- Convert Riverpod providers to Bloc/Cubit iteratively: start with authentication, then calendar view, contacts, settings.
- Introduce `BlocProvider`/`BlocListener` wiring, remove Riverpod dependencies as features convert.
- Update tests to use `bloc_test` & `mocktail` (or keep Mockito if necessary).

### Phase 7 – QA, Documentation, & Cleanup
- Update documentation: tech stack reference, deployment checklist, environment setup guides.
- Remove Supabase packages, env vars, and unused functions after successful cutover.
- Run full manual regression, golden tests, integration tests.
- Prepare rollout communications (release notes, alert ops).

## 3. Supabase ➜ Firebase Mapping Inventory

| Supabase asset | Firebase replacement | Security rules / IAM | Cloud Function / Automation |
| --- | --- | --- | --- |
| `profiles`, `user_settings`, `customer_flags` | `users` collection (`users/{firebaseUid}`) with subcollections for settings & flags | `users/{id}` readable by owner via `request.auth.uid == resource.id`; admin claims for support tooling | HTTP callable for profile updates that validates owner; scheduled function to sync legacy Supabase-only fields until sunset |
| `events`, `event_attendees`, `event_categories` | `calendars/{calendarId}/events/{eventId}` with embedded attendee array; optional `event_categories` collection | Rules require matching `owner_uid` and membership of shared calendar; composite index on `owner_uid + start_ts` | Cloud Function to mirror Supabase changes during dual-write; scheduled cleanup to prune orphaned events |
| `calendar_visibility`, `calendars` | `calendars/{calendarId}` documents plus `visible_calendars` subcollection | Visibility reads gated by `request.auth.uid` match; writes allowed to owners only | Callable to upsert visibility sets invoked by app during dual-write |
| `availability_signals` | `signals/{signalId}` with `signal_shares` subcollection or `sharedWith` map | Rules check `owner_uid` for writes and ensure `sharedWith` entries reference existing users via custom claim | Cloud Function to expire signals, publish FCM notifications, and replicate Supabase updates during bridge period |
| `signal_shares` | `signals/{signalId}/shares/{shareId}` | Require either `owner_uid` or `shared_with_uid` == `request.auth.uid`; prevent arbitrary share escalation via validation | Trigger to fan out notifications & analytics; importer job to backfill shares from Supabase |
| `notifications`, `reminders`, `notification_settings` | `users/{uid}/notifications` and `users/{uid}/reminders` | User-only access enforced by nested path; custom claims for delegated support read | Cloud Function to deliver reminders (replacing Supabase cron); topic-based FCM messaging |
| `contacts`, `contact_labels`, `contact_requests` | `users/{uid}/contacts/{contactId}` with subcollections for labels/requests | Rules ensure only owners modify contacts; shared contact metadata guarded by reciprocal claims | Callable for invitation lifecycle; Firestore trigger to create reciprocal entries |
| `sms_conversations`, `sms_message_queue` | `users/{uid}/sms_conversations/{conversationId}` + `users/{uid}/sms_queue/{messageId}` | Restrict by owner UID; protect PII with separate location + CMEK | HTTP Cloud Function replacing `handle-inbound-sms`, using Twilio validation via Secret Manager |
| `email_jobs`, Resend webhook state | `users/{uid}/email_jobs/{jobId}` | Owner read/write; Cloud Function service account write | Callable/HTTP Cloud Functions replacing `send-contact-invitation-email` with retry + logging |
| Supabase storage (profile photos, attachments) | Firebase Storage buckets segmented per environment | Storage rules reference custom claims and document ownership | Cloud Function to copy existing assets + rewrite URLs in Firestore |

**Cloud Function parity tasks**
- `handle-inbound-sms` ➜ HTTP Cloud Function with Twilio signature validation, writes to `sms_conversations`, triggers AI agent Pub/Sub if needed.
- `send-contact-invitation-email` ➜ Callable Cloud Function using Resend API, enforces rate limits via Firestore counters or Redis.
- `send-contact-invitation-sms` ➜ Callable/HTTP Cloud Function wrapping Twilio SMS send with quota checks.
- `resend-verification-email` ➜ Callable Cloud Function leveraging Firebase Auth `generateEmailVerificationLink` and Firestore audit log.
- `_shared` utilities ➜ Shared TypeScript module deployed via Firebase Functions `lib/` folder with Secret Manager integration for Twilio/Resend keys.

## 4. Required Deliverables Per Phase
- Terraform/CLI scripts for Firebase project bootstrap.
- Data migration playbooks & validation checklists.
- Updated CI/CD scripts (e.g., `flutterfire configure`, Crashlytics symbol upload).
- Comprehensive developer onboarding doc for new stack.
- Sunset plan for Supabase infrastructure (DB backups, function decommission).

## 5. Open Questions
- Does the product still require Supabase Edge Functions (SMS/email)? If yes, port to Cloud Functions.
- Any regulatory requirements (HIPAA/GDPR) impacting Firebase data residency?
- Offline-first requirements that may influence Firestore caching/hydrated bloc usage?
- Need for multi-tenant separation beyond Firebase projects (custom claims?).

## 6. Next Steps
- Approve this roadmap and decide on phase sequencing with product.
- Stand up Firebase dev project & commit baseline configuration files.
- Create tickets per phase with engineering estimates.
- Begin Phase 1 spikes (dependencies + sample Bloc integration).

---
Maintaining this doc in-source will help track progress and ensure all engineering, QA, and documentation updates stay aligned during the migration. Update section statuses as each phase lands.
