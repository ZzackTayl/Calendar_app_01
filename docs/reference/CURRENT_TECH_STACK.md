# MyOrbit Calendar – Current Tech Stack (October 2025)

**Last Updated:** October 31, 2025
**Status:** Active migration from Supabase/Riverpod to Firebase/Bloc
**Application:** MyOrbit - Consent-aware calendar for complex social networks

---

## Executive Summary

MyOrbit is currently in a **transitional architecture state**. The application is being migrated from:
- **Supabase → Firebase** (backend)
- **Riverpod → Flutter Bloc/Cubit** (state management)

Both old and new systems coexist in the codebase. The app currently runs in **offline preview mode** with mock data while Firebase integration is being completed.

---

## 1. Platform & Language

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Flutter | 3.35.0 (pinned via FVM) | Mobile-first, cross-platform |
| Language | Dart | 3.9.x | Bundled with Flutter |
| Target Platforms | iOS, Android, Web | - | Desktop (macOS) supported for development |
| Package Name | `myorbit_calendar` | 1.0.0+1 | Internal name |
| Application ID (Android) | `com.example.calendar_app` | - | Needs production update |
| Namespace (Android) | `com.myorbit.app` | - | Kotlin MainActivity path |

---

## 2. State Management (TRANSITIONAL)

### Current (Mixed State)
The project uses **both** state management approaches during migration:

#### Primary: Flutter Bloc + Cubit (NEW - In Progress)
- **Package:** `flutter_bloc: ^9.1.1`
- **Location:** `lib/presentation/bloc/` and `lib/presentation/cubit/`
- **Implemented Modules:**
  - User management (`user_bloc`, `user_profile_cubit`)
  - Authentication (`auth_cubit`)
  - Calendar management (`calendars_cubit`)
  - Settings (`settings_cubit`)
  - Onboarding (`onboarding_cubit`)
  - Notifications (`notification_bloc`)
  - Events (`event_bloc`)
  - UI state (`expansion_cubit`)

#### Legacy: Riverpod (Being Phased Out)
- **Packages:**
  - `flutter_riverpod: ^3.0.3`
  - `hooks_riverpod: ^3.0.3`
  - `riverpod_annotation: ^3.0.3`
- **Location:** `lib/logic/providers/`
- **Status:** Still powering existing screens during migration
- **Migration Plan:** See `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md`

**IMPORTANT FOR ENGINEERS:** Do not create new Riverpod providers. All new state management should use Bloc/Cubit patterns.

---

## 3. Backend Services (TRANSITIONAL)

### Primary Target: Firebase (In Progress)

#### Configured Packages
```yaml
firebase_core: ^4.2.0
firebase_auth: ^6.1.1
cloud_firestore: ^6.0.3
firebase_analytics: ^12.0.3
firebase_crashlytics: ^5.0.3
firebase_messaging: ^16.0.3
firebase_storage: ^13.0.3
cloud_functions: ^6.0.3
```

#### Current Status
- **Configuration:** Packages installed, initialization code present
- **Integration Status:** NOT YET WIRED to production Firebase projects
- **Current Mode:** App runs with mock data via `DevDataService`
- **Platform Files Needed:**
  - `android/app/google-services.json` (per environment)
  - `ios/Runner/GoogleService-Info.plist` (per environment)
  - Firebase options files need generation via FlutterFire CLI

#### Emulator Support
The `.env.example` shows Firebase emulator configuration is planned:
- Auth Emulator: Port 9099
- Firestore Emulator: Port 8080
- Functions Emulator: Port 5001
- Storage Emulator: Port 9199

### Legacy: Supabase (Being Phased Out)

#### Package
- `supabase_flutter: ^2.6.5` (still in pubspec.yaml)

#### Current Status
- **Code Usage:** Only 1 reference in lib/ (minimal)
- **Configuration:** Environment variables present in `.env.example`
- **Schema:** Preserved in `/supabase` directory for historical reference
- **Edge Functions:** Exist but not deployed
- **Migration Status:** See Phase 2-3 of `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md`

