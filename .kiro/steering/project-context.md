# MyOrbit Calendar - Project Context

**Last Updated:** November 1, 2025  
**Source of Truth:** `docs/migration/STATUS.md`

---

## Project Overview

MyOrbit Calendar is a sophisticated, consent-aware calendar application built with Flutter and Dart. The project is currently undergoing a comprehensive migration from Riverpod + Supabase to BLoC/Cubit + Firebase following the MyOrbit_CleanArch canonical architecture pattern.

---

## Current Status

### Architecture Migration: ✅ COMPLETE
- **Status:** All 7 phases complete (42 hours, under budget)
- **Code Quality:** Zero analyzer errors
- **Architecture:** 100% compliant with MyOrbit_CleanArch patterns

### UI Migration: 🚧 IN PROGRESS
- **Status:** 2 of 26 screens migrated (8%)
- **Estimated Time:** 24-35 hours remaining

---

## Architecture

### Source of Truth: MyOrbit_CleanArch

**Location:** `../MyOrbit_CleanArch` (sibling directory)

All architecture decisions, patterns, naming conventions, and implementation details follow this canonical project exactly.

**Key Documentation:**
- `MYORBIT_CLEANARCH_PATTERNS.md` - Complete pattern reference
- `REFERENCE_FROM_CLEANARCH/` - Copied example files
- `docs/migration/STATUS.md` - Current migration status

### Clean Architecture Layers

```
lib/
├── features/                    # Feature modules (Clean Architecture)
│   ├── calendar/               # Calendar & Events
│   ├── contacts/               # Contacts & Sharing
│   ├── signals/                # Availability Signals
│   ├── settings/               # Settings & Preferences
│   └── external_calendar/      # Google/Apple Calendar Import
│
├── presentation/cubit/         # Additional cubits
│   ├── auth/                   # Authentication
│   ├── calendar/               # CalendarsCubit
│   ├── profile/                # UserProfileCubit
│   └── settings/               # SettingsCubit
│
├── core/                        # Shared infrastructure
│   ├── di/                     # GetIt dependency injection
│   ├── error/                  # Failure classes
│   ├── enums/                  # AppStateStatus enum
│   └── utils/                  # EitherMixin helpers
│
├── logic/providers/            # ❌ DEPRECATED - Riverpod (being removed)
└── ui/screens/                 # ⚠️ UI screens (need BLoC wiring)
```

### Key Patterns

1. **Dependency Injection:** GetIt service locator
2. **Error Handling:** Either<Failure, Success> (dartz)
3. **State Management:** BLoC/Cubit with AppStateStatus enum
4. **Architecture:** Features-first clean architecture

---

## Development Setup

### Prerequisites

```bash
flutter pub get
flutter gen-l10n  # Required for localization
```

### Running the App

```bash
# App runs in offline mode with mock data
flutter run

# Firebase is configured but not connected to real projects yet
```

### Service Initialization Sequence

**CRITICAL:** Services must initialize in order before `runApp()` in `main.dart`:

1. `SupabaseService.initialize()` - Supabase connection (10s timeout, fails gracefully)
2. `TimezoneService.initialize()` - Timezone database loading
3. `ConnectivityService.initialize()` - Connectivity monitoring
4. `ReminderSchedulingService.initialize()` - **MUST execute before AppShell renders**

All initializations use try-catch for graceful degradation.

### Environment Variables

**Native platforms** (macOS, iOS, Android):
- Place `.env` file in repo root
- See `.env.example` for required keys

**Web platform:**
- Use `--dart-define` flags only
- `.env` loading is skipped to prevent 404 errors

```bash
# Web launch example
flutter run -d chrome \
  --dart-define=FLUTTER_ENV=dev \
  --dart-define=DEV_SUPABASE_URL=https://xxx.supabase.co \
  --dart-define=DEV_SUPABASE_ANON_KEY=your_key
```

---

## Working with the Codebase

### ✅ DO

- Follow patterns in `MYORBIT_CLEANARCH_PATTERNS.md`
- Use GetIt for dependency injection
- Use Either<Failure, Success> for error handling
- Create features in `lib/features/` directory
- Use BLoC/Cubit for state management
- Register new components in `lib/core/di/service_locator_impl.dart`

### ❌ DON'T

