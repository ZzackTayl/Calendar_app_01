# PolyHarmony Security Consolidated Document

Document owner: Security & Platform Team
Status: Consolidated reference (production-ready)
Last updated: 2025-09-09

Scope
- This single document consolidates all security-related guidance, implementation notes, and operational procedures for Calendar_app_01 (PolyHarmony).
- It references original source documents for traceability and accuracy.

How to use this document
- Engineers: follow implementation sections and validation commands before deploys
- Operators: use monitoring, incident response, and recovery procedures
- Reviewers: use audit checklists and prohibited claim guidance before releases

Key references to originals
- Docs/SECURITY_SETUP.md
- Docs/SECURITY_AUDIT_CHECKLIST.md
- docs/SECURITY_IMPLEMENTATION_CHECKLIST.md
- docs/CSRF_PROTECTION_REPORT.md
- docs/ENCRYPTION_SECURITY_REVIEW.md
- Docs/RLS_IMPLEMENTATION_GUIDE.md
- Docs/PERMISSIONS_SYSTEM_GUIDE.md
- Docs/DISASTER_RECOVERY_PROCEDURES.md
- Docs/BACKUP_MONITORING_TESTING_STRATEGY.md
- Docs/DATABASE_SCHEMA_REFERENCE.md
- middleware.ts, lib/rate-limiting.ts, lib/privacy-utils.ts, lib/auth/* (implementation)

**Enhanced Security Documentation (September 2025)** ⭐
- `research/security-research-findings.md`: Industry security standards & hardening
- `research/database-security-analysis.md`: PostgreSQL security hardening strategies
- `docs/environment-setup-guide.md`: Comprehensive environment security architecture
- `planning/monitoring-architecture.md`: Security monitoring and alerting strategy
- `planning/test-environment-design.md`: Security testing and compliance validation

1) Enhanced Security Architecture Overview ⭐ (September 2025)

### **Defense in Depth Strategy** ⭐
- **Container Layer**: Docker security hardening, read-only filesystems, resource limits
- **Infrastructure Layer**: SSL/TLS encryption, network segmentation, access controls
- **Application Layer**: Middleware protection, authentication, authorization
- **Database Layer**: Row-level security, encrypted connections, audit logging
- **Monitoring Layer**: Real-time security monitoring, alerting, compliance tracking

### **Security Layers** ⭐
- **Container Security**: Read-only filesystems, non-root containers, resource limits (research/security-research-findings.md)
- **Middleware**: Route protection, session validation, security headers (middleware.ts)
- **Authentication & Session**: Supabase Auth, advanced session validation/monitoring (lib/auth/*)
- **CSRF Protection**: Validation for all state-changing routes (docs/CSRF_PROTECTION_REPORT.md)
- **Rate Limiting**: Multi-tier limits with progressive penalties (lib/rate-limiting.ts)
- **Input Validation**: Zod-based request schemas, strict length and format checks
- **Encryption**: AES-256-GCM for sensitive tokens at rest and in transit (docs/ENCRYPTION_SECURITY_REVIEW.md)
- **Database Security**: Comprehensive RLS policies and encrypted connections (research/database-security-analysis.md)
- **Privacy Controls**: 4-level privacy with relationship-aware access (lib/privacy-utils.ts, Docs/PERMISSIONS_SYSTEM_GUIDE.md)
- **Security Monitoring**: Real-time alerts, dashboards, threat detection (planning/monitoring-architecture.md)
- **Backup & Recovery**: Encrypted backups, PITR flow, security validation (Docs/DISASTER_RECOVERY_PROCEDURES.md)

### **Enhanced Security Features** ⭐
- **Zero Configuration Drift**: Identical security controls across all environments
- **Automated Security Testing**: Vulnerability scanning, compliance validation, penetration testing
- **Real-time Monitoring**: Security event detection, alerting, and response automation
- **Compliance Automation**: SOC 2, GDPR, and OWASP compliance tracking and reporting
- **Container Hardening**: Production-grade security with minimal attack surface

2) Environment & configuration (from Docs/SECURITY_SETUP.md, checklist docs)
- Required environment variables (production)
  - NEXT_PUBLIC_SUPABASE_URL: your Supabase project URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY: anon key
  - SUPABASE_SERVICE_ROLE_KEY: service role key
  - NEXTAUTH_SECRET: strong secret
  - NEXTAUTH_URL: app URL (e.g., https://polyharmony.app)
  - ENCRYPTION_KEY: 64-character hex string (256-bit key)
  - NODE_ENV: production
- Strong recommendations
  - Never commit secrets; use project envs (e.g., Vercel)
  - Rotate API keys periodically
  - Separate dev/stage/prod keys
  - Prefer a KMS for production encryption keys (see Encryption section)
- Vercel headers (security)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  - Content-Security-Policy and Permissions-Policy configured per environment

3) Authentication & session security (from docs/SECURITY_IMPLEMENTATION_CHECKLIST.md, lib/auth/*)
- Supabase Auth with mandatory email verification in production
- Session management
  - Advanced validation, consistency checks, and security alerts
  - Progressive delays on repeated failures
  - Session termination on security violations
- Recent fixes (2025-09-09)
  - session-persistence.ts: added initializeSessionSeed and corrected malformed comment
  - Permission service: explicit type annotation to resolve implicit any

Validation commands
- npm run security:validate
- npm run security:test
- npm run validate (lint + type-check + tests)

4) CSRF protection (from docs/CSRF_PROTECTION_REPORT.md, updated to match current code)
- Coverage
  - High-risk routes protected: invitations accept, group member removal, group invitations accept
  - User data changes: timezone update, onboarding completion
  - Content management: notifications, attachments upload, calendar sharing, templates
  - Previously protected: account deletion, events CRUD, contacts, calendar sync ops, group invitation creation, OAuth state
- Standard route pattern (current)
  - validateCSRFProtection now accepts a single parameter (request) and returns { valid: boolean }
  - Example (updated):
    - const result = await validateCSRFProtection(request)
    - if (!result.valid) return 403
- Client integration
  - fetchWithCSRF utility used for state-changing calls; handles token acquisition, header injection, refresh
- Response codes
  - 401 Unauthorized (no auth), 403 Forbidden (invalid/missing token), 400 Bad Request (invalid data)
- Recommendations
  - Consider middleware wrapper to enforce CSRF on all state-changing routes
  - Add dedicated CSRF unit/integration tests and log failures for monitoring

5) Rate limiting & DoS protection (from lib/rate-limiting.ts and project rules)
- Tiers
  - Auth: 5 attempts per 15 minutes
  - API: 100 requests per minute
  - Events: 30 operations per minute
- Features
  - Progressive penalties (increasing delays and potential IP blocks)
  - Admin exemptions with higher limits
  - Comprehensive logging of violations

6) Input validation & security headers (from docs/SECURITY_IMPLEMENTATION_CHECKLIST.md)
- Zod schema validation on all API endpoints
- XSS protection: HTML character filtering and strict CSP
- SQL injection prevention: parameterized queries only
- Input limits: length, type, and format validation to prevent overflow and abuse
- Security headers as noted in Section 2

7) Encryption (from docs/ENCRYPTION_SECURITY_REVIEW.md)
- Algorithm: AES-256-GCM (authenticated)
  - Key: 256-bit (64-char hex)
  - IV: 16 bytes; Auth Tag: 16 bytes
  - Format: iv:authTag:encryptedData
- Implementation
  - Centralized at /lib/encryption.ts
  - Used for calendar integrations, OAuth tokens, and session data
- Strengths
  - Authenticated encryption; secure IV generation; key validation; robust error handling
- Concerns & recommendations
  - Key storage: prefer managed KMS (AWS KMS/Azure KV/Vault) in production
  - No key rotation: implement versioned keys and rotation procedures
  - Add encryption context for purpose scoping and improved auditing
- Testing
  - Unit: encrypt/decrypt roundtrip and tamper detection
  - Integration: test with real integrations
  - Security: wrong-key attempts, malformed inputs, auth tag verification

8) Database security: RLS & permissions (from Docs/RLS_IMPLEMENTATION_GUIDE.md and Docs/PERMISSIONS_SYSTEM_GUIDE.md)
- RLS coverage
  - All user-scoped tables protected (users, user_profiles, relationships, events, contacts, invitations, calendar_integrations, CSRF/OAuth state, availability, audit/logging)
- Relationship-aware access
  - Connection tiers: private, busy_only, details
  - Event privacy overrides: default (inherit), private (explicit overrides required)
- Helper functions
  - can_view_user_calendar(viewer_id, calendar_owner_id)
  - can_view_event_details(event_id, viewer_id)
- Critical relationship policies (example)
  - SELECT: auth.uid() = user_id OR auth.uid() = partner_id
  - INSERT: auth.uid() = user_id
  - UPDATE/DELETE: auth.uid() = user_id OR auth.uid() = partner_id
- Permission system (summary)
  - event_permissions: explicit grants for private events (relationship/group/contact scoping)
  - event_visibility: controls detail level (future/partial usage)
  - relationship_groups and relationship_group_members: group-based access management
- Enforcement hierarchy
  - Owner always full access
  - Private events: owner + explicit event_permissions
  - Non-private: determined by connection_tier
  - Group membership inherits group permissions
  - Audit trail via permission_audit_logs

9) Privacy model (from project rules and permissions guide)
- Four levels: Private, Semi-Private, Visible, Public (legacy), and unified tiers: private, busy_only, details
- Privacy-aware operations throughout the API; UI should reflect busy_only appropriately
- Audit logging for privacy-sensitive operations; privacy boundaries tested in dedicated suites

10) Monitoring, alerting, and incident response (from Docs/DISASTER_RECOVERY_PROCEDURES.md and related)
- Monitoring endpoints
  - /api/health for liveness and component checks
  - /api/monitoring/dashboard for real-time metrics (auth failures, rate-limit violations, suspicious activity)
- Alert thresholds (example defaults)
  - authFailures: 5; suspiciousActivity: 3; criticalEvents: 1
- Incident response (abbreviated flow)
  - Detect -> Assess severity (1/2/3) -> Declare incident -> Notify team -> Execute runbook -> Validate -> Communicate -> Postmortem
- Communication cadence
  - Initial alert; status updates every 30 minutes; recovery completion notice with impact summary

11) Backup, recovery, and drills (from Docs/BACKUP_MONITORING_TESTING_STRATEGY.md and Docs/DISASTER_RECOVERY_PROCEDURES.md)
- Objectives
  - RTO: 15 minutes; RPO: 2 minutes; Availability: 99.9%
- PITR recovery (Supabase)
  - Restore to new project, validate, then cut over by updating env vars and redeploying
- Validation after recovery
  - Backup validation script; critical table access; functional checks (auth, events, display, relationships)
- Drill schedule
  - Monthly: PITR to staging
  - Quarterly: Full disaster simulation
  - Annual: Business continuity test

12) Security testing and validation (from docs/SECURITY_IMPLEMENTATION_CHECKLIST.md and testing strategy docs)
- Pre-deployment commands
  - npm run security:test
  - npm run test:privacy:all
  - npm run test:email:security
  - npm run security:validate
  - npm run validate
  - npm run monitoring:check
- Post-deployment
  - npm run security:monitor
  - npm run security:health
  - npm run backup:create
- Claims audit & prohibited phrases (Docs/SECURITY_AUDIT_CHECKLIST.md)
  - Prohibited: fully encrypted, end-to-end, zero-knowledge, military-grade, bank-level, completely secure/100% secure, unhackable
  - Verify user-facing text, run PACT tests, align docs with implementation

13) Production configuration profiles (from docs/SECURITY_IMPLEMENTATION_CHECKLIST.md)
- Production
  - Demo mode disabled; email verification required; strict rate limits; 60-minute sessions; full CSP; 90-day logs; real-time alerts enabled
- Development
  - Demo mode allowed (max sessions); verification optional; relaxed limits; 8-hour sessions; relaxed CSP; 7-day logs

14) Operational schedules and metrics (from security checklist and testing strategy)
- Daily: review security alerts, check rate-limit metrics, verify backup integrity
- Weekly: audit logs, dependency vulnerabilities, monitoring validation
- Monthly: configuration review, dependency updates, pentesting, policy updates
- Quarterly: comprehensive audit, incident drill, security training, access review
- Metrics targets
  - Health check availability >99.9%; alert response <60s; monitoring overhead <5%

15) Recent changes and fixes (cross-reference to implementation updates)
- CSRF validation usage updated
  - validateCSRFProtection(request) returns { valid }; previous { isValid } and 2-arg usage corrected
- session-persistence.ts corrected and initializeSessionSeed added
- browser-encryption TS compatibility addressed
- Permission service typing fixed

16) Governance and approvals
- Before releases
  - Technical Lead Review, Security Claims Review, PACT tests passing, implementation verification complete
- Automation
  - CI runs security tests, implementation verification, documentation link validation, prohibited phrase scanning; alerts on failures

17) References (source of truth)
- /Users/zackstewart/Calendar_app_01/Docs/SECURITY_SETUP.md
- /Users/zackstewart/Calendar_app_01/Docs/SECURITY_AUDIT_CHECKLIST.md
- /Users/zackstewart/Calendar_app_01/docs/SECURITY_IMPLEMENTATION_CHECKLIST.md
- /Users/zackstewart/Calendar_app_01/docs/CSRF_PROTECTION_REPORT.md (note: updated call signature and result key)
- /Users/zackstewart/Calendar_app_01/docs/ENCRYPTION_SECURITY_REVIEW.md
- /Users/zackstewart/Calendar_app_01/Docs/RLS_IMPLEMENTATION_GUIDE.md
- /Users/zackstewart/Calendar_app_01/Docs/PERMISSIONS_SYSTEM_GUIDE.md
- /Users/zackstewart/Calendar_app_01/Docs/DISASTER_RECOVERY_PROCEDURES.md
- /Users/zackstewart/Calendar_app_01/Docs/BACKUP_MONITORING_TESTING_STRATEGY.md
- /Users/zackstewart/Calendar_app_01/Docs/DATABASE_SCHEMA_REFERENCE.md
- /Users/zackstewart/Calendar_app_01/middleware.ts
- /Users/zackstewart/Calendar_app_01/lib/rate-limiting.ts
- /Users/zackstewart/Calendar_app_01/lib/privacy-utils.ts
- /Users/zackstewart/Calendar_app_01/lib/auth/

Change log for this consolidated doc
- 2025-09-09: Initial consolidation created; CSRF usage corrected per latest implementation; added recent fixes section.
