# Continue Migration From Here

**Status:** Phase 4 Complete ✅  
**Next:** Phase 5 - Settings & Preferences Migration

---

## What's Done

✅ **Phase 0:** MyOrbit_CleanArch patterns documented  
✅ **Phase 1:** Core infrastructure + Auth feature migrated  
✅ **Phase 2:** Calendar & Events migrated  
✅ **Phase 3:** Contacts & Sharing migrated  
✅ **Phase 4:** Signals & Signal Sharing migrated

### Key Files Created
- `MYORBIT_CLEANARCH_PATTERNS.md` - Complete pattern reference
- `MIGRATION_ASSESSMENT_AND_PLAN.md` - Full migration plan
- `docs/migration/PHASE_1_COMPLETE.md` - Phase 1 summary
- `docs/migration/PHASE_2_COMPLETE.md` - Phase 2 summary
- `docs/migration/PHASE_3_COMPLETE.md` - Phase 3 summary
- `docs/migration/PHASE_4_COMPLETE.md` - Phase 4 summary
- `lib/core/di/service_locator.dart` - GetIt DI setup
- `lib/core/error/failures.dart` - Failure classes
- `lib/core/enums/app_state_status.dart` - State status enum
- `lib/core/utils/either_extensions.dart` - Either helpers

### Features Migrated
- ✅ Auth (Cubit + Repository)
- ✅ Calendar & Events (Cubits + Repositories)
- ✅ Contacts & Sharing (Cubits + Repositories)
- ✅ Signals & Signal Sharing (Cubits + Repositories)
- ✅ All registered in GetIt
- ✅ No analyzer errors

---

## What's Next - Phase 5: Settings & Preferences

This phase focuses on migrating app settings and user preferences.

### 1. Analyze Existing Code

**Files to Review:**
- `lib/logic/providers/settings_providers.dart` - Settings state
- `lib/logic/providers/ui_state_providers.dart` - UI state
- `lib/presentation/cubit/settings/settings_cubit.dart` - Existing cubit (if any)

### 2. Create Firestore Schema Design
Define collections:
```
users/{uid}/preferences/{preferenceId}
users/{uid}/settings/{settingId}
```

### 3. Create Data Sources
- `lib/features/settings/data/datasources/preferences_remote_data_source.dart`
- `lib/features/settings/data/datasources/preferences_local_data_source.dart`

### 4. Create/Update Repositories
- `lib/features/settings/domain/repositories/preferences_repository.dart` (contract)
- `lib/features/settings/data/repositories/preferences_repository_impl.dart`

### 5. Create/Update Cubits
- `lib/features/settings/presentation/cubit/settings_cubit.dart` - Settings management
- `lib/features/settings/presentation/cubit/theme_cubit.dart` - Theme state (if needed)

### 6. Register in GetIt
Add to `lib/core/di/service_locator_impl.dart`:
```dart
// Settings Data Sources
sl.registerLazySingleton<PreferencesRemoteDataSource>(
  () => PreferencesFirestoreDataSource(),
);

sl.registerLazySingleton<PreferencesLocalDataSource>(
  () => PreferencesSharedPrefsDataSource(sharedPreferences: sl()),
);

// Settings Repositories
sl.registerLazySingleton<PreferencesRepository>(
  () => PreferencesRepositoryImpl(
    remoteDataSource: sl(),
    localDataSource: sl(),
  ),
);

// Settings Cubits
sl.registerFactory<SettingsCubit>(
  () => SettingsCubit(repository: sl()),
);
```

### 7. Migrate Providers
Replace these Riverpod providers:
- `lib/logic/providers/settings_providers.dart` → SettingsCubit
- `lib/logic/providers/ui_state_providers.dart` → Individual Cubits as needed

### 8. Update UI Screens
Replace `ref.watch()` with `BlocBuilder`:
```dart
// Before (Riverpod)
final settings = ref.watch(settingsProvider);

// After (BLoC)
BlocBuilder<SettingsCubit, SettingsState>(
  builder: (context, state) {
    if (state.status.isLoading) return LoadingWidget();
    if (state.status.isFailure) return ErrorWidget(state.message);
    return SettingsView(settings: state.settings);
  },
)
```

---

## Quick Reference

### Pattern Template (Copy for each feature)

**1. Repository Contract (domain):**
```dart
abstract class FeatureRepository {
  Future<Either<Failure, DataModel>> getData(String id);
  Future<Either<Failure, void>> createData(DataModel data);
}
```

**2. Repository Implementation (data):**
```dart
class FeatureRepositoryImpl with EitherMixin implements FeatureRepository {
  final FeatureRemoteDataSource remoteDataSource;
  
  @override
  Future<Either<Failure, DataModel>> getData(String id) async {
    return execute(() => remoteDataSource.getData(id));
  }
}
```

**3. Cubit:**
```dart
class FeatureState {
  final AppStateStatus status;
  final DataModel? data;
  final String message;
  
  const FeatureState({
    this.status = AppStateStatus.initial,
    this.data,
    this.message = '',
  });
  
  FeatureState copyWith({...}) => FeatureState(...);
}

class FeatureCubit extends Cubit<FeatureState> {
  final FeatureRepository repository;
  
  FeatureCubit({required this.repository}) : super(const FeatureState());
  
  Future<void> loadData(String id) async {
    emit(state.copyWith(status: AppStateStatus.loading));
    
    final result = await repository.getData(id);
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
```

**4. GetIt Registration:**
```dart
sl.registerLazySingleton<FeatureRepository>(
  () => FeatureRepositoryImpl(remoteDataSource: sl()),
);
sl.registerFactory<FeatureCubit>(
  () => FeatureCubit(repository: sl()),
);
```

---

## Commands

```bash
# Check for errors
flutter analyze

# Run tests
flutter test

# Generate code (if using freezed/json_serializable)
dart run build_runner build --delete-conflicting-outputs

# Run app
flutter run
```

---

## Key Documents

- `MYORBIT_CLEANARCH_PATTERNS.md` - Pattern reference
- `MIGRATION_ASSESSMENT_AND_PLAN.md` - Full plan
- `docs/migration/PHASE_*_COMPLETE.md` - What was done in each phase
- `REFERENCE_FROM_CLEANARCH/` - Copied files from MyOrbit_CleanArch

---

## Estimated Time Remaining

- Phase 5 (Settings & Preferences): 6-10 hours
- Phase 6 (External Calendar): 8-12 hours
- Phase 7 (Cleanup): 6-10 hours

**Total Remaining:** 20-32 hours (2-4 working days)

---

## Progress Summary

- **Phase 0:** ✅ Complete (4 hours)
- **Phase 1:** ✅ Complete (6 hours)
- **Phase 2:** ✅ Complete (8 hours)
- **Phase 3:** ✅ Complete (7 hours)
- **Phase 4:** ✅ Complete (5 hours)
- **Phase 5:** 🔜 Next (6-10 hours estimated)
- **Total:** 30/96 hours (31% complete)

---

**Ready to start Phase 5!** 🚀

