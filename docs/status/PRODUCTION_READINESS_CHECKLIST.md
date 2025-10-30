# Production Readiness Checklist – Firebase + Bloc

**Last updated:** October 30, 2025  
**Context:** The codebase is migrating from Supabase + Riverpod to Firebase + Flutter Bloc/Cubit. Use this checklist to track the remaining work required before a Firebase-backed launch.

---

## 1. Architecture & State Management
- [ ] Port remaining feature areas from Riverpod providers to Bloc/Cubit and remove unused providers.
- [ ] Delete or regenerate stale test fixtures (`*.mocks.dart`) that block `flutter analyze` and `flutter test`.
- [ ] Add Bloc-focused unit/widget tests for user management and any migrated features.
- [ ] Document Bloc usage patterns in `docs/guides/DEVELOPER_GUIDE.md`.

## 2. Firebase Integration
- [ ] Generate `firebase_options_*.dart` for dev/staging/prod and wire environment switching through `APP_ENV`.
- [ ] Implement Firestore-backed `UserRemoteDataSource` and repositories; confirm CRUD parity with mock data.
- [ ] Configure Firebase Authentication (email/password + OAuth providers) and connect it to the domain layer.
- [ ] Author Firestore security rules covering calendars, events, contacts, signals, and audit logs.
- [ ] Migrate Supabase data (if any) or seed canonical Firebase documents for QA.
- [ ] Set up Firebase Cloud Functions for invitations, notifications, data export, and analytics fan-out.
- [ ] Add Firebase Analytics, Crashlytics, and optional App Check instrumentation gated by feature flags.

## 3. Tooling & Automation
- [ ] Update CI (GitHub Actions) to run `flutter analyze`, `flutter test`, and build artifacts with Firebase configs.
- [ ] Create deployment scripts for Firebase Functions (`firebase deploy`) with environment separation.
- [ ] Document secrets management for local development and CI (service accounts, API keys).

## 4. QA & Testing
- [ ] Regenerate localization assets (`flutter gen-l10n`) and un-skip localization-dependent tests.
- [ ] Restore golden/widget/unit tests to green; ensure new Bloc modules have positive coverage.
- [ ] Run manual smoke tests on iOS, Android, web, and macOS once Firebase wiring is in place.
- [ ] Execute accessibility audits (contrast, large text, screen readers) on real devices.

## 5. Product & Operations
- [ ] Update product analytics/telemetry dashboards to read from Firebase event streams.
- [ ] Refresh customer support runbooks to reference Firebase console workflows instead of Supabase.
- [ ] Review privacy/security docs to reflect Firebase data storage and access patterns.
- [ ] Prepare production monitoring (Crashlytics alerts, SLA dashboards, incident response).

---

Track progress by ticking the boxes as tasks land. Keep this synced with the main [`PROJECT_STATUS`](PROJECT_STATUS.md) report.
