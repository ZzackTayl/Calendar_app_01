# Developer Quick Start Guide

**New to this project? Start here.**

---

## 🎯 What You Need to Know

This project is **24% through a migration** from Riverpod/Supabase to BLoC/Firebase, following the **MyOrbit_CleanArch** canonical project.

**Source of Truth:** `../MyOrbit_CleanArch` (sibling directory)

---

## 📖 Read These First (In Order)

1. **[README.md](README.md)** - Project overview and current status (5 min)
2. **[MIGRATION_README.md](MIGRATION_README.md)** - Complete migration guide (10 min)
3. **[MYORBIT_CLEANARCH_PATTERNS.md](MYORBIT_CLEANARCH_PATTERNS.md)** - Pattern reference (15 min)

---

## 🚀 Get Running (5 minutes)

```bash
# 1. Install dependencies
flutter pub get

# 2. Generate localization (required)
flutter gen-l10n

# 3. Run the app (offline mode with mock data)
flutter run

# 4. Test migrated code (should show 0 errors)
dart analyze lib/features/ lib/core/di/ lib/core/error/ \
  lib/core/enums/ lib/presentation/cubit/auth/
```

---

## 🗺️ Project Structure

### ✅ Migrated (Use These Patterns)

```
lib/features/              # NEW - Clean Architecture
├── calendar/             # Example: Calendar & Events
│   ├── data/
│   │   ├── datasources/  # Firestore implementations
│   │   └── repositories/ # Repository implementations
│   ├── domain/
│   │   └── repositories/ # Repository contracts
│   └── presentation/
│       └── cubit/        # State management
│
└── contacts/             # Example: Contacts
    └── (same structure)

lib/presentation/cubit/auth/  # Example: Auth feature
lib/core/di/                  # GetIt dependency injection
```

### ❌ Old (Don't Use These Patterns)

```
lib/logic/providers/      # Riverpod providers (30+ to migrate)
lib/ui/screens/          # UI screens (need BLoC wiring)
```

---

## 🏗️ Architecture Patterns

### Source: MyOrbit_CleanArch

**Everything follows the MyOrbit_CleanArch project exactly.**

### Key Patterns

1. **GetIt** for dependency injection
2. **Either<Failure, Success>** for error handling
3. **BLoC/Cubit** for state management
4. **AppStateStatus** enum for state
5. **Features-first** organization

### Example: Adding a Feature

```dart
// 1. Create structure
lib/features/my_feature/
├── data/
│   ├── datasources/my_feature_remote_data_source.dart
│   └── repositories/my_feature_repository_impl.dart
├── domain/
│   └── repositories/my_feature_repository.dart
└── presentation/
    └── cubit/my_feature_cubit.dart

// 2. Repository Contract (domain)
abstract class MyFeatureRepository {
  Future<Either<Failure, MyData>> getData();
}

// 3. Repository Implementation (data)
class MyFeatureRepositoryImpl implements MyFeatureRepository {
  @override
  Future<Either<Failure, MyData>> getData() async {
    try {
      final data = await dataSource.getData();
      return Right(data);
    } catch (e) {
      return Left(Failure(message: 'Failed: $e'));
    }
  }
}

// 4. Cubit (presentation)
class MyFeatureCubit extends Cubit<MyFeatureState> {
  final MyFeatureRepository repository;
  
  Future<void> loadData() async {
    emit(state.copyWith(status: AppStateStatus.loading));
    
    final result = await repository.getData();
    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (data) => emit(state.copyWith(
        status: AppStateStatus.success,
        data: data,
      )),
    );
  }
}

// 5. Register in GetIt (lib/core/di/service_locator_impl.dart)
sl.registerLazySingleton<MyFeatureRepository>(
  () => MyFeatureRepositoryImpl(dataSource: sl()),
);
sl.registerFactory<MyFeatureCubit>(
  () => MyFeatureCubit(repository: sl()),
);
```

---

## 🔍 Finding Examples

### Want to see how to...

**Create a Cubit?**
- Look at: `lib/presentation/cubit/auth/auth_cubit.dart`
- Or: `lib/features/calendar/presentation/cubit/calendar_cubit.dart`

**Create a Repository?**
- Look at: `lib/features/calendar/domain/repositories/calendar_repository.dart`
- And: `lib/features/calendar/data/repositories/calendar_repository_impl.dart`

**Create a Data Source?**
- Look at: `lib/features/calendar/data/datasources/calendar_remote_data_source.dart`

**Register in GetIt?**
- Look at: `lib/core/di/service_locator_impl.dart`

**See the canonical patterns?**
- Look at: `REFERENCE_FROM_CLEANARCH/` directory
- Or: `MYORBIT_CLEANARCH_PATTERNS.md`

---

## ✅ Do's and Don'ts

### ✅ DO

- Follow `MYORBIT_CLEANARCH_PATTERNS.md` exactly
- Use GetIt for dependency injection
- Use Either<Failure, Success> for errors
- Use AppStateStatus enum for state
- Create features in `lib/features/`
- Test with `dart analyze lib/features/your_feature/`

### ❌ DON'T

- Create new Riverpod providers
- Add Supabase dependencies
- Modify `REFERENCE_FROM_CLEANARCH/` files
- Use Result<T> type (use Either instead)
- Create features outside `lib/features/`
- Deviate from MyOrbit_CleanArch patterns

---

## 🧪 Testing Your Code

```bash
# Test your feature (should show 0 errors)
dart analyze lib/features/your_feature/

# Test all migrated code
dart analyze lib/features/ lib/core/di/ lib/core/error/ \
  lib/core/enums/ lib/presentation/cubit/auth/

# Run tests (currently failing - needs updates)
flutter test
```

---

## 📚 Key Documents

| Document | When to Read |
|----------|--------------|
| `README.md` | First - project overview |
| `MIGRATION_README.md` | Second - complete guide |
| `MYORBIT_CLEANARCH_PATTERNS.md` | Before coding - pattern reference |
| `MIGRATION_ASSESSMENT_AND_PLAN.md` | Understanding the plan |
| `docs/migration/PHASE_*_COMPLETE.md` | See completed examples |
| `REFERENCE_FROM_CLEANARCH/` | Study canonical patterns |

---

## 🆘 Getting Help

### Stuck on Architecture?

1. Check `MYORBIT_CLEANARCH_PATTERNS.md`
2. Check `REFERENCE_FROM_CLEANARCH/` examples
3. Check completed features (auth, calendar, contacts)

### Stuck on Implementation?

1. Look at similar completed feature
2. Check the pattern documentation
3. Verify you're following MyOrbit_CleanArch exactly

### Stuck on Migration?

1. Check `MIGRATION_ASSESSMENT_AND_PLAN.md`
2. Check phase completion docs in `docs/migration/`
3. Check `MIGRATION_README.md`

---

## 🎯 Current Status

- **Migrated:** Auth, Calendar/Events, Contacts
- **Next:** Notifications & Signals
- **Progress:** 24% (23/96 hours)
- **Code Quality:** ✅ 0 errors

---

## 🚦 Ready to Code?

1. ✅ Read this guide
2. ✅ Read `MYORBIT_CLEANARCH_PATTERNS.md`
3. ✅ Look at completed features
4. ✅ Follow the patterns exactly
5. ✅ Test your code
6. ✅ Ensure 0 errors

**Remember: MyOrbit_CleanArch is the source of truth for everything.**

---

**Questions? Check the docs. Still stuck? Look at the reference project.**
