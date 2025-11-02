# MyOrbit Calendar - Best Practices Recommendations

**Date:** October 31, 2025
**Reviewer:** Senior Flutter/Dart Architect
**Project State:** Mid-migration (Riverpod→Bloc, Supabase→Firebase)
**Review Scope:** Architecture, code quality, testing, dependencies, CI/CD

---

## Executive Summary

Your MyOrbit Calendar project demonstrates **strong architectural foundations** with clean architecture, proper separation of concerns, and modern Flutter patterns. However, being mid-migration creates technical debt and several best practice violations that need addressing.

### Overall Grade: B+ (Good, with room for improvement)

**Strengths:**
- ✅ Clean architecture properly implemented
- ✅ Repository pattern with proper contracts
- ✅ Result type for error handling (excellent!)
- ✅ Bloc pattern implementation is solid
- ✅ Domain models use Equatable correctly

**Critical Issues:**
- ❌ Dual state management systems (Riverpod + Bloc)
- ❌ Missing Freezed for immutability
- ❌ No proper dependency injection container
- ❌ Tests are broken and blocking
- ❌ Mixed repository implementations (domain vs data layers)

---

## Priority Matrix

| Priority | Category | Impact | Effort |
|----------|----------|--------|--------|
| 🔴 **P0 - Critical** | Fix broken tests | High | Medium |
| 🔴 **P0 - Critical** | Implement proper DI | High | High |
| 🟠 **P1 - High** | Add Freezed for immutability | High | Medium |
| 🟠 **P1 - High** | Complete Bloc migration | High | High |
| 🟠 **P1 - High** | Move repositories to correct layer | Medium | Low |
| 🟡 **P2 - Medium** | Enhance lint rules | Medium | Low |
| 🟡 **P2 - Medium** | Add use case layer | Medium | Medium |
| 🟢 **P3 - Low** | Optimize pubspec dependencies | Low | Low |

---

## 1. Architecture & Design Patterns

### ✅ What's Good

1. **Clean Architecture Structure**
   ```
   lib/
   ├── domain/      # Business logic ✅
   ├── data/        # Data access ✅
   └── presentation/ # UI & state ✅
   ```
   - Clear separation of concerns
   - Proper layering
   - Dependencies point inward

2. **Repository Pattern**
   - Interfaces in `domain/repositories/` ✅
   - Clear contracts
   - Good abstraction

3. **Result Type Pattern**
   ```dart
   // lib/core/result.dart - EXCELLENT!
   sealed class Result<T> {
     R when<R>({
       required R Function(T data) success,
       required R Function(String message, Exception?) failure,
     })
   }
   ```
   - Type-safe error handling
   - No throwing exceptions for expected failures
   - Clean API with `when()` method

### ❌ Critical Issues

#### 1.1 Repository Implementations in Wrong Layer 🔴 **P1**

**Problem:**
```dart
// ❌ WRONG: lib/data/repositories/auth_repository.dart
// This is an implementation, not a contract!

// ❌ WRONG: lib/data/repositories/user_repository.dart
// This is an implementation, should be user_repository_impl.dart
```

**Best Practice:**
```dart
// ✅ CORRECT Structure:

// lib/domain/repositories/user_repository.dart
abstract class UserRepository {
  Future<Result<List<UserProfile>>> getUsers();
}

// lib/data/repositories/user_repository_impl.dart
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource remoteDataSource;
  final UserLocalDataSource localDataSource;

  // Implementation here
}
```

**Why It Matters:**
- Domain layer should have NO implementations
- Data layer shouldn't have contracts
- Makes dependency injection confusing
- Violates clean architecture principles

**Action Items:**
- [ ] Rename `lib/data/repositories/user_repository.dart` → `user_repository_impl.dart`
- [ ] Move implementation of `AuthRepository` to `auth_repository_impl.dart`
- [ ] Update all imports
- [ ] Keep only abstract classes in `domain/repositories/`

---

#### 1.2 Missing Dependency Injection Container 🔴 **P0**

**Current State:**
```dart
// lib/presentation/cubit/auth/auth_cubit.dart:65
AuthCubit({AuthRepository? repository})
    : _repository = repository ?? AuthDependencyInjection.authRepository,
```

