# MyOrbit Calendar – Documentation Hub

**Last audited:** October 21, 2025  
**Maintainer note:** All active documentation now lives under the `docs/` directory. Files in `docs/archive/` are historical snapshots and are no longer kept in sync with the codebase.

**🆕 LATEST:** Apple Calendar integration is now complete and verified. See Feature Deep Dives section below for team guide and technical details.

---

## Quick Start
- [`../README.md`](../README.md) – High-level project overview.
- [`setup/HOW_TO_RUN.md`](setup/HOW_TO_RUN.md) – Run the Flutter app on macOS, Windows, or web.
- [`setup/QUICK_START_BACKEND.md`](setup/QUICK_START_BACKEND.md) – Boot Supabase locally in five minutes.

---

## Active Documentation by Category

### Status & Planning
- [`status/PROJECT_STATUS.md`](status/PROJECT_STATUS.md) – Current reality check, open issues, and next steps.
- [`status/DEVELOPER_WORK_REVIEW.md`](status/DEVELOPER_WORK_REVIEW.md) – Prior developer hand-off notes (keep in mind several items are now outdated; see `status/PROJECT_STATUS.md` for the latest view).
- [`BACKEND_INTEGRATION_FIX_PLAN.md`](BACKEND_INTEGRATION_FIX_PLAN.md) – Outstanding Supabase readiness gaps and parallel work plan.
- [`RESEARCH_FOR_FOUNDER.md`](RESEARCH_FOR_FOUNDER.md) – Google Sign-In v7 migration research dossier.

### Setup & Environment
- [`setup/HOW_TO_RUN.md`](setup/HOW_TO_RUN.md) – Local run instructions.
- [`setup/WINDOWS_SETUP.md`](setup/WINDOWS_SETUP.md) – Windows-specific tooling notes.
- [`setup/SUPABASE_SETUP.md`](setup/SUPABASE_SETUP.md) – Configure Supabase projects.
- [`setup/PRODUCTION_SUPABASE_SETUP.md`](setup/PRODUCTION_SUPABASE_SETUP.md) – Production deployment checklist.

### SMS & Email Infrastructure (NEW)
- [`QUICK_START_SMS_DEPLOYMENT.md`](QUICK_START_SMS_DEPLOYMENT.md) – 5-minute setup guide (Resend email + Twilio SMS).
- [`SMS_IMPLEMENTATION_SUMMARY.md`](SMS_IMPLEMENTATION_SUMMARY.md) – Architecture overview, features, cost analysis.
- [`DEPLOYMENT_EDGE_FUNCTIONS.md`](DEPLOYMENT_EDGE_FUNCTIONS.md) – Complete deployment guide with full troubleshooting.

### Development Guides
- [`guides/DEVELOPER_GUIDE.md`](guides/DEVELOPER_GUIDE.md) – Architecture, workflows, and patterns.
- [`guides/FEATURES_AND_COMPONENTS_GUIDE.md`](guides/FEATURES_AND_COMPONENTS_GUIDE.md) – Feature matrix with code entry points.
- [`guides/RESPONSIVE_DESIGN_SPECIFICATION.md`](guides/RESPONSIVE_DESIGN_SPECIFICATION.md) – Layout and breakpoint guidance.
- [`guides/Flutter_Patterns.md`](guides/Flutter_Patterns.md) – Common Flutter idioms in this repo.
- [`guides/PERMISSION_SYSTEM.md`](guides/PERMISSION_SYSTEM.md) – Consent and visibility model.
- [`guides/WIDGET_INSPECTION_SETUP.md`](guides/WIDGET_INSPECTION_SETUP.md) – Widget inspector workflows.
- [`guides/ENCRYPTION_INTEGRATION_GUIDE.md`](guides/ENCRYPTION_INTEGRATION_GUIDE.md) – ⚠️ How to re-enable encryption for production deployment.

