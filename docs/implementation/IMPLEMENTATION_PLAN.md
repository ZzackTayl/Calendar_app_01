# MyOrbit Calendar - Implementation Plan
# Best Practices Migration & Architecture Improvements

**Date:** October 31, 2025
**Lead Architect:** MyOrbit Engineering Team
**Project Phase:** Mid-migration (Riverpod→Bloc, Supabase→Firebase)
**Document Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Phased Implementation Plan](#phased-implementation-plan)
4. [Agent Assignments & Coordination](#agent-assignments--coordination)
5. [Critical Decision Points](#critical-decision-points)
6. [Risk Mitigation Strategy](#risk-mitigation-strategy)
7. [Success Criteria & Validation](#success-criteria--validation)
8. [Timeline & Resource Estimates](#timeline--resource-estimates)
9. [Blocking Issues & Dependencies](#blocking-issues--dependencies)
10. [Communication Plan](#communication-plan)

---

## 1. Executive Summary

### For Non-Technical Founder

**What's Happening:**
Your MyOrbit calendar app has strong architectural foundations, but being mid-migration has created technical debt that's slowing development and making the codebase harder to maintain. This plan fixes those issues systematically.

**The Problem in Plain English:**
Imagine building a house while renovating it at the same time. You have two different types of electrical wiring (Riverpod and Bloc), two different plumbing systems (Supabase and Firebase), and some tools are broken (tests don't run). This makes adding new features risky and slow.

**What We're Fixing:**
1. **Broken tests** - Can't verify code works correctly (URGENT)
2. **Dual systems** - Two ways to do everything = confusion (HIGH PRIORITY)
3. **Missing tools** - No proper dependency injection = hard to test (HIGH PRIORITY)
4. **Manual boilerplate** - 88-line models that could be 20 lines (MEDIUM PRIORITY)
5. **Architecture gaps** - Missing pieces that prevent offline support (MEDIUM PRIORITY)

**Business Impact:**
- **Development Speed:** 40-50% faster feature delivery once complete
- **Code Quality:** 80%+ test coverage = fewer bugs in production
- **Onboarding:** New engineers productive in days, not weeks
- **Maintenance:** 60-70% less boilerplate = easier changes
- **Reliability:** Proper offline support = works without internet

**Timeline:**
- Critical fixes: 1 week
- High priority: 2-3 weeks
- Medium priority: 4-6 weeks
- Total: 6-8 weeks to completion

**Investment Required:**
- 1-2 engineers full-time for 6-8 weeks
- No external dependencies or purchases needed (all open-source tools)
- Can be done incrementally without blocking new feature work

**ROI:**
- Reduces future technical debt accumulation by 80%
- Cuts new feature development time by 40%
- Decreases bug count by targeting 90% test coverage
- Enables confident refactoring and rapid iteration

---

### For Technical Team

**Current Reality:**
The codebase is in a **transitional state** with dual state management (Riverpod + Bloc), incomplete Firebase migration, broken tests, and several architectural best practice violations that are documented in `/docs/BEST_PRACTICES_RECOMMENDATIONS.md`.

**Strategic Goals:**
1. Complete Bloc migration (remove Riverpod entirely)
2. Implement proper DI with get_it
3. Adopt Freezed for immutability and reduced boilerplate
4. Fix broken test suite and achieve 80%+ coverage
5. Add missing architectural layers (use cases, local data sources)
6. Enhance code quality with strict lint rules
7. Wire Firebase completely (currently uses mocks)

**Approach:**
Incremental, risk-minimized migration following clean architecture principles. Each phase is independently verifiable and can be validated before proceeding to the next.

**Coordination:**
This plan assumes a multi-agent approach where specialized SMEs (Bloc/Cubit/Gradle expert, Lead Architect, Test Specialist) work in coordinated phases with clear handoffs.

---

## 2. Current State Assessment

### 2.1 Code Inventory

| Component | Count | Status | Notes |
|-----------|-------|--------|-------|
| Dart files | ~200+ | Mixed | Both old and new patterns |
| Riverpod Providers | 38 files | Legacy | Need conversion to Bloc/Cubit |
| Bloc/Cubit files | 9 files | Active | New development targets these |
| Test files | 71 files | Broken | Need flutter gen-l10n |
| Domain models | ~30+ | Manual | Should use Freezed |
| Repositories | ~8 | Split layers | Need restructuring |

### 2.2 Technical Debt Quantification

**Critical (Blocking Development):**
- Tests fail due to missing localization files (`flutter gen-l10n` not run)
- 22 analyzer issues from Riverpod/Bloc coexistence
- No proper DI container (using static service locators)

**High Priority (Slowing Development):**
- 38 Riverpod provider files need migration
- Manual serialization in domain models (88 lines vs 20 with Freezed)
- Repository implementations in wrong layer (violates clean architecture)

**Medium Priority (Technical Debt):**
- No use case layer (business logic mixed with Blocs)
- No local data sources (no offline support)
- Weak lint rules (missing 50+ recommended rules)
- Missing value objects (no domain validation)

**Low Priority (Nice to Have):**
- Firebase not wired to production (currently uses mocks)
- API key obfuscation needed for production
- Test coverage below target (need 80%+)

### 2.3 Strengths to Preserve

These are **working well** and should NOT be changed:

1. **Clean Architecture Structure** - Domain/Data/Presentation layers clearly separated
2. **Result Type Pattern** - Type-safe error handling with `Result<T>`
3. **Bloc Implementation Quality** - Existing Blocs are well-structured
4. **Repository Pattern** - Clear contracts and abstractions
5. **Mock Data Service** - `DevDataService` enables offline development
6. **Bootstrap System** - Bloc-based initialization is solid

---

## 3. Phased Implementation Plan

### Overview

The plan is divided into **7 phases** executed over **6-8 weeks**:

- **Phase 0 (Week 1):** Critical Blockers - Fix tests, implement DI
- **Phase 1 (Week 2):** Architecture Cleanup - Fix layers, add Freezed
- **Phase 2 (Week 3):** Bloc Migration Batch 1 - Convert priority providers
- **Phase 3 (Week 4):** Code Quality - Lint rules, test coverage
- **Phase 4 (Week 5):** Architecture Enhancement - Use cases, local data
- **Phase 5 (Week 6):** Bloc Migration Batch 2 - Complete migration
- **Phase 6 (Week 7-8):** Firebase Wiring & Production Readiness

---

### Phase 0: Critical Blockers (Week 1)

**Objective:** Unblock development by fixing broken tests and implementing proper DI

**Priority:** P0 (CRITICAL)

**Estimated Effort:** 3-5 days

#### Task 0.1: Fix Broken Tests

**Agent:** Test Specialist + Bloc/Cubit SME

**Steps:**
1. Generate localization files
   ```bash
   flutter gen-l10n
   git add lib/l10n/
   git commit -m "chore: generate localization files"
   ```

2. Regenerate all code generation
   ```bash
   dart run build_runner clean
   dart run build_runner build --delete-conflicting-outputs
   ```

3. Fix `UserProfile` field references
   - Find all `photoUrl` references
   - Replace with `avatarUrl`
   - Update tests accordingly

4. Run tests and document failures
   ```bash
   flutter test > test_results.txt 2>&1
   ```

5. Fix at least 5 critical test files
   - Start with unit tests (easiest)
   - Focus on domain models
   - Ensure CI pipeline basics work

**Deliverables:**
- [ ] Localization files generated and committed
- [ ] At least 5 test files passing
- [ ] Documentation of remaining test failures
- [ ] CI configuration updated with `flutter gen-l10n` step

**Success Criteria:**
- `flutter gen-l10n` runs successfully
- At least 10% of tests pass
- CI pipeline doesn't fail on localization

**Dependencies:** None (can start immediately)

**Risks:**
- May discover deeper issues in test suite
- Mocks may need extensive updates

**Mitigation:**
- Document all failures systematically
- Don't try to fix all tests at once
- Focus on critical path tests first

---

#### Task 0.2: Implement Proper Dependency Injection

**Agent:** Lead Architect + Bloc/Cubit SME

**Steps:**

1. Add `get_it` dependency
   ```yaml
   dependencies:
     get_it: ^8.0.0
   ```

2. Create DI container
   ```dart
   // lib/core/di/injection_container.dart
   import 'package:get_it/get_it.dart';

   final sl = GetIt.instance; // Service Locator

   Future<void> initializeDependencies() async {
     // External dependencies
     _registerExternalDependencies();

     // Data sources
     _registerDataSources();

     // Repositories
     _registerRepositories();

     // Blocs/Cubits
     _registerBlocs();

     // Services
     _registerServices();
   }

   void _registerExternalDependencies() {
     if (FirebaseAppServices.isConfigured) {
       sl.registerLazySingleton(() => FirebaseFirestore.instance);
       sl.registerLazySingleton(() => FirebaseAuth.instance);
       sl.registerLazySingleton(() => FirebaseStorage.instance);
     }
   }

   void _registerDataSources() {
     sl.registerLazySingleton<UserRemoteDataSource>(
       () => UserRemoteDataSourceImpl(),
     );
     // Add more data sources
   }

   void _registerRepositories() {
     sl.registerLazySingleton<UserRepository>(
       () => UserRepositoryImpl(
         remoteDataSource: sl(),
       ),
     );
     // Add more repositories
   }

   void _registerBlocs() {
     // Use registerFactory for Blocs (new instance each time)
     sl.registerFactory(() => UserBloc(userRepository: sl()));
     sl.registerFactory(() => AuthCubit(repository: sl()));
     // Add more blocs
   }

   void _registerServices() {
     sl.registerLazySingleton(() => DevDataService());
     // Add more services
   }
   ```

3. Enhance existing DI container
   - File exists at `lib/core/di/injection_container.dart`
   - Extend with `get_it` registration
   - Keep existing bootstrap compatibility

4. Update bootstrap sequence
   ```dart
   // lib/main.dart
   void main() async {
     WidgetsFlutterBinding.ensureInitialized();

     // Initialize DI container
     await initializeDependencies();

     // Initialize Firebase
     if (FirebaseAppServices.isConfigured) {
       await Firebase.initializeApp();
     }

     // Run app
     runApp(MyOrbitApp());
   }
   ```

5. Update Bloc/Cubit constructors
   ```dart
   // Before:
   AuthCubit({AuthRepository? repository})
       : _repository = repository ?? AuthDependencyInjection.authRepository;

   // After:
   AuthCubit({required AuthRepository repository})
       : _repository = repository;
   ```

6. Update BlocProvider usage
   ```dart
   // Before:
   BlocProvider(
     create: (_) => AuthCubit(),
     child: AuthScreen(),
   )

   // After:
   BlocProvider(
     create: (_) => sl<AuthCubit>(),
     child: AuthScreen(),
   )
   ```

7. Remove static dependency injection classes
   - Delete `AuthDependencyInjection` class
   - Remove static service locators

**Deliverables:**
- [ ] `get_it` package added
- [ ] Complete DI container implementation
- [ ] All Blocs/Cubits use constructor injection
- [ ] Bootstrap sequence updated
- [ ] Static DI classes removed
- [ ] Tests updated to use DI

**Success Criteria:**
- App starts successfully with DI container
- All dependencies resolved correctly
- No runtime DI resolution errors
- Tests can inject mocks easily

**Dependencies:**
- None (can run in parallel with 0.1)

**Risks:**
- Breaking existing initialization order
- Circular dependency issues
- Firebase initialization timing

**Mitigation:**
- Test thoroughly on each platform
- Use lazy registration where possible
- Keep DevDataService as fallback

---

#### Task 0.3: Update CI Pipeline

**Agent:** DevOps/CI Specialist (or Lead Architect)

**Steps:**

1. Update GitHub Actions workflow
   ```yaml
   # .github/workflows/flutter_ci.yml
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3

         - uses: subosito/flutter-action@v2
           with:
             flutter-version: '3.35.0'
             channel: 'stable'

         - name: Install dependencies
           run: flutter pub get

         # CRITICAL: Add this step
         - name: Generate localizations
           run: flutter gen-l10n

         - name: Run code generation
           run: dart run build_runner build --delete-conflicting-outputs

         - name: Analyze
           run: flutter analyze

         - name: Run tests
           run: flutter test --coverage

         - name: Upload coverage
           uses: codecov/codecov-action@v3
           with:
             file: coverage/lcov.info
   ```

2. Add coverage reporting
   - Sign up for Codecov (free for open source)
   - Add badge to README

**Deliverables:**
- [ ] CI pipeline includes `flutter gen-l10n`
- [ ] Code generation runs before tests
- [ ] Coverage reporting configured

**Success Criteria:**
- CI pipeline passes (even if some tests fail)
- No localization errors in CI
- Coverage report generated

**Dependencies:**
- Task 0.1 must be complete

---

### Phase 1: Architecture Cleanup (Week 2)

**Objective:** Fix architectural violations and reduce boilerplate with Freezed

**Priority:** P1 (HIGH)

**Estimated Effort:** 5-7 days

#### Task 1.1: Fix Repository Layer Structure

**Agent:** Lead Architect

**Steps:**

1. Audit repository files
   ```bash
   find lib/data/repositories -name "*.dart" -type f
   find lib/domain/repositories -name "*.dart" -type f
   ```

2. Identify misplaced implementations
   - Any concrete class in `domain/repositories/` is wrong
   - Any abstract class in `data/repositories/` is wrong

3. Rename implementation files
   ```bash
   # Example:
   # lib/data/repositories/user_repository.dart → user_repository_impl.dart
   git mv lib/data/repositories/user_repository.dart \
          lib/data/repositories/user_repository_impl.dart
   ```

4. Update class names
   ```dart
   // Before:
   class UserRepository implements UserRepositoryContract { }

   // After:
   class UserRepositoryImpl implements UserRepository { }
   ```

5. Update all imports
   ```dart
   // Before:
   import 'package:myorbit_calendar/data/repositories/user_repository.dart';

   // After:
   import 'package:myorbit_calendar/data/repositories/user_repository_impl.dart';
   ```

6. Ensure domain has ONLY abstract classes
   ```dart
   // lib/domain/repositories/user_repository.dart
   abstract class UserRepository {
     Future<Result<List<UserProfile>>> getUsers();
     Future<Result<UserProfile>> getUserById(String id);
     Future<Result<UserProfile>> createUser(UserProfile user);
     Future<Result<UserProfile>> updateUser(UserProfile user);
     Future<Result<void>> deleteUser(String id);
   }
   ```

7. Update DI container registrations
   ```dart
   sl.registerLazySingleton<UserRepository>(
     () => UserRepositoryImpl(remoteDataSource: sl()),
   );
   ```

**Affected Files:**
- `lib/data/repositories/event_repository_impl.dart`
- `lib/data/repositories/user_repository_impl.dart`
- `lib/data/repositories/calendar_repository_impl.dart`
- All imports in Blocs, Cubits, tests

**Deliverables:**
- [ ] All repository implementations end with `Impl`
- [ ] Domain layer has ONLY abstract classes
- [ ] Data layer has ONLY implementations
- [ ] All imports updated
- [ ] DI container updated
- [ ] Tests passing for affected repositories

**Success Criteria:**
- Clear separation: contracts in domain, implementations in data
- No analyzer errors from refactoring
- All existing tests still pass

**Dependencies:**
- Task 0.2 (DI) should be complete first

---

#### Task 1.2: Add Freezed to Domain Models

**Agent:** Bloc/Cubit SME + Lead Architect

**Why Freezed?**
- Reduces boilerplate by 60-70%
- Provides immutability guarantees
- Generates copyWith, toJson, fromJson automatically
- Enables union types for states

**Steps:**

1. Verify Freezed is installed (already in pubspec.yaml)
   ```yaml
   dependencies:
     freezed_annotation: ^3.1.0

   dev_dependencies:
     freezed: ^3.2.3
     build_runner: 2.7.1
     json_serializable: ^6.7.1
   ```

2. **Priority Conversion Order:**

   **Batch 1 (Day 1-2): Core Models**
   - `lib/domain/user_profile.dart` (HIGHEST PRIORITY)
   - `lib/domain/event.dart`
   - `lib/domain/contact.dart`
   - `lib/domain/user_calendar.dart`

   **Batch 2 (Day 2-3): Bloc States**
   - `lib/presentation/cubit/auth/auth_cubit.dart` (refactor state)
   - `lib/presentation/bloc/user/user_state.dart`
   - `lib/presentation/cubit/calendar/calendars_cubit.dart` (refactor state)
   - `lib/presentation/cubit/settings/settings_cubit.dart` (refactor state)

   **Batch 3 (Day 3-4): Bloc Events**
   - `lib/presentation/bloc/user/user_event.dart`
   - `lib/presentation/bloc/event/event_event.dart`
   - `lib/presentation/bloc/notification/notification_event.dart`

   **Batch 4 (Day 4-5): Secondary Models**
   - All other domain models
   - Value objects (if creating them)

3. **Conversion Template:**

   **Before (Manual):**
   ```dart
   // lib/domain/user_profile.dart (88 lines!)
   class UserProfile extends Equatable {
     final String id;
     final String email;
     final String? displayName;
     final String? avatarUrl;
     final String? timezone;
     final DateTime? createdAt;
     final DateTime? updatedAt;

     const UserProfile({
       required this.id,
       required this.email,
       this.displayName,
       this.avatarUrl,
       this.timezone,
       this.createdAt,
       this.updatedAt,
     });

     UserProfile copyWith({
       String? id,
       String? email,
       String? displayName,
       String? avatarUrl,
       // ... 30 more lines
     }) {
       return UserProfile(
         id: id ?? this.id,
         email: email ?? this.email,
         // ... 20 more lines
       );
     }

     Map<String, dynamic> toJson() {
       return {
         'id': id,
         'email': email,
         // ... 15 more lines
       };
     }

     factory UserProfile.fromJson(Map<String, dynamic> json) {
       return UserProfile(
         id: json['id'] as String,
         email: json['email'] as String,
         // ... 15 more lines
       );
     }

     @override
     List<Object?> get props => [id, email, displayName, avatarUrl, timezone];
   }
   ```

   **After (Freezed - 20 lines!):**
   ```dart
   // lib/domain/user_profile.dart
   import 'package:freezed_annotation/freezed_annotation.dart';

   part 'user_profile.freezed.dart';
   part 'user_profile.g.dart';

   @freezed
   class UserProfile with _$UserProfile {
     const factory UserProfile({
       required String id,
       required String email,
       String? displayName,
       String? avatarUrl,
       String? timezone,
       DateTime? createdAt,
       DateTime? updatedAt,
     }) = _UserProfile;

     factory UserProfile.fromJson(Map<String, dynamic> json) =>
         _$UserProfileFromJson(json);
   }
   ```

4. **For Union State Types (Recommended):**

   **Before:**
   ```dart
   // lib/presentation/cubit/auth/auth_cubit.dart
   enum AuthStatus { unknown, authenticated, unauthenticated, loading, error }

   class AuthState {
     final AuthStatus status;
     final User? user;
     final String? errorMessage;

     const AuthState({
       required this.status,
       this.user,
       this.errorMessage,
     });

     AuthState copyWith({
       AuthStatus? status,
       User? user,
       String? errorMessage,
     }) {
       return AuthState(
         status: status ?? this.status,
         user: user ?? this.user,
         errorMessage: errorMessage ?? this.errorMessage,
       );
     }
   }
   ```

   **After (Better with Freezed unions):**
   ```dart
   // lib/presentation/cubit/auth/auth_state.dart
   import 'package:freezed_annotation/freezed_annotation.dart';

   part 'auth_state.freezed.dart';

   @freezed
   class AuthState with _$AuthState {
     const factory AuthState.unknown() = AuthUnknown;
     const factory AuthState.authenticated(User user) = AuthAuthenticated;
     const factory AuthState.unauthenticated() = AuthUnauthenticated;
     const factory AuthState.loading() = AuthLoading;
     const factory AuthState.error(String message) = AuthError;
   }

   // Usage in Cubit:
   void signIn() async {
     emit(const AuthState.loading());
     final result = await _repository.signIn();
     result.when(
       success: (user) => emit(AuthState.authenticated(user)),
       failure: (msg, _) => emit(AuthState.error(msg)),
     );
   }

   // Usage in UI:
   BlocBuilder<AuthCubit, AuthState>(
     builder: (context, state) {
       return state.when(
         unknown: () => SplashScreen(),
         authenticated: (user) => HomeScreen(user: user),
         unauthenticated: () => LoginScreen(),
         loading: () => CircularProgressIndicator(),
         error: (message) => ErrorWidget(message),
       );
     },
   )
   ```

5. **Generate Code After Each Batch:**
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

6. **Update Tests:**
   - Remove manual equality tests (Freezed generates `==` and `hashCode`)
   - Update copyWith tests
   - Update serialization tests

**Deliverables:**
- [ ] UserProfile converted to Freezed
- [ ] All Bloc states converted to Freezed (with union types)
- [ ] All Bloc events converted to Freezed
- [ ] Secondary domain models converted
- [ ] Generated files committed
- [ ] All affected tests updated and passing

**Success Criteria:**
- All models compile with Freezed
- Generated files are up to date
- Tests pass with new models
- UI uses union type pattern matching
- Code reduction: 88-line models → 20-line models

**Dependencies:**
- None (can run in parallel with 1.1)

**Risks:**
- Breaking changes in API
- Tests need extensive updates
- UI widgets need refactoring for union types

**Mitigation:**
- Convert one model at a time
- Keep both versions temporarily if needed
- Update tests immediately after each conversion

---

### Phase 2: Bloc Migration Batch 1 (Week 3)

**Objective:** Convert high-priority Riverpod providers to Bloc/Cubit

**Priority:** P1 (HIGH)

**Estimated Effort:** 5-7 days

#### Task 2.1: Identify Migration Priority

**Agent:** Bloc/Cubit SME

**Steps:**

1. List all remaining Riverpod providers (38 files)
   ```bash
   find lib/logic/providers -name "*_providers.dart" -type f
   ```

2. Categorize by priority:

   **P0 (Critical Path - Week 3):**
   - `event_providers.dart` - Core functionality
   - `calendar_providers.dart` - Core functionality
   - `notification_providers.dart` - Core functionality
   - `contact_providers.dart` - Core functionality
   - `settings_providers.dart` - User experience

   **P1 (High Priority - Week 5):**
   - `signal_providers.dart` - Key feature
   - `shared_calendar_providers.dart` - Key feature
   - `reminder_providers.dart` - User experience
   - `profile_providers.dart` - User experience

   **P2 (Medium Priority - Week 6):**
   - `ui_state_providers.dart` - UI state
   - `sync_status_provider.dart` - Background task
   - `event_invite_providers.dart` - Secondary feature
   - `reminder_banner_providers.dart` - UI feature

   **P3 (Low Priority - Week 7):**
   - Remaining specialized providers
   - One-off providers
   - Deprecated providers

**Deliverables:**
- [ ] Complete priority list
- [ ] Dependency map (which providers depend on others)
- [ ] Migration order document

---

#### Task 2.2: Convert Priority Providers to Bloc/Cubit

**Agent:** Bloc/Cubit SME + Lead Architect

**Conversion Pattern:**

**When to use Bloc vs Cubit:**
- **Use Cubit:** Simple state changes, CRUD operations, settings
- **Use Bloc:** Complex business logic, multiple event types, event sourcing

**Template:**

**Before (Riverpod):**
```dart
// lib/logic/providers/settings_providers.dart
@riverpod
class SettingsNotifier extends _$SettingsNotifier {
  @override
  SettingsState build() {
    return const SettingsState();
  }

  void updateTheme(ThemeMode mode) {
    state = state.copyWith(themeMode: mode);
  }

  void updateLocale(Locale locale) {
    state = state.copyWith(locale: locale);
  }
}

final settingsProvider = settingsNotifierProvider;
```

**After (Cubit):**
```dart
// lib/presentation/cubit/settings/settings_cubit.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'settings_state.dart';
part 'settings_cubit.freezed.dart';

class SettingsCubit extends Cubit<SettingsState> {
  final SettingsRepository _repository;

  SettingsCubit({
    required SettingsRepository repository,
  })  : _repository = repository,
        super(const SettingsState.initial());

  Future<void> loadSettings() async {
    emit(const SettingsState.loading());

    final result = await _repository.getSettings();

    result.when(
      success: (settings) => emit(SettingsState.loaded(settings)),
      failure: (message, _) => emit(SettingsState.error(message)),
    );
  }

  Future<void> updateTheme(ThemeMode mode) async {
    final currentState = state;
    if (currentState is SettingsLoaded) {
      final updated = currentState.settings.copyWith(themeMode: mode);
      await _repository.saveSettings(updated);
      emit(SettingsState.loaded(updated));
    }
  }

  Future<void> updateLocale(Locale locale) async {
    final currentState = state;
    if (currentState is SettingsLoaded) {
      final updated = currentState.settings.copyWith(locale: locale);
      await _repository.saveSettings(updated);
      emit(SettingsState.loaded(updated));
    }
  }
}

// lib/presentation/cubit/settings/settings_state.dart
part of 'settings_cubit.dart';

@freezed
class SettingsState with _$SettingsState {
  const factory SettingsState.initial() = SettingsInitial;
  const factory SettingsState.loading() = SettingsLoading;
  const factory SettingsState.loaded(Settings settings) = SettingsLoaded;
  const factory SettingsState.error(String message) = SettingsError;
}
```

**UI Update:**

**Before (Riverpod):**
```dart
// lib/ui/screens/settings_screen.dart
class SettingsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);

    return Scaffold(
      body: Column(
        children: [
          DropdownButton<ThemeMode>(
            value: settings.themeMode,
            onChanged: (mode) {
              if (mode != null) {
                ref.read(settingsProvider.notifier).updateTheme(mode);
              }
            },
          ),
        ],
      ),
    );
  }
}
```

**After (Bloc):**
```dart
// lib/ui/screens/settings_screen.dart
class SettingsScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<SettingsCubit>()..loadSettings(),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatelessWidget {
  const _SettingsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<SettingsCubit, SettingsState>(
        builder: (context, state) {
          return state.when(
            initial: () => const SizedBox.shrink(),
            loading: () => const CircularProgressIndicator(),
            loaded: (settings) => Column(
              children: [
                DropdownButton<ThemeMode>(
                  value: settings.themeMode,
                  onChanged: (mode) {
                    if (mode != null) {
                      context.read<SettingsCubit>().updateTheme(mode);
                    }
                  },
                ),
              ],
            ),
            error: (message) => Text('Error: $message'),
          );
        },
      ),
    );
  }
}
```

**Steps for Each Provider:**

1. Create new Cubit/Bloc file structure
2. Define state using Freezed union types
3. Define events (if using Bloc)
4. Implement business logic
5. Add to DI container
6. Update UI screens
7. Write/update tests
8. Remove old Riverpod provider
9. Clean up imports

**Week 3 Target (5 providers):**
- Day 1: `settings_providers.dart` → `settings_cubit.dart`
- Day 2: `calendar_providers.dart` → `calendars_cubit.dart` (may already exist, verify)
- Day 3: `event_providers.dart` → `event_bloc.dart`
- Day 4: `notification_providers.dart` → `notification_bloc.dart`
- Day 5: `contact_providers.dart` → `contact_cubit.dart`

**Deliverables:**
- [ ] 5 Riverpod providers converted
- [ ] Corresponding UI screens updated
- [ ] Tests written for new Blocs/Cubits
- [ ] Old Riverpod files removed
- [ ] DI container updated

**Success Criteria:**
- All affected screens work correctly
- No Riverpod references in converted code
- Tests achieve 90%+ coverage for new Blocs
- No regressions in functionality

**Dependencies:**
- Phase 0 (DI) must be complete
- Phase 1.2 (Freezed states) helps significantly

---

### Phase 3: Code Quality Enhancement (Week 4)

**Objective:** Improve code quality with strict lint rules and test coverage

**Priority:** P2 (MEDIUM)

**Estimated Effort:** 4-6 days

#### Task 3.1: Implement Strict Lint Rules

**Agent:** Lead Architect

**Steps:**

1. Backup current `analysis_options.yaml`
   ```bash
   cp analysis_options.yaml analysis_options.yaml.backup
   ```

2. Replace with recommended rules (see BEST_PRACTICES_RECOMMENDATIONS.md Section 3.1)

3. Run analyzer and capture baseline
   ```bash
   flutter analyze > analyzer_baseline.txt 2>&1
   ```

4. Categorize issues by severity:
   - Errors (must fix)
   - Warnings (should fix)
   - Lints (can defer)

5. Fix issues incrementally by category:
   ```bash
   # Fix one lint rule at a time
   flutter analyze | grep "prefer_const_constructors" | wc -l
   # Fix all instances
   # Commit
   git commit -m "style: enforce prefer_const_constructors lint rule"
   ```

6. Add to CI as quality gate
   ```yaml
   - name: Analyze with strict rules
     run: flutter analyze --fatal-infos
   ```

**Target Lint Rules (Priority):**
- `always_declare_return_types`
- `prefer_const_constructors`
- `prefer_final_fields`
- `unawaited_futures`
- `require_trailing_commas`
- `avoid_print` (use logger instead)

**Deliverables:**
- [ ] Updated `analysis_options.yaml`
- [ ] All errors fixed
- [ ] 80%+ warnings fixed
- [ ] CI enforces lint rules

**Success Criteria:**
- `flutter analyze` passes with strict rules
- CI fails on new lint violations
- Code consistency improved

---

#### Task 3.2: Increase Test Coverage

**Agent:** Test Specialist + Bloc/Cubit SME

**Current Coverage:** Unknown (tests broken)

**Target Coverage:**
- Domain models: 80%+
- Repositories: 90%+
- Blocs/Cubits: 90%+
- Data sources: 70%+
- UI widgets: 60%+
- **Overall: 80%+**

**Steps:**

1. Establish baseline coverage
   ```bash
   flutter test --coverage
   genhtml coverage/lcov.info -o coverage/html
   open coverage/html/index.html
   ```

2. Identify gaps
   - List files with <60% coverage
   - Prioritize by criticality

3. Write missing tests using `bloc_test` package
   ```dart
   // test/presentation/bloc/user/user_bloc_test.dart
   import 'package:bloc_test/bloc_test.dart';
   import 'package:mocktail/mocktail.dart';

   class MockUserRepository extends Mock implements UserRepository {}

   void main() {
     late UserBloc bloc;
     late MockUserRepository mockRepository;

     setUp(() {
       mockRepository = MockUserRepository();
       bloc = UserBloc(userRepository: mockRepository);
     });

     tearDown(() {
       bloc.close();
     });

     group('LoadUsers', () {
       final mockUsers = [
         UserProfile(id: '1', email: 'test@test.com'),
       ];

       blocTest<UserBloc, UserState>(
         'emits [UserLoading, UserLoaded] when successful',
         build: () {
           when(() => mockRepository.getUsers())
               .thenAnswer((_) async => Success(mockUsers));
           return bloc;
         },
         act: (bloc) => bloc.add(const LoadUsers()),
         expect: () => [
           const UserLoading(),
           UserLoaded(mockUsers),
         ],
         verify: (_) {
           verify(() => mockRepository.getUsers()).called(1);
         },
       );

       blocTest<UserBloc, UserState>(
         'emits [UserLoading, UserError] when fails',
         build: () {
           when(() => mockRepository.getUsers())
               .thenAnswer((_) async => const Failure('Network error'));
           return bloc;
         },
         act: (bloc) => bloc.add(const LoadUsers()),
         expect: () => [
           const UserLoading(),
           const UserError(message: 'Network error'),
         ],
       );
     });
   }
   ```

4. Add repository tests
   ```dart
   // test/data/repositories/user_repository_impl_test.dart
   void main() {
     late UserRepositoryImpl repository;
     late MockUserRemoteDataSource mockRemoteDataSource;

     setUp(() {
       mockRemoteDataSource = MockUserRemoteDataSource();
       repository = UserRepositoryImpl(
         remoteDataSource: mockRemoteDataSource,
       );
     });

     group('getUsers', () {
       test('returns Success when remote source succeeds', () async {
         // Arrange
         final mockUsers = [UserProfile(id: '1', email: 'test@test.com')];
         when(() => mockRemoteDataSource.getUsers())
             .thenAnswer((_) async => mockUsers);

         // Act
         final result = await repository.getUsers();

         // Assert
         expect(result, isA<Success<List<UserProfile>>>());
       });

       test('returns Failure when remote source throws', () async {
         // Arrange
         when(() => mockRemoteDataSource.getUsers())
             .thenThrow(Exception('Network error'));

         // Act
         final result = await repository.getUsers();

         // Assert
         expect(result, isA<Failure<List<UserProfile>>>());
       });
     });
   }
   ```

5. Write tests for all new Blocs/Cubits from Phase 2

6. Add coverage threshold to CI
   ```yaml
   - name: Check coverage
     run: |
       flutter test --coverage
       # Optionally fail if coverage < 80%
   ```

**Deliverables:**
- [ ] Test coverage report baseline
- [ ] Tests for all Phase 2 Blocs/Cubits
- [ ] Repository tests for critical paths
- [ ] Coverage above 80%
- [ ] Coverage enforcement in CI

**Success Criteria:**
- 80%+ overall coverage
- 90%+ coverage for Blocs/Cubits
- All critical paths tested
- CI fails if coverage drops

---

### Phase 4: Architecture Enhancement (Week 5)

**Objective:** Add use case layer and local data sources for offline support

**Priority:** P2 (MEDIUM)

**Estimated Effort:** 5-7 days

#### Task 4.1: Add Use Case Layer

**Agent:** Lead Architect

**When to Use Use Cases:**
- Complex business logic
- Multi-repository operations
- Data transformations
- Filtering/sorting logic
- Validation rules

**Structure:**
```
lib/domain/use_cases/
├── notifications/
│   ├── get_unread_notifications_use_case.dart
│   └── mark_notification_read_use_case.dart
├── events/
│   ├── get_upcoming_events_use_case.dart
│   ├── create_event_with_invites_use_case.dart
│   └── sync_calendar_events_use_case.dart
└── users/
    ├── get_active_users_use_case.dart
    └── search_users_use_case.dart
```

**Template:**
```dart
// lib/domain/use_cases/events/get_upcoming_events_use_case.dart
class GetUpcomingEventsUseCase {
  final EventRepository _eventRepository;
  final UserRepository _userRepository;

  const GetUpcomingEventsUseCase({
    required EventRepository eventRepository,
    required UserRepository userRepository,
  })  : _eventRepository = eventRepository,
        _userRepository = userRepository;

  Future<Result<List<Event>>> call({
    required String userId,
    int daysAhead = 7,
  }) async {
    // Business logic here
    final now = DateTime.now();
    final endDate = now.add(Duration(days: daysAhead));

    final eventsResult = await _eventRepository.getEventsByDateRange(
      userId: userId,
      startDate: now,
      endDate: endDate,
    );

    return eventsResult.when(
      success: (events) {
        // Filter out cancelled events
        final activeEvents = events
            .where((e) => e.status != EventStatus.cancelled)
            .toList();

        // Sort by start time
        activeEvents.sort((a, b) => a.startTime.compareTo(b.startTime));

        return Success(activeEvents);
      },
      failure: (message, exception) => Failure(message, exception),
    );
  }
}
```

**Usage in Bloc:**
```dart
class EventBloc extends Bloc<EventEvent, EventState> {
  final GetUpcomingEventsUseCase _getUpcomingEventsUseCase;

  EventBloc({
    required GetUpcomingEventsUseCase getUpcomingEventsUseCase,
  })  : _getUpcomingEventsUseCase = getUpcomingEventsUseCase,
        super(const EventInitial()) {
    on<LoadUpcomingEvents>(_onLoadUpcomingEvents);
  }

  Future<void> _onLoadUpcomingEvents(
    LoadUpcomingEvents event,
    Emitter<EventState> emit,
  ) async {
    emit(const EventLoading());

    final result = await _getUpcomingEventsUseCase(
      userId: event.userId,
      daysAhead: 7,
    );

    result.when(
      success: (events) => emit(EventLoaded(events)),
      failure: (message, _) => emit(EventError(message)),
    );
  }
}
```

**Priority Use Cases to Implement:**
1. `GetUpcomingEventsUseCase` (complex filtering)
2. `CreateEventWithInvitesUseCase` (multi-repository)
3. `SyncCalendarEventsUseCase` (complex business logic)
4. `SearchUsersUseCase` (filtering/sorting)
5. `GetUnreadNotificationsUseCase` (complex query)

**Deliverables:**
- [ ] Use case directory structure created
- [ ] 5 priority use cases implemented
- [ ] Blocs updated to use use cases
- [ ] DI container registers use cases
- [ ] Tests for all use cases

**Success Criteria:**
- Complex business logic extracted from Blocs
- Use cases are testable in isolation
- Blocs are thinner and focused on state management

---

#### Task 4.2: Add Local Data Sources for Offline Support

**Agent:** Lead Architect + Backend Specialist

**Why?**
Enable offline-first architecture where app works without internet connection.

**Technology Choice:** Hive (fast, Flutter-optimized local database)

**Steps:**

1. Add Hive dependencies
   ```yaml
   dependencies:
     hive: ^2.2.3
     hive_flutter: ^1.1.0

   dev_dependencies:
     hive_generator: ^2.0.0
   ```

2. Create local data source interfaces
   ```dart
   // lib/domain/datasources/user_local_data_source.dart
   abstract class UserLocalDataSource {
     Future<List<UserProfile>> getCachedUsers();
     Future<UserProfile?> getCachedUser(String id);
     Future<void> cacheUsers(List<UserProfile> users);
     Future<void> cacheUser(UserProfile user);
     Future<void> clearCache();
   }
   ```

3. Implement with Hive
   ```dart
   // lib/data/datasources/local/user_local_data_source_impl.dart
   class UserLocalDataSourceImpl implements UserLocalDataSource {
     final Box<Map<String, dynamic>> _userBox;

     UserLocalDataSourceImpl({required Box<Map<String, dynamic>> userBox})
         : _userBox = userBox;

     @override
     Future<List<UserProfile>> getCachedUsers() async {
       return _userBox.values
           .map((json) => UserProfile.fromJson(json))
           .toList();
     }

     @override
     Future<UserProfile?> getCachedUser(String id) async {
       final json = _userBox.get(id);
       return json != null ? UserProfile.fromJson(json) : null;
     }

     @override
     Future<void> cacheUsers(List<UserProfile> users) async {
       final map = {for (var u in users) u.id: u.toJson()};
       await _userBox.putAll(map);
     }

     @override
     Future<void> cacheUser(UserProfile user) async {
       await _userBox.put(user.id, user.toJson());
     }

     @override
     Future<void> clearCache() async {
       await _userBox.clear();
     }
   }
   ```

4. Update repositories to use cache-first strategy
   ```dart
   // lib/data/repositories/user_repository_impl.dart
   class UserRepositoryImpl implements UserRepository {
     final UserRemoteDataSource _remoteDataSource;
     final UserLocalDataSource _localDataSource;
     final NetworkInfo _networkInfo;

     UserRepositoryImpl({
       required UserRemoteDataSource remoteDataSource,
       required UserLocalDataSource localDataSource,
       required NetworkInfo networkInfo,
     })  : _remoteDataSource = remoteDataSource,
           _localDataSource = localDataSource,
           _networkInfo = networkInfo;

     @override
     Future<Result<List<UserProfile>>> getUsers() async {
       if (await _networkInfo.isConnected) {
         try {
           // Fetch from remote
           final users = await _remoteDataSource.getUsers();

           // Cache locally
           await _localDataSource.cacheUsers(users);

           return Success(users);
         } catch (e) {
           // Fall back to cache
           return _getUsersFromCache();
         }
       } else {
         // Offline - use cache
         return _getUsersFromCache();
       }
     }

     Future<Result<List<UserProfile>>> _getUsersFromCache() async {
       try {
         final cachedUsers = await _localDataSource.getCachedUsers();
         if (cachedUsers.isEmpty) {
           return const Failure('No cached data available offline');
         }
         return Success(cachedUsers);
       } catch (e) {
         return Failure('Failed to load cached data: $e');
       }
     }
   }
   ```

5. Initialize Hive in bootstrap
   ```dart
   // lib/core/di/injection_container.dart
   Future<void> initializeDependencies() async {
     // Initialize Hive
     await Hive.initFlutter();

     // Open boxes
     final userBox = await Hive.openBox<Map<String, dynamic>>('users');
     final eventBox = await Hive.openBox<Map<String, dynamic>>('events');

     // Register boxes
     sl.registerLazySingleton(() => userBox);
     sl.registerLazySingleton(() => eventBox);

     // Register local data sources
     sl.registerLazySingleton<UserLocalDataSource>(
       () => UserLocalDataSourceImpl(userBox: sl()),
     );

     // Register NetworkInfo
     sl.registerLazySingleton<NetworkInfo>(
       () => NetworkInfoImpl(Connectivity()),
     );

     // Update repository registration
     sl.registerLazySingleton<UserRepository>(
       () => UserRepositoryImpl(
         remoteDataSource: sl(),
         localDataSource: sl(),
         networkInfo: sl(),
       ),
     );
   }
   ```

6. Implement NetworkInfo service
   ```dart
   // lib/core/network/network_info.dart
   abstract class NetworkInfo {
     Future<bool> get isConnected;
   }

   class NetworkInfoImpl implements NetworkInfo {
     final Connectivity connectivity;

     NetworkInfoImpl(this.connectivity);

     @override
     Future<bool> get isConnected async {
       final result = await connectivity.checkConnectivity();
       return result != ConnectivityResult.none;
     }
   }
   ```

**Priority Entities for Caching:**
1. UserProfile (frequently accessed)
2. Event (large dataset)
3. Calendar (frequently accessed)
4. Contact (frequently accessed)
5. Notification (frequent updates)

**Deliverables:**
- [ ] Hive packages installed
- [ ] Local data source interfaces defined
- [ ] Local data sources implemented for 5 priority entities
- [ ] Repositories updated with offline-first logic
- [ ] NetworkInfo service implemented
- [ ] Hive initialization in bootstrap
- [ ] Tests for local data sources
- [ ] Integration tests for offline scenarios

**Success Criteria:**
- App works completely offline
- Data syncs when coming back online
- No data loss during offline operations
- Cache invalidation works correctly

---

### Phase 5: Bloc Migration Batch 2 (Week 6)

**Objective:** Complete Riverpod to Bloc migration for remaining providers

**Priority:** P1 (HIGH)

**Estimated Effort:** 5-7 days

#### Task 5.1: Convert Remaining Providers

**Agent:** Bloc/Cubit SME

**Remaining Providers from Task 2.1:**

**Week 6 Batch (P1-P2 providers):**
- Day 1: `signal_providers.dart` → `signal_bloc.dart`
- Day 2: `shared_calendar_providers.dart` → `shared_calendar_cubit.dart`
- Day 3: `reminder_providers.dart` → `reminder_cubit.dart`
- Day 4: `profile_providers.dart` → `profile_cubit.dart` (or use existing)
- Day 5: `ui_state_providers.dart` → Various UI Cubits

**Follow same pattern as Phase 2, Task 2.2**

**Deliverables:**
- [ ] 5+ additional providers converted
- [ ] UI screens updated
- [ ] Tests written
- [ ] Old providers removed

**Success Criteria:**
- <10 Riverpod providers remaining
- No regressions in functionality
- Tests passing for all new Blocs

---

#### Task 5.2: Remove Riverpod Dependencies

**Agent:** Bloc/Cubit SME + Lead Architect

**Criteria for Removal:**
Only remove when ALL of the following are true:
- All providers converted to Bloc/Cubit
- All UI screens updated
- All tests passing
- No `ref.watch()` or `ref.read()` calls in codebase

**Steps:**

1. Verify no Riverpod usage
   ```bash
   grep -r "ref.watch" lib/ --include="*.dart"
   grep -r "ref.read" lib/ --include="*.dart"
   grep -r "ConsumerWidget" lib/ --include="*.dart"
   grep -r "ConsumerStatefulWidget" lib/ --include="*.dart"
   ```

2. Remove Riverpod packages
   ```yaml
   # Remove from pubspec.yaml:
   # flutter_riverpod: ^3.0.3
   # riverpod: ^3.0.3
   # hooks_riverpod: ^3.0.3
   # riverpod_annotation: ^3.0.3
   # riverpod_generator: ^3.0.3
   ```

3. Delete provider files
   ```bash
   rm -rf lib/logic/providers/
   ```

4. Update imports
   - Remove all Riverpod imports
   - Replace with Bloc imports

5. Update main.dart
   ```dart
   // Before:
   runApp(ProviderScope(child: MyOrbitApp()));

   // After:
   runApp(MyOrbitApp());
   ```

6. Run full test suite
   ```bash
   flutter test
   ```

**Deliverables:**
- [ ] No Riverpod references in codebase
- [ ] Riverpod packages removed from pubspec.yaml
- [ ] All tests passing
- [ ] App runs successfully

**Success Criteria:**
- Complete migration to Bloc
- No Riverpod dependencies
- All tests green
- No regressions

---

### Phase 6: Firebase Wiring & Production Readiness (Week 7-8)

**Objective:** Wire Firebase to production and prepare for deployment

**Priority:** P2 (MEDIUM - can defer if needed)

**Estimated Effort:** 7-10 days

#### Task 6.1: Firebase Configuration

**Agent:** Backend Specialist + DevOps

**Steps:**

1. **Create Firebase Projects (per environment):**
   - `myorbit-calendar-dev`
   - `myorbit-calendar-staging`
   - `myorbit-calendar-prod`

2. **Generate configuration files:**
   ```bash
   # Install FlutterFire CLI
   dart pub global activate flutterfire_cli

   # Configure for dev
   flutterfire configure \
     --project=myorbit-calendar-dev \
     --out=lib/firebase_options_dev.dart \
     --platforms=android,ios,web

   # Configure for staging
   flutterfire configure \
     --project=myorbit-calendar-staging \
     --out=lib/firebase_options_staging.dart \
     --platforms=android,ios,web

   # Configure for prod
   flutterfire configure \
     --project=myorbit-calendar-prod \
     --out=lib/firebase_options_prod.dart \
     --platforms=android,ios,web
   ```

3. **Update initialization to use correct config:**
   ```dart
   // lib/core/firebase/firebase_initializer.dart
   import 'package:myorbit_calendar/firebase_options_dev.dart' as dev;
   import 'package:myorbit_calendar/firebase_options_staging.dart' as staging;
   import 'package:myorbit_calendar/firebase_options_prod.dart' as prod;

   FirebaseOptions getFirebaseOptions() {
     final env = dotenv.env['APP_ENV'] ?? 'dev';

     switch (env) {
       case 'prod':
         return prod.DefaultFirebaseOptions.currentPlatform;
       case 'staging':
         return staging.DefaultFirebaseOptions.currentPlatform;
       default:
         return dev.DefaultFirebaseOptions.currentPlatform;
     }
   }

   Future<void> initializeFirebase() async {
     await Firebase.initializeApp(
       options: getFirebaseOptions(),
     );
   }
   ```

4. **Set up Firestore security rules:**
   ```javascript
   // firestore.rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // User profiles
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth.uid == userId;
       }

       // Events
       match /events/{eventId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null;
       }

       // More rules...
     }
   }
   ```

5. **Deploy security rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

**Deliverables:**
- [ ] Firebase projects created
- [ ] Configuration files generated
- [ ] Environment-based initialization
- [ ] Security rules defined and deployed

---

#### Task 6.2: Wire Data Sources to Firebase

**Agent:** Backend Specialist

**Steps:**

1. **Replace mock implementations:**
   ```dart
   // Before (mock):
   class UserRemoteDataSourceImpl implements UserRemoteDataSource {
     @override
     Future<List<UserProfile>> getUsers() async {
       // Mock data
       return [
         UserProfile(id: '1', email: 'mock@example.com'),
       ];
     }
   }

   // After (real Firebase):
   class UserRemoteDataSourceImpl implements UserRemoteDataSource {
     final FirebaseFirestore _firestore;

     UserRemoteDataSourceImpl({required FirebaseFirestore firestore})
         : _firestore = firestore;

     @override
     Future<List<UserProfile>> getUsers() async {
       final snapshot = await _firestore.collection('users').get();

       return snapshot.docs
           .map((doc) => UserProfile.fromJson({
                 'id': doc.id,
                 ...doc.data(),
               }))
           .toList();
     }

     @override
     Future<UserProfile> getUserById(String id) async {
       final doc = await _firestore.collection('users').doc(id).get();

       if (!doc.exists) {
         throw Exception('User not found');
       }

       return UserProfile.fromJson({
         'id': doc.id,
         ...doc.data()!,
       });
     }

     @override
     Future<void> createUser(UserProfile user) async {
       await _firestore.collection('users').doc(user.id).set(user.toJson());
     }

     @override
     Future<void> updateUser(UserProfile user) async {
       await _firestore.collection('users').doc(user.id).update(user.toJson());
     }

     @override
     Future<void> deleteUser(String id) async {
       await _firestore.collection('users').doc(id).delete();
     }
   }
   ```

2. **Wire Authentication:**
   ```dart
   // lib/data/datasources/remote/auth_remote_data_source_impl.dart
   class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
     final FirebaseAuth _auth;

     AuthRemoteDataSourceImpl({required FirebaseAuth auth}) : _auth = auth;

     @override
     Future<User> signInWithEmail(String email, String password) async {
       final credential = await _auth.signInWithEmailAndPassword(
         email: email,
         password: password,
       );

       if (credential.user == null) {
         throw Exception('Sign in failed');
       }

       return credential.user!;
     }

     @override
     Future<User> signUpWithEmail(String email, String password) async {
       final credential = await _auth.createUserWithEmailAndPassword(
         email: email,
         password: password,
       );

       if (credential.user == null) {
         throw Exception('Sign up failed');
       }

       return credential.user!;
     }

     @override
     Future<void> signOut() async {
       await _auth.signOut();
     }

     @override
     Stream<User?> get authStateChanges => _auth.authStateChanges();
   }
   ```

3. **Wire remaining data sources:**
   - EventRemoteDataSource
   - CalendarRemoteDataSource
   - NotificationRemoteDataSource
   - ContactRemoteDataSource

4. **Test with Firebase emulators:**
   ```bash
   firebase emulators:start --only firestore,auth
   ```

5. **Update data sources to use emulators in dev:**
   ```dart
   if (kDebugMode && useEmulators) {
     await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
     FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
   }
   ```

**Deliverables:**
- [ ] All data sources wired to Firebase
- [ ] Firebase emulator support
- [ ] Authentication working
- [ ] CRUD operations working
- [ ] Integration tests with emulators

**Success Criteria:**
- App connects to real Firebase
- Data persists in Firestore
- Authentication works
- No mock data in production

---

#### Task 6.3: Production Readiness

**Agent:** DevOps + Lead Architect

**Steps:**

1. **Environment validation:**
   ```dart
   // lib/core/env_validator.dart
   class EnvValidator {
     static void validate() {
       final requiredVars = [
         'APP_ENV',
         'DEV_FIREBASE_PROJECT_ID',
         'DEV_FIREBASE_WEB_API_KEY',
       ];

       final missing = <String>[];

       for (final key in requiredVars) {
         if (!dotenv.env.containsKey(key) || dotenv.env[key]!.isEmpty) {
           missing.add(key);
         }
       }

       if (missing.isNotEmpty) {
         throw EnvValidationException(
           'Missing required environment variables: ${missing.join(', ')}',
         );
       }
     }
   }
   ```

2. **API key obfuscation:**
   ```dart
   // Use --dart-define for sensitive keys
   const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
   ```

3. **Update build commands:**
   ```bash
   # Production build
   flutter build apk --release \
     --dart-define=FIREBASE_API_KEY=$FIREBASE_API_KEY \
     --dart-define=APP_ENV=prod
   ```

4. **Set up Crashlytics:**
   ```dart
   FlutterError.onError = FirebaseCrashlytics.instance.recordFlutterError;

   PlatformDispatcher.instance.onError = (error, stack) {
     FirebaseCrashlytics.instance.recordError(error, stack);
     return true;
   };
   ```

5. **Set up Analytics:**
   ```dart
   await FirebaseAnalytics.instance.logAppOpen();
   await FirebaseAnalytics.instance.setUserId(id: userId);
   ```

6. **Final checklist:**
   - [ ] All tests passing
   - [ ] All lint issues resolved
   - [ ] 80%+ test coverage
   - [ ] Firebase configured for all environments
   - [ ] Security rules deployed
   - [ ] Crashlytics working
   - [ ] Analytics working
   - [ ] Performance monitoring enabled
   - [ ] App bundle size optimized
   - [ ] ProGuard rules configured (Android)

**Deliverables:**
- [ ] Environment validation implemented
- [ ] API keys properly obfuscated
- [ ] Crashlytics configured
- [ ] Analytics configured
- [ ] Production builds tested
- [ ] Release checklist complete

**Success Criteria:**
- App ready for production deployment
- All monitoring in place
- Security hardened
- Performance optimized

---

## 4. Agent Assignments & Coordination

### 4.1 Agent Roles

**Agent 1: Lead Architect (You)**
- **Responsibilities:**
  - Overall architecture decisions
  - Repository layer cleanup
  - Use case layer implementation
  - Code reviews for architecture patterns
  - Risk assessment and mitigation
  - Coordination between agents

- **Assigned Tasks:**
  - Task 1.1: Fix Repository Layer Structure
  - Task 4.1: Add Use Case Layer
  - Task 4.2: Add Local Data Sources
  - All code review and coordination tasks

**Agent 2: Bloc/Cubit/Gradle SME**
- **Responsibilities:**
  - State management expertise
  - Bloc/Cubit implementation patterns
  - Riverpod to Bloc migration
  - Gradle build optimization
  - Testing Bloc patterns

- **Assigned Tasks:**
  - Task 0.2: Implement DI (co-lead)
  - Task 1.2: Add Freezed to Domain Models
  - Task 2.1: Identify Migration Priority
  - Task 2.2: Convert Priority Providers
  - Task 5.1: Convert Remaining Providers
  - Task 5.2: Remove Riverpod Dependencies

**Agent 3: Test Specialist**
- **Responsibilities:**
  - Test suite maintenance
  - Test coverage improvement
  - Test strategy and architecture
  - CI/CD pipeline for testing
  - Mock setup and management

- **Assigned Tasks:**
  - Task 0.1: Fix Broken Tests
  - Task 3.2: Increase Test Coverage
  - Writing tests for all new Blocs/Cubits
  - Test reviews

**Agent 4: Backend/Firebase Specialist**
- **Responsibilities:**
  - Firebase configuration
  - Data source implementations
  - Security rules
  - Cloud Functions (future)
  - Backend integration

- **Assigned Tasks:**
  - Task 6.1: Firebase Configuration
  - Task 6.2: Wire Data Sources to Firebase
  - Firebase emulator setup
  - Security rules deployment

**Agent 5: DevOps/CI Specialist**
- **Responsibilities:**
  - CI/CD pipeline
  - Build configuration
  - Deployment automation
  - Environment management
  - Monitoring setup

- **Assigned Tasks:**
  - Task 0.3: Update CI Pipeline
  - Task 6.3: Production Readiness
  - CI/CD optimization
  - Release automation

**Agent 6: Code Quality Specialist**
- **Responsibilities:**
  - Lint rule enforcement
  - Code style consistency
  - Static analysis
  - Documentation review
  - Tech debt tracking

- **Assigned Tasks:**
  - Task 3.1: Implement Strict Lint Rules
  - Code quality reviews
  - Documentation updates

### 4.2 Coordination Strategy

**Daily Standups (Async):**
- Each agent posts daily update:
  - What was completed yesterday
  - What will be done today
  - Any blockers

**Weekly Sync:**
- Review progress against plan
- Adjust priorities if needed
- Resolve cross-agent dependencies

**Communication Channels:**
- **Critical decisions:** Escalate to Lead Architect
- **Technical questions:** Post in team channel
- **Blockers:** Immediate notification
- **Code reviews:** Within 24 hours

**Handoff Protocol:**
1. Completing agent documents what was done
2. Completing agent creates PR with detailed description
3. Receiving agent reviews and acknowledges
4. Lead Architect approves handoff

**Conflict Resolution:**
- Technical conflicts: Lead Architect decides
- Priority conflicts: Founder decides
- Blocking conflicts: Immediate escalation

### 4.3 Dependencies Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 0.1 Fix Tests | None | 3.2 Test Coverage |
| 0.2 Implement DI | None | 1.1 Repository Structure, 2.2 Bloc Migration |
| 0.3 Update CI | 0.1 Fix Tests | None |
| 1.1 Repository Structure | 0.2 Implement DI | None |
| 1.2 Add Freezed | None | 2.2 Bloc Migration (helpful) |
| 2.1 Migration Priority | None | 2.2 Convert Providers |
| 2.2 Convert Providers | 0.2 Implement DI, 1.2 Freezed (helpful) | 5.1 Remaining Providers |
| 3.1 Lint Rules | None | None |
| 3.2 Test Coverage | 0.1 Fix Tests | None |
| 4.1 Use Cases | None | None |
| 4.2 Local Data Sources | None | None |
| 5.1 Remaining Providers | 2.2 Initial Providers | 5.2 Remove Riverpod |
| 5.2 Remove Riverpod | 5.1 All Providers Converted | None |
| 6.1 Firebase Config | None | 6.2 Wire Data Sources |
| 6.2 Wire Data Sources | 6.1 Firebase Config | 6.3 Production Readiness |
| 6.3 Production Readiness | All previous tasks | None |

---

## 5. Critical Decision Points

### Decision Point 1: Freezed Union Types for States

**Decision:** Should we use Freezed union types for all Bloc/Cubit states?

**Options:**
1. **Use union types** (recommended)
   - Pros: Type-safe pattern matching, impossible to forget states, cleaner UI code
   - Cons: More initial work, learning curve

2. **Use status enum pattern** (current approach)
   - Pros: Familiar, less change
   - Cons: Error-prone, verbose, no compile-time guarantees

**Recommendation:** Use union types for all new states

**Requires Founder Approval:** No (technical decision)

**Decision Owner:** Lead Architect + Bloc/Cubit SME

---

### Decision Point 2: Complete Bloc Migration Timeline

**Decision:** Should we complete the full Bloc migration in one go or incrementally?

**Options:**
1. **Incremental (recommended)** - Convert providers over 2-3 weeks
   - Pros: Lower risk, can validate each conversion, allows parallel new feature work
   - Cons: Longer timeline with mixed systems

2. **Big bang** - Convert all providers in one sprint
   - Pros: Faster completion, clean cut
   - Cons: High risk, blocks all feature work, harder to debug issues

**Recommendation:** Incremental migration over 3 weeks

**Requires Founder Approval:** YES

**Decision Owner:** Founder + Lead Architect

**Questions for Founder:**
- Can we afford 3 weeks of mixed systems?
- Should we pause new feature work to migrate faster?
- Is there a specific date by which migration must be complete?

---

### Decision Point 3: Offline Support Priority

**Decision:** Should we implement full offline support (Phase 4, Task 4.2) or defer it?

**Options:**
1. **Implement now (recommended)** - Week 5
   - Pros: Better UX, competitive advantage, enables future features
   - Cons: Additional complexity, more testing needed

2. **Defer to post-launch** - After Phase 6
   - Pros: Faster initial launch, fewer moving parts
   - Cons: User complaints about offline experience, harder to retrofit

**Recommendation:** Implement now (Week 5)

**Requires Founder Approval:** YES

**Decision Owner:** Founder + Lead Architect

**Questions for Founder:**
- How important is offline support for MVP?
- Have beta users complained about lack of offline support?
- Does competitive analysis show offline as table stakes?

---

### Decision Point 4: Test Coverage Target

**Decision:** What test coverage target should we enforce?

**Options:**
1. **80%+ overall (recommended)**
   - Pros: High confidence, catches most bugs, good for CI
   - Cons: More upfront work

2. **60%+ overall**
   - Pros: Faster to achieve, focuses on critical paths
   - Cons: Less confidence, more bugs slip through

3. **No strict target**
   - Pros: Maximum flexibility
   - Cons: Coverage will drift down over time

**Recommendation:** 80%+ overall, with 90%+ for Blocs/Cubits

**Requires Founder Approval:** No (engineering decision)

**Decision Owner:** Lead Architect + Test Specialist

---

### Decision Point 5: Firebase Emulator Usage

**Decision:** Should we develop against Firebase emulators or real dev project?

**Options:**
1. **Emulators (recommended)**
   - Pros: Free, fast, no quota limits, offline capable, deterministic testing
   - Cons: Setup complexity, may not catch all cloud-specific issues

2. **Real dev project**
   - Pros: Realistic environment, catches cloud issues early
   - Cons: Costs money, slower, quota limits, requires network

**Recommendation:** Emulators for development + CI, real dev project for integration testing

**Requires Founder Approval:** No (technical decision)

**Decision Owner:** Backend Specialist + DevOps

---

### Decision Point 6: API Key Management

**Decision:** How should we manage API keys and secrets?

**Options:**
1. **dart-define + GitHub Secrets (recommended)**
   - Pros: Industry standard, secure, works with CI
   - Cons: More complex build process

2. **.env files**
   - Pros: Simple, already in use
   - Cons: Keys can leak, not recommended for production

3. **Native secret management**
   - Pros: Most secure
   - Cons: Platform-specific, complex

**Recommendation:** dart-define + GitHub Secrets for production, .env for dev

**Requires Founder Approval:** No (security decision)

**Decision Owner:** Lead Architect + DevOps

---

### Decision Point 7: Scope Reduction Options

**Decision:** If timeline needs to compress, what can we defer?

**Priority for Deferral (in order):**
1. **Phase 4.1 (Use Cases)** - Can add later without breaking changes
2. **Phase 4.2 (Local Data Sources)** - Important but can defer to post-launch
3. **Phase 3.1 (Strict Lint Rules)** - Nice to have, not critical path
4. **Phase 6 (Firebase Wiring)** - Can continue with mocks if needed

**Cannot Defer:**
- Phase 0 (Critical Blockers)
- Phase 1 (Architecture Cleanup)
- Phase 2 (Initial Bloc Migration)
- Phase 5 (Complete Bloc Migration)

**Requires Founder Approval:** YES (if any deferral needed)

**Decision Owner:** Founder + Lead Architect

**Questions for Founder:**
- What is the absolute hard deadline for launch?
- Can we ship with offline support deferred?
- Can we ship with partial lint rules?

---

## 6. Risk Mitigation Strategy

### Risk 1: Tests Remain Broken

**Likelihood:** Medium
**Impact:** High (blocks all quality validation)

**Mitigation:**
- Start with Phase 0, Task 0.1 immediately
- Assign Test Specialist full-time to this
- Daily check-ins on progress
- Have backup plan to regenerate all mocks from scratch

**Contingency:**
If tests still broken after 3 days:
1. Delete all `.mocks.dart` files
2. Regenerate from scratch with updated annotations
3. Write new tests for critical paths only
4. Defer full test coverage to Phase 3

---

### Risk 2: Bloc Migration Takes Longer Than Estimated

**Likelihood:** High
**Impact:** Medium (delays completion)

**Mitigation:**
- Buffer 20% extra time in estimates
- Convert easiest providers first to build momentum
- Parallelize UI updates with provider conversion
- Have templates and examples ready

**Contingency:**
If migration falling behind by Week 4:
1. Reduce scope - only convert P0 providers
2. Leave P3 providers as Riverpod temporarily
3. Complete full migration post-launch
4. Extend timeline by 1-2 weeks if founder approves

---

### Risk 3: DI Container Causes Runtime Errors

**Likelihood:** Medium
**Impact:** High (app won't start)

**Mitigation:**
- Test DI container thoroughly on each platform
- Use lazy registration where possible
- Keep DevDataService as fallback
- Write DI container tests

**Contingency:**
If DI container breaks:
1. Revert to static service locators temporarily
2. Debug DI container in isolation
3. Re-introduce once stable
4. Add comprehensive logging to DI resolution

---

### Risk 4: Freezed Conversion Breaks Serialization

**Likelihood:** Medium
**Impact:** High (data loss)

**Mitigation:**
- Test serialization/deserialization thoroughly
- Compare JSON output before/after conversion
- Keep old implementation alongside temporarily
- Migration path for existing data

**Contingency:**
If serialization breaks:
1. Roll back Freezed conversion for affected model
2. Debug JSON generation
3. Add JSON tests before reconverting
4. Consider manual serialization for complex cases

---

### Risk 5: Firebase Wiring Issues

**Likelihood:** Medium
**Impact:** High (no production backend)

**Mitigation:**
- Use emulators for development and testing
- Test each data source independently
- Have Firebase expert available
- Incremental wiring (one entity at a time)

**Contingency:**
If Firebase wiring blocked:
1. Continue using mock data sources
2. Deploy Firebase integration as Phase 2 post-launch
3. Consider hiring Firebase consultant
4. Extend timeline for Firebase integration

---

### Risk 6: Coverage Target Not Achievable

**Likelihood:** Low
**Impact:** Medium (lower quality)

**Mitigation:**
- Write tests alongside implementation
- Use test templates and generators
- Focus on high-value tests first
- Automate test generation where possible

**Contingency:**
If 80% coverage not achievable:
1. Lower target to 70% temporarily
2. Focus on 90%+ coverage for critical paths only
3. Defer full coverage to maintenance phase
4. Add coverage improvement to backlog

---

### Risk 7: Performance Regression

**Likelihood:** Low
**Impact:** Medium (poor UX)

**Mitigation:**
- Profile after major changes
- Monitor Flutter DevTools metrics
- Keep performance tests
- Benchmark critical paths

**Contingency:**
If performance degrades:
1. Profile to identify bottleneck
2. Optimize hot paths
3. Consider lazy loading
4. Add performance budgets to CI

---

### Risk 8: Scope Creep During Implementation

**Likelihood:** High
**Impact:** High (timeline expansion)

**Mitigation:**
- Strictly follow this plan
- No new features during migration
- Document "nice to have" items for later
- Weekly scope review

**Contingency:**
If scope grows:
1. Pause and reassess priorities
2. Move new items to backlog
3. Get founder approval for any additions
4. Extend timeline if necessary

---

## 7. Success Criteria & Validation

### Phase 0 Success Criteria

**Must Achieve:**
- [ ] `flutter gen-l10n` runs without errors
- [ ] At least 10% of tests passing
- [ ] CI includes localization generation
- [ ] DI container initializes successfully
- [ ] All Blocs/Cubits use constructor injection
- [ ] App starts and runs without DI errors

**Validation Method:**
```bash
flutter gen-l10n && echo "✅ Localization OK"
flutter test | grep "passed" && echo "✅ Tests OK"
flutter run && echo "✅ App starts OK"
```

---

### Phase 1 Success Criteria

**Must Achieve:**
- [ ] All repository implementations named `*Impl`
- [ ] Domain layer has ONLY abstract classes
- [ ] UserProfile model uses Freezed (≤20 lines)
- [ ] Auth state uses Freezed union types
- [ ] Generated files committed
- [ ] All affected tests passing

**Validation Method:**
```bash
# Check repository naming
find lib/data/repositories -name "*.dart" | grep -v "_impl.dart" && echo "❌ Non-impl files in data/repositories" || echo "✅ Repository naming correct"

# Check domain has no implementations
grep -r "class.*{" lib/domain/repositories/ && echo "❌ Implementations in domain" || echo "✅ Domain layer clean"

# Check Freezed generation
find lib -name "*.freezed.dart" | wc -l
find lib -name "*.g.dart" | wc -l

# Run tests
flutter test && echo "✅ Tests passing"
```

---

### Phase 2 Success Criteria

**Must Achieve:**
- [ ] 5 Riverpod providers converted to Bloc/Cubit
- [ ] All affected UI screens work correctly
- [ ] 90%+ test coverage for new Blocs
- [ ] No Riverpod references in converted code
- [ ] DI container updated

**Validation Method:**
```bash
# Count remaining providers
find lib/logic/providers -name "*_providers.dart" | wc -l

# Check for Riverpod references in converted files
grep -r "ref.watch\|ref.read\|ConsumerWidget" lib/presentation/ && echo "❌ Riverpod references found" || echo "✅ Clean Bloc migration"

# Check test coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

---

### Phase 3 Success Criteria

**Must Achieve:**
- [ ] `flutter analyze` passes with strict rules
- [ ] 80%+ overall test coverage
- [ ] 90%+ Bloc/Cubit test coverage
- [ ] CI enforces quality gates
- [ ] No critical lint violations

**Validation Method:**
```bash
# Check analyzer
flutter analyze --fatal-infos && echo "✅ Analyzer passes"

# Check coverage
flutter test --coverage
# Parse coverage report for percentage

# Check CI
cat .github/workflows/flutter_ci.yml | grep "flutter analyze" && echo "✅ CI has quality gates"
```

---

### Phase 4 Success Criteria

**Must Achieve:**
- [ ] 5 use cases implemented
- [ ] Blocs use use cases instead of repositories directly
- [ ] Local data sources implemented for 5 entities
- [ ] Offline mode works
- [ ] Data syncs when coming online

**Validation Method:**
```bash
# Check use cases exist
find lib/domain/use_cases -name "*_use_case.dart" | wc -l

# Check local data sources exist
find lib/data/datasources/local -name "*_local_data_source*.dart" | wc -l

# Manual testing
# 1. Start app with network
# 2. Disable network
# 3. Verify data loads from cache
# 4. Enable network
# 5. Verify data syncs
```

---

### Phase 5 Success Criteria

**Must Achieve:**
- [ ] All Riverpod providers converted (0 remaining)
- [ ] Riverpod packages removed from pubspec
- [ ] All tests passing
- [ ] No Riverpod references in codebase
- [ ] App runs without Riverpod

**Validation Method:**
```bash
# Count remaining providers
find lib/logic/providers -name "*_providers.dart" 2>/dev/null | wc -l

# Check pubspec
grep "riverpod" pubspec.yaml && echo "❌ Riverpod still in pubspec" || echo "✅ Riverpod removed"

# Check codebase
grep -r "ref.watch\|ref.read\|Consumer" lib/ && echo "❌ Riverpod references found" || echo "✅ Clean migration"

# Run tests
flutter test && echo "✅ All tests passing"
```

---

### Phase 6 Success Criteria

**Must Achieve:**
- [ ] Firebase connected for all environments
- [ ] All data sources use real Firebase (no mocks)
- [ ] Authentication works
- [ ] CRUD operations work
- [ ] Crashlytics reporting errors
- [ ] Analytics tracking events
- [ ] 80%+ test coverage maintained
- [ ] All lint rules passing
- [ ] Production build succeeds

**Validation Method:**
```bash
# Check Firebase initialization
flutter run && # Verify Firebase connects

# Check data sources
grep -r "// Mock data" lib/data/datasources/remote/ && echo "❌ Mock data still present" || echo "✅ Real Firebase"

# Check monitoring
# Trigger an error, verify it appears in Firebase Console
# Trigger an event, verify it appears in Analytics

# Final checks
flutter analyze --fatal-infos
flutter test --coverage
flutter build apk --release
```

---

### Overall Success Criteria (Project Complete)

**Must Achieve:**
- [ ] All 71 test files passing
- [ ] 80%+ test coverage (overall)
- [ ] 90%+ Bloc/Cubit coverage
- [ ] 0 Riverpod dependencies
- [ ] All repositories in correct layers
- [ ] All domain models use Freezed
- [ ] Firebase wired and working
- [ ] `flutter analyze` passes with strict rules
- [ ] CI enforces all quality gates
- [ ] App ready for production deployment

**Final Validation Checklist:**
```bash
# 1. Tests
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
# Verify 80%+ coverage

# 2. Analysis
flutter analyze --fatal-infos
# Must pass with 0 issues

# 3. Architecture
find lib/data/repositories -name "*.dart" | grep -v "_impl.dart"
# Must return nothing

find lib/domain/repositories -name "*_impl.dart"
# Must return nothing

# 4. Dependencies
grep "riverpod" pubspec.yaml
# Must return nothing

# 5. Generated code
find lib -name "*.freezed.dart" | wc -l
# Should be 30+ files

# 6. Firebase
flutter run --release
# Verify Firebase connection in logs

# 7. Build
flutter build apk --release
flutter build ios --release
flutter build web --release
# All must succeed

# 8. CI
git push
# Watch CI - must be green
```

---

## 8. Timeline & Resource Estimates

### 8.1 Detailed Timeline

**Week 1: Phase 0 - Critical Blockers**
- Days 1-2: Fix tests (0.1) - Test Specialist
- Days 1-3: Implement DI (0.2) - Lead Architect + Bloc SME
- Day 4: Update CI (0.3) - DevOps
- Day 5: Validation and buffer

**Week 2: Phase 1 - Architecture Cleanup**
- Days 1-2: Fix repository layers (1.1) - Lead Architect
- Days 1-5: Add Freezed (1.2) - Bloc SME + Lead Architect
  - Day 1-2: Core models
  - Day 2-3: Bloc states
  - Day 3-4: Bloc events
  - Day 4-5: Secondary models

**Week 3: Phase 2 - Bloc Migration Batch 1**
- Day 1: Identify priority (2.1) - Bloc SME
- Days 1-5: Convert providers (2.2) - Bloc SME
  - Day 1: Settings
  - Day 2: Calendar
  - Day 3: Events
  - Day 4: Notifications
  - Day 5: Contacts

**Week 4: Phase 3 - Code Quality**
- Days 1-2: Strict lint rules (3.1) - Code Quality Specialist
- Days 3-5: Test coverage (3.2) - Test Specialist

**Week 5: Phase 4 - Architecture Enhancement**
- Days 1-3: Use cases (4.1) - Lead Architect
- Days 3-5: Local data sources (4.2) - Lead Architect + Backend Specialist

**Week 6: Phase 5 - Bloc Migration Batch 2**
- Days 1-4: Convert remaining providers (5.1) - Bloc SME
- Day 5: Remove Riverpod (5.2) - Bloc SME + Lead Architect

**Week 7-8: Phase 6 - Firebase & Production**
- Week 7, Days 1-2: Firebase config (6.1) - Backend Specialist
- Week 7, Days 3-5: Wire data sources (6.2) - Backend Specialist
- Week 8: Production readiness (6.3) - All agents

### 8.2 Resource Allocation

**Full-Time Equivalent (FTE) Breakdown:**

| Agent | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 | Week 7-8 | Total |
|-------|--------|--------|--------|--------|--------|--------|----------|-------|
| Lead Architect | 0.7 | 0.8 | 0.3 | 0.2 | 1.0 | 0.5 | 0.6 | 4.1 |
| Bloc/Cubit SME | 0.6 | 1.0 | 1.0 | 0.3 | 0.2 | 1.0 | 0.3 | 4.4 |
| Test Specialist | 0.8 | 0.3 | 0.3 | 0.8 | 0.2 | 0.3 | 0.3 | 3.0 |
| Backend Specialist | 0.1 | 0.1 | 0.1 | 0.1 | 0.4 | 0.1 | 1.0 | 1.9 |
| DevOps | 0.3 | 0.1 | 0.1 | 0.2 | 0.1 | 0.1 | 0.5 | 1.4 |
| Code Quality | 0.1 | 0.2 | 0.2 | 0.8 | 0.1 | 0.1 | 0.2 | 1.7 |
| **Total FTE/Week** | **2.6** | **2.5** | **2.0** | **2.4** | **2.0** | **2.1** | **2.9** | **16.5** |

**Interpretation:**
- **Peak load:** Week 1 (2.6 FTE), Week 7-8 (2.9 FTE)
- **Average load:** 2.3 FTE
- **Total effort:** ~16.5 person-weeks across 8 weeks
- **Minimum team size:** 2 engineers full-time for 8 weeks
- **Optimal team size:** 3 engineers (one takes multiple roles)

### 8.3 Cost Estimation

**If using contracted resources:**

Assuming average Flutter engineer rate: $100/hour
- Week 1: 2.6 FTE × 40 hours × $100 = $10,400
- Week 2: 2.5 FTE × 40 hours × $100 = $10,000
- Week 3: 2.0 FTE × 40 hours × $100 = $8,000
- Week 4: 2.4 FTE × 40 hours × $100 = $9,600
- Week 5: 2.0 FTE × 40 hours × $100 = $8,000
- Week 6: 2.1 FTE × 40 hours × $100 = $8,400
- Week 7-8: 2.9 FTE × 80 hours × $100 = $23,200

**Total Cost:** ~$77,600 (contracted)

**If using internal team:**
Cost = opportunity cost of not building new features for 8 weeks

### 8.4 Timeline Adjustments

**Fast-track option (5-6 weeks):**
- Increase to 3 FTE
- Defer Phase 4 (Use Cases + Local Data Sources)
- Defer Phase 3.1 (Strict Lint Rules)
- Risk: Lower code quality, no offline support

**Conservative option (10-12 weeks):**
- Keep at 1.5-2 FTE
- Add buffer weeks between phases
- Allows parallel feature development
- Risk: Longer time with dual systems

**Recommended:** Stick to 8-week plan with 2-2.5 FTE

---

## 9. Blocking Issues & Dependencies

### 9.1 Current Blockers

**Blocker 1: Tests Fail**
- **Impact:** Cannot validate any changes
- **Owner:** Test Specialist
- **Resolution:** Phase 0, Task 0.1
- **ETA:** Week 1, Day 2
- **Workaround:** Manual testing only

**Blocker 2: No Proper DI**
- **Impact:** Hard to test, tight coupling
- **Owner:** Lead Architect + Bloc SME
- **Resolution:** Phase 0, Task 0.2
- **ETA:** Week 1, Day 3
- **Workaround:** Continue with static DI temporarily

**Blocker 3: Dual State Management**
- **Impact:** Confusion, harder to maintain
- **Owner:** Bloc SME
- **Resolution:** Phase 2, Phase 5
- **ETA:** Week 6
- **Workaround:** None - must live with it

### 9.2 External Dependencies

**Dependency 1: Flutter SDK**
- **Current:** 3.35.0 (pinned via FVM)
- **Risk:** Security updates or critical bugs
- **Mitigation:** Monitor Flutter releases, plan for updates post-migration
- **Owner:** DevOps

**Dependency 2: Firebase Projects**
- **Current:** Not yet created
- **Risk:** Configuration delays
- **Mitigation:** Create projects early (Week 1)
- **Owner:** Backend Specialist + Founder

**Dependency 3: Package Updates**
- **Current:** Several packages can be updated
- **Risk:** Breaking changes
- **Mitigation:** Pin versions during migration, update after completion
- **Owner:** Lead Architect

**Dependency 4: Apple/Google Services**
- **Current:** OAuth configured
- **Risk:** Config expires or changes
- **Mitigation:** Verify configs during Phase 6
- **Owner:** Backend Specialist

### 9.3 Internal Dependencies

**Code Freeze During Migration:**
- Recommend minimal feature work during Phases 0-1 (Weeks 1-2)
- Bug fixes allowed, but coordinate with migration team
- New features can resume after Phase 1 (Week 3+)

**Branch Strategy:**
- Create `feature/architecture-migration` branch
- Daily merges from `main` to stay current
- PR back to `main` after each phase completion
- No direct commits to `main` during migration

**Documentation Requirements:**
- Update docs after each phase
- Keep this plan updated with actual progress
- Document any deviations from plan
- Update tech stack document when migration completes

---

## 10. Communication Plan

### 10.1 Status Reporting

**Daily Updates (Async):**
- Each agent posts in team channel:
  ```
  [Agent Name] - [Date]
  ✅ Completed: [Task]
  🚧 In Progress: [Task]
  🔴 Blocked: [Issue if any]
  📅 Next: [What's next]
  ```

**Weekly Summary (Sync):**
- Every Friday, 30-minute call
- Agenda:
  1. Progress against plan (5 min)
  2. Blockers and resolutions (10 min)
  3. Next week priorities (10 min)
  4. Q&A (5 min)

**Phase Completion Reports:**
- After each phase, Lead Architect writes summary:
  - What was completed
  - What was deferred
  - Metrics achieved (test coverage, etc.)
  - Risks identified
  - Next phase readiness

### 10.2 Stakeholder Updates

**For Founder:**

**Weekly Email (Mondays):**
```
Subject: MyOrbit Architecture Migration - Week [N] Update

Progress:
- [X]% complete overall
- [Current phase]
- On track / [N] days behind schedule

Wins:
- [Key accomplishment]
- [Key accomplishment]

Challenges:
- [Issue and how it's being handled]

Next Week:
- [What's happening]

Decisions Needed:
- [Any decisions required]

Dashboard: [Link to project board]
```

**Monthly Deep Dive (Optional):**
- Video call with founder
- Demo progress
- Review metrics
- Discuss any timeline adjustments

### 10.3 Decision Escalation

**Escalation Tiers:**

**Tier 1: Agent-to-Agent (30 min resolution)**
- Technical questions
- Implementation details
- Code review feedback

**Tier 2: Lead Architect (4 hour resolution)**
- Architecture decisions
- Priority conflicts
- Technical blockers

**Tier 3: Founder (24 hour resolution)**
- Timeline adjustments
- Scope changes
- Resource allocation
- Budget impacts

**Escalation Template:**
```
ESCALATION REQUIRED

From: [Agent]
To: [Tier 2 or 3]
Date: [Date]

Issue:
[Clear description]

Impact:
[What's blocked, how critical]

Options Considered:
1. [Option A] - Pros/Cons
2. [Option B] - Pros/Cons

Recommendation:
[Preferred option and why]

Timeline Impact:
[How this affects schedule]

Decision Needed By:
[Date]
```

### 10.4 Documentation Updates

**Living Documents:**
- This implementation plan (update with actuals)
- Tech stack document (update after Phase 6)
- Migration guide (update after Phase 5)

**New Documents to Create:**
- DI container guide (after Phase 0)
- Freezed migration guide (after Phase 1)
- Bloc migration patterns (after Phase 2)
- Testing guide (after Phase 3)
- Offline support guide (after Phase 4)
- Firebase integration guide (after Phase 6)

**Documentation Owner:** Lead Architect (delegates to agents)

---

## 11. Appendices

### Appendix A: Key Files Reference

**Configuration:**
- `/pubspec.yaml` - Dependencies
- `/analysis_options.yaml` - Lint rules
- `/.env.example` - Environment variables
- `/firebase.json` - Firebase configuration

**Architecture:**
- `/lib/domain/repositories/` - Repository contracts
- `/lib/data/repositories/` - Repository implementations
- `/lib/presentation/bloc/` - Bloc implementations
- `/lib/presentation/cubit/` - Cubit implementations

**DI:**
- `/lib/core/di/injection_container.dart` - Main DI container

**Bootstrap:**
- `/lib/main.dart` - App entry point
- `/lib/core/bootstrap/` - Bootstrap logic

**Testing:**
- `/test/` - Test files
- `/integration_test/` - Integration tests

### Appendix B: Command Reference

**Development:**
```bash
# Run app
flutter run

# Generate code
flutter gen-l10n
dart run build_runner build --delete-conflicting-outputs

# Run tests
flutter test
flutter test --coverage

# Analyze
flutter analyze
```

**Quality:**
```bash
# Check coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html

# Format code
dart format lib test

# Count files
find lib -name "*.dart" | wc -l
```

**Firebase:**
```bash
# Configure
flutterfire configure

# Start emulators
firebase emulators:start

# Deploy rules
firebase deploy --only firestore:rules
```

**Build:**
```bash
# Debug builds
flutter build apk --debug
flutter build ios --debug

# Release builds
flutter build apk --release
flutter build ios --release
flutter build web --release
```

### Appendix C: Testing Templates

**Bloc Test Template:**
```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_test/flutter_test.dart';

class Mock[Dependency] extends Mock implements [Dependency] {}

void main() {
  late [Bloc] bloc;
  late Mock[Dependency] mock[Dependency];

  setUp(() {
    mock[Dependency] = Mock[Dependency]();
    bloc = [Bloc]([dependency]: mock[Dependency]);
  });

  tearDown(() {
    bloc.close();
  });

  group('[Event]', () {
    blocTest<[Bloc], [State]>(
      '[description]',
      build: () {
        when(() => mock[Dependency].[method]())
            .thenAnswer((_) async => [result]);
        return bloc;
      },
      act: (bloc) => bloc.add([Event]()),
      expect: () => [
        [ExpectedState1](),
        [ExpectedState2](),
      ],
      verify: (_) {
        verify(() => mock[Dependency].[method]()).called(1);
      },
    );
  });
}
```

**Repository Test Template:**
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class Mock[DataSource] extends Mock implements [DataSource] {}

void main() {
  late [Repository]Impl repository;
  late Mock[DataSource] mock[DataSource];

  setUp(() {
    mock[DataSource] = Mock[DataSource]();
    repository = [Repository]Impl(
      [dataSource]: mock[DataSource],
    );
  });

  group('[method]', () {
    test('returns Success when [condition]', () async {
      // Arrange
      final mockData = [/* mock data */];
      when(() => mock[DataSource].[method]())
          .thenAnswer((_) async => mockData);

      // Act
      final result = await repository.[method]();

      // Assert
      expect(result, isA<Success<[Type]>>());
      result.when(
        success: (data) => expect(data, equals(mockData)),
        failure: (_, __) => fail('Expected success'),
      );
    });

    test('returns Failure when [error condition]', () async {
      // Arrange
      when(() => mock[DataSource].[method]())
          .thenThrow(Exception('Error'));

      // Act
      final result = await repository.[method]();

      // Assert
      expect(result, isA<Failure<[Type]>>());
    });
  });
}
```

### Appendix D: Useful Resources

**Flutter Best Practices:**
- [Flutter Architecture Samples](https://github.com/brianegan/flutter_architecture_samples)
- [Very Good CLI](https://github.com/VeryGoodOpenSource/very_good_cli)
- [Reso Coder Clean Architecture Series](https://resocoder.com/flutter-clean-architecture-tdd/)

**Bloc Resources:**
- [Bloc Library Documentation](https://bloclibrary.dev/)
- [Bloc Examples](https://github.com/felangel/bloc/tree/master/examples)
- [bloc_test Package](https://pub.dev/packages/bloc_test)

**Freezed Resources:**
- [Freezed Documentation](https://pub.dev/packages/freezed)
- [Freezed Examples](https://github.com/rrousselGit/freezed/tree/master/examples)

**Firebase Resources:**
- [FlutterFire Documentation](https://firebase.flutter.dev/)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)

---

## 12. Conclusion

This implementation plan provides a comprehensive, phased approach to migrating MyOrbit Calendar to industry best practices. By following this plan:

**For the Founder:**
- Clear visibility into progress and timeline
- Defined decision points requiring your input
- Risk mitigation for your investment
- Measurable success criteria
- Business impact justification

**For the Engineering Team:**
- Clear task assignments
- Coordination strategy
- Technical patterns and templates
- Quality standards
- Success validation

**Key Success Factors:**
1. **Start with critical blockers** (Phase 0) - unblocks everything else
2. **Fix architecture foundation** (Phase 1) - enables clean development
3. **Incremental migration** (Phases 2, 5) - lower risk
4. **Quality gates** (Phase 3) - maintain standards
5. **Enhanced architecture** (Phase 4) - competitive advantage
6. **Production readiness** (Phase 6) - ship with confidence

**Timeline Summary:**
- **Week 1:** Fix blockers, implement DI
- **Week 2:** Clean up architecture, add Freezed
- **Week 3:** Initial Bloc migration
- **Week 4:** Improve code quality and tests
- **Week 5:** Add use cases and offline support
- **Week 6:** Complete Bloc migration
- **Week 7-8:** Wire Firebase and production prep

**Estimated Completion:** 8 weeks (2-2.5 FTE)

**Expected ROI:**
- 40-50% faster feature development post-migration
- 80%+ test coverage = higher confidence
- 60-70% less boilerplate = easier maintenance
- Offline support = better UX
- Clean architecture = easier onboarding

---

## Questions & Feedback

This plan is a living document. If you have questions, concerns, or need clarifications:

1. **For technical clarifications:** Contact Lead Architect
2. **For timeline adjustments:** Review with Founder + Lead Architect
3. **For scope changes:** Decision Point review required
4. **For risk concerns:** Refer to Section 6 (Risk Mitigation)

**Next Steps:**
1. Founder reviews and approves plan (or requests modifications)
2. Address critical decision points (Section 5)
3. Assign agents to roles
4. Create project board/tracking
5. Kick off Phase 0 (Week 1)

**Document Maintenance:**
- Update with actuals after each phase
- Record deviations and reasons
- Document lessons learned
- Update estimates based on experience

---

**Plan Prepared By:** Lead Architect
**Date:** October 31, 2025
**Status:** DRAFT - Awaiting Founder Approval
**Next Review:** After Phase 0 Completion

---

**Approval Signatures:**

_________________________
Founder                     Date

_________________________
Lead Architect             Date

_________________________
Engineering Lead           Date

---

**End of Implementation Plan**
