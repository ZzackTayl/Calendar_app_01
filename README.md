# Calendar_Mobile

Mobile-first Calendar app (MyOrbit) built with Flutter and Dart.

## Features

### ✅ **Implemented & Production Ready**
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
- 🎉 **NEW: Complete Event Invite Response System** - Beautiful UI for accepting/declining event invitations with conflict detection, auto-calendar integration, and organizer notifications

### 🚧 **Backend Status**
- ✅ **Database Schema Complete** - All 11 tables, 8 functions, RLS policies, and indexes implemented
- ✅ **API Integration Ready** - Supabase client configured, migration scripts provided
- ✅ **Event Invite API** - Full CRUD operations for event invitations implemented and tested

## Getting Started

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

### One-time setup (macOS)
```bash
brew install --cask flutter
brew install cocoapods # only needed for iOS later
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer || true
flutter --version && flutter doctor -v
```

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

## Project Structure (high-level)
```
lib/
├── core/                # Theme, constants, shared utilities
├── domain/              # Immutable data models & enums
├── logic/
│   ├── providers/       # Riverpod state (events, contacts, signals, settings)
│   └── services/        # API + mock services (DevDataService, SignalsService, etc.)
├── ui/
│   ├── screens/         # Feature screens (dashboard, calendar, activity, settings)
│   └── widgets/         # Reusable widgets & semantic helpers
└── main.dart            # App entry point
```

## 📚 **Documentation**

### **📖 Documentation Index**
- [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) – Complete documentation guide and navigation

### **🚀 Quick Start**
- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) – Complete project status and recent achievements
- [`QUICK_START_BACKEND.md`](QUICK_START_BACKEND.md) – 5-minute backend setup
- [`TEST_SUMMARY.md`](TEST_SUMMARY.md) – Comprehensive test results and coverage

### **🛠️ Development**
- [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) – Development setup and guidelines
- [`BACKEND_READY_SUMMARY.md`](BACKEND_READY_SUMMARY.md) – Backend integration guide
- [`archive/docs/`](archive/docs/) – Historical development documentation and reports

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