**Problems:**
- Using static `AuthDependencyInjection` class (service locator anti-pattern)
- Hard to test
- Hard to swap implementations
- Tight coupling

**Best Practice Solution:**

Use `get_it` (industry standard for Flutter DI):

```dart
// lib/core/di/injection_container.dart
import 'package:get_it/get_it.dart';

final sl = GetIt.instance; // sl = Service Locator

Future<void> initializeDependencies() async {
  // Data sources
  sl.registerLazySingleton<UserRemoteDataSource>(
    () => UserRemoteDataSourceImpl(firestore: sl()),
  );

  // Repositories
  sl.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(
      remoteDataSource: sl(),
      localDataSource: sl(),
    ),
  );

  // Blocs/Cubits (factories, not singletons!)
  sl.registerFactory(() => UserBloc(userRepository: sl()));
  sl.registerFactory(() => AuthCubit(repository: sl()));

  // External dependencies
  sl.registerLazySingleton(() => FirebaseFirestore.instance);
  sl.registerLazySingleton(() => FirebaseAuth.instance);
}

// Usage in main.dart:
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDependencies();
  runApp(MyApp());
}

// In widgets:
BlocProvider(
  create: (_) => sl<UserBloc>(), // Clean!
  child: MyScreen(),
)
```

**Action Items:**
- [ ] Add `get_it: ^8.0.0` to pubspec.yaml
- [ ] Create proper `injection_container.dart`
- [ ] Register all dependencies
- [ ] Remove static `AuthDependencyInjection` class
- [ ] Update all Bloc/Cubit constructors
- [ ] Update bootstrap sequence in `main.dart`

---

#### 1.3 Missing Use Case Layer 🟡 **P2**

**Current State:**
Blocs call repositories directly:

```dart
// lib/presentation/bloc/user/user_bloc.dart:29
final result = await userRepository.getUsers();
```

**Best Practice:**
Add use case layer for complex business logic:

```dart
// lib/domain/use_cases/get_users_use_case.dart
class GetUsersUseCase {
  final UserRepository repository;

  const GetUsersUseCase(this.repository);

  Future<Result<List<UserProfile>>> call({
    bool includeInactive = false,
    String? searchQuery,
  }) async {
    // Business logic here
    final result = await repository.getUsers();

    return result.when(
      success: (users) {
        var filtered = users;

        if (!includeInactive) {
          filtered = filtered.where((u) => u.isActive).toList();
        }

        if (searchQuery != null) {
          filtered = filtered.where((u) =>
            u.displayName?.contains(searchQuery) ?? false
          ).toList();
        }

        return Success(filtered);
      },
      failure: (message, exception) => Failure(message, exception),
    );
  }
}

// In Bloc:
final result = await getUsersUseCase(searchQuery: event.query);
```

**When to Use Use Cases:**
- ✅ Complex business logic
- ✅ Multi-repository operations
- ✅ Transformations/filtering
- ❌ Simple CRUD (okay to skip)

**Action Items:**
- [ ] Create `lib/domain/use_cases/` directory
- [ ] Implement use cases for complex operations
- [ ] Update Blocs to use use cases instead of repositories directly
- [ ] Keep simple operations direct (optional)

---

### 1.4 Missing Freezed for Immutability 🟠 **P1**

**Current State:**
```dart
// lib/domain/user_profile.dart
class UserProfile extends Equatable {
  final String id;
  final String email;
  // ...

  // Manual copyWith, fromJson, toJson
  UserProfile copyWith({...}) { /* lots of boilerplate */ }
}
```

**Problem:**
- 88 lines for a simple model
- Manual serialization prone to errors
- No immutability guarantees
- Verbose copyWith implementations

**Best Practice with Freezed:**

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

