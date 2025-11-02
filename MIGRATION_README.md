# MyOrbit Calendar - Migration to Clean Architecture

**Status:** 🚧 In Progress (24% Complete)  
**Started:** October 31, 2025  
**Source of Truth:** `../MyOrbit_CleanArch` (Canonical Clean Architecture Reference)

---

## 🎯 What's Happening

This project is being migrated from:
- **Supabase → Firebase** (backend)
- **Riverpod → BLoC/Cubit** (state management)
- **Mixed Architecture → Clean Architecture** (following MyOrbit_CleanArch patterns)

**Why?** To align with the canonical MyOrbit_CleanArch project, which is our source of truth for architecture patterns.

---

## 📁 Repository Structure

### Current State (Dual System)

```
lib/
├── features/                    # ✅ NEW - Clean Architecture (Migrated)
│   ├── calendar/               # Phase 2 - Complete
│   │   ├── data/
│   │   │   ├── datasources/   # Firestore data sources
│   │   │   └── repositories/  # Repository implementations
│   │   ├── domain/
│   │   │   └── repositories/  # Repository contracts
│   │   └── presentation/
│   │       └── cubit/         # BLoC/Cubit state management
│   │
│   └── contacts/               # Phase 3 - Complete (partial)
│       ├── data/
│       ├── domain/
│       └── presentation/
│
├── core/                        # ✅ UPDATED - Core infrastructure
│   ├── di/                     # GetIt dependency injection
│   ├── error/                  # Failure classes for Either pattern
│   ├── enums/                  # AppStateStatus enum
│   └── utils/                  # EitherMixin helpers
│
├── presentation/cubit/auth/    # ✅ MIGRATED - Auth feature
│
├── logic/providers/            # ❌ OLD - Riverpod (30+ files to migrate)
│
├── data/repositories/          # ⚠️ MIXED - Some migrated, some old
├── domain/                     # ⚠️ MIXED - Domain models (shared)
└── ui/                         # ❌ OLD - UI screens (need BLoC wiring)
```

### Reference Project

```
REFERENCE_FROM_CLEANARCH/       # 📚 Copied from MyOrbit_CleanArch
├── features/                   # Example feature structure
│   ├── auth/
│   ├── home/
│   └── onboarding/
└── core/                       # Example core setup

⚠️ DO NOT MODIFY - This is reference material only
```

---

## 🗺️ Migration Progress

### ✅ Completed Phases

| Phase | Feature | Status | Files | Errors |
|-------|---------|--------|-------|--------|
| 0 | Foundation & Patterns | ✅ Complete | 5 | 0 |
| 1 | Auth Feature | ✅ Complete | 8 | 0 |
| 2 | Calendar & Events | ✅ Complete | 11 | 0 |
| 3 | Contacts | ✅ Complete | 6 | 0 |

**Total:** 23/96 hours (24% complete)

### 🔜 Remaining Phases

| Phase | Feature | Status | Estimated |
|-------|---------|--------|-----------|
| 4 | Notifications & Signals | 🔜 Next | 10-16 hrs |
| 5 | Settings & Preferences | 📋 Planned | 6-10 hrs |
| 6 | External Calendar Sync | 📋 Planned | 8-12 hrs |
| 7 | Cleanup & Testing | 📋 Planned | 6-10 hrs |

### ⏸️ Postponed

- **Calendar Sharing** - Needs domain model refactoring (SharedCalendarEvent serialization)

---

## 🏗️ Architecture Patterns

### Source of Truth: MyOrbit_CleanArch

**Location:** `../MyOrbit_CleanArch` (sibling directory)

All patterns, naming conventions, and architecture decisions follow this canonical project exactly.

**Key Documentation:**
- `MYORBIT_CLEANARCH_PATTERNS.md` - Complete pattern reference extracted from source
- `REFERENCE_FROM_CLEANARCH/` - Copied example files for reference

### Clean Architecture Layers

```
Feature Structure (from MyOrbit_CleanArch):

features/{feature}/
├── data/
│   ├── datasources/           # Firestore/API implementations
│   │   ├── {feature}_remote_data_source.dart
│   │   └── {feature}_local_data_source.dart
│   └── repositories/          # Repository implementations
│       └── {feature}_repository_impl.dart
│
├── domain/
│   └── repositories/          # Repository contracts (abstract)
│       └── {feature}_repository.dart
│
└── presentation/
    └── cubit/                 # State management
        ├── {feature}_cubit.dart
        └── {feature}_state.dart
```

### Key Patterns

1. **Dependency Injection:** GetIt service locator (`lib/core/di/service_locator.dart`)
2. **Error Handling:** Either<Failure, Success> from dartz package
3. **State Management:** BLoC/Cubit with AppStateStatus enum
4. **Repository Pattern:** Abstract contracts in domain, implementations in data

---

## 🚀 Getting Started

### Prerequisites

```bash
flutter pub get
flutter gen-l10n  # Required for localization
```

### Running the App

```bash
# The app runs in offline mode with mock data
flutter run

# Firebase is configured but not yet connected to real projects
# See docs/firebase/ for Firebase setup instructions
```

### Testing Migrated Code

```bash
# Test all migrated features (should show 0 errors)
dart analyze lib/features/ lib/core/di/ lib/core/error/ \
  lib/core/enums/ lib/presentation/cubit/auth/

# Test specific feature
dart analyze lib/features/calendar/
```

---

## 📚 Key Documentation

### Migration Documentation

