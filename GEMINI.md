# MyOrbit Calendar – Gemini Guidelines

**Last updated:** October 20, 2025  
**Source of truth:** [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md)

---

## 1. Status Snapshot (Read Before Acting)
- ✅ **Test suite:** `flutter test` (454 specs) is green after updating the conflict-resolution merge semantics.
- ⚠️ **Feature verification pending:** Real-time sync services, Apple EventKit bridges, and reminder scheduling still exist, but none have been validated since the build broke. Treat previous “production-ready” claims as historical context only.
- ⚠️ **Documentation reorganised:** Active docs now live under `docs/`. Anything in `docs/archive/` is frozen for provenance.
- ✅ **Analyzer state:** `flutter analyze` surfaces only info-level lint suggestions (null-aware assignments, unnecessary import). No blocking static analysis errors.

---

## 2. Documentation Map
- [`docs/README.md`](docs/README.md) – Current documentation hub.
- [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md) – Live status, blockers, and next steps.
- [`docs/setup/HOW_TO_RUN.md`](docs/setup/HOW_TO_RUN.md) – Local run instructions.
- [`docs/guides/DEVELOPER_GUIDE.md`](docs/guides/DEVELOPER_GUIDE.md) – Architecture and workflows.
- [`docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md`](docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md) & siblings – Feature deep dives; cross-check with the status page before trusting details.
- [`docs/archive/`](docs/archive) – Historical “all green” reports. Do not rely on them without verification.

When in doubt, start at the status doc and follow links outward.

---

## 3. Implementation Highlights (Reality Check)
- **Real-time sync:** `RealtimeSyncService`, `SyncQueueService`, and `ConflictResolutionService` orchestrate Supabase subscriptions and offline queues. Manual retest required after the build is fixed.
- **Google Calendar import:** `GoogleCalendarSyncService` uses the v6 constructor-based API; the v7 singleton migration remains unscheduled.
- **Apple Calendar import:** Native channel implemented in `ios/Runner/AppDelegate.swift` and `macos/Runner/AppDelegate.swift`. Verify permissions and event fetching on devices once the app runs.
- **Offline mode:** `SupabaseService.initialize()` preserves offline behaviour when env vars are missing (`DevDataService` + `OfflineCacheService`).
- **Tests:** ~50 Dart test files cover providers/services/widgets/screens; the suite currently runs 454 specs with 0 failures.

---

## 4. Development Testing Setup Rules (Critical)
**Following these prevents blank screen on app startup:**

### Service Initialization Sequence
All services must initialize in order before `runApp()` is called in `main.dart`:
1. `SupabaseService.initialize()` – Supabase connection (10s timeout, fails gracefully offline)
2. `TimezoneService.initialize()` – Timezone database loading
3. `ConnectivityService.initialize()` – Connectivity state monitoring
4. `ReminderSchedulingService.initialize()` – **CRITICAL: Must execute before AppShell renders** (omission → `LateInitializationError`)

All initializations wrap in try-catch; services continue offline if initialization fails.

### Environment Variable Setup
- **Native platforms** (macOS, iOS, Android): Place `.env` file in repo root. See `.env.example` for required keys.
- **Web platform**: Use `--dart-define` flags only; `.env` loading is skipped to prevent 404 errors.

**Required env vars:** `DEV_SUPABASE_URL`, `DEV_SUPABASE_ANON_KEY`, `FLUTTER_ENV`, etc.

### Launch Commands
```bash
# macOS (reads .env)
flutter run -d macos

# Web (use dart-define)
flutter run -d chrome --dart-define=FLUTTER_ENV=dev --dart-define=DEV_SUPABASE_URL=your_url --dart-define=DEV_SUPABASE_ANON_KEY=your_key
```

### Troubleshooting Blank Screen
1. Check console for initialization debug output (🚀 Starting bootstrapApp... etc.)
2. Look for error boundary text if startup fails (will display error instead of blank screen)
3. Verify all `dart-define` vars are set for web builds

---

## 5. Working Rules for Gemini
1. **Always** consult `docs/status/PROJECT_STATUS.md` before coding, testing, or updating docs.
2. **Do not** assume “production ready” despite older reports; reproduce functionality locally once the blocker is removed.
3. When editing documentation, move stale pages into `docs/archive/` and add a note instead of silently deleting history.
4. After code changes:
   - Run `dart run build_runner build --delete-conflicting-outputs` if Riverpod/Freezed classes changed.
   - Re-run `flutter analyze` and (once unblocked) `flutter test`.
   - Update the status doc with new results.
5. Document any new operational requirements (environment variables, scripts) under `docs/setup/` or `docs/operations/`.

---

## 6. Useful Commands
```bash
# Format + lint
dart format lib test
flutter analyze

# Generate code
dart run build_runner build --delete-conflicting-outputs

# Run tests
flutter test

# Launch app once build is green
flutter run -d chrome
```

Keep this file in sync with the status document and the actual test/build results. If the blocker changes, update both immediately.