**IMPORTANT:** Supabase artifacts are kept for reference only. Do not deploy or enhance Supabase infrastructure.

---

## 4. Architecture Pattern

### Clean Architecture (NEW)

```
lib/
├── core/               # Cross-cutting concerns
│   ├── bootstrap/      # App initialization (Bloc-based)
│   ├── config/         # Environment configuration
│   ├── di/            # Dependency injection
│   ├── services/      # Core services (analytics, Firebase)
│   └── ...
├── domain/            # Business logic layer
│   ├── entities/      # Domain models (Freezed)
│   ├── repositories/  # Repository contracts
│   └── use_cases/     # Business logic
├── data/              # Data layer
│   ├── datasources/   # Remote/local data sources
│   │   ├── local/     # SQLite, SharedPreferences
│   │   └── remote/    # Firebase, API clients
│   └── repositories/  # Repository implementations
├── presentation/      # UI layer
│   ├── bloc/         # Bloc pattern implementations
│   ├── cubit/        # Cubit pattern implementations
│   ├── app/          # App widget
│   └── routes/       # Navigation
├── logic/            # LEGACY - Being migrated
│   ├── providers/    # Riverpod providers (phase out)
│   └── services/     # Shared services
└── ui/               # Screens & widgets
    ├── screens/
    └── widgets/
```

### Key Points
- **Bootstrap:** BLoC-based app initialization via `AppBootstrapper` and `BootstrapAppBloc`
- **DI:** Manual dependency injection in `lib/core/di/`
- **Repository Pattern:** Contracts in `domain/`, implementations in `data/`
- **Mock Data:** `DevDataService` provides offline preview data
- **Navigation:** GoRouter with shell navigation

---

## 5. Key Dependencies

### State & Architecture
```yaml
# State Management
flutter_bloc: ^9.1.1          # Primary state management
equatable: ^2.0.5             # Value equality
flutter_riverpod: ^3.0.3      # Legacy (phase out)
hooks_riverpod: ^3.0.3        # Legacy (phase out)

# Routing
go_router: ^16.2.4

# Code Generation
freezed_annotation: ^3.1.0
json_annotation: ^4.9.0
build_runner: 2.7.1
freezed: ^3.2.3
json_serializable: ^6.7.1
```

### Backend & Networking
```yaml
dio: ^5.9.0                   # HTTP client
firebase_*: ^4.2.0+           # Firebase suite (see above)
supabase_flutter: ^2.6.5      # Legacy (minimal usage)
```

### Utilities
```yaml
# Environment & Config
flutter_dotenv: ^6.0.0

# Data & Time
uuid: ^4.5.1
intl: ^0.20.2
timezone: ^0.10.1

# Security
crypto: ^3.0.6
encrypt: ^5.0.3
pointycastle: ^3.9.1
flutter_secure_storage: ^9.2.2

# Storage
shared_preferences: ^2.5.3

# Connectivity
connectivity_plus: ^7.0.0
url_launcher: ^6.3.2
```

### UI & Platform
```yaml
# Calendar & Date
table_calendar: ^3.2.0

# Images
image_picker: ^1.1.2
image_cropper: ^11.0.0

# Notifications
flutter_local_notifications: ^19.5.0

# Permissions
permission_handler: ^12.0.1

# Contacts
flutter_contacts: ^1.1.9+2

# Google Services
google_sign_in: ^7.2.0
googleapis: ^15.0.0
googleapis_auth: ^2.0.0
```

### Monitoring & Observability
```yaml
sentry_flutter: ^9.7.0        # Error tracking (optional)
firebase_analytics: ^12.0.3   # Usage analytics
firebase_crashlytics: ^5.0.3  # Crash reporting
```

### Testing
```yaml
flutter_test: sdk
test: 1.26.2
mockito: 5.5.0
bloc_test: ^10.0.0            # Bloc testing
golden_toolkit: ^0.15.0       # Golden tests
patrol: ^3.19.0               # Integration tests
```

---

## 6. Build System

