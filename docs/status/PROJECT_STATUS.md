# MyOrbit Calendar – Project Status

**Last updated:** October 20, 2025  
**Overall status:** 🟡 **QA Needed – automated suite green, manual validation pending**

The Google Sign-In regression has been cleared (the app now uses the v6 constructor). Automated tests are fully passing again; focus shifts to re-validating real-time sync and calendar import flows on devices.

---

## 🚨 Build & Test State

| Command | Result | Notes |
|---------|--------|-------|
| `flutter test` | ✅ All passing | 454 specs green after updating conflict-resolution merge semantics. |
| `flutter analyze` | ⚠️ 9 info-level lints | Only style suggestions (null-aware assignment, unnecessary import). No blocking diagnostics. |
| `flutter run` | ⏳ Not re-run since reverting Google Sign-In | Re-test once the failing unit test is resolved. |
| `flutter build web` | ✅ Compiles | Succeeds; build emits expected WASM dry-run warnings from `flutter_secure_storage_web`. |

---

## ✅ / ⚠️ Feature Reality Check

| Area | Status | Evidence & Gaps |
|------|--------|-----------------|
| Real-time sync (Supabase) | ⚠️ Implementation present (`RealtimeSyncService`, `SyncQueueService`, `ConflictResolutionService`), but unverified recently because the app cannot run. Requires end-to-end test once build is fixed. |
| Google Calendar import | ⚠️ Constructor-based sign-in restored. End-to-end import still unverified post-revert. |
| Apple Calendar import | ⚠️ Native EventKit bridges exist for iOS/macOS (`ios/Runner/AppDelegate.swift`, `macos/Runner/AppDelegate.swift`). Needs manual device validation once the Flutter app builds again. |
| Offline-first mode | ✅ Still functional in theory. `SupabaseService.initialize()` gracefully short-circuits when env vars are missing. Manual verification pending. |
| Notifications & reminders | ⚠️ Reminder scheduling services remain in the tree, but there is no recent automated proof. Requires smoke test once build recovers. |
| Documentation set | ⚠️ Reorganised into `docs/`, but many deep-dive guides describe the optimistic “all green” state. Use this status page plus test results to decide what still applies. |

---

## 🛠️ Immediate Actions

1. **Manually validate critical features**  
   - Real-time sync against a Supabase instance (events + contacts).  
   - Google Calendar import on Android/Web.  
   - Apple Calendar import on iOS/macOS devices.  
   - Reminder scheduling on at least one mobile platform.

2. **Review documentation claims**  
   - Update feature guides once manual validation confirms behaviour.

---

## 📁 Environment & Tooling Notes

- `.env` remains optional. Without Supabase credentials the app should stay in offline mode (`DevDataService` + `OfflineCacheService`).  
- Supabase migrations live in `supabase/schema/*.sql` and are more advanced than the February 2025 docs mention (files up to `012_realtime_and_functions_alignment.sql`).  
- Logs from the last `flutter test` attempt are stored in `flutter_test.log` for quick reference.
- Desktop builds (macOS) now fall back to an in-memory secure store so unsigned development builds work out of the box. Re-enable the native Keychain after adding entitlements with `flutter run --dart-define=ENABLE_NATIVE_SECURE_STORAGE=true -d macos`.
- Local notification scheduling has been patched to initialise on macOS; no extra setup beyond running `flutter pub get` is required.

---

## 🔗 Reference Documents

- [`../README.md`](../README.md) – developer onboarding (currently references the reorganised doc tree).  
- [`../GEMINI.md`](../GEMINI.md), [`../QWEN.md`](../QWEN.md), [`../cursor.mdc`](../cursor.mdc) – AI assistant rules; each file now links back to this status document.  
- [`../docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md`](../docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md) – architecture notes; treat as reference until verification is redone.  
- [`../docs/qa/TEST_FAILURE_ANALYSIS.md`](../docs/qa/TEST_FAILURE_ANALYSIS.md) – historical investigation of earlier failures (pre-reorganisation).

---

Keeping this page accurate is the fastest way to prevent developers and AI assistants from trusting outdated “all green” reports. Update it immediately after the current blocker is resolved or whenever new regressions surface.
