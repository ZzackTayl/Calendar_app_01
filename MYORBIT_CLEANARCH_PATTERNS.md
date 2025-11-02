# MyOrbit_CleanArch Patterns Reference
**Extracted from:** `../MyOrbit_CleanArch`  
**Date:** October 31, 2025  
**Purpose:** Canonical patterns for calendar_app migration

---

## Architecture Overview

**Organization:** Features-first (not layers-first)

```
lib/
├── app.dart                          # Root app widget
├── main.dart                         # Entry point
├── core/                             # Shared utilities
│   ├── config/                       # App configuration
│   │   ├── app_router.dart          # GoRouter setup
│   │   ├── app_routes.dart          # Route constants
│   │   └── custom_exception.dart    # Exception classes
│   ├── cubit/                        # Global cubits (theme, etc)
│   ├── di/                           # Dependency injection
│   │   ├── di.dart                  # Main DI file
│   │   └── core_injection.dart      # GetIt setup (part of di.dart)
│   ├── enums/                        # App-wide enums
│   ├── extension/                    # Dart extensions
│   ├── services/                     # Core services
│   ├── shared_widget/                # Reusable widgets
│   ├── theme/                        # Theme configuration
│   └── utils/                        # Utility functions
└── features/                         # Feature modules
    └── {feature}/                    # e.g., auth, home, onboarding
        ├── data/
        │   ├── datasources/          # Remote/local data sources
        │   ├── models/               # Data models (optional)
        │   └── repositories/         # Repository implementations
        ├── domain/
        │   └── repositories/         # Repository contracts
        └── presentation/
            ├── cubit/                # State management
            ├── pages/                # Full screens
            └── widgets/              # Feature-specific widgets
```

---

## Key Patterns

### 1. Dependency Injection (GetIt)

**Package:** `get_it: ^7.6.0` (or similar)

**Setup Pattern:**

```dart
// lib/core/di/di.dart
import 'package:get_it/get_it.dart';
part 'core_injection.dart';

// lib/core/di/core_injection.dart
part of 'di.dart';

final sl = GetIt.instance;

Future<void> initializeDependencies() async {
  // 1. Core Services (singletons)
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerSingleton<SharedPreferences>(sharedPreferences);
  
  sl.registerLazySingleton<AnalyticsService>(() => AnalyticsServiceImpl());
  
  // 2. Data Sources (lazy singletons)
  sl.registerLazySingleton<HomeRemoteDataSource>(
    () => HomeFirebaseDataSource(),
  );
  
  // 3. Repositories (lazy singletons)
  sl.registerLazySingleton<HomeRepo>(
    () => HomeRepositoryImpl(remoteDataSource: sl<HomeRemoteDataSource>()),
  );
  
  sl.registerLazySingleton<AuthRepo>(() => AuthRepoImpl());
  
  // 4. Cubits/BLoCs (factories - new instance each time)
  sl.registerFactory<AuthCubit>(() => AuthCubit(sl<AuthRepo>()));
  
  // 5. Cubits with parameters (factory with params)
  sl.registerFactoryParam<HomeCubit, String, void>(
    (userId, _) => HomeCubit(repository: sl<HomeRepo>(), userId: userId),
  );
}
```

**Usage in main.dart:**

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDependencies();  // Initialize DI first
  runApp(const MyOrbitApp());
}
```

**Usage in app.dart:**

```dart
class MyOrbitApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => sl<AuthCubit>()),
        BlocProvider(create: (_) => sl<SplashCubit>()),
        BlocProvider(create: (_) => sl<OnboardingCubit>()),
        BlocProvider<ThemeCubit>(create: (_) => ThemeCubit()),
      ],
      child: MaterialApp.router(
        routerConfig: AppRouter().router,
        theme: AppThemes.light(),
        darkTheme: AppThemes.dark(),
      ),
    );
  }
}
```

---

### 2. Error Handling (Either Pattern)

**Package:** `dartz: ^0.10.1` (or `fpdart`)

**Pattern:**

```dart
// Returns Either<Failure, Success>
// Left = Error, Right = Success

// In repository contract (domain):
abstract class AuthRepo {
  Future<Either<CustomException, bool>> login(String email, String password);
  Future<Either<CustomException, bool>> signup(String name, String email, String password);
}

// In repository implementation (data):
class AuthRepoImpl with ExceptionMixin implements AuthRepo {
  @override
  Future<Either<CustomException, bool>> login(String email, String password) async {
    return await handleFuture(() async {
      // Actual implementation
      await Future.delayed(const Duration(seconds: 1));
      return true;
    });
  }
}