### Android
- **Build Tool:** Gradle (Kotlin DSL)
- **Java Version:** 17 (Temurin recommended)
- **Gradle Files:**
  - `android/build.gradle.kts` (root)
  - `android/app/build.gradle.kts` (app module)
- **Signing:** Environment-based via `ANDROID_KEYSTORE_*` variables
- **Namespace:** `com.example.calendar_app` (TODO: update to production)
- **MainActivity:** `com.myorbit.app.MainActivity.kt`

### iOS
- **Xcode Required:** For iOS builds
- **CocoaPods:** Dependency manager
- **Bundle ID:** (To be configured in production)

### Web
- **Renderer:** Auto (defaults to CanvasKit)
- **Build Command:** `flutter build web`

---

## 7. Environment Configuration

### Environment Variables (.env file)

#### App Environment
```bash
APP_ENV=dev|staging|prod      # Primary environment selector
FLUTTER_ENV=dev               # Deprecated (backwards compat)
```

#### Firebase (Per Environment)
```bash
DEV_FIREBASE_PROJECT_ID=...
DEV_FIREBASE_WEB_API_KEY=...
STAGING_FIREBASE_PROJECT_ID=...
PROD_FIREBASE_PROJECT_ID=...
```

#### OAuth
```bash
GOOGLE_OAUTH_CLIENT_ID_IOS=...
GOOGLE_OAUTH_CLIENT_ID_ANDROID=...
APPLE_SERVICES_ID=...
```

#### Supabase (Legacy - Optional)
```bash
DEV_SUPABASE_URL=...
DEV_SUPABASE_ANON_KEY=...
# (Staging and Prod variants exist)
```

#### Monitoring
```bash
SENTRY_DSN=...                # Optional error tracking
SENTRY_ENV=development
SENTRY_RELEASE=1.0.0+1
```

#### Future Services
```bash
TWILIO_ACCOUNT_SID=...        # SMS (not MVP)
TWILIO_AUTH_TOKEN=...
```

---

## 8. Current Build Status

### Analysis & Testing
| Command | Status | Issue | Resolution |
|---------|--------|-------|------------|
| `flutter analyze` | ❌ 22 issues | Riverpod/Bloc coexistence conflicts, stale mocks | Clean up legacy mocks, complete migration |
| `flutter test` | ❌ Failed | Missing localization files, deleted mocks | Run `flutter gen-l10n`, update tests |
| `flutter run` | ✅ Works | - | Runs in offline mode with mock data |

### Required Actions Before Production
1. Run `flutter gen-l10n` to generate localization files
2. Clean up stale mock files (`.mocks.dart`)
3. Complete Firebase configuration per environment
4. Update `UserProfile` field references (`photoUrl` → `avatarUrl`)
5. Regenerate mocks with `dart run build_runner build`

---

## 9. Data Sources (Current Implementation)

### Mock Data (Active)
- **Service:** `DevDataService` in `lib/logic/services/dev_data_service.dart`
- **Purpose:** Offline preview mode
- **Provides:** Mock contacts, calendars, events, signals
- **Used By:** All screens in current state

### Firebase Data Sources (In Progress)
- **Location:** `lib/data/datasources/remote/`
- **Status:** Implemented with mocks
- **Example:** `UserRemoteDataSourceImpl` returns mock data
- **Next Step:** Replace mocks with actual Firebase calls

### Local Data Sources
- **Location:** `lib/data/datasources/local/`
- **Technologies:** SharedPreferences, Flutter Secure Storage
- **Purpose:** Cache, settings, offline queue

---

## 10. CI/CD

### GitHub Actions
- **File:** `.github/workflows/flutter_ci.yml`
- **Current Jobs:**
  - Analyze
  - Test (currently failing)
  - Build web
  - Build Android debug APK
