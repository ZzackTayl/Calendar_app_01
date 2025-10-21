# MyOrbit Security Assessment – October 20, 2025

## Scope & Approach
- Reviewed Flutter client source (`lib/`), shared services, and Supabase database migrations to understand data flows.
- Evaluated mobile platform configs (Android/iOS manifests) and environment handling for secrets.
- Focused on storage, authentication, transport, third-party integrations, and telemetry configurations relevant to privacy-conscious calendar users.

## Security Posture Highlights
- Supabase schemas enforce row-level security for all user-scoped tables (for example, `supabase/schema/002_calendars_events.sql:208` and `supabase/schema/003_availability_signals.sql:33`), and application queries consistently scope by `owner_id`.
- Real-time subscriptions and service layers apply per-user filters before propagating updates (`lib/logic/services/realtime_sync_service.dart:52`).
- `.env` files are excluded from version control, reducing accidental credential leaks during development.

> **Update (Oct 20, 2025 – Evening):** Findings 1–3 below have been remediated. Twilio/FCM secrets are no longer bundled into the app, offline caches use per-user keys stored in secure storage, and the sync queue is encrypted. See `docs/setup/AUTH_IMPLEMENTATION_STATUS.md` and `docs/founder_edge_function_sms_guide.md` for the latest status.

## Key Findings

### 1. Static “encryption” keys undermine local data protection *(Resolved Oct 20, 2025)*
- **Severity:** High  
- **Evidence:** `lib/logic/services/offline_cache_service.dart:156-163`, `lib/logic/services/user_profile_service.dart:144-150`.  
- **Impact:** Cached events, contacts, and profiles stored in `SharedPreferences` can be decrypted by anyone who extracts the app bundle or filesystem because the keys (`myorbit_<type>_key_v1`) are embedded in the binary. This exposes names, schedules, and partner details on lost/jailbroken devices.  
- **Root Cause:** Placeholder key-derivation never replaced with per-user secrets or platform secure storage.  
- **Recommendation:** Generate a random key per user and store it in the OS keystore/keychain via `flutter_secure_storage` (or similar), or derive a key from a Supabase session token salted with device-bound data. Re-encrypt cached payloads with the retrieved key and rotate legacy data during upgrade.

### 2. Offline sync queue persists sensitive objects without encryption *(Resolved Oct 20, 2025)*
- **Severity:** Medium  
- **Evidence:** `lib/logic/services/sync_queue_service.dart:251-257`.  
- **Impact:** Pending event/contact mutations—including descriptions and contact metadata—are serialized to plain JSON in `SharedPreferences`. Device compromise exposes unsynced updates and may leak private partner information.  
- **Root Cause:** Queue persistence was added for reliability but reuses `SharedPreferences` without the encryption layer used elsewhere (and even that layer is currently weak per Finding 1).  
- **Recommendation:** Store queued mutations in the same encrypted store recommended above, or keep them in memory and fall back to Supabase’s offline cache with RLS once a secure client-side solution is available. At minimum, wrap queue writes with the strengthened encryption from Finding 1.

### 3. Client is structured to ship high-value service credentials *(Resolved Oct 20, 2025)*
- **Severity:** High  
- **Evidence:** `lib/main.dart:65` (loads `FCM_SERVER_KEY`, `TWILIO_*` via `--dart-define`), `lib/core/env.dart:64-67`, `lib/logic/services/sms_service.dart:20-58`.  
- **Impact:** Any production build compiled with these defines embeds the Firebase Cloud Messaging server key and Twilio SID/auth token in the APK/IPA. Attackers can decompile the app, send arbitrary push notifications, or abuse Twilio to send SMS at your expense.  
- **Root Cause:** Documentation placeholders for future SMS/push functionality were implemented directly in the client instead of via trusted server-side endpoints or Supabase Functions (even though invitation email/SMS already uses edge functions).  
- **Recommendation:** Remove server-side credentials from the mobile app entirely. Keep Twilio and FCM server keys in Supabase Edge Functions or another backend and expose only scoped, short-lived tokens to the client. Delete or guard `SmsService` to prevent future regressions, and update deployment pipelines to block builds that include these secrets.

## Additional Hardening Opportunities
- Add a Sentry `beforeSend` scrubber to strip personally identifiable calendar/contact data before telemetry is sent, or disable Sentry in privacy-sensitive regions.
- Enable Flutter build obfuscation (`--obfuscate --split-debug-info`) for release builds to raise the cost of reverse engineering.
- Consider TLS certificate pinning for Supabase and critical third-party APIs if threat models include hostile networks.
- Audit logging (`developer.log`) to ensure private event titles/descriptions are not written to production logs.

## External Assurance Options
1. **Targeted Mobile & API Penetration Test (post-remediation):** Validates that encryption fixes and secret handling changes withstand real-world abuse. Pros: increased stakeholder confidence, possible compliance leverage. Cons: cost, best scheduled after addressing the high-severity items above.  
2. **Managed Secrets Platform / Vault Integration:** Centralizes Twilio/FCM credentials with rotation alerts. Pros: operational guardrails, integrates with Supabase Functions or custom backend. Cons: additional infrastructure overhead.

## Recommended Next Steps
- Prioritize redesign of client-side secret handling and secure local storage (Findings 1 & 3).  
- Patch the sync queue persistence once the new encryption/key management flows are in place (Finding 2).  
- Update build and release documentation to prohibit embedding long-lived backend credentials.  
- Plan a third-party security review after remediation to benchmark against market expectations.
