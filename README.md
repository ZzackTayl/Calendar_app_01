# Calendar_Mobile

Mobile-first Calendar app (MyOrbit) built with Flutter and Dart.

## Current snapshot (October 2025)

| Check | Status | Notes |
| --- | --- | --- |
| `flutter analyze` | ✅ Clean | Verified 2025‑10‑23.
| `flutter test` | ⚠️ 459 passing / 21 failing | Failures come from missing generated localization (`package:flutter_gen/...`). Run `flutter gen-l10n` or restore the generated files before relying on test results. |
| Device builds | ✅ Critical UI fixes applied | Calendar text scaling crashes resolved, notification system enhanced, animation errors fixed. Ready for device testing. |

For a fuller project status and prioritized follow-up, see the refreshed [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md).

## Feature status overview

### ✅ Available today (UI + offline data)
- Core navigation shell covering Home/Dashboard, Calendar, Activity feed, Notifications tray, Settings, and "My Orbit" contact management
- Offline preview mode powered by `DevDataService`, providing mock contacts, calendars, and events for demos without a backend connection
- Settings surface including theme toggle (dark mode default), default privacy selection, timezone display, and calendar visibility management
- Notification center UI with bulk-clear, badge counts, and footer CTA
- Event creation/editor flows with recurrence, reminders, attendee management, and invite response bottom sheet
- **STABILITY FIXES:** Calendar text scaling crashes resolved, event cards layout stability improved, animation errors fixed
- **NOTIFICATION ENHANCEMENTS:** 2-week filtering added to Activity screen, improved notification lifecycle management
- Accessibility groundwork: semantic widgets, scalable typography helpers, and numerous golden/widget tests (currently blocked by localization build step)

### ⚠️ Implemented in code but awaiting integration/validation
- Supabase-backed services for auth, contacts, events, invitations, and SMS/Email pipelines (requires configuring real credentials and enabling realtime tables)
- Realtime sync, conflict resolution queue, and cross-device notifications—logic is present but has not been re-verified against a live backend in 2025
- Google/Apple calendar import/export bridges; expect additional manual testing before shipping
- Automated test suite (580 specs) covers UI and services but currently fails until localization assets are generated
- Localization scaffolding (`flutter_gen`) referenced across tests yet not checked into source control

### 🚀 Planned / future vision
- Production deployment of edge functions for invitations and AI SMS agents once Supabase credentials and Twilio/Resend keys are provisioned
- Push notifications and background refresh across mobile/desktop
- Accessibility hardening based on earlier WCAG audit (contrast, large text overflow fixes still pending verification)
- Analytics and growth loops once the core scheduling flows are stable

### Backend readiness snapshot
- Supabase schema and edge functions live in `/supabase` and are ready to deploy, but no environment variables are supplied by default; the app stays in offline preview without them
- Realtime subscriptions, SMS/email invites, and AI SMS agents are implemented but unverified in 2025—treat docs as technical references rather than proof of production readiness
- Apple EventKit bridges exist under `ios/` and `macos/` but still need smoke testing on physical devices after the latest UI refactors

## Getting Started

### 🚀 **Quick Start (Easiest Way)**
- **Mac:** Double-click `launch_flutter.command`
- **Windows:** Double-click `launcher.bat`

👉 **See [`docs/setup/HOW_TO_RUN.md`](docs/setup/HOW_TO_RUN.md) for detailed instructions**

### Prerequisites
- Flutter SDK 3.35.x (pinned via FVM)
- Dart SDK 3.9.x (bundled with Flutter)
- Android Studio (SDK + emulator) for Android builds
- Xcode only needed for iOS (you plan to add it later)

### One-time setup (Windows)
1. Install Java 17 (Temurin) and Git:
   - PowerShell: `winget install --id EclipseAdoptium.Temurin.17.JDK -e` and `winget install --id Git.Git -e`
2. Install Flutter:
   - `winget install -e --id Google.Flutter` (or download SDK to `C:\src\flutter` and add `C:\src\flutter\bin` to PATH)
3. Optional: Android Studio for emulator and platform tools.
4. Restart terminal, then run:
   ```powershell
   flutter --version
   flutter doctor -v
   ```
5. **Ready to go!** Double-click `launcher.bat` or see [`docs/setup/WINDOWS_SETUP.md`](docs/setup/WINDOWS_SETUP.md)

### One-time setup (macOS)
```bash
brew install --cask flutter
brew install cocoapods # only needed for iOS later
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer || true
flutter --version && flutter doctor -v
```
**Ready to go!** Double-click `launch_flutter.command` or see [`docs/setup/HOW_TO_RUN.md`](docs/setup/HOW_TO_RUN.md)

### Use the pinned Flutter version (FVM)
- Config: `.fvm/fvm_config.json` pins Flutter `3.35.0`.
- Option A (global): install FVM: `dart pub global activate fvm` → run `fvm flutter ...`
- Option B (simple): just install Flutter stable ~3.35 on PATH and use `flutter ...`.