### Feature Deep Dives
- **[🆕 REALTIME SUBSCRIPTIONS]** [`REALTIME_SUBSCRIPTIONS_SETUP.md`](REALTIME_SUBSCRIPTIONS_SETUP.md) – **Step-by-step Supabase Dashboard enablement guide** – How to enable realtime for events, contacts, signals, and shares. **READ THIS FIRST before deploying.**
- **[🆕 REALTIME SETUP]** [`REALTIME_ENABLEMENT_CHECKLIST.md`](REALTIME_ENABLEMENT_CHECKLIST.md) – **Complete phase-by-phase checklist** – Verification, testing, troubleshooting, and rollback plan.
- **[🆕 REALTIME TECH]** [`REALTIME_IMPLEMENTATION_SUMMARY.md`](REALTIME_IMPLEMENTATION_SUMMARY.md) – Technical implementation details, code changes, and architecture explanation.
- [`features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md`](features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md) – Service-level sync architecture.
- [`features/START_HERE_REALTIME_SYNC.md`](features/START_HERE_REALTIME_SYNC.md) – Quick manual validation checklist.
- [`features/REALTIME_SYNC_TESTING_GUIDE.md`](features/REALTIME_SYNC_TESTING_GUIDE.md) – End-to-end sync QA scenarios.
- [`features/EXTERNAL_CALENDAR_SYNC_COMPLETE.md`](features/EXTERNAL_CALENDAR_SYNC_COMPLETE.md) – Google Calendar import overview (verify against current Google Sign-In state before use).
- **[🆕 START HERE]** [`features/APPLE_CALENDAR_TEAM_GUIDE.md`](features/APPLE_CALENDAR_TEAM_GUIDE.md) – **Team guide for Apple Calendar integration** – What was built, how to test, what's next. Read this first!
- [`features/APPLE_CALENDAR_SETUP_COMPLETE.md`](features/APPLE_CALENDAR_SETUP_COMPLETE.md) – Apple EventKit technical deep-dive (for engineers wanting code details and architecture).
- [`features/EVENT_INVITE_IMPLEMENTATION_PLAN.md`](features/EVENT_INVITE_IMPLEMENTATION_PLAN.md) – Invite workflow plan.

### Quality & Testing
- [`qa/TESTING.md`](qa/TESTING.md) – Testing strategy and tooling.
- [`qa/TEST_SUMMARY.md`](qa/TEST_SUMMARY.md) – Historical coverage snapshot; cross-check with the latest `flutter test`.
- [`qa/TEST_FAILURE_ANALYSIS.md`](qa/TEST_FAILURE_ANALYSIS.md) – Deep dive on past failures (reference only; see status doc for current blockers).
- [`qa/COMPREHENSIVE_TEST_FAILURE_GUIDE.md`](qa/COMPREHENSIVE_TEST_FAILURE_GUIDE.md) – Categorised failure ledger.

### Operations & Tooling
- [`operations/MCP_SETUP.md`](operations/MCP_SETUP.md) – Model Context Protocol bridge setup.
- [`operations/SENTRY_INTEGRATION_GUIDE.md`](operations/SENTRY_INTEGRATION_GUIDE.md) – Sentry configuration.
- [`operations/SENTRY_MCP_CODEX_SETUP.md`](operations/SENTRY_MCP_CODEX_SETUP.md) – Sentry MCP usage from Codex CLI.
- [`operations/tracinginfo.md`](operations/tracinginfo.md) – Tracing contracts for MCP servers.

### Security
- [`security_assessment_2025-10-20.md`](security_assessment_2025-10-20.md) – Most recent security review and remediation backlog.

### Reference
- [`reference/main.md`](reference/main.md) – Product specification (UI/UX narrative).
- [`reference/techstack.md`](reference/techstack.md) – Technology stack quick facts.
- [`reference/widget_inspection_demo.md`](reference/widget_inspection_demo.md) – Inspector walk-through.
- [`reports/`](reports) – Point-in-time QA and implementation reports.

---

## Archived Material
- [`archive/outdated/`](archive/outdated) – Optimistic “production-ready” reports from early 2025; keep for provenance only.
- [`archive/pre_sync_implementation/`](archive/pre_sync_implementation) – Legacy planning documents from the pre-sync era.

When uncertain, always prefer the active documents above. If an archived file contains information you still need, copy it forward and refresh the content rather than editing in place.

---

## Maintenance Checklist
1. Update [`status/PROJECT_STATUS.md`](status/PROJECT_STATUS.md) whenever build status or scope changes.
2. Keep quick-start docs (`setup/HOW_TO_RUN.md`, `setup/QUICK_START_BACKEND.md`) aligned with the latest dev workflow.
3. Move stale documents into `docs/archive/` with a short note so contributors are not misled.
4. Reflect any new folders or major docs in this index.
