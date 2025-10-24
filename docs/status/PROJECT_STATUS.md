# MyOrbit Calendar – Project Status

**Last updated:** October 24, 2025  
**Maintainer:** MyOrbit engineering  
**Repository:** https://github.com/MyOrbitCalendar/MyOrbit  
**Overall status:** 🚧 UI and service work are feature-complete for offline preview; Supabase-backed flows and automated QA still require reactivation before shipping.

---

## Build & QA snapshot

| Check | Result | Notes |
| --- | --- | --- |
| `flutter analyze` | ✅ Clean | Last full run on 2025‑11‑19. No analyzer regressions introduced by the latest UI/Navigation updates. |
| `flutter test` | ⚠️ 459 passing / 21 failing | Every failure originates from missing localization output (`package:flutter_gen/gen_l10n/app_localizations.dart`). Run `flutter gen-l10n` (or `flutter pub run flutter_gen`) before treating results as authoritative. |
| Device builds (`flutter run`) | 🚧 Needs rerun | Navigation/back-stack fix and new gradient surfaces have not been smoke-tested on iOS/Android/web. |
| Supabase-connected flows | 🚧 Disabled | App still operates in offline preview via `DevDataService`. No 2025 validation against live Supabase instances. |

### What changed since October 24, 2025?
1. **Navigation reliability:** Dashboard cards, CTAs, and notifications now use `context.push(...)` so the in-app back button consistently returns to the previous screen.  
2. **Consistent chrome:** New `AppGradientBackground` widget applied to modernized screens for a matching dark/light gradient.  
3. **Data export foundation:** Domain model (`DataExportRequest`), Supabase API (`DataExportApi`), and consolidated schema add first-party export support.  
4. **Environment configuration:** `Env` now exposes support, Discord, and help URLs to unblock future settings work.  
5. **Documentation refresh:** README, status reports, and work summaries updated to reflect the current release train (see [`OCTOBER_24_2025_WORK_SUMMARY.md`](../../OCTOBER_24_2025_WORK_SUMMARY.md)).

---

## Architecture snapshot (end-to-front)

### Frontend
- **Framework:** Flutter 3.35 + Dart 3.9 (FVM).  
- **Navigation:** `GoRouter` with `AppShell` bottom nav. All primary entry points (`/dashboard`, `/calendar`, `/activity`, `/people`, `/settings`, etc.) now rely on `context.push`/`pop` to preserve history.  
- **State management:** Riverpod (`ref.watch`/`notifier`) across screens and services.  
- **Theming:** `AppPalette`, `AppGradients`, and the new `AppGradientBackground` ensure unified backgrounds for dark/light themes.  
- **Offline mode:** `DevDataService` and rich mock providers back every primary screen so the UI runs without a backend.

### Domain & services
- Domain models live in `lib/domain/` (contacts, events, permissions, notifications, **new** `DataExportRequest`).  
- Service layer in `lib/logic/services/` wraps Supabase clients, device integrations, Google/Apple calendar bridges, and offline caches.  
- Settings & profile providers extend `SettingsController` and `UserProfileService` to expose configuration, theme, and data export hooks.  
- Error handling standardised via `Result<T>` patterns (`Success`/`Failure`).

### Backend integration
- **Supabase schema:** Consolidated into `supabase/schema/000_corrected_schema_complete.sql`. Legacy migrations archived under `supabase/schema/archive/`.  
- **Data export table:** Added RLS-secured `data_export_requests` table (see `archive/013_data_export_requests.sql`).  
- **Edge functions:** Email/SMS/AI agents remain in `/supabase/functions/` but require credential provisioning.  
- **Environment management:** `.env` keys differentiate dev/staging/prod Supabase instances; defaults fall back to safe placeholders.

---

## Product surface status (November 2025)

