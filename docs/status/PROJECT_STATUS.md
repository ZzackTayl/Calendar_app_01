# MyOrbit Calendar – Project Status

**Last updated:** October 30, 2025  
**Maintainer:** MyOrbit engineering  
**Repository:** https://github.com/MyOrbitCalendar/MyOrbit  
**Overall status:** 🚧 UI and service work remain feature-complete for offline preview. Firebase integration and Bloc/Cubit migration are mid-flight, and automated QA still requires reactivation before shipping.

---

## Build & QA snapshot

| Check | Result | Notes |
| --- | --- | --- |
| `flutter analyze` | ❌ 22 issues | Analyzer trips over the coexistence of legacy Riverpod specs and the new clean-architecture Bloc modules (`presentation/bloc/user/*`). Stale mock files (`*.mocks.dart`) and imports from the pre-migration providers must be removed or regenerated before the Bloc layer can own analysis. |
| `flutter test` | ❌ Compilation blocked | Riverpod-era tests reference deleted mocks and the renamed `UserProfile.avatarUrl` field. New Bloc-focused test coverage has not landed yet, and `flutter gen-l10n` must run to unblock widget/golden specs. |
| Device builds (`flutter run`) | 🚧 Needs rerun | Navigation/back-stack fix and new gradient surfaces have not been smoke-tested on iOS/Android/web. |
| Firebase-connected flows | 🚧 Not wired | App currently runs in offline preview via `DevDataService` and mock `UserRemoteDataSource`. Firebase Auth/Firestore wiring is in progress; no live validation yet. |

### What changed since October 24, 2025?
1. **Bloc + Firebase migration kicked off:** Introduced `lib/data/`, `lib/domain/`, and `lib/presentation/bloc/user/` layers, added clean architecture contracts, and updated docs to reflect Firebase as the target backend.  
2. **Navigation reliability:** Dashboard cards, CTAs, and notifications now use `context.push(...)` so the in-app back button consistently returns to the previous screen.  
3. **Consistent chrome:** New `AppGradientBackground` widget applied to modernized screens for a matching dark/light gradient.  
4. **Data export foundation:** Domain model (`DataExportRequest`), Supabase API (`DataExportApi`), and consolidated schema add first-party export support.  
5. **Environment configuration:** `Env` now exposes support, Discord, and help URLs to unblock future settings work.  
6. **Documentation refresh:** README, status/status docs, and flow guides re-audited (Oct 29) to reflect the Riverpod-first implementation and the legacy BLoC debt that blocks analyzer/tests.  

---

## Architecture snapshot (end-to-front)

### Frontend
- **Framework:** Flutter 3.35 + Dart 3.9 (FVM).  
- **Navigation:** `GoRouter` with `AppShell` bottom nav. All primary entry points (`/dashboard`, `/calendar`, `/activity`, `/people`, `/settings`, etc.) now rely on `context.push`/`pop` to preserve history.  
- **State management:** Flutter Bloc + Cubit power new feature modules (`presentation/bloc/user`). Riverpod providers continue to back existing screens during the transition and will be removed once Bloc coverage expands.  
- **Theming:** `AppPalette`, `AppGradients`, and the new `AppGradientBackground` ensure unified backgrounds for dark/light themes.  
- **Offline mode:** `DevDataService` and rich mock providers back every primary screen so the UI runs without a backend.

### Domain & services
- Domain models live in `lib/domain/` (contacts, events, permissions, notifications, **new** `DataExportRequest`, user aggregates).  
- Repository implementations now sit in `lib/data/`, targeting Firebase-backed data sources; current `UserRemoteDataSourceImpl` uses mocks until Firestore is wired. Legacy Supabase services remain under `logic/services/` for reference and will be replaced as migration progresses.  
- Settings & profile providers extend `SettingsController` and `UserProfileService` to expose configuration, theme, and data export hooks.  
- Error handling standardised via `Result<T>` patterns (`Success`/`Failure`).

### Backend integration
- **Firebase configuration:** Packages are staged for integration (`firebase_core`, `cloud_firestore`, `firebase_auth`, analytics/messaging/crashlytics). Platform-specific configuration files (`google-services.json`, `GoogleService-Info.plist`) still need to be generated per environment.  
- **Data sources:** `UserRemoteDataSourceImpl` currently mocks Firebase responses; Firestore-backed implementations and security rules are tracked in `docs/MIGRATION_TO_FIREBASE_AND_BLOC.md`.  
- **Legacy Supabase assets:** Consolidated schema and edge functions remain in `/supabase` for historical reference but are no longer part of the production deployment path. Deprecation plan tracked in the migration doc.

---

## Product surface status (November 2025)