// ExceptionMixin helper:
mixin ExceptionMixin {
  Future<Either<CustomException, T>> handleFuture<T>(
    Future<T> Function() future,
  ) async {
    try {
      final result = await future();
      return Right(result);  // Success
    } catch (e) {
      return Left(CustomException(message: e.toString()));  // Failure
    }
  }
}

// In Cubit:
Future<void> login(String email, String password) async {
  emit(state.copyWith(status: AppStateStatus.loading));
  
  final result = await repository.login(email, password);
  result.fold(
    (error) => emit(state.copyWith(
      status: AppStateStatus.failure,
      message: error.message,
    )),
    (_) => emit(state.copyWith(
      status: AppStateStatus.success,
      message: 'Login successful',
      isAuthenticated: true,
    )),
  );
}
```

**Alternative Pattern (Simpler):**

```dart
// HomeRepo uses Either<String, T> instead of Either<CustomException, T>
abstract class HomeRepo {
  Future<Either<String, HomeDataModel>> getHomeData(String userId);
}

class HomeRepositoryImpl implements HomeRepo {
  @override
  Future<Either<String, HomeDataModel>> getHomeData(String userId) async {
    try {
      final result = await remoteDataSource.getHomeData(userId);
      return Right(result);
    } on Exception catch (e) {
      return Left(e.toString());
    } catch (e) {
      return Left('Unexpected error: $e');
    }
  }
}
```

---

### 3. State Management (Cubit Pattern)

**Package:** `flutter_bloc: ^8.1.3`

**File Structure:**

```
features/auth/presentation/cubit/
├── cubit.dart           # Barrel file (exports all)
├── auth_cubit.dart      # Cubit logic (part of cubit.dart)
└── auth_state.dart      # State class (part of cubit.dart)
```

**cubit.dart (Barrel File):**

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:myorbit_calender/core/enums/enums.dart';
import 'package:myorbit_calender/features/auth/domain/repositories/repositories.dart';

part 'auth_cubit.dart';
part 'auth_state.dart';
```

**auth_state.dart:**

```dart
part of 'cubit.dart';

class AuthState {
  final AppStateStatus status;
  final String message;
  final bool isAuthenticated;
  final bool needsEmailVerification;
  final bool isSignUpMode;

  const AuthState({
    this.status = AppStateStatus.initial,
    this.message = '',
    this.isAuthenticated = false,
    this.needsEmailVerification = false,
    this.isSignUpMode = false,
  });

  AuthState copyWith({
    AppStateStatus? status,
    String? message,
    bool? isAuthenticated,
    bool? needsEmailVerification,
    bool? isSignUpMode,
  }) {
    return AuthState(
      status: status ?? this.status,
      message: message ?? this.message,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      needsEmailVerification: needsEmailVerification ?? this.needsEmailVerification,
      isSignUpMode: isSignUpMode ?? this.isSignUpMode,
    );
  }
}
```

**auth_cubit.dart:**

```dart
part of 'cubit.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepo repository;

  AuthCubit(this.repository) : super(const AuthState());

  // Simple state updates
  void toggleMode() {
    emit(state.copyWith(isSignUpMode: !state.isSignUpMode));
  }

  // Async operations with Either pattern
  Future<void> login(String email, String password) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.login(email, password);
    result.fold(
      (error) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: error.message,
      )),
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'Login successful',
        isAuthenticated: true,
      )),
    );
  }

  void logout() {
    emit(const AuthState());  // Reset to initial state
  }
}
```

---

### 4. AppStateStatus Enum

**Location:** `lib/core/enums/enums.dart`

```dart
enum AppStateStatus {
  initial,   // Default state
  loading,   // Operation in progress
  success,   // Operation succeeded
  failure,   // Operation failed
}

extension AppStateStatusX on AppStateStatus {
  bool get isInitial => this == AppStateStatus.initial;
  bool get isLoading => this == AppStateStatus.loading;
  bool get isSuccess => this == AppStateStatus.success;
  bool get isFailure => this == AppStateStatus.failure;
}
```

**Usage in UI:**

```dart
BlocBuilder<AuthCubit, AuthState>(
  builder: (context, state) {
    if (state.status.isLoading) {
      return CircularProgressIndicator();
    }
    
    if (state.status.isFailure) {
      return Text('Error: ${state.message}');
    }
    
    return YourWidget();
  },
)
```

---

### 5. Repository Pattern

**Domain Layer (Contract):**

```dart
// lib/features/auth/domain/repositories/repositories.dart
export 'auth_repo.dart';

// lib/features/auth/domain/repositories/auth_repo.dart
part of 'repositories.dart';

abstract class AuthRepo {
  Future<Either<CustomException, bool>> login(String email, String password);
  Future<Either<CustomException, bool>> signup(String name, String email, String password);
  Future<Either<CustomException, bool>> signInWithGoogle();
}
```

