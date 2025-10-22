# Production Readiness Playbook (November 2025)

This playbook organizes the remaining work needed to launch MyOrbit with confidence.
It is designed for **two developers working in parallel**. Every task lists the
expected outcome, owners, dependencies, and checklists.

---

## Overview of workstreams

| Stream | Goal | Primary Owner |
| --- | --- | --- |
| A. Build Pipeline Recovery | Restore automated tests by regenerating localization assets and updating CI | Developer A |
| B. Documentation Accuracy & Warnings | Flag aspirational docs, keep the project map honest | Developer B |
| C. Supabase Reconnect & Smoke Tests | Validate real backend flows with staging credentials | Pair (A+B) |
| D. Accessibility Follow-up | Re-run WCAG tests, fix remaining overflow/contrast issues | Developer B (with support) |
| E. Edge Integrations Validation | Deploy and verify email/SMS/AI agent functions | Developer A |

> Tip: open `docs/status/PROJECT_STATUS.md` alongside this playbook to tick items off.

---

## Stream A – Build Pipeline Recovery (Developer A)

**Objective:** ensure `flutter test` succeeds locally and in CI by restoring generated
localization files and updating golden baselines.

1. **Regenerate localization artifacts**
   - Run `flutter gen-l10n` in the repo root.
   - Verify generated outputs land in `lib/l10n/` and `l10n.yaml` references them.
   - Commit the generated Dart files so widget tests can resolve `AppLocalizations`.

2. **Update golden images and widget tests**
   - Run `flutter test --update-goldens` after localization output exists.
   - Re-run `flutter test` to confirm all suites pass.
   - Investigate any remaining failures and note follow-up issues in the status doc.

3. **Automate localization step**
   - Add `flutter gen-l10n` to your pre-commit hook or CI pipeline (`.github/workflows/flutter_ci.yml`).
   - Ensure PRs fail if generated files differ (e.g., check them in or run
     `git diff --exit-code lib/l10n` during CI).

4. **Document the workflow**
   - Append the “Regenerate localization” step to `docs/setup/HOW_TO_RUN.md` and the
     developer onboarding section in `README.md`.

Deliverable: CI green, local test suite passes, documentation updated with the new build step.

---

## Stream B – Documentation Accuracy & Accessibility (Developer B)

**Objective:** keep documentation truthful and close remaining accessibility gaps.

1. **Tag aspirational docs**
   - Insert conspicuous banners at the top of:
     - `docs/features/APPLE_CALENDAR_SETUP_COMPLETE.md`
     - `docs/SMS_IMPLEMENTATION_SUMMARY.md`
     - Any other file claiming “COMPLETE” status that now needs revalidation.
   - Phrase suggestion: “⚠️ Status as of Oct 2024. Re-run validation before treating this as production-ready.”

2. **Audit remaining guides**
   - Cross-check high-traffic docs (`docs/setup/*`, `docs/guides/*`) against the new status report.
   - File issues or TODO comments for any mismatches you find.

3. **Accessibility regression pass**
   - After Stream A restores tests, run the WCAG suites noted in `docs/status/PROJECT_STATUS.md`.
   - Fix contrast/overflow errors (calendar with 200% text scaling was previously flagged).
   - Update status doc with findings and fixes.

Deliverable: no misleading documentation, accessibility suites passing or tracked with actionable issues.

---

## Stream C – Supabase Reconnect & Smoke Tests (Developers A & B)

**Objective:** bring the app out of “offline preview only” by verifying Supabase-backed
flows with staging credentials.

1. **Environment setup**
   - Create or reuse a Supabase project dedicated to staging.
   - Populate `.env.staging` with URL, anon key, service key, Twilio/Resend creds (use 1Password or Vault for storage).
   - Document the env template at `docs/setup/SUPABASE_ENV_TEMPLATE.md`.

2. **Migrations & RLS**
   - Run `supabase db push` (or `supabase migration up`) from repo root.
   - Confirm tables, functions, and policies exist by referencing `supabase/schema/`.

3. **Realtime enablement**
   - Follow `docs/REALTIME_SUBSCRIPTIONS_SETUP.md` to enable realtime on events/contacts/signals/shares.
   - Test via Supabase dashboard or CLI that change feeds are active.

4. **Device smoke tests**
   - Run `flutter run` on Android, iOS (if available), and web.
   - Exercise sign-in, create event, invite partner, send signal, and view notifications.
   - Capture screen recordings or concise test notes.

5. **Update status doc**
   - Summarize observations, successes, and bugs in `docs/status/PROJECT_STATUS.md` under a new “Supabase validation” heading.

Deliverable: app demonstrated working against staging backend; gaps documented with owner + ETA.

---

## Stream D – Edge Integrations Validation (Developer A)

**Objective:** prove the Resend, Twilio, and AI agent functions work end-to-end.

1. **Deploy edge functions**
   - Use `supabase functions deploy <name>` for each function under `supabase/functions/`.
   - Configure environment variables per `docs/QUICK_START_SMS_DEPLOYMENT.md`.

2. **Integration tests**
   - Trigger invitation email/SMS from the app and confirm delivery (use staging email inbox & test phone number).
   - Exercise AI agent conversation loop: send outbound message, reply via webhook, confirm status updates in Supabase.

3. **Monitoring & logging**
   - Enable Supabase logs for the functions and document how to inspect failures.
   - Record runbooks (retry policy, alerting needs) in a new section within `docs/DEPLOYMENT_EDGE_FUNCTIONS.md`.

Deliverable: working edge functions with documented test evidence and operations notes.

---

## Coordination Checklist (Both developers)

- [ ] Kickoff meeting: review this playbook, assign owners, set target dates.
- [ ] Daily sync: share blockers and update the status doc (avoid drifting from reality).
- [ ] Merge discipline: small PRs with passing tests once Stream A is complete.
- [ ] Final sign-off: run a joint demo (backend + accessibility + notifications) before declaring production-ready.

Keep this playbook in version control, updating checkboxes or sections as you progress.