| Surface | Status | Notes |
| --- | --- | --- |
| **Dashboard & Home** | ✅ Shipping (UI) | Widgets load from mock data; quick actions route with proper back-stack behaviour. Requires Supabase reconnection for real metrics. |
| **Calendar & Events** | ✅ Shipping (UI) | Day/Week/Month views stable after text-scale fixes. Invite sheet, recurrence, buffers, attendees ready. Persistence still offline. |
| **Signals / My Orbit** | ✅ Shipping (UI) | Contact management, pending invitations, permission chips, and signal center filters polished. Needs live partner data. |
| **Notifications** | ✅ Shipping (UI) | Badge counts, clear-all, CTA now maintain navigation history. Listener services still seeded locally. |
| **Settings** | ✅ Shipping (UI) | Theme toggle, privacy defaults, timezone summary, **new** data export entry. Export action awaits Supabase deployment. |
| **Auth & Onboarding** | ⚠️ Blocked on backend | Flows exist but throw explicit errors without Supabase credentials. |
| **External calendars** | ⚠️ Untested | Google/Apple bridges compiled but need device validation. |
| **Realtime / Edge functions** | ⚠️ Awaiting deployment | Implementation complete, but realtime toggles and edge function deployments are paused. |

---

## Testing & QA

- **Automated tests:** Widget/unit suite remains partially red due to missing localization output. Remediation: run `flutter gen-l10n`, commit generated files, and re-run `flutter test`.  
- **Golden tests:** Need regeneration after the latest UI tweaks once localization is fixed.  
- **Accessibility:** Calendar and dashboard fixes from Oct 23 remain unverified on devices (screen readers, large-text, high-contrast).  
- **Manual smoke tests pending:** Dashboard → Calendar → My Orbit → Notifications loop, settings data export dialog, and account recovery flow should be exercised once assets regenerate.

---

## Documentation health

- ✅ **Updated:** This status report, root `README.md`, and engineering work summary (`OCTOBER_24_2025_WORK_SUMMARY.md`).  
- ✅ **Indexed:** `docs/README.md` refreshed with current pathways and highlights.  
- ⚠️ **Needs review:** Legacy “complete” guides under `docs/features/` (e.g., Apple Calendar, realtime) still read as production-ready. Add banners clarifying revalidation is required.  
- ⚠️ **Setup docs:** `docs/setup/SUPABASE_SETUP.md` walks through schema deployment but does not mention running `flutter gen-l10n`. Add a note when regenerating localisation assets.  
- 📌 **Action:** Maintain this page whenever analyzer/test/device status changes; link new subsystem docs from the docs index.

---

## Next steps (engineering backlog)

1. **Restore localisation assets** – Run `flutter gen-l10n`, commit outputs, and unblock tests/goldens.  
2. **Smoke test navigation fixes** – Validate back-button behaviour on iOS, Android, and macOS/web.  
3. **Reconnect Supabase (staging)** – Provision `.env`, enable realtime on tables, run consolidated schema, and exercise auth + data export flows.  
4. **Document data export ops** – Add runbooks describing expected job processing, download handling, and support surfaces.  
5. **Re-certify external integrations** – Re-test Google/Apple calendar bridges, SMS/email edge functions, and update guides with findings.  
6. **Accessibility verification** – Execute device-based WCAG checks (contrast, large text, screen readers) and update QA docs.

---

## Quick reference

- Offline preview data lives in `lib/logic/services/dev_data_service.dart`.  
- Navigation shell: `lib/ui/app_shell.dart`.  
- Data export entry points: `lib/logic/services/data_export_api.dart`, `lib/domain/data_export_request.dart`, `lib/ui/screens/settings_screen.dart`.  
- Supabase configuration: `lib/core/env.dart`, `supabase/schema/000_corrected_schema_complete.sql`.  
- Work summary archive: [`OCTOBER_24_2025_WORK_SUMMARY.md`](../../OCTOBER_24_2025_WORK_SUMMARY.md).

---

_Keep this document as the single source of truth for engineering readiness. Update after every significant feature landing, build status change, or infrastructure deployment._