**Data Layer (Implementation):**

```dart
// lib/features/auth/data/repositories/repositories.dart
export 'auth_repo_impl.dart';

// lib/features/auth/data/repositories/auth_repo_impl.dart
part of 'repositories.dart';

class AuthRepoImpl with ExceptionMixin implements AuthRepo {
  @override
  Future<Either<CustomException, bool>> login(String email, String password) async {
    return await handleFuture(() async {
      // Call Firebase Auth, Firestore, etc.
      await Future.delayed(const Duration(seconds: 1));
      return true;
    });
  }
  
  @override
  Future<Either<CustomException, bool>> signup(String name, String email, String password) async {
    return await handleFuture(() async {
      // Implementation
      return true;
    });
  }
  
  @override
  Future<Either<CustomException, bool>> signInWithGoogle() async {
    return await handleFuture(() async {
      // Implementation
      return true;
    });
  }
}
```

---

### 6. Data Source Pattern

**When to Use:**
- Use data sources when you need to separate remote (API/Firebase) from local (cache/database) data access
- HomeRepo uses data sources, AuthRepo doesn't (simpler, direct implementation)

**Pattern:**

```dart
// lib/features/home/data/datasources/datasource.dart
export 'home_datasource.dart';
export 'home_remote_datasource.dart';

// lib/features/home/data/datasources/home_remote_datasource.dart
part of 'datasource.dart';

abstract class HomeRemoteDataSource {
  Future<HomeDataModel> getHomeData(String userId);
  Future<List<CalendarEventModel>> getUpcomingEvents(String userId);
}

// lib/features/home/data/datasources/home_datasource.dart
part of 'datasource.dart';

class HomeFirebaseDataSource implements HomeRemoteDataSource {
  @override
  Future<HomeDataModel> getHomeData(String userId) async {
    // Firebase/Firestore implementation
    throw UnimplementedError();
  }
  
  @override
  Future<List<CalendarEventModel>> getUpcomingEvents(String userId) async {
    // Firebase/Firestore implementation
    throw UnimplementedError();
  }
}
```

**Repository uses data source:**

```dart
class HomeRepositoryImpl implements HomeRepo {
  final HomeRemoteDataSource remoteDataSource;

  HomeRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<String, HomeDataModel>> getHomeData(String userId) async {
    try {
      final result = await remoteDataSource.getHomeData(userId);
      return Right(result);
    } catch (e) {
      return Left('Failed to load home data: $e');
    }
  }
}
```

---

### 7. Routing (GoRouter)

**Location:** `lib/core/config/app_router.dart`

```dart
part of 'config.dart';

class AppRouter {
  late final GoRouter _router;

  AppRouter() {
    _router = GoRouter(
      initialLocation: AppRoutes.splash,
      debugLogDiagnostics: kDebugMode,
      routes: _routes,
    );
  }

  GoRouter get router => _router;

  List<RouteBase> get _routes => <RouteBase>[
    GoRoute(
      name: AppRoutes.splash,
      path: AppRoutes.splash,
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      name: AppRoutes.login,
      path: AppRoutes.login,
      builder: (context, state) => const AuthPage(),
    ),
    GoRoute(
      name: AppRoutes.home,
      path: AppRoutes.home,
      builder: (context, state) => const HomePage(),
    ),
  ];
}
```

**Route Constants:**

```dart
// lib/core/config/app_routes.dart
part of 'config.dart';

class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String home = '/home';
}
```

---

### 8. Custom Exceptions

**Location:** `lib/core/config/custom_exception.dart`

```dart
class CustomException implements Exception {
  final String message;
  final String? code;
  final dynamic originalException;

  const CustomException({
    required this.message,
    this.code,
    this.originalException,
  });

  @override
  String toString() {
    if (code != null) {
      return 'CustomException [$code]: $message';
    }
    return 'CustomException: $message';
  }
}

// Specific exceptions
class NetworkException extends CustomException {
  const NetworkException({
    super.message = 'Network connection failed.',
    super.code,
    super.originalException,
  });
}

class AuthException extends CustomException {
  const AuthException({
    super.message = 'Authentication failed.',
    super.code,
    super.originalException,
  });
}

class InvalidCredentialsException extends AuthException {
  const InvalidCredentialsException({
    super.message = 'Invalid email or password.',
    super.code,
    super.originalException,
  });
}
```

---

### 9. Cubit with Parameters (Advanced DI)

**For cubits that need user-specific data:**

```dart
// In DI setup:
sl.registerFactoryParam<HomeCubit, String, void>(
  (userId, _) => HomeCubit(repository: sl<HomeRepo>(), userId: userId),
);

// In UI:
BlocProvider(
  create: (context) => sl<HomeCubit>(param1: currentUserId),
  child: HomePage(),
)
```