| Surface | Status | Notes |
| --- | --- | --- |
| **Dashboard & Home** | ✅ Shipping (UI) | Widgets load from mock data; quick actions route with proper back-stack behaviour. Live metrics require Firebase read models once Firestore integration lands. |
| **Calendar & Events** | ✅ Shipping (UI) | Day/Week/Month views stable after text-scale fixes. Invite sheet, recurrence, buffers, attendees ready. Persistence remains offline until Firestore repositories replace mocks. |
| **Signals / My Orbit** | ✅ Shipping (UI) | Contact management, pending invitations, permission chips, and signal center filters polished. Needs live partner data from Firebase-backed repositories. |
| **Notifications** | ✅ Shipping (UI) | Badge counts, clear-all, CTA now maintain navigation history. Listener services still seeded locally. |
| **Settings** | ✅ Shipping (UI) | Theme toggle, privacy defaults, timezone summary, **new** data export entry. Export action awaits Firebase Cloud Functions wiring. |
| **Auth & Onboarding** | ⚠️ Blocked on backend | Flows exist but throw explicit errors until Firebase Auth is configured. |
| **External calendars** | ⚠️ Untested | Google/Apple bridges compiled but need device validation. |
| **Realtime / Cloud functions** | ⚠️ Awaiting deployment | Firebase Cloud Functions + Messaging strategy not yet implemented; Supabase edge functions remain as legacy reference. |

---

## Testing & QA

- **Automated tests:** Widget/unit suite remains partially red due to missing localization output. Remediation: run `flutter gen-l10n`, commit generated files, and re-run `flutter test`.  
- **Golden tests:** Need regeneration after the latest UI tweaks once localization is fixed.  
- **Accessibility:** Calendar and dashboard fixes from Oct 23 remain unverified on devices (screen readers, large-text, high-contrast).  
- **Manual smoke tests pending:** Dashboard → Calendar → My Orbit → Notifications loop, settings data export dialog, and account recovery flow should be exercised once assets regenerate.

---

## Documentation health

- ✅ **Updated:** This status report, root `README.md`, and flow documentation (`docs/features/CONTACTS_FLOW.md`, `docs/features/CONTACTS_README.md`).  
- ✅ **Indexed:** `docs/README.md` refreshed with current pathways and highlights.  
- ⚠️ **Needs review:** Legacy “complete” guides under `docs/features/` (e.g., Apple Calendar, realtime) still read as production-ready. Add banners clarifying revalidation is required.  
- ⚠️ **Setup docs:** `docs/setup/QUICK_START_BACKEND.md` now tracks Firebase setup. Expand with Firestore security rules, CLI tooling, and localization reminders.  
- 📦 **Legacy docs:** Supabase-specific guides remain in `/supabase` and `docs/REALTIME_*.md`; keep them marked as archival references during migration.  
- 📌 **Action:** Maintain this page whenever analyzer/test/device status changes; link new subsystem docs from the docs index.

---

## Next steps (engineering backlog)

1. **Finish Bloc migration** – Expand Bloc/Cubit coverage beyond user flows, retire redundant Riverpod providers, and regenerate/remove stale mocks blocking analyzer/tests.  
2. **Wire Firebase data sources** – Implement Firestore-backed `UserRemoteDataSource`, configure Firebase Auth, and introduce environment-driven Firebase options for each platform.  
3. **Restore localisation assets** – Run `flutter gen-l10n`, commit outputs, and unblock widget/golden suites.  
4. **Smoke test navigation fixes** – Validate back-button behaviour on iOS, Android, and macOS/web once Firebase wiring lands.  
5. **Document Firebase operations** – Add security rules, CI deployment steps, and data export guidance for Firebase Cloud Functions.  
6. **Re-certify external integrations** – Re-test Google/Apple calendar bridges, SMS/email workflows (migrated to Firebase Functions), and update guides with findings.  
7. **Accessibility verification** – Execute device-based WCAG checks (contrast, large text, screen readers) and update QA docs.

---

## Quick reference

- Offline preview data lives in `lib/logic/services/dev_data_service.dart`.  
- Navigation shell: `lib/ui/app_shell.dart`.  
- Data export entry points: `lib/logic/services/data_export_api.dart`, `lib/domain/data_export_request.dart`, `lib/ui/screens/settings_screen.dart`.  
- Firebase data source stubs: `lib/data/datasources/remote/user_remote_data_source.dart`, `lib/data/repositories/user_repository.dart` (replace mocks with Firestore).  
- Legacy Supabase configuration remains at `lib/core/env.dart` + `supabase/` for archival reference.  
- Work summary archive: [`OCTOBER_24_2025_WORK_SUMMARY.md`](../../OCTOBER_24_2025_WORK_SUMMARY.md).

---

_Keep this document as the single source of truth for engineering readiness. Update after every significant feature landing, build status change, or infrastructure deployment._