// Generated features:
// - Immutability (const constructors)
// - copyWith()
// - toJson() / fromJson()
// - == operator and hashCode
// - toString()
// - Union types support
// Total: ~20 lines vs 88 lines!
```

**Freezed Benefits:**
1. **Immutability by default** - prevents accidental mutations
2. **Less boilerplate** - 60-70% less code
3. **Type safety** - generated code is type-safe
4. **Union types** - for states (Loading, Success, Error)
5. **Deep copying** - automatic nested copyWith

**Freezed for States:**

```dart
// lib/presentation/cubit/auth/auth_state.dart
@freezed
class AuthState with _$AuthState {
  const factory AuthState.unknown() = _Unknown;
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.authenticated(User user) = _Authenticated;
  const factory AuthState.loading() = _Loading;
  const factory AuthState.error(String message) = _Error;
}

// Usage:
state.when(
  unknown: () => CircularProgressIndicator(),
  unauthenticated: () => LoginScreen(),
  authenticated: (user) => HomeScreen(user),
  loading: () => LoadingIndicator(),
  error: (msg) => ErrorWidget(msg),
)
```

**Action Items:**
- [ ] Add `freezed: ^3.2.3` to dev_dependencies (already have it!)
- [ ] Convert all domain models to Freezed
- [ ] Convert all Bloc/Cubit states to Freezed
- [ ] Convert all Bloc events to Freezed
- [ ] Run `dart run build_runner build`
- [ ] Update tests

**Files to Convert (Priority Order):**
1. `lib/domain/user_profile.dart` ⭐
2. `lib/presentation/bloc/user/user_state.dart` ⭐
3. `lib/presentation/bloc/user/user_event.dart` ⭐
4. `lib/presentation/cubit/auth/auth_cubit.dart` (refactor state)
5. All other domain models
6. All other states/events

---

## 2. State Management

### ✅ What's Good

1. **Bloc Implementation Quality**
   ```dart
   // lib/presentation/bloc/user/user_bloc.dart
   // - Clean event handlers
   // - Proper error handling
   // - Good logging
   // - State transitions are clear
   ```

2. **AuthCubit Pattern**
   - Stream subscription management
   - Proper cleanup in `close()`
   - Error boundaries

### ❌ Critical Issues

#### 2.1 Dual State Management 🔴 **P0**

**Problem:**
```
lib/
├── logic/providers/        # Riverpod (legacy)
└── presentation/
    ├── bloc/               # Bloc (new)
    └── cubit/              # Cubit (new)
```

**Best Practice:**
Pick ONE and complete the migration.

**Recommendation:** **Complete Bloc migration ASAP**

**Migration Plan:**

```dart
// Phase 1: Identify remaining Riverpod providers
find lib/logic/providers -name "*.dart" -exec grep -l "Provider" {} \;

// Phase 2: Convert one provider at a time
// Example: settings_providers.dart → settings_cubit.dart

// Before (Riverpod):
final settingsProvider = StateNotifierProvider<SettingsNotifier, SettingsState>(
  (ref) => SettingsNotifier(),
);

// After (Cubit):
class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit() : super(SettingsState.initial());

  void updateTheme(ThemeMode mode) {
    emit(state.copyWith(themeMode: mode));
  }
}

// Phase 3: Update UI
// Before:
Consumer(builder: (context, ref, child) {
  final settings = ref.watch(settingsProvider);
  ...
})

// After:
BlocBuilder<SettingsCubit, SettingsState>(
  builder: (context, state) {
    ...
  },
)
```

**Action Items:**
- [ ] Create migration checklist (all Riverpod providers)
- [ ] Convert providers to Blocs/Cubits (1 per week)
- [ ] Update UI screens
- [ ] Remove Riverpod dependencies when done
- [ ] Target: Complete by end of November 2025

---

#### 2.2 State Classes Need Freezed 🟠 **P1**

**Current:**
```dart
// lib/presentation/cubit/auth/auth_cubit.dart:25
class AuthState {
  const AuthState({
    required this.status,
    this.user,
    this.errorMessage,
  });

  // Manual copyWith boilerplate...
}
```

**Best Practice:**
```dart
@freezed
class AuthState with _$AuthState {
  const factory AuthState.unknown() = _Unknown;
  const factory AuthState.authenticated(User user) = _Authenticated;
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.loading() = _Loading;
  const factory AuthState.error(String message) = _Error;
}

