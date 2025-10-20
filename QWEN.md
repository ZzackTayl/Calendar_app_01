# MyOrbit Calendar – Qwen Operating Guide

**Timestamp:** 2025-10-20  
**Primary source:** [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md)

---

## 1. Situation Report
- ✅ **Test suite:** `flutter test` (454 specs) now passes end-to-end after updating conflict-resolution merging.
- ⚠️ **Real-time sync & calendar imports:** Code paths exist, but no recent verification has been run. Treat everything in `docs/features/` as reference material until the build is restored.
- ⚠️ **Docs reorganised:** Active docs are under `docs/`. Items in `docs/archive/` describe past optimistic states and must not be trusted without re-testing.
- ✅ **Static analysis:** Only info-level lint suggestions from `flutter analyze`; no blocking diagnostics remain.

---

## 2. Documentation Pointers
- [`docs/README.md`](docs/README.md) – Landing page for all documentation.
- [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md) – Live, authoritative status.
- [`docs/setup/HOW_TO_RUN.md`](docs/setup/HOW_TO_RUN.md), [`docs/setup/WINDOWS_SETUP.md`](docs/setup/WINDOWS_SETUP.md) – Environment bootstrapping.
- [`docs/guides/DEVELOPER_GUIDE.md`](docs/guides/DEVELOPER_GUIDE.md) – Architecture & workflows.
- [`docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md`](docs/features/REALTIME_SYNC_IMPLEMENTATION_COMPLETE.md), [`docs/features/EXTERNAL_CALENDAR_SYNC_COMPLETE.md`](docs/features/EXTERNAL_CALENDAR_SYNC_COMPLETE.md) – Deep-dive references (validate assumptions after build recovery).
- [`docs/qa/TEST_FAILURE_ANALYSIS.md`](docs/qa/TEST_FAILURE_ANALYSIS.md) – Prior failure analysis for context.

Always start from the status doc, then drill down.

---

## 3. Key Code Anchors
```text
lib/main.dart                      # App bootstrap (broken GoogleSignIn init lives here)
lib/logic/services/google_calendar_sync_service.dart
lib/logic/services/apple_calendar_sync_service.dart
lib/logic/services/realtime_sync_service.dart
lib/logic/services/sync_queue_service.dart
lib/logic/services/reminder_scheduling_service.dart  # Must init before AppShell renders
supabase/schema/*.sql              # Database migrations (12 files, more than old docs mention)
```

Native bridges:
- `ios/Runner/AppDelegate.swift`
- `macos/Runner/AppDelegate.swift`

---

## 4. Development Testing Setup Rules (Critical)
**Prevent blank screen on app startup by following this sequence:**

### Service Initialization Requirements
These must complete **before** `runApp()` is called in `main.dart`, in this order:
1. `SupabaseService.initialize()` – Supabase client init (10s timeout, continues offline if timeout)
2. `TimezoneService.initialize()` – Loads timezone database
3. `ConnectivityService.initialize()` – Sets up connectivity monitoring  
4. `ReminderSchedulingService.initialize()` – **CRITICAL: omission causes `LateInitializationError` in AppShell**

All initializations use try-catch for graceful degradation.

### Environment Variable Configuration
- **macOS/iOS/Android:** Create `.env` file in repo root with keys from `.env.example`
- **Web:** Use `--dart-define=KEY=VALUE` flags (skip `.env` – prevents 404 on asset load)

**Example web command:**
```bash
flutter run -d chrome \
  --dart-define=FLUTTER_ENV=dev \
  --dart-define=DEV_SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=DEV_SUPABASE_ANON_KEY=your_anon_key
```

### Blank Screen Diagnosis
- Verify `🚀 Starting bootstrapApp...` debug output in console
- Check error boundary (app displays error text if initialization fails)
- Ensure all required env vars are supplied for the target platform

---

## 5. Execution Rules for Qwen
1. Confirm the current blocker status in `docs/status/PROJECT_STATUS.md` before running commands.
2. Do not assume success claims from early-2025 docs; explicitly re-test each subsystem during manual QA.
3. When updating docs, move stale material into `docs/archive/` with a note instead of leaving conflicting statements in active guides.
4. After touching Riverpod/Freezed code, run:
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```
5. Post-change checklist (once build is green):
   ```bash
   flutter analyze
   flutter test
   ```
   Record results in the status doc and relevant QA summaries.
6. Keep AI instructions (this file, `GEMINI.md`, `cursor.mdc`) aligned with real repo state.

---

## 6. Quick Commands
```bash
# Fix dependencies (after editing pubspec)
flutter pub get

# Format
dart format lib test

# Analyze
flutter analyze

# Run tests
flutter test

# Launch web build once unblocked
flutter run -d chrome
```

Stay sceptical of any “production ready” claims until the current blocker is cleared and the suite passes.
