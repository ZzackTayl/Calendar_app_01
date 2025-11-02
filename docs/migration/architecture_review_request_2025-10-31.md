# Architecture Review Request — Supabase Identity Linking Deferral

**Date:** 2025-10-31  
**Requester:** Auth migration working group  
**Audience:** Architecture Guild / Backend Architecture Leads

## Summary
- `docs/migration/supabase_identity_linking.md` documents why the Supabase ↔ Firebase identity-linking bridge is deferred during the current Firebase auth migration.
- The deferral keeps implementation on hold until any Supabase-dependent repositories or historical users require cross-store lookups.
- We need an architecture decision confirming the deferral, the listed revisit triggers, and ownership when the work activates.

## Key Questions for Architecture
1. Does the proposed trigger list capture all scenarios that would force the team to revive identity linking?
2. Are additional safeguards (security rules, audit logging, data retention) required before the mapping collection ships?
3. Which squad should own the work when a trigger fires (backend platform vs. feature squads)?

## Artifacts
- Migration plan: `docs/migration/auth_phase.md`
- Senior review log: `docs/migration/auth_phase_REVIEW_COMMENTS.md`
- Deferral detail: `docs/migration/supabase_identity_linking.md`

## Requested Outcome
- Architecture guild to respond with either:
  - ✅ Approval of the deferral as-is, or
  - ⚠️ Required adjustments (additional triggers, security requirements, or timeline changes).
- Capture the decision in `docs/migration/auth_phase.md` Section 8 once received.

Please add comments directly to the referenced docs or reply in the shared migration thread with the decision so we can update the action checklist.