- Create new Riverpod providers
- Add Supabase dependencies
- Modify `REFERENCE_FROM_CLEANARCH/` files (read-only reference)
- Use Result<T> type (use Either instead)
- Create features outside `lib/features/` structure

---

## Migration Pattern

### Before (Riverpod)
```dart
class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(myProvider);
    return data.when(
      data: (value) => MyWidget(value),
      loading: () => CircularProgressIndicator(),
      error: (e, s) => ErrorWidget(e),
    );
  }
}
```

### After (BLoC)
```dart
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocBuilder<MyCubit, MyState>(
      builder: (context, state) {
        if (state.status.isLoading) return CircularProgressIndicator();
        if (state.status.isFailure) return ErrorWidget(state.message);
        return MyWidget(state.data);
      },
    );
  }
}
```

---

## Testing

### Current Status

- **Migrated Code:** ✅ 0 errors
- **Test Suite:** ❌ Failing (needs Either pattern updates)
- **Coverage:** Pending test updates

### Running Tests

```bash
# Analyze migrated code (should pass)
dart analyze lib/features/

# Run tests (currently failing - needs updates)
flutter test
```

---

## Known Issues

1. **Test Suite:** Failing - needs updates for Either pattern
2. **iOS Build:** Requires iOS 15.0+ deployment target
3. **Old Code:** 22 analyzer issues in non-migrated code

---

## Troubleshooting

### Blank Screen on Startup

1. Check console for initialization debug output (`🚀 Starting bootstrapApp...`)
2. Look for error boundary text if startup fails
3. Verify all `dart-define` vars are set for web builds
4. Ensure `ReminderSchedulingService.initialize()` completed before AppShell

### Build Errors

```bash
# Fix dependencies
flutter pub get

# Regenerate code (if Riverpod/Freezed changed)
dart run build_runner build --delete-conflicting-outputs

# Analyze
flutter analyze

# Format
dart format lib test
```

---

## Documentation

### Primary Documentation

- `README.md` - Project overview
- `DEVELOPER_QUICKSTART.md` - Quick start guide
- `MYORBIT_CLEANARCH_PATTERNS.md` - Architecture patterns
- `docs/migration/STATUS.md` - Current migration status
- `docs/migration/PHASES.md` - Phase completion summaries

### Reference Documentation

- `docs/README.md` - Documentation hub
- `docs/guides/DEVELOPER_GUIDE.md` - Architecture & workflows
- `docs/setup/HOW_TO_RUN.md` - Local run instructions
- `docs/reference/CURRENT_TECH_STACK.md` - Tech stack overview

### Migration Documentation

- `docs/migration/PHASE_1_COMPLETE.md` - Auth migration
- `docs/migration/PHASE_2_COMPLETE.md` - Calendar/Events migration
- `docs/migration/PHASE_3_COMPLETE.md` - Contacts migration
- `docs/migration/PHASE_4_COMPLETE.md` - Signals migration
- `docs/migration/PHASE_5_COMPLETE.md` - Settings migration
- `docs/migration/PHASE_6_COMPLETE.md` - External Calendar migration
- `docs/migration/PHASE_7_COMPLETE.md` - Cleanup & Testing

---

## Quick Commands

```bash
# Format + lint
dart format lib test
flutter analyze

# Generate code
dart run build_runner build --delete-conflicting-outputs

# Run tests
flutter test

# Launch app
flutter run -d macos  # or chrome, ios, android
```

---

## Key Principles

1. **Always consult** `docs/migration/STATUS.md` before coding
2. **Follow MyOrbit_CleanArch patterns** exactly (source of truth)
3. **Use Either pattern** for all error handling
4. **Register in GetIt** for all new components
5. **Update documentation** after significant changes
6. **Test incrementally** with `flutter analyze` after each change

---

## Next Steps

1. **Continue UI Migration** - 24 screens remaining
2. **Create Missing Cubits** - NotificationCubit, CalendarSharingCubit, CalendarMigrationCubit
3. **Update Test Suite** - For Either pattern
4. **Remove Riverpod Packages** - After UI migration complete
5. **End-to-End Testing** - Comprehensive testing

---

**For detailed architecture patterns, always refer to `MYORBIT_CLEANARCH_PATTERNS.md`**  
**For current status, always refer to `docs/migration/STATUS.md`**
