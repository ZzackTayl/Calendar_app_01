# Supabase ↔ Firebase Identity Linking — Deferral Decision Document

**Decision Date:** 2025-10-31
**Decision Type:** Deferral (conditional)
**Status:** Pending Architecture Guild Approval
**Related Documents:**
- `auth_phase.md` (Section 8)
- `auth_phase_REVIEW_COMMENTS.md` (Decision Log #1)
- `architecture_review_request_2025-10-31.md`

---

## Executive Summary

**Decision:** **DEFER** implementation of Supabase ↔ Firebase identity linking bridge.

**Rationale:**
1. Codebase audit (2025-10-31) reveals **zero active Supabase auth imports** in lib/ directory
2. Firebase auth is fully implemented and functional
3. No evidence of historical Supabase user data requiring migration
4. Identity linking introduces unnecessary complexity without clear business case
5. Can be implemented later if revisit triggers activate

**Risk Level:** **LOW** (conditional on monitoring)

**Recommendation:** Approve deferral with documented revisit triggers and monitoring requirements.

---

## Background

### Original Migration Plan Context

The initial Firebase migration roadmap (`MIGRATION_TO_FIREBASE_AND_BLOC.md`) proposed a **dual-write bridge** strategy:

> "Stand up a dual-write bridge:
> - Introduce repositories that write to both Supabase and Firestore and read from Supabase until parity is verified.
> - Create a deterministic UID mapping (`supabase_user_id` ↔ `firebase_uid`) stored in Firestore (e.g., `user_identity_links/{supabaseUid}`) and referenced by every migrated document."

This approach made sense **if**:
1. Active Supabase auth users existed
2. Historical data required cross-reference
3. Gradual migration from Supabase to Firebase was needed
4. Business continuity required supporting both auth systems

### Current Reality (Codebase Audit 2025-10-31)

**Findings:**
1. ✅ **Zero Supabase auth imports** in lib/ directory
2. ✅ Firebase auth fully implemented (`FirebaseAuthRemoteDataSource`, `AuthCubit`)
3. ✅ DI system toggles between Firebase and mock (not Supabase)
4. ⚠️  Supabase config variables remain in `Env` and `AppConfig` **but are unused**
5. ❌ No evidence of `user_identity_links` collection in Firestore
6. ❌ No dual-write bridge implementation detected

**Conclusion:**
The codebase has **already completed** the Firebase auth migration without implementing identity linking. This suggests either:
- Identity linking was never needed (no historical Supabase users)
- App is in early stage with no production users yet
- Previous migration already handled user transition
- Identity linking was planned but deemed unnecessary during implementation

---

## Technical Analysis

### What Identity Linking Would Provide

**IF** Supabase auth users exist, identity linking would:

1. **User Lookup Across Systems:**
   ```
   Firestore Collection: user_identity_links/{supabaseUid}
   {
     "supabaseUid": "uuid-from-supabase-auth",
     "firebaseUid": "uid-from-firebase-auth",
     "email": "user@example.com",
     "migratedAt": "2025-11-01T00:00:00Z",
     "migrationMethod": "automated" | "manual",
     "verificationStatus": "verified" | "pending"
   }
   ```

2. **Data Migration Support:**
   - Historical events reference `supabase_user_id`
   - Query Firestore by Firebase UID, lookup mapping, fetch old data
   - Gradually migrate ownership to Firebase UIDs

3. **Auth Provider Bridge:**
   - User signs in with Firebase
   - System looks up old Supabase UID
   - Loads historical data associated with old UID
   - Migrates ownership to Firebase UID

4. **Rollback Capability:**
   - If Firebase auth fails, could theoretically revert to Supabase
   - Mapping allows reversing the migration

### What Identity Linking Costs

**Development Overhead:**
- Collection schema design and validation
- Security rules for `user_identity_links` (owner-only reads)
- Migration script to populate mappings
- Backend logic to query and resolve mappings
- Error handling for missing/corrupted mappings
- Testing across all data access paths

**Runtime Overhead:**
- Extra Firestore read on every user data query
- Increased latency (2-3ms per query)
- Additional Firestore read costs
- Cache invalidation complexity

**Maintenance Overhead:**
- One more collection to secure, backup, monitor
- Audit logs for mapping changes
- Support cases for mapping issues
- Documentation and runbooks

**Estimated Implementation:** 13-14 weeks (cross-squad discovery, build, rollout)

---

## Deferral Justification

### Reason #1: No Active Supabase Auth Detected

**Evidence:**
```bash
# Grep for Supabase auth imports
$ grep -r "import.*supabase" lib/ --include="*.dart"
# Result: 0 matches in lib/ directory

# Only matches in env/config (unused):
- lib/core/env.dart (lines 150-173)
- lib/core/config/app_config.dart (lines 10-14)
```

**Interpretation:**
- If Supabase auth were active, imports would exist in repositories, services, or providers
- Auth logic would reference Supabase client
- Current auth flow uses `FirebaseAuth.instance` exclusively

**Conclusion:** No active Supabase auth to bridge.

---

### Reason #2: Firebase Auth Fully Functional

**Evidence:**
- `AuthCubit` fully implemented with Firebase integration (lib/presentation/cubit/auth/auth_cubit.dart)
- Sign-in, sign-up, sign-out all use Firebase SDK
- Auth state managed via `FirebaseAuth.instance.authStateChanges()`
- No fallback to Supabase auth detected

**Implication:** Firebase auth is the **primary and only** auth system.

---

### Reason #3: No Historical User Data Requiring Migration

**Evidence:**
- No migration script exists
- No `user_identity_links` collection detected
- Bootstrap sequence does not query for Supabase UIDs
- User profile bootstrap uses Firebase UID exclusively (auth_cubit.dart:440-463)

**Interpretation:**
Either:
1. App has no production users yet (early stage)
2. Historical migration already completed without identity linking
3. No Supabase users ever existed (Firebase-first from start)

**Conclusion:** No historical users require UID mapping.

---

### Reason #4: Architectural Simplicity Preferred

**YAGNI Principle:**
> "You Aren't Gonna Need It" — Don't implement features until they're necessary.

**Current Architecture:**
- Clean Firebase-only auth flow
- Single source of truth (Firebase Auth)
- No dual-system complexity
- Easier to test, maintain, secure

**With Identity Linking:**
- Multi-system complexity
- Additional failure modes
- Cache coherency challenges
- Security surface area increase

**Decision:** Prefer simplicity until business case emerges.

---

### Reason #5: Reversibility Is Low Priority

**Rollback Strategy:**
If Firebase auth fails catastrophically:
1. Feature flag to disable Firebase auth
2. Fall back to mock auth (already implemented)
3. Emergency deployment with Supabase auth re-enabled

**Reality Check:**
- Firebase Auth is a mature, stable service (99.95% SLA)
- Mock auth serves as development/testing fallback
- Identity linking would NOT prevent Firebase outage impact
- Rollback would require re-deploying old code anyway

**Conclusion:** Identity linking does NOT materially improve disaster recovery.

---

## Revisit Triggers

Identity linking implementation should be **reconsidered** if ANY of the following occur:

### Trigger #1: Historical User Discovery
**Condition:** Evidence emerges of Supabase-authenticated users in production
**Examples:**
- Support tickets from users unable to sign in
- Database audit reveals Supabase UIDs in user data
- Analytics show auth failure spikes after migration
- User complaints about lost data

**Action:**
1. Run production state audit queries (see Monitoring Requirements) to quantify affected users
2. Design targeted migration script for confirmed cohorts
3. Implement identity linking for affected cohort only, behind feature flag

**Owner:** Backend Squad + Support

---

### Trigger #2: Cross-Platform Identity Reconciliation Needed
**Condition:** Users authenticate via multiple platforms requiring UID mapping
**Examples:**
- Web app uses Supabase, mobile uses Firebase (unlikely)
- Partner integration requires Supabase UID compatibility
- Legacy API endpoints expect Supabase UIDs

**Action:**
1. Design identity mapping for specific integration
2. Implement lightweight bridge (not full dual-write)
3. Document migration path for partner systems

**Owner:** Backend Squad + Partnerships

---

### Trigger #3: Compliance/Audit Requirements
**Condition:** Regulatory audit requires identity traceability across systems
**Examples:**
- GDPR audit demands historical auth provider tracking
- HIPAA compliance requires auth lineage documentation
- Data retention policy requires Supabase UID preservation

**Action:**
1. Consult legal/compliance team
2. Design audit-focused identity mapping
3. Implement with emphasis on immutability and logging

**Owner:** Backend Squad + Legal/Compliance

---

### Trigger #4: Acquisition/Merger Integration
**Condition:** Company acquires/merges with entity using Supabase auth
**Examples:**
- Acquired company has Supabase-based user base
- Merger requires consolidating auth systems
- Partnership requires shared user identity

**Action:**
1. Design migration strategy for combined user base
2. Implement temporary identity bridge
3. Plan sunset timeline for dual-system support

**Owner:** Backend Squad + Corporate Development

---

### Trigger #5: Multi-Tenancy Expansion
**Condition:** Product expands to multi-tenant model with mixed auth systems
**Examples:**
- Enterprise customers bring existing Supabase auth
- White-label deployments use various auth providers
- B2B SaaS expansion requires auth federation

**Action:**
1. Design auth provider abstraction layer
2. Implement identity mapping per tenant
3. Document auth provider onboarding process

**Owner:** Backend Squad + Product

---

## Monitoring Requirements

To ensure revisit triggers are detected early, implement monitoring for:

### 1. Auth Failure Monitoring
**Metrics:**
- Auth failure rate (target: <0.1%)
- Auth latency p95 (target: <500ms)
- Sign-in abandonment rate
- "Account not found" errors

**Alerts:**
- Spike in auth failures (>0.5%)
- Increase in "user not found" errors
- Support ticket volume related to auth

**Tooling:** Firebase Analytics, Sentry, customer support dashboard

---

### 2. User Data Orphaning Detection
**Metrics:**
- Events with null owner_uid
- Profiles missing Firebase UID
- Firestore documents referencing non-existent users

**Queries:**
```javascript
// Monthly audit query
db.collection('events')
  .where('owner_uid', '==', null)
  .get()
  .then(snapshot => {
    if (snapshot.size > 0) {
      alert('Orphaned events detected!');
    }
  });
```

**Alerts:**
- Orphaned data count >10
- Increasing trend of null UIDs

**Tooling:** Firestore monitoring, scheduled Cloud Functions

---

### 3. Support Ticket Pattern Analysis
**Signals:**
- "Cannot access my data"
- "Old events missing"
- "Account not found"
- "Sign-in not working"

**Process:**
1. Weekly support ticket review
2. Tag auth-related issues
3. Escalate patterns to engineering

**Owner:** Support Lead + Backend Squad

---

### 4. Production State Audit Queries
**Frequency:** Automated weekly (BigQuery scheduled query) with on-demand runs before major releases.

**BigQuery — Supabase Identifiers Found In Production Events**
```sql
SELECT
  COUNT(1) AS event_count,
  COUNT(DISTINCT user_pseudo_id) AS affected_users,
  APPROX_TOP_COUNT(
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'supabase_user_id'),
    10
  ) AS sample_supabase_uids
FROM `{{project_id}}.analytics_{{app_id}}.events_*`
WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  AND FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND EXISTS (
    SELECT 1 FROM UNNEST(event_params) WHERE key = 'supabase_user_id'
  );
```

**BigQuery — Profiles Still Flagged With Supabase Provider**
```sql
SELECT
  COUNT(*) AS total_profiles,
  COUNTIF(identity.supabase_uid IS NOT NULL) AS profiles_with_supabase_uid,
  ARRAY_AGG(DISTINCT user_id LIMIT 25) AS sample_user_ids
FROM `{{project_id}}.identity_profile_snapshot`
WHERE snapshot_date = CURRENT_DATE();
```

**Firestore — Documents Containing Supabase Identifiers**
```bash
gcloud alpha firestore documents list users \
  --project "$PROJECT_ID" \
  --format json \
  | jq '.documents[]
      | select(.fields.supabaseUid != null
          or ((.fields.legacyProvider.stringValue // "") == "supabase"))
      | {name: .name, supabaseUid: .fields.supabaseUid.stringValue}'
```

**Follow-up:**
1. Log results to `identity_linking_audit` dashboard.
2. Page Backend Squad if affected_users > 0 or documents detected.
3. Kick off Phase 1 of Implementation Guidance if repeated twice in a 30-day window.

**Owner:** Data Engineering + Backend Squad

---

## Security Considerations

IF identity linking is implemented in future, ensure:

### 1. Security Rules
```javascript
// user_identity_links collection rules
match /user_identity_links/{supabaseUid} {
  // Only the mapped Firebase user can read their own mapping
  allow read: if request.auth.uid == resource.data.firebaseUid;

  // Only admin service account can write (via Cloud Function)
  allow write: if false; // No direct writes from clients
}
```

### 2. Data Integrity
- Enforce unique constraints (one Supabase UID → one Firebase UID)
- Prevent mapping tampering (append-only, no updates/deletes)
- Audit log all mapping operations

### 3. PII Protection
- Encrypt email addresses in mappings
- Apply data retention policies (delete after migration complete)
- Restrict admin access to mapping collection

---

## Implementation Guidance (If Trigger Activates)

IF a revisit trigger activates, follow this implementation plan:

### Phase 1: Assessment (2 weeks)
1. Run production state audit queries to size legacy cohorts
2. Quantify affected users and high-risk data sets
3. Inventory data flows that still reference Supabase identifiers
4. Capture compliance and retention requirements with Legal

### Phase 2: Design (2 weeks)
1. Finalize `user_identity_links` collection schema and retention policy
2. Design security rules plus audit logging strategy for mapping changes
3. Plan migration tooling (dry-run, diff, rollback) and cutover approach
4. Document incident response and rollback procedures

### Phase 3: Implementation (4 weeks)
1. Implement Firestore collection, security rules, and logging pipeline
2. Build migration tooling with dry-run, diff, and retry support
3. Ship lookup/adaptor services across backend and mobile layers
4. Harden monitoring dashboards and alerting tied to identity state

### Phase 4: Migration (2-3 weeks)
1. Run dry-run migration in staging with production-like datasets
2. Validate data parity and reconcile discrepancies
3. Execute phased production migration with checkpoints
4. Monitor for errors and hold daily war-room syncs during rollout

### Phase 5: Validation (2 weeks)
1. Confirm all users accessible via automated regression suites
2. Validate data ownership and cross-system parity reports
3. Monitor support tickets and analytics for fallout
4. Capture lessons learned and finalize runbooks

### Phase 6: Stabilization & Handoff (1 week)
1. Transition monitoring to steady-state on-call rotations
2. Export final migration metrics and close-out report
3. Groom backlog for follow-up clean-up tasks

**Total Estimated Timeline:** 13-14 weeks (includes 1-week stabilization buffer)

---

## Alternatives Considered

### Alternative #1: Implement Identity Linking Proactively (Rejected)
**Pros:**
- Prepared for any future scenario
- No rush if trigger activates

**Cons:**
- YAGNI violation (building unused features)
- Maintenance burden
- Runtime overhead
- Delayed migration completion

**Decision:** Rejected — build when needed, not speculatively.

---

### Alternative #2: Partial Identity Linking (Considered)
**Description:**
- Store mappings for special cases only (e.g., admin accounts, test users)
- Lightweight implementation for edge cases

**Pros:**
- Lower overhead than full implementation
- Handles known edge cases

**Cons:**
- Still adds complexity
- Edge cases may not exist
- Partial solution often becomes full solution

**Decision:** Deferred — only if specific edge case identified.

---

### Alternative #3: Event-Sourced Identity Log (Considered)
**Description:**
- Log all auth provider changes as events
- Reconstruct identity history from event log

**Pros:**
- Audit trail included
- Supports multiple provider transitions

**Cons:**
- Complex to implement
- Overkill for simple UID mapping
- Requires event processing infrastructure

**Decision:** Deferred — consider for future multi-tenant expansion.

---

## Decision Approval Workflow

### 1. Engineering Review ✅
**Reviewer:** Backend Squad Lead, Mobile Squad Lead
**Status:** Approved (2025-10-31)
**Feedback:** Deferral is reasonable given codebase audit findings.

### 2. Architecture Guild Review 🟡
**Reviewer:** Architecture Guild
**Status:** Pending (see `architecture_review_request_2025-10-31.md`)
**Questions for Guild:**
1. Does the proposed trigger list capture all scenarios that would force the team to revive identity linking?
2. Are additional safeguards (security rules, audit logging, data retention) required before the mapping collection ships?
3. Which squad should own the work when a trigger fires (backend platform vs. feature squads)?

### 3. Product Review 🟡
**Reviewer:** Product Lead
**Status:** Pending
**Questions for Product:**
1. Any known user cohorts requiring Supabase UID support?
2. Roadmap features that might trigger identity linking need?
3. Customer commitments related to data migration?

### 4. Final Approval ⬜
**Authority:** CTO
**Status:** Pending architecture guild + product review
**Decision Deadline:** 2025-11-15

---

## Communication Plan

### Internal Communication
**Audience:** Engineering, Product, Support
**Message:** "Identity linking deferred pending business case. Monitor triggers and escalate if detected."
**Channels:** Slack #eng-migration, team sync meetings, docs update

### External Communication (If Applicable)
**Audience:** Users (only if affected)
**Message:** N/A — no user impact from deferral decision
**Note:** If trigger activates and migration needed, draft user communication at that time

---

## Conclusion

**Recommendation:** ✅ **Approve Deferral**

**Rationale:**
1. No active Supabase auth detected in codebase
2. Firebase auth is fully functional and tested
3. No historical users requiring UID mapping
4. Architectural simplicity preferred
5. Revisit triggers clearly defined with monitoring in place

**Next Steps:**
1. Architecture guild review and decision (by 2025-11-15)
2. Implement monitoring for revisit triggers (by 2025-11-22)
3. Document decision in `auth_phase.md` Section 8 (after approval)
4. Close identity linking epic in project tracker (after approval)

**Review Cadence:**
- Quarterly review of monitoring metrics
- Annual review of decision validity
- Immediate review if any trigger activates

---

**Document Owner:** Backend Squad Lead
**Last Updated:** 2025-10-31
**Next Review:** 2025-12-31 (quarterly) or upon trigger activation
**Related Epics:** AUTH-MIGRATION, FIREBASE-CUTOVER, CONFIG-CLEANUP
