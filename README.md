# MyOrbit Calendar

Mobile-first Calendar app (MyOrbit) built with Flutter and Dart.

## Current snapshot (October 29, 2025)

| Check | Status | Notes |
| --- | --- | --- |
| `flutter analyze` | ❌ 22 issues | Analyzer fails while the Riverpod-era providers and the new `user_bloc` clean architecture module coexist. Generated mocks and imports for the retired Riverpod tests must be cleaned up before the Bloc layer can be treated as the primary surface. |
| `flutter test` | ❌ Compilation errors | Legacy Riverpod/BLoC specs still reference deleted `*.mocks.dart` files and pre-migration fields (`photoUrl`). New Bloc tests are pending, and localization output (`flutter gen-l10n`) must be regenerated before the suite can pass. |
| Device builds | 🚧 Needs rerun | UI fixes from late October are in place, but iOS/Android/web smoke tests have not been repeated since the navigation refactor. |

For a fuller project status and prioritized follow-up, see the refreshed [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md).

## Recent Updates

- **October 30, 2025**: Kicked off Flutter Bloc + Cubit adoption for user flows, introduced clean architecture layers (`data/`, `domain/`, `presentation/bloc`), and started replacing Supabase guides with Firebase-first documentation.
- **October 29, 2025**: Repository documentation audit, analyzer/test status regression captured, onboarding/contact flow docs brought in sync with the current Riverpod implementation.
- **October 24, 2025**: Data export system implementation, schema consolidation, UI enhancements, and development tooling improvements
- **October 23, 2025**: Major development work including profile picture functionality, UI improvements, and comprehensive testing setup
- **October 22, 2025**: Enhanced contact management, calendar integration, and notification system improvements
- **October 21, 2025**: Added realtime features, availability signals, and comprehensive backend integration

## Feature status overview

### ✅ Available today (UI + offline data)
- Core navigation shell covering Home/Dashboard, Calendar, Activity feed, Notifications tray, Settings, and "My Orbit" contact management
- Offline preview mode powered by `DevDataService`, providing mock contacts, calendars, and events for demos without a backend connection
- Settings surface including theme toggle (dark mode default), default privacy selection, timezone display, calendar visibility management, and the data‑export request sheet
- Notification center UI with badge counts, clear-all, and reminder hand-off footer actions
- Event creation/editor flows with recurrence, reminders, attendee management, invite response sheet, and availability-signal conflict resolution
- **STABILITY FIXES:** Calendar text scaling crashes resolved, event cards layout stability improved, animation errors fixed
- **NOTIFICATION ENHANCEMENTS:** 2-week filtering added to Activity screen, improved notification lifecycle management
- Accessibility groundwork: semantic widgets, scalable typography helpers, and numerous golden/widget tests (currently blocked by localization build step)

### ⚠️ Implemented in code but awaiting integration/validation
- Firebase-backed services (Auth, Firestore repositories, messaging) are scaffolded but still rely on mock implementations until credentials and security rules land. Legacy Supabase services remain for comparison and will be removed after parity.
- Realtime sync, conflict resolution queue, and cross-device notifications—logic is present but has not been re-verified against a live Firebase backend.
- Google/Apple calendar import/export bridges; expect additional manual testing before shipping
- Automated test suite (580 specs) covers UI and services but currently fails until localization assets are generated
- Localization scaffolding (`flutter_gen`) referenced across tests yet not checked into source control
- Legacy `presentation/bloc` layer is still present but no longer wired into production UI. Its test suite requires new mock generation (`build_runner`) plus updates for the `UserProfile.avatarUrl` field before analyzer/tests can pass again.

### 🚀 Planned / future vision
- Production deployment of Firebase Cloud Functions for invitations and AI SMS agents once Twilio/Resend keys are provisioned
- Push notifications and background refresh across mobile/desktop
- Accessibility hardening based on earlier WCAG audit (contrast, large text overflow fixes still pending verification)
- Analytics and growth loops once the core scheduling flows are stable

