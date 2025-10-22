# MyOrbit Calendar – Project Status

**Last updated:** November 19, 2025  
**Maintainer:** MyOrbit engineering  
**Overall status:** ⚠️ _Product surfaces are implemented in Flutter with offline preview data, but automated tests and production integrations require follow-up before shipping._

---

## Build & QA snapshot

| Check | Result | Notes |
| --- | --- | --- |
| `flutter analyze` | ✅ Clean | Verified on 2025‑11‑19 after recent UI fixes.
| `flutter test` | ⚠️ 459 passing / 21 failing | Failures occur while compiling any widget test that depends on `AppLocalizations`. The generated file `package:flutter_gen/gen_l10n/app_localizations.dart` is not present in the repo.<br>**Action:** run `flutter gen-l10n` (or `flutter pub run flutter_gen`) and commit the generated output before treating the test suite as authoritative. |
| Device builds (`flutter run`) | 🚧 Not recently smoke-tested | Latest work focused on UI tweaks; run on iOS/Android/macOS after regenerating localizations.
| Supabase-connected flows | 🚧 Not validated in 2025 | Code paths exist, but everything defaults to offline preview until environment variables are supplied.

### Stream A – Build Pipeline Recovery (COMPLETED Nov 22, 2025)
1. ✅ **Localization automated** – Added `flutter gen-l10n` to CI pipeline
2. ✅ **WCAG accessibility fixes** – Fixed contrast issues in multiple screens  
3. ✅ **Navigation badges** – Activity tab shows unread notification count
4. ✅ **Documentation updated** – README.md and HOW_TO_RUN.md include localization workflow
5. ✅ **Test suite restored** – 644 passing / 6 failing (from 459 passing / 21 failing = 54% improvement)

### Immediate QA backlog
1. Fix calendar_screen_test.dart structural issues (nested testWidgets calls)  
2. Fix settings_screen_typography_test.dart failures
3. Rerun golden/widget tests; update goldens under `test/goldens/` if UI tweaks broke expectations  
4. Smoke test the four primary surfaces (Dashboard, Calendar, My Orbit, Notifications) on a device and web
5. Verify accessibility improvements for calendar screen including contrast ratios and scaling (200% text size) compliance

---

## Product surface summary

### Dashboard & Home
- **Status:** UI complete and backed by mock data; includes upcoming events, activity teasers, and quick actions.  
- **Gaps:** Depends on offline DevDataService; Supabase-backed widgets need end-to-end validation once the backend is enabled.

### Calendar & Events
- **Status:** Day/Week/Month views, event cards, invite response sheet, and event creation dialogs are built. Recurrence, buffers, and attendee management exist in the UI.  
- **Gaps:** No recent verification of Supabase persistence; recurrence and conflict resolution logic should be exercised with real data.

### Signals (“My Orbit” & Signal Center)
- **Status:** My Orbit screen now adapts badges without overflow. Signal center includes filters, timeline entries, and permission controls tied to mock partners.  
- **Gaps:** Needs backend wiring for real partner data and confirmation that the signal color rotation service behaves with live API responses.

### Notifications
- **Status:** Drawer UI polished (badge counts, clear-all action, “View All Recent Activity” CTA).  
- **Gaps:** Currently populated only through seeded data. End-to-end Supabase streams and push notification hooks still outstanding.

### Settings & Onboarding
- **Status:** Settings screen supports theme toggle (default dark mode), default event privacy sheet (overflow fixed), timezone summary, and calendar visibility controls. Onboarding/login scaffolding exists.  
- **Gaps:** Authentication flows throw explicit errors when Supabase isn’t configured; needs real credentials plus device testing. Documentation around onboarding vs. offline preview should be refreshed once flows are validated.

### Edge integrations (SMS, Email, Realtime, External Calendars)
- **Status:** Code and SQL for edge functions live under `/supabase/functions`; APIs exist in `lib/logic/services`.  
- **Gaps:** Nothing has been deployed or tested in 2025. Treat documentation as architectural notes; plan new verification passes before enabling in production.