// Usage in Cubit:
void signIn() async {
  emit(const AuthState.loading());
  final result = await repo.signIn();
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

**Benefits:**
- Type-safe pattern matching
- Impossible to forget a state
- Compile-time guarantees
- Less boilerplate

---

## 3. Code Quality & Linting

### ❌ Critical Issues

#### 3.1 Weak Lint Rules 🟡 **P2**

**Current:**
```yaml
# analysis_options.yaml:10
include: package:flutter_lints/flutter.yaml

linter:
  rules:
    # No custom rules enabled!
```

**Best Practice:**

```yaml
# analysis_options.yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  exclude:
    - archive/**
    - '**/*.g.dart'
    - '**/*.freezed.dart'

  errors:
    invalid_annotation_target: ignore

  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true

linter:
  rules:
    # Errors
    - avoid_dynamic_calls
    - avoid_empty_else
    - avoid_slow_async_io
    - avoid_type_to_string
    - cancel_subscriptions
    - close_sinks
    - discarded_futures
    - literal_only_boolean_expressions
    - no_adjacent_strings_in_list
    - throw_in_finally
    - unnecessary_statements
    - unsafe_html

    # Style
    - always_declare_return_types
    - always_put_required_named_parameters_first
    - always_use_package_imports
    - avoid_bool_literals_in_conditional_expressions
    - avoid_catches_without_on_clauses
    - avoid_catching_errors
    - avoid_classes_with_only_static_members
    - avoid_escaping_inner_quotes
    - avoid_field_initializers_in_const_classes
    - avoid_final_parameters
    - avoid_implementing_value_types
    - avoid_js_rounded_ints
    - avoid_multiple_declarations_per_line
    - avoid_positional_boolean_parameters
    - avoid_private_typedef_functions
    - avoid_redundant_argument_values
    - avoid_returning_this
    - avoid_setters_without_getters
    - avoid_types_on_closure_parameters
    - avoid_unused_constructor_parameters
    - avoid_void_async
    - cascade_invocations
    - cast_nullable_to_non_nullable
    - combinators_ordering
    - conditional_uri_does_not_exist
    - deprecated_consistency
    - directives_ordering
    - eol_at_end_of_file
    - leading_newlines_in_multiline_strings
    - library_annotations
    - lines_longer_than_80_chars
    - missing_whitespace_between_adjacent_strings
    - no_default_cases
    - no_literal_bool_comparisons
    - no_runtimeType_toString
    - noop_primitive_operations
    - omit_local_variable_types
    - one_member_abstracts
    - only_throw_errors
    - package_api_docs
    - parameter_assignments
    - prefer_asserts_in_initializer_lists
    - prefer_asserts_with_message
    - prefer_const_constructors
    - prefer_const_constructors_in_immutables
    - prefer_const_declarations
    - prefer_const_literals_to_create_immutables
    - prefer_constructors_over_static_methods
    - prefer_expression_function_bodies
    - prefer_final_fields
    - prefer_final_in_for_each
    - prefer_final_locals
    - prefer_for_elements_to_map_fromIterable
    - prefer_foreach
    - prefer_if_elements_to_conditional_expressions
    - prefer_interpolation_to_compose_strings
    - prefer_mixin
    - prefer_null_aware_method_calls
    - prefer_single_quotes
    - require_trailing_commas
    - sized_box_shrink_expand
    - sort_constructors_first
    - sort_unnamed_constructors_first
    - tighten_type_of_initializing_formals
    - type_annotate_public_apis
    - unawaited_futures
    - unnecessary_await_in_return
    - unnecessary_breaks
    - unnecessary_lambdas
    - unnecessary_null_aware_operator_on_extension_on_nullable
    - unnecessary_null_checks
    - unnecessary_nullable_for_final_variable_declarations
    - unnecessary_parenthesis
    - unnecessary_raw_strings
    - unreachable_from_main
    - use_colored_box
    - use_decorated_box
    - use_enums
    - use_if_null_to_convert_nulls_to_bools
    - use_is_even_rather_than_modulo
    - use_named_constants
    - use_raw_strings
    - use_string_buffers
    - use_string_in_part_of_directives
    - use_super_parameters
    - use_test_throws_matchers
    - use_to_and_as_if_applicable

# Specific for your project:
    - always_put_control_body_on_new_line  # Consistency
    - avoid_print  # Use logging instead
    - prefer_relative_imports  # For consistency
    - public_member_api_docs  # Force documentation
```

**Action Items:**
- [ ] Copy recommended `analysis_options.yaml`
- [ ] Run `flutter analyze`
- [ ] Fix issues one lint rule at a time
- [ ] Commit after each rule is satisfied
- [ ] Make analyzer pass part of CI

---

#### 3.2 Missing Required Dependencies 🟡 **P2**

**Add to pubspec.yaml:**

```yaml
dependencies:
  # Dependency Injection (CRITICAL)
  get_it: ^8.0.0

  # Better logging (replace print statements)
  logger: ^2.4.0

  # Functional programming utilities
  dartz: ^0.10.1  # For Option<T>, Either<L, R>

  # Network status checking
  internet_connection_checker_plus: ^2.5.2

dev_dependencies:
  # Enhanced Freezed
  freezed: ^3.2.3  # Already have
  build_runner: 2.7.1  # Already have

  # Better testing
  mocktail: ^1.0.4  # Modern mocking (vs mockito)

  # Test coverage
  test_coverage: ^0.7.0

  # Lint rules
  flutter_lints: ^6.0.0  # Already have
  very_good_analysis: ^6.0.0  # Additional strict rules
```

---

## 4. Testing Strategy

### ❌ Critical Issues

#### 4.1 Tests Are Broken 🔴 **P0**

**Problem:**
```bash
$ flutter test
# ❌ Compilation errors
# Missing localization files
# Stale mocks
```

**Immediate Fix:**

```bash
# Step 1: Generate localization
flutter gen-l10n

# Step 2: Clean and regenerate
dart run build_runner clean
dart run build_runner build --delete-conflicting-outputs

# Step 3: Update mocks
# Find files using old mocks:
find test -name "*.dart" -exec grep -l "\.mocks\.dart" {} \;

# Step 4: Run tests
flutter test
```

**Action Items:**
- [ ] Run `flutter gen-l10n` and commit generated files
- [ ] Regenerate all mocks with build_runner
- [ ] Fix `UserProfile.photoUrl` → `avatarUrl` references
- [ ] Get at least 1 test passing
- [ ] Add `flutter gen-l10n` to CI before tests
- [ ] Make tests pass in CI

---

#### 4.2 Missing Test Coverage for New Code 🟡 **P2**

**Current State:**
```
test/
├── presentation/  # New Bloc/Cubit tests missing!
├── data/          # New repository tests missing!
└── domain/        # Minimal coverage
```

**Best Practice Test Structure:**

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

**Repository Tests:**

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
    test('returns Success with users when remote source succeeds', () async {
      // Arrange
      final mockUsers = [UserProfile(id: '1', email: 'test@test.com')];
      when(() => mockRemoteDataSource.getUsers())
          .thenAnswer((_) async => mockUsers);

      // Act
      final result = await repository.getUsers();

      // Assert
      expect(result, isA<Success<List<UserProfile>>>());
      expect(result.dataOrNull, equals(mockUsers));
    });

    test('returns Failure when remote source throws', () async {
      // Arrange
      when(() => mockRemoteDataSource.getUsers())
          .thenThrow(Exception('Network error'));

      // Act
      final result = await repository.getUsers();

      // Assert
      expect(result, isA<Failure<List<UserProfile>>>());
      expect(result.errorOrNull, contains('Network'));
    });

    test('validates user email before creating', () async {
      // Arrange
      final invalidUser = UserProfile(
        id: '1',
        email: 'invalid-email',  // Bad format
        displayName: 'Test',
      );

      // Act
      final result = await repository.createUser(invalidUser);

      // Assert
      expect(result, isA<Failure<UserProfile>>());
      expect(result.errorOrNull, contains('Invalid email'));
      verifyNever(() => mockRemoteDataSource.createUser(any()));
    });
  });
}
```

**Test Coverage Goals:**
- **Domain models:** 80%+ (simple, easy to test)
- **Repositories:** 90%+ (critical business logic)
- **Blocs/Cubits:** 90%+ (most important!)
- **Data sources:** 70%+ (mocked in repos)
- **UI widgets:** 60%+ (golden tests)

**Action Items:**
- [ ] Add tests for ALL new Blocs/Cubits
- [ ] Add tests for repository implementations
- [ ] Add use case tests when created
- [ ] Set up test coverage reporting
- [ ] Target: 80%+ overall coverage
- [ ] Make coverage check part of CI

---

## 5. Domain Layer

### ✅ What's Good

1. **UserProfile Model**
   - Uses Equatable correctly
   - Proper value object
   - Clean API

2. **Repository Contracts**
   - Clear interfaces
   - Return Result<T> types
   - Good method signatures

### ❌ Issues

#### 5.1 Manual Serialization Boilerplate 🟠 **P1**

**Replace with Freezed + json_serializable** (see Section 1.4)

#### 5.2 Missing Value Objects 🟡 **P2**

**Current:**
```dart
class UserProfile {
  final String email;  // Just a string, no validation!
}
```

**Best Practice:**

```dart
// lib/domain/value_objects/email.dart
@freezed
class Email with _$Email {
  const Email._();