- **Artifacts:** Web build, APK
- **Secrets Needed:**
  - `ANDROID_KEYSTORE_PATH`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`

---

## 11. Migration Status Summary

### Completed
✅ Flutter Bloc/Cubit packages installed
✅ Clean architecture folders created (`domain/`, `data/`, `presentation/bloc/`)
✅ Firebase packages installed
✅ Bootstrap system migrated to Bloc pattern
✅ Core Cubits/Blocs implemented (auth, user, calendar, settings)
✅ Mock data service for offline development

### In Progress
🚧 Wiring Firebase to data sources
🚧 Completing Bloc migration (events, notifications)
🚧 Phasing out Riverpod providers
🚧 Test suite updates for new architecture

### Blocked/Pending
❌ Firebase project configuration per environment
❌ Platform-specific Firebase config files
❌ Localization file generation
❌ Test suite passing
❌ Production backend deployment

---

## 12. Key Documentation Files

### Primary References
- **This Document:** Current tech stack truth
- **Migration Plan:** `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md`
- **Project Status:** `docs/status/PROJECT_STATUS.md`
- **README:** `/README.md` (high-level overview)

### Architecture Guides
- **Clean Architecture:** See folder structure above
- **Bloc Pattern:** `lib/presentation/bloc/` examples
- **Repository Pattern:** `lib/domain/repositories/` contracts

### Setup Guides
- **Getting Started:** `docs/setup/HOW_TO_RUN.md`
- **Backend Setup:** `docs/setup/QUICK_START_BACKEND.md`
- **Authentication:** `docs/setup/FOUNDER_AUTH_SETUP_GUIDE.md`

---

## 13. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Oct 2025 | Migrate Supabase → Firebase | Better ecosystem, Cloud Functions, simpler ops |
| Oct 2025 | Migrate Riverpod → Bloc | Industry standard, better testability, team familiarity |
| Oct 2025 | Keep dual system temporarily | Gradual migration reduces risk |
| Oct 2025 | Use mock data during transition | Enables UI work without backend |
| Oct 2025 | Sentry optional | Privacy-first approach |

---

## 14. Engineer Onboarding Checklist

New engineers should:

- [ ] Read this document completely
- [ ] Review `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md`
- [ ] Understand current status: **transitional architecture**
- [ ] Know: Create new features with **Bloc/Cubit**, not Riverpod
- [ ] Know: Target **Firebase**, not Supabase
- [ ] Set up environment: Follow `docs/setup/HOW_TO_RUN.md`
- [ ] Run `flutter gen-l10n` before testing
- [ ] Review clean architecture in `lib/domain/`, `lib/data/`, `lib/presentation/`
- [ ] Check current test status before adding tests

---

## 15. Common Commands

```bash
# Setup
flutter pub get
flutter gen-l10n              # REQUIRED before testing

# Development
flutter run                   # Runs with mock data
flutter run -d chrome         # Web development

# Code Generation
dart run build_runner build --delete-conflicting-outputs

# Quality Checks
flutter analyze               # Currently: 22 issues
flutter test                  # Currently: failing
dart format lib test

# Firebase (when configured)
firebase emulators:start      # Local development
firebase deploy --only functions
```

---

## 16. Future Technology Additions (Planned)

- [ ] Firebase Emulator Suite integration
- [ ] End-to-end tests with Patrol
- [ ] Performance monitoring (Firebase Performance)
- [ ] A/B testing (Firebase Remote Config)
- [ ] Cloud Functions for server-side logic
- [ ] Drift (SQLite) for offline-first persistence
- [ ] Background task scheduling

---

## 17. Technology We're NOT Using

To avoid confusion, here's what MyOrbit does **not** use:

- ❌ BLoC library (we use flutter_bloc, not the older bloc package directly)
- ❌ Provider package (using Bloc instead)
- ❌ GetX (using GoRouter + Bloc)
- ❌ Redux (using Bloc)
- ❌ MobX (using Bloc)
- ❌ GraphQL (using REST with Dio and Firebase APIs)
- ❌ AWS (using Firebase)
- ❌ Appwrite (initially considered, chose Firebase)

---

**For questions or updates to this document, contact the MyOrbit engineering team.**

**Last verified:** October 31, 2025
