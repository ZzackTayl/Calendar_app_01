# Firebase Migration: Phase Reshuffle Briefing

## Audience
- Backend squad (Supabase → Firebase transition)
- Mobile squad (Flutter client owners)

## Purpose
Align on the updated migration sequence (data-first) and capture ownership/questions before execution begins.

## Talking Points
1. **Phase sequencing**
   - Phase 2 now focuses on Firestore schema + dual-write bridge.
   - Phase 3 handles Firebase Auth cutover once data parity is proven.
   - Riverpod → Bloc remains isolated (Phase 6) to avoid refactor overlap.
2. **Dual-write bridge expectations**
   - Repositories write to Supabase + Firestore while reads stay on Supabase until parity.
   - `user_identity_links/{supabaseUid}` documents map Supabase IDs to Firebase UIDs.
   - Shadow reads compare Supabase vs Firestore payloads and surface diffs.
3. **Inventory overview** (excerpt from roadmap table)
   - `events` & `event_attendees` → `calendars/{calendarId}/events/{eventId}`.
   - `availability_signals` & `signal_shares` → `signals/{signalId}` + `shares/`.
   - `sms_conversations` → `users/{uid}/sms_conversations/` with HTTP Cloud Function replacing `handle-inbound-sms`.
   - `notifications`/`reminders` → `users/{uid}/notifications` & `reminders` collections.
4. **Cloud Functions parity**
   - Deno functions (`handle-inbound-sms`, `send-contact-invitation-email`, etc.) to be ported to Firebase Functions with Secret Manager.
5. **Next actions**
   - Collect feedback on sequencing/ownership by <DATE TBD>.
   - Confirm required compliance reviews (GDPR/HIPAA) for data residency.
   - Schedule deep-dive on dual-write bridge implementation details (see sizing below).

-## Suggested Share-Out
- Teams post linking to updated roadmap + this summary.
- 15-minute agenda item in backend/mobile sync to walk through talking points.
- Follow-up doc for questions/decisions (can append to this file).

---

## Dual-Write Bridge & UID Linking – Sizing Breakdown

| Workstream | Description | Owner(s) | Dependencies | Estimate |
| --- | --- | --- | --- | --- |
| Repository bridge | Update API/services to write to both Supabase + Firestore (events, contacts, signals, visibility). Include feature flag + telemetry for diff logging. | Backend squad | Firestore schema finalized; telemetry pipeline | M (1.5 sprint-weeks) |
| UID mapping store | Create `user_identity_links` collection, populate via migration script + runtime creation, enforce referential checks in rules. | Backend squad | Firebase Auth project ready | S (<1 week) |
| Historical data backfill | Export Supabase tables, transform, and bulk import to Firestore with verification hashes + parity dashboards. | Backend squad + data engineer | Bridge infra in place; storage bucket access | L (3 sprint-weeks) |
| Shadow read comparator | Implement service comparing Supabase vs Firestore query results, emit diff metrics to monitoring. | Backend squad | Repository bridge | S (<1 week) |
| Monitoring & alerts | Dashboards for dual-write success rates, UID link coverage, and error alerts. | Backend squad + DevOps | Telemetry endpoints | S (<1 week) |
| Mobile client readiness | Ensure Flutter repositories can ingest Firestore payload shape; add behind-feature-flag toggles. | Mobile squad | Firestore schema definitions | M (1 sprint-week) |
| Auth interop prep | Extend auth providers to locate Supabase ID via `user_identity_links` during dual-write window. | Mobile squad | UID mapping store | S (<1 week) |

> **Sizing legend**: S ≈ <1 week, M ≈ 1–2 weeks, L ≈ 3+ weeks (per squad, assuming single-stream focus).

### Ticket Seed List (example IDs to create in tracker)
1. Draft Firestore write adapters for events/contacts/signals (bridge feature flag).
2. Implement `user_identity_links` schema + backfill CLI.
3. Build Supabase → Firestore data export/import pipeline for core tables.
4. Create shadow-read diff service & logging dashboard.
5. Port `handle-inbound-sms` to Firebase Functions with Twilio signature check.
6. Port `send-contact-invitation-email` to Firebase Functions with rate limiting.
7. Update Flutter repositories to read Firestore models under feature flag.
8. Extend auth providers to resolve Supabase IDs from Firestore mappings.

Use these seeds to open actual tickets with squad-specific details/assignees.