  const factory Email(String value) = _Email;

  factory Email.create(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      throw ArgumentError('Email cannot be empty');
    }

    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(trimmed)) {
      throw ArgumentError('Invalid email format: $trimmed');
    }

    return Email(trimmed.toLowerCase());
  }

  @override
  String toString() => value;
}

// Usage:
final email = Email.create('user@example.com');  // Validated!
final profile = UserProfile(
  id: '1',
  email: email,
);
```

**Other Value Objects to Consider:**
- `UserId` - Type-safe IDs
- `Timezone` - Validated timezones
- `DisplayName` - Length validation
- `AvatarUrl` - URL validation

**Action Items:**
- [ ] Create `lib/domain/value_objects/` directory
- [ ] Implement Email value object
- [ ] Update UserProfile to use Email
- [ ] Consider other value objects
- [ ] Update tests

---

## 6. Data Layer

### ✅ What's Good

1. **Remote Data Sources**
   - Clean abstraction
   - Proper separation

2. **Error Handling in Repositories**
   - `_getErrorMessage()` helper is good
   - User-friendly messages

### ❌ Issues

#### 6.1 Missing Local Data Sources 🟡 **P2**

**Current:**
```dart
class UserRepositoryImpl {
  final UserRemoteDataSource remoteDataSource;
  // No local data source!
}
```

**Best Practice - Offline First:**

```dart
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource remoteDataSource;
  final UserLocalDataSource localDataSource;
  final NetworkInfo networkInfo;

  const UserRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.networkInfo,
  });

  @override
  Future<Result<List<UserProfile>>> getUsers() async {
    if (await networkInfo.isConnected) {
      try {
        // Fetch from remote
        final users = await remoteDataSource.getUsers();

        // Cache locally
        await localDataSource.cacheUsers(users);

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
      final cachedUsers = await localDataSource.getCachedUsers();
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

**Implementation:**

```dart
// lib/data/datasources/local/user_local_data_source.dart
abstract class UserLocalDataSource {
  Future<List<UserProfile>> getCachedUsers();
  Future<void> cacheUsers(List<UserProfile> users);
  Future<UserProfile?> getCachedUser(String id);
  Future<void> cacheUser(UserProfile user);
  Future<void> clearCache();
}

// Using Hive (fast local DB):
class UserLocalDataSourceImpl implements UserLocalDataSource {
  final Box<Map<String, dynamic>> userBox;

  @override
  Future<List<UserProfile>> getCachedUsers() async {
    return userBox.values
        .map((json) => UserProfile.fromJson(json))
        .toList();
  }

  @override
  Future<void> cacheUsers(List<UserProfile> users) async {
    final map = {for (var u in users) u.id: u.toJson()};
    await userBox.putAll(map);
  }
}
```

**Action Items:**
- [ ] Add `hive: ^2.2.3` and `hive_flutter: ^1.1.0`
- [ ] Create local data source interfaces
- [ ] Implement with Hive
- [ ] Update repositories to use cache
- [ ] Add cache invalidation strategy
- [ ] Test offline functionality

---

## 7. Presentation Layer (UI)

### ✅ What's Good

1. **Bloc Pattern Usage**
   - BlocBuilder, BlocListener used correctly
   - Proper separation

### ⚠️ Recommendations

#### 7.1 Add BlocConsumer Pattern 🟡 **P3**

**When you need both Builder and Listener:**

```dart
// Instead of nesting:
BlocListener<AuthCubit, AuthState>(
  listener: (context, state) {
    if (state.status == AuthStatus.error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.errorMessage ?? 'Error')),
      );
    }
  },
  child: BlocBuilder<AuthCubit, AuthState>(
    builder: (context, state) {
      // UI here
    },
  ),
)

// Use BlocConsumer:
BlocConsumer<AuthCubit, AuthState>(
  listener: (context, state) {
    if (state.status == AuthStatus.error) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.errorMessage ?? 'Error')),
      );
    }
  },
  builder: (context, state) {
    // UI here
  },
)
```

#### 7.2 Selector for Performance 🟡 **P3**

**Use BlocSelector for granular rebuilds:**

```dart
// Rebuilds on ANY state change:
BlocBuilder<UserBloc, UserState>(
  builder: (context, state) {
    return Text(state is UserLoaded ? '${state.users.length}' : '0');
  },
)

// Rebuilds ONLY when user count changes:
BlocSelector<UserBloc, UserState, int>(
  selector: (state) => state is UserLoaded ? state.users.length : 0,
  builder: (context, userCount) {
    return Text('$userCount');
  },
)
```

---

## 8. Build & CI/CD

### ❌ Critical Issues

#### 8.1 Missing Localization in CI 🔴 **P0**

**Problem:**
```yaml
# .github/workflows/flutter_ci.yml
# Missing: flutter gen-l10n step!
```

**Fix:**

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

      # ADD THIS STEP!
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

**Action Items:**
- [ ] Add `flutter gen-l10n` to CI before tests
- [ ] Add coverage upload to Codecov
- [ ] Make analyzer pass before tests run
- [ ] Add test coverage threshold (80%)

---

#### 8.2 Missing Environment Validation 🟡 **P2**

**Best Practice:**

```dart
// lib/core/env_validator.dart
class EnvValidator {
  static void validate() {
    final requiredVars = [
      'APP_ENV',
      'DEV_FIREBASE_PROJECT_ID',
      'SENTRY_DSN',
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

// In main.dart:
void main() async {
  await _initializeEnvironment();
  EnvValidator.validate();  // Fail fast if misconfigured!
  runApp(MyApp());
}
```

---

## 9. Firebase Integration

### ⚠️ Recommendations

#### 9.1 Firebase Initialization Pattern 🟡 **P2**

**Current:**
```dart
// Scattered Firebase checks
if (FirebaseAppServices.isConfigured) { ... }
```

**Best Practice:**

```dart
// lib/core/firebase/firebase_initializer.dart
class FirebaseInitializer {
  static Future<void> initialize() async {
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );

      if (kDebugMode) {
        await _initializeEmulators();
      }

      await _initializeFirebaseServices();

    } catch (e) {
      debugPrint('Firebase initialization failed: $e');
      rethrow;
    }
  }

  static Future<void> _initializeEmulators() async {
    final useEmulators = dotenv.env['FIREBASE_EMULATORS_ENABLED'] == 'true';
    if (!useEmulators) return;

    final host = dotenv.env['FIREBASE_EMULATOR_HOST'] ?? 'localhost';

    // Connect to emulators
    await FirebaseAuth.instance.useAuthEmulator(host, 9099);
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);

    debugPrint('✅ Firebase emulators connected');
  }

  static Future<void> _initializeFirebaseServices() async {
    // Initialize Crashlytics
    if (!kIsWeb) {
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);
    }

    // Initialize Analytics
    await FirebaseAnalytics.instance.setAnalyticsCollectionEnabled(true);

    debugPrint('✅ Firebase services initialized');
  }
}
```

**Action Items:**
- [ ] Create proper Firebase initialization module
- [ ] Add emulator support
- [ ] Add environment-based configuration
- [ ] Test with emulators before production

---

## 10. Security & Privacy

### ⚠️ Recommendations

#### 10.1 API Key Obfuscation 🟡 **P2**

**Problem:**
```
.env files tracked in git (even .env.example shows structure)
```

**Best Practice:**

```dart
// Use --dart-define for sensitive values in CI
flutter run --dart-define=FIREBASE_API_KEY=$FIREBASE_API_KEY

// In code:
const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
```

**For production builds:**

```yaml
# .github/workflows/deploy.yml
- name: Build APK
  run: |
    flutter build apk --release \
      --dart-define=FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }} \
      --dart-define=SENTRY_DSN=${{ secrets.SENTRY_DSN }}
```

**Action Items:**
- [ ] Move sensitive keys to --dart-define
- [ ] Add secrets to GitHub Actions
- [ ] Remove keys from .env files
- [ ] Use flutter_dotenv only for non-sensitive config

---

#### 10.2 Encrypt Sensitive Local Data 🟡 **P2**

**If storing user data locally:**

```dart
// Use flutter_secure_storage for tokens
final storage = FlutterSecureStorage();
await storage.write(key: 'auth_token', value: token);

// Use encrypted Hive boxes for sensitive data
final encryptionKey = await _getOrCreateEncryptionKey();
final encryptedBox = await Hive.openBox(
  'sensitive_data',
  encryptionCipher: HiveAesCipher(encryptionKey),
);
```

---

## Summary: Action Plan (Prioritized)

### Week 1 (Critical - P0)
1. ✅ Fix broken tests
   - [ ] Run `flutter gen-l10n`
   - [ ] Regenerate mocks
   - [ ] Get tests passing
   - [ ] Add gen-l10n to CI

2. ✅ Implement proper DI with get_it
   - [ ] Add get_it dependency
   - [ ] Create injection_container.dart
   - [ ] Register dependencies
   - [ ] Update Blocs/Cubits

### Week 2-3 (High Priority - P1)
3. ✅ Move repositories to correct layers
   - [ ] Rename implementations
   - [ ] Fix imports
   - [ ] Update DI

4. ✅ Add Freezed to domain models
   - [ ] Convert UserProfile
   - [ ] Convert all states
   - [ ] Convert all events
   - [ ] Regenerate

5. ✅ Continue Bloc migration
   - [ ] Identify remaining Riverpod providers
   - [ ] Convert 1 provider per week
   - [ ] Remove when done

### Week 4-5 (Medium Priority - P2)
6. ✅ Enhance lint rules
   - [ ] Copy recommended analysis_options.yaml
   - [ ] Fix issues incrementally
   - [ ] Add to CI

7. ✅ Add use case layer
   - [ ] Create for complex operations
   - [ ] Update Blocs

8. ✅ Add test coverage
   - [ ] Write Bloc tests
   - [ ] Write repository tests
   - [ ] Aim for 80%+

### Month 2 (Low Priority - P3)
9. ✅ Add local data sources
   - [ ] Implement with Hive
   - [ ] Add offline support
   - [ ] Test offline mode

10. ✅ Optimize dependencies
   - [ ] Remove unused
   - [ ] Update outdated
   - [ ] Add missing

---

## Conclusion

Your MyOrbit Calendar project has a **solid foundation** with clean architecture and modern patterns. The main challenges are:

1. **Completing the migration** (Riverpod → Bloc, Supabase → Firebase)
2. **Fixing broken tests** (blocking development)
3. **Adding proper DI** (critical for maintainability)
4. **Leveraging Freezed** (reduce boilerplate by 70%)

Follow this action plan and you'll have a **production-ready, best-practices Flutter application** by end of November 2025.

**Estimated Total Effort:** 6-8 weeks (1-2 engineers)

**ROI:**
- 50% reduction in boilerplate (Freezed)
- 90%+ test coverage (confidence in changes)
- Clean architecture (easier onboarding)
- Proper DI (testability)
- Working CI (prevent regressions)

**Questions or need clarification?** Refer back to this document or create issues for tracking.

---

**Document Version:** 1.0
**Last Updated:** October 31, 2025
**Next Review:** End of November 2025 (after migration complete)