| Document | Purpose |
|----------|---------|
| `MIGRATION_ASSESSMENT_AND_PLAN.md` | Complete 7-phase migration plan |
| `MYORBIT_CLEANARCH_PATTERNS.md` | Pattern reference from source of truth |
| `PHASE_1_COMPLETE.md` | Auth migration summary |
| `PHASE_2_COMPLETE.md` | Calendar/Events migration summary |
| `PHASE_3_COMPLETE.md` | Contacts migration summary |
| `TESTING_SUMMARY_FINAL.md` | Test results and status |

### Reference Documentation

| Document | Purpose |
|----------|---------|
| `GEMINI.md` | AI agent guidelines (current state) |
| `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md` | Firebase migration plan |
| `docs/reference/CURRENT_TECH_STACK.md` | Tech stack overview |

---

## 🔧 For Developers

### Working with Migrated Code

**✅ DO:**
- Follow patterns in `MYORBIT_CLEANARCH_PATTERNS.md`
- Use GetIt for dependency injection
- Use Either<Failure, Success> for error handling
- Use AppStateStatus enum for state
- Create features in `lib/features/` directory
- Register new components in `lib/core/di/service_locator_impl.dart`

**❌ DON'T:**
- Create new Riverpod providers
- Add Supabase dependencies
- Modify `REFERENCE_FROM_CLEANARCH/` files
- Use Result<T> type (use Either instead)
- Create features outside `lib/features/` structure

### Adding a New Feature

1. **Study the pattern:** Check `MYORBIT_CLEANARCH_PATTERNS.md`
2. **Create structure:** `lib/features/{feature}/data/domain/presentation/`
3. **Implement layers:** Data sources → Repositories → Cubits
4. **Register in GetIt:** Add to `lib/core/di/service_locator_impl.dart`
5. **Test:** Run `dart analyze lib/features/{feature}/`

### Migrating an Old Feature

1. **Check existing code:** Look in `lib/logic/providers/`
2. **Create new structure:** Follow clean architecture
3. **Migrate logic:** Provider → Cubit
4. **Update UI:** Replace `ref.watch()` with `BlocBuilder`
5. **Delete old code:** Remove Riverpod provider
6. **Test:** Ensure 0 errors

---

## 🗂️ What's Where

### Migrated (Clean Architecture)

```
lib/features/calendar/          # Calendar & Events feature
lib/features/contacts/          # Contacts feature
lib/presentation/cubit/auth/    # Auth feature
lib/core/di/                    # Dependency injection
lib/core/error/                 # Error handling
lib/core/enums/                 # Shared enums
```

### Old (To Be Migrated)

```
lib/logic/providers/            # 30+ Riverpod providers
lib/ui/screens/                 # UI screens (need BLoC wiring)
lib/logic/services/             # Service layer (some to migrate)
```

### Shared (Used by Both)

```
lib/domain/                     # Domain models
lib/core/firebase_*             # Firebase utilities
lib/core/services/              # Core services
```

---

## 🧹 Cleanup Status

### ✅ Cleaned Up

- Removed old auth_cubit_backup.dart
- Removed incomplete calendar sharing files
- Organized migration documentation

### 📦 Archived

- Old migration files moved to `docs/archive/`
- Reference files in `REFERENCE_FROM_CLEANARCH/`

### ⚠️ Needs Cleanup (Phase 7)

- `lib/logic/providers/` - 30+ Riverpod providers
- Supabase references in `.env` and docs
- Old test files using Riverpod patterns

---

## 🐛 Known Issues

### Current Issues

1. **iOS Build:** Requires iOS 15.0+ deployment target (CocoaPods issue)
2. **Test Suite:** Failing - needs updates for Either pattern
3. **Analyzer:** 22 issues in old code (not in migrated code)

### Postponed Features

1. **Calendar Sharing:** Needs SharedCalendarEvent serialization methods
2. **Realtime Sync:** Firestore listeners not yet implemented
3. **Offline Caching:** Local data sources not yet implemented

---

## 📞 Getting Help

### If You're Stuck

1. **Check patterns:** `MYORBIT_CLEANARCH_PATTERNS.md`
2. **Check reference:** `REFERENCE_FROM_CLEANARCH/`
3. **Check examples:** Look at completed features (auth, calendar, contacts)
4. **Check plan:** `MIGRATION_ASSESSMENT_AND_PLAN.md`

### Understanding the Migration

- **Why GetIt?** MyOrbit_CleanArch uses it (source of truth)
- **Why Either?** MyOrbit_CleanArch uses it (source of truth)
- **Why features-first?** MyOrbit_CleanArch uses it (source of truth)
- **Why BLoC/Cubit?** MyOrbit_CleanArch uses it (source of truth)

**Everything follows MyOrbit_CleanArch patterns - that's the source of truth.**

---

## 🎯 Success Criteria

### Phase Complete When:

- ✅ All code compiles (0 errors)
- ✅ Follows MyOrbit_CleanArch patterns exactly
- ✅ Registered in GetIt
- ✅ Uses Either for error handling
- ✅ Uses AppStateStatus for state
- ✅ Documentation updated

### Migration Complete When:

- All Riverpod providers removed
- All Supabase references removed
- All features in clean architecture
- Test suite passing
- App runs end-to-end

---

## 📊 Quick Stats

- **Lines of Code Migrated:** ~3,000+
- **Files Created:** 30+
- **Features Migrated:** 3 (Auth, Calendar/Events, Contacts)
- **Compilation Errors:** 0
- **Time Invested:** 23 hours
- **Progress:** 24%

---

## 🚦 Current Status

**Last Updated:** October 31, 2025

**Current Phase:** Testing Phase 1-3  
**Next Phase:** Phase 4 - Notifications & Signals  
**Blockers:** None  
**Code Quality:** ✅ Perfect (0 errors)

**Ready for:** Continued migration or runtime testing

---

**For questions about architecture patterns, always refer to MyOrbit_CleanArch project (source of truth).**