---

### 10. State Patterns

**Simple Cubit States (like Auth):**
- Single state class with status enum
- Use `copyWith` for immutability
- Status: initial, loading, success, failure

**Complex Cubit States (like Home):**
- Multiple state classes extending base
- Sealed class pattern (or manual subclasses)

```dart
// Base state
abstract class HomeState {}

class HomeInitial extends HomeState {}

class HomeLoading extends HomeState {}

class HomeLoaded extends HomeState {
  final HomeDataModel data;
  HomeLoaded({required this.data});
}

class HomeRefreshing extends HomeState {
  final HomeDataModel previousData;
  HomeRefreshing({required this.previousData});
}

class HomeError extends HomeState {
  final String message;
  HomeError({required this.message});
}
```

---

## Naming Conventions

### Files
- **Cubits:** `{feature}_cubit.dart`, `{feature}_state.dart`
- **Repositories (domain):** `{feature}_repo.dart`
- **Repositories (data):** `{feature}_repo_impl.dart`
- **Data sources:** `{feature}_remote_datasource.dart`, `{feature}_local_datasource.dart`
- **Barrel files:** `cubit.dart`, `repositories.dart`, `datasource.dart`, `pages.dart`, `widgets.dart`

### Classes
- **Cubits:** `{Feature}Cubit` (e.g., `AuthCubit`, `HomeCubit`)
- **States:** `{Feature}State` (e.g., `AuthState`, `HomeState`)
- **Repositories (contract):** `{Feature}Repo` (e.g., `AuthRepo`, `HomeRepo`)
- **Repositories (impl):** `{Feature}RepositoryImpl` or `{Feature}RepoImpl`
- **Data sources:** `{Feature}RemoteDataSource`, `{Feature}FirebaseDataSource`

### Imports
- Use barrel files: `import 'cubit/cubit.dart'` instead of individual files
- Use `part of` for files that belong together

---

## BLoC vs Cubit Decision

**Use Cubit when:**
- Simple state management
- Direct method calls (no events needed)
- Most features in MyOrbit_CleanArch use Cubit

**Use BLoC when:**
- Complex event handling
- Need event transformation (debounce, throttle)
- Multiple events can trigger same state change
- Need event replay/undo functionality

**MyOrbit_CleanArch uses:** Primarily Cubits (Auth, Home, Splash, Onboarding all use Cubit)

---

## Key Differences from calendar_app

| Aspect | calendar_app (Current) | MyOrbit_CleanArch (Target) |
|--------|------------------------|----------------------------|
| **DI** | Manual factories in `injection_container.dart` | GetIt service locator |
| **Error Handling** | `Result<T>` type | `Either<Failure, Success>` (dartz) |
| **State Management** | Mix of Riverpod + BLoC | Pure BLoC/Cubit |
| **Organization** | Mixed (some features-first, some layers-first) | Strict features-first |
| **Barrel Files** | Minimal | Extensive use of barrel files |
| **Repository Naming** | `{Feature}Repository` | `{Feature}Repo` |
| **State Classes** | Various patterns | Consistent: simple state with status enum |

---

## Migration Checklist per Feature

- [ ] Create feature folder structure (data/domain/presentation)
- [ ] Define repository contract in domain/repositories
- [ ] Implement repository in data/repositories
- [ ] Create data sources if needed (data/datasources)
- [ ] Create Cubit in presentation/cubit
- [ ] Create State class with AppStateStatus enum
- [ ] Register in DI (core/di/core_injection.dart)
- [ ] Provide in app.dart if global, or in page if local
- [ ] Create pages in presentation/pages
- [ ] Create widgets in presentation/widgets
- [ ] Add routes to app_router.dart
- [ ] Remove old Riverpod provider
- [ ] Update tests

---

## Required Packages

```yaml
dependencies:
  flutter_bloc: ^8.1.3
  get_it: ^7.6.0
  dartz: ^0.10.1  # or fpdart
  go_router: ^13.0.0
  equatable: ^2.0.5  # for state equality
  
dev_dependencies:
  bloc_test: ^9.1.5
  mocktail: ^1.0.0
```

---

## Next Steps for Migration

1. **Install packages:** Add get_it, dartz to pubspec.yaml
2. **Setup DI:** Create core/di structure with GetIt
3. **Migrate Auth first:** It's the simplest and already mostly done
4. **Use Auth as template:** Copy pattern for other features
5. **Remove Riverpod:** Once all features migrated, remove riverpod packages
6. **Update tests:** Use bloc_test instead of riverpod testing

---

**This document is the source of truth for all migration work.**
