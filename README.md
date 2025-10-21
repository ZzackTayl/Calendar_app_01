# Calendar_Mobile

Mobile-first Calendar app (MyOrbit) built with Flutter and Dart.

> ✅ **Build status:** `flutter test` (454 specs) now passes end-to-end. See [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md) for manual QA actions still outstanding.

## Features

### 🧩 Feature Implementations (re-validate after fixing build)
- 📱 Mobile-first design with touch-friendly interactions
- 🎨 Modern UI with clean components, smooth animations, and accessibility support
- 📅 Advanced calendar views: Month, Week, and Day toggle with sophisticated event rendering
- 🧭 Comprehensive onboarding flow with Google Calendar integration and connection management
- 📡 Sophisticated availability signal platform: Share availability with different contacts at different permission levels, with conflict detection and smart buffers
- 🔔 Granular notification settings including signal alert channels, buffers, and comprehensive notification controls
- 💾 Offline-first architecture with Supabase backend and local storage fallback via shared_preferences
- 🌐 Web dev target for quick iteration with native mobile app experience
- 🔐 Multi-tier privacy system: 3-level contact permissions (Private/Semi-Visible/Visible) with 3-level event privacy (Normal/Exclusive/Super Exclusive)
- 🔄 Smart recurrence patterns with AI-powered suggestions for recurring events and signals
- 🌙 Dark/Light theme support with comprehensive appearance customization
- 🕐 Advanced timezone handling with user-configurable settings
- 💥 Conflict detection between events and availability signals with automatic resolution options
- 📊 Multi-calendar support with visibility toggling and color coding
- 🔄 Event buffers and smart scheduling assistance
- 🎉 Complete Event Invite Response System - Beautiful UI for accepting/declining event invitations with conflict detection, auto-calendar integration, and organizer notifications
- 📧 **NEW: SMS & Email Infrastructure** - Production-ready contact invitations via Resend (email) and Twilio (SMS), plus AI agent SMS framework for two-way messaging with multi-agent orchestration

> These flows are present in the codebase, but end-to-end verification should wait until the conflict-resolution test failure is resolved.

### 🚧 **Backend Status**
- ✅ **Database Schema Complete** - All 11 tables, 8 functions, RLS policies, and indexes implemented
- ✅ **API Integration Ready** - Supabase client configured, migration scripts provided
- ✅ **Event Invite API** - Full CRUD operations for event invitations implemented and tested
- ✅ **SMS & Email Infrastructure Complete** - Production-ready edge functions for contact invitations (Resend email, Twilio SMS) + AI agent SMS framework with two-way conversation support. See [`docs/DEPLOYMENT_EDGE_FUNCTIONS.md`](docs/DEPLOYMENT_EDGE_FUNCTIONS.md) and [`docs/SMS_IMPLEMENTATION_SUMMARY.md`](docs/SMS_IMPLEMENTATION_SUMMARY.md)
- ✅ **Apple Calendar Integration Complete** - Native EventKit bridges for iOS/macOS with platform channels, Riverpod state management, Supabase integration. See [`docs/features/APPLE_CALENDAR_SETUP_COMPLETE.md`](docs/features/APPLE_CALENDAR_SETUP_COMPLETE.md)

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
flutter run          # choose a device or -d chrome for web
```

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