### Install and run
```bash
flutter pub get
flutter gen-l10n     # Generate localization files (REQUIRED)
flutter run          # choose a device or -d chrome for web
```

> **Important:** Always run `flutter gen-l10n` after pulling changes or before running tests. This generates required localization files that are not checked into git.

To run on web explicitly:
```bash
flutter run -d chrome
```

### Platform notes
- **macOS development:** The app defaults to an in-memory secure-storage fallback so you can run `flutter run -d macos` without Xcode signing. When you add the proper Keychain entitlement later, re-enable the native Keychain by running `flutter run --dart-define=ENABLE_NATIVE_SECURE_STORAGE=true -d macos`.
- **Desktop reminders:** Local notification scheduling now initialises correctly on macOS. No extra configuration is needed when running the desktop build.

## Project Structure (high-level)
```
lib/
├── core/                # Theme, constants, shared utilities, Supabase client
├── domain/              # Immutable data models & enums (Freezed)
├── logic/
│   ├── providers/       # Riverpod 3 state providers (auto-generated with @riverpod)
│   └── services/        # Business logic & API calls (Supabase, Google/Apple calendar sync, etc.)
├── ui/
│   ├── screens/         # Feature screens (dashboard, calendar, activity, settings, etc.)
│   └── widgets/         # Reusable widgets & semantic helpers
└── main.dart            # App entry point with ProviderScope
```

### Key Architecture Points
- **State Management:** Riverpod 3.0+ with code generation via `@riverpod` annotation (replaces legacy Provider pattern)
- **Backend:** Supabase (Postgres) with Realtime subscriptions for cross-device sync
- **Data Modes:** Offline-first with mock data (DevDataService) when credentials absent; seamless fallback to Supabase when available
- **Services:** Modular service layer handling API calls, calendar sync (Google/Apple), notifications, signals, and sync queue

## 📚 **Documentation**

### **📖 Documentation Index**
- [`docs/README.md`](docs/README.md) – Live documentation hub and navigation map.

### **🚀 Quick Start**
- [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md) – Current state of the project (must-read before coding).
- [`docs/setup/QUICK_START_BACKEND.md`](docs/setup/QUICK_START_BACKEND.md) – 5-minute Supabase setup.
- [`docs/qa/TEST_SUMMARY.md`](docs/qa/TEST_SUMMARY.md) – Historical test coverage (update after next full run).

### **⚡ Realtime Subscriptions (NEW)**
- [`docs/REALTIME_SUBSCRIPTIONS_SETUP.md`](docs/REALTIME_SUBSCRIPTIONS_SETUP.md) – **Step-by-step Supabase Dashboard enablement** for events, contacts, signals, and shares. **👉 READ THIS BEFORE DEPLOYING.**
- [`docs/REALTIME_ENABLEMENT_CHECKLIST.md`](docs/REALTIME_ENABLEMENT_CHECKLIST.md) – Phase-by-phase verification, testing, and troubleshooting guide.
- [`docs/REALTIME_IMPLEMENTATION_SUMMARY.md`](docs/REALTIME_IMPLEMENTATION_SUMMARY.md) – Technical implementation details and code changes.

### **📧 SMS & Email**
- [`docs/QUICK_START_SMS_DEPLOYMENT.md`](docs/QUICK_START_SMS_DEPLOYMENT.md) – 5-minute SMS/email setup guide (Resend + Twilio).
- [`docs/SMS_IMPLEMENTATION_SUMMARY.md`](docs/SMS_IMPLEMENTATION_SUMMARY.md) – Architecture, features, and cost breakdown.
- [`docs/DEPLOYMENT_EDGE_FUNCTIONS.md`](docs/DEPLOYMENT_EDGE_FUNCTIONS.md) – Complete deployment guide with troubleshooting.

### **🛠️ Development**
- [`docs/guides/DEVELOPER_GUIDE.md`](docs/guides/DEVELOPER_GUIDE.md) – Development setup and guidelines.
- [`docs/guides/FEATURES_AND_COMPONENTS_GUIDE.md`](docs/guides/FEATURES_AND_COMPONENTS_GUIDE.md) – Feature matrix and code entry points.
- [`docs/archive/`](docs/archive) – Historical documentation (read-only; contents may be outdated).

## Notable UX
- Landing page uses your icon at icons/Calendar_Icon_wood.png
- Onboarding steps are scroll-safe on small screens
- Invite flow advances correctly and uses the global footer wisely
- Calendar view toggle is centered; double-tap a date to open full-day details

## Build
```bash
# Android
flutter build apk --release

# iOS
flutter build ios --release

# Web
flutter build web
```

### Android signing (env-based)
Release signing is auto-configured via environment variables in `android/app/build.gradle.kts`:
```
ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
```
Provide these locally or as GitHub Actions secrets to produce signed release builds.

### CI
GitHub Actions at `.github/workflows/flutter_ci.yml`:
- Analyze, test, build web, build Android debug APK.
- Uploads artifacts for web and APK.
Add Android signing secrets to build signed releases in CI.

## License
MIT