### Backend readiness snapshot
- Firebase configuration files (`firebase_options_*.dart`) need to be generated per environment before the repositories can talk to Firestore/Auth.
- Supabase schema and edge functions remain in `/supabase` purely as historical artefacts; do not deploy them unless you intentionally target the legacy stack.
- Realtime subscriptions, SMS/email invites, and AI SMS agents will move to Firebase Cloud Functions—implementation tracking lives in `docs/MIGRATION_TO_FIREBASE_AND_BLOC.md`.

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
├── core/                # Theme, constants, shared utilities, Firebase config helpers
├── data/                # Repositories + data sources (Firebase + offline mocks)
├── domain/              # Immutable entities, value objects, repository contracts (Freezed)
├── presentation/
│   └── bloc/            # Flutter Bloc/Cubit modules following clean architecture
├── logic/
│   ├── providers/       # Legacy Riverpod providers (scheduled for removal post-migration)
│   └── services/        # Shared services (DevDataService, calendar sync, notifications)
├── ui/
│   ├── screens/         # Feature screens (dashboard, calendar, activity, settings, etc.)
│   └── widgets/         # Reusable widgets & semantic helpers
└── main.dart            # App entry point (Bloc + Provider wiring during transition)
```

### Key Architecture Points
- **State Management:** Flutter Bloc + Cubit power the new clean architecture feature modules; legacy Riverpod providers remain temporarily during the migration.
- **Backend:** Firebase (Firestore + Authentication) is the target production backend. Supabase artifacts remain in `/supabase` for historical reference but are no longer the primary path.
- **Data Modes:** Offline-first with mock data (`DevDataService`, `UserRemoteDataSourceImpl`) until Firebase credentials are configured; Firebase implementations will replace mocks feature-by-feature.
- **Services:** Modular service layer wraps Firebase APIs, calendar sync (Google/Apple), notifications, and offline caches. Shared utilities continue to live under `logic/services` during the transition.

## 📚 **Documentation**

### **📖 Documentation Index**
- [`docs/README.md`](docs/README.md) – Live documentation hub and navigation map.

### **🚀 Quick Start**
- [`docs/status/PROJECT_STATUS.md`](docs/status/PROJECT_STATUS.md) – Current state of the project (must-read before coding).
- [`docs/status/PRODUCTION_READINESS_CHECKLIST.md`](docs/status/PRODUCTION_READINESS_CHECKLIST.md) – Task list to reach Firebase-backed production readiness.
- [`docs/setup/QUICK_START_BACKEND.md`](docs/setup/QUICK_START_BACKEND.md) – Firebase setup primer (Firestore, Auth, config injection).
- [`docs/qa/TEST_SUMMARY.md`](docs/qa/TEST_SUMMARY.md) – Historical test coverage (update after next full run).

### **☁️ Backend & Architecture**
- [`docs/MIGRATION_TO_FIREBASE_AND_BLOC.md`](docs/MIGRATION_TO_FIREBASE_AND_BLOC.md) – Active migration plan covering Firebase adoption and Bloc rollout.
- `supabase/` directory – retained for historical reference; treat as legacy while migrating to Firebase.

### **📚 Legacy Supabase References**
- [`docs/REALTIME_SUBSCRIPTIONS_SETUP.md`](docs/REALTIME_SUBSCRIPTIONS_SETUP.md) – Legacy realtime enablement (Supabase-only).
- [`docs/REALTIME_ENABLEMENT_CHECKLIST.md`](docs/REALTIME_ENABLEMENT_CHECKLIST.md) – Legacy verification guide.
- [`docs/REALTIME_IMPLEMENTATION_SUMMARY.md`](docs/REALTIME_IMPLEMENTATION_SUMMARY.md) – Historical implementation notes.
- [`docs/QUICK_START_SMS_DEPLOYMENT.md`](docs/QUICK_START_SMS_DEPLOYMENT.md) – Supabase/Twilio deployment (replace with Firebase Functions plan).
- [`docs/SMS_IMPLEMENTATION_SUMMARY.md`](docs/SMS_IMPLEMENTATION_SUMMARY.md) – Legacy architecture reference.
- [`docs/DEPLOYMENT_EDGE_FUNCTIONS.md`](docs/DEPLOYMENT_EDGE_FUNCTIONS.md) – Edge function (Supabase) playbook.

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
