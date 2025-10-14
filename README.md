# Calendar_Mobile

Mobile-first Calendar app (MyOrbit) built with Flutter and Dart.

## Features

- 📱 Mobile-first design with touch-friendly interactions
- 🎨 Modern UI with clean components and smooth animations
- 📅 Month, Week, and Day toggle above the calendar
- 🧭 Onboarding flow with Google Calendar connect, invites, and summary
- 📡 Availability signal platform (services + providers) with calendar conflict warnings
- 🔔 Granular notification settings including signal alert channels & buffers
- 💾 Local storage for events via shared_preferences
- 🌐 Web dev target for quick iteration

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

Additional references:
- [`FUTURE_READY_CODE.md`](FUTURE_READY_CODE.md) – code scaffolding already in place for upcoming features.
- [`BACKEND_TASKS.md`](BACKEND_TASKS.md) – backend/API follow-up list with reasons.

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