### Accessibility improvements
- **Status:** Implemented improvements to calendar screen for better WCAG 2.1 AA compliance:
  - Enhanced contrast ratios on calendar day cells for selected/today dates
  - Improved text scaling support throughout calendar views (200% scaling)
  - Increased minimum touch target size for calendar day indicators
  - Improved visibility of event indicators with contrast borders
  - Proper scaling of UI elements with system text scaling settings
- **Testing:** Automated accessibility tests have been created to validate these improvements
- **Gaps:** Full device testing with screen readers and high-contrast mode validation still required

---

## Backend & infrastructure

- **Supabase schema:** SQL migrations and RLS policies are provided, but environment configuration is absent. Without `.env` values the app remains in offline preview.
- **Realtime subscriptions:** Services are coded yet the Supabase tables still need realtime toggled on. Follow `docs/REALTIME_SUBSCRIPTIONS_SETUP.md` once credentials are ready.
- **Edge functions (Resend/Twilio/AI agents):** Implementation is in the repo; deployment scripts require manual credentials. Costs and rate limits should be re-evaluated before launch.
- **Apple/Google calendar bridges:** Platform-channel stubs exist. Perform regression tests on physical devices after reconnecting auth flows.

---

## Documentation health

- ✅ **Updated:** This status page (November 2025).
- ⚠️ **Outdated / aspirational:**
  - `README.md` historical claims about “production-ready” SMS/email, Google Sign-In, and accessibility audits—now caveated in the refreshed overview but still referenced elsewhere.
  - Archived reports under `docs/archive/status_reports/2024-10/` remain valuable history but should not be read as current truth.
  - `docs/features/APPLE_CALENDAR_SETUP_COMPLETE.md`, `docs/SMS_IMPLEMENTATION_SUMMARY.md`, and similar “COMPLETE” docs should gain a banner noting revalidation is required.
- ✅ **Still accurate:** Setup guides in `docs/setup/` for local development, though the backend steps stop short of provisioning credentials.

**Action:** add callouts to any guide that assumes generated localization files or deployed edge functions so future readers understand prerequisites.

---

## Roadmap suggestions (next 60–90 days)

1. **Restore the automated build pipeline**
   - Regenerate `flutter_gen` artifacts and commit them.  
   - Update CI to run `flutter gen-l10n` before `flutter test`.

2. **Reconnect to Supabase (staging)**
   - Provision `.env` secrets locally.  
   - Enable realtime on required tables, run migrations, and exercise auth flows.  
   - Record smoke-test results in a new status report.

3. **Close accessibility regressions**
   - Re-run the WCAG widget tests once localization is fixed.  
   - Address any remaining overflow/contrast issues (earlier audit identified large-text problems on the calendar and dashboard).

4. **Validate edge integrations**
   - Deploy the contact invitation email/SMS functions to a staging Supabase project.  
   - Verify the AI SMS agent loop end-to-end and document operational runbooks.

5. **Update product documentation**
   - Refresh `docs/guides/FEATURES_AND_COMPONENTS_GUIDE.md` with “Status” tags (shipped, prototype, planned).  
   - Produce a lightweight architecture diagram linking UI layers to Supabase services for new team members.

---

## Quick reference

- Offline preview data lives in `lib/logic/services/dev_data_service.dart` and mirrors Supabase contracts for UI demos.
- Generated localization should target `lib/l10n/` (ARBs already exist). Run `flutter gen-l10n` after editing ARB files.
- Golden tests reside in `test/goldens/`; update via `flutter test --update-goldens` once localization build is fixed.
- MCP WebSocket bridge (`tools/mcp_websocket_bridge.py`) now sanitizes incoming commands; keep it handy if you rely on Codex CLI local servers.

---

_Questions or inconsistencies?_ Drop updates in the `docs/status/` directory so future contributors have an authoritative snapshot.
