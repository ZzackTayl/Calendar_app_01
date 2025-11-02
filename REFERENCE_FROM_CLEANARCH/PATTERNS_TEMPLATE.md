# MyOrbit_CleanArch Patterns Reference

Please fill this out by looking at your MyOrbit_CleanArch project.

---

## Folder Structure

```
lib/
├── core/
│   ├── di/              # Dependency injection - HOW IS IT ORGANIZED?
│   ├── error/           # Error handling
│   ├── network/         # Network layer
│   └── ...
├── features/            # OR is it domain/data/presentation at top level?
│   ├── auth/
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── bloc/
│   │       ├── pages/
│   │       └── widgets/
│   └── ...
└── ...
```

**Question:** Is it features-first or layers-first? (features/auth/data vs data/auth)

---

## Example BLoC Implementation

**File:** `lib/features/auth/presentation/bloc/auth_bloc.dart` (or wherever it is)

```dart
// PASTE A COMPLETE BLOC EXAMPLE HERE
// Include:
// - imports
// - event classes
// - state classes  
// - bloc class with event handlers
```

---

## Example Cubit Implementation

**File:** `lib/features/???/presentation/cubit/???_cubit.dart`

```dart
// PASTE A COMPLETE CUBIT EXAMPLE HERE
```

---

## Example Repository (Domain Contract)

**File:** `lib/features/auth/domain/repositories/auth_repository.dart` (or wherever)

```dart
// PASTE THE ABSTRACT REPOSITORY CLASS
```

---

## Example Repository Implementation

**File:** `lib/features/auth/data/repositories/auth_repository_impl.dart`

```dart
// PASTE THE CONCRETE IMPLEMENTATION
```

---

## Example Data Source (Remote)

**File:** `lib/features/auth/data/datasources/auth_remote_data_source.dart`

```dart
// PASTE BOTH THE ABSTRACT CLASS AND IMPLEMENTATION
```

---

## Example Use Case

**File:** `lib/features/auth/domain/usecases/sign_in_usecase.dart`

```dart
// PASTE A USE CASE EXAMPLE
// (if you use use cases - some clean arch doesn't)
```

---

## Dependency Injection Pattern

**File:** `lib/core/di/injection_container.dart` (or similar)

```dart
// PASTE HOW DI IS SET UP
// - Using get_it?
// - Manual factories?
// - Provider pattern?
```

---

## Error Handling Pattern

**File:** `lib/core/error/failures.dart` or similar

```dart
// PASTE YOUR FAILURE/ERROR CLASSES
// - Do you use Either<Failure, Success>?
// - Do you use Result<T>?
// - Custom error types?
```

---

## Entity vs Model Pattern

**Entity File:** `lib/features/auth/domain/entities/user.dart`

```dart
// PASTE ENTITY EXAMPLE
```

**Model File:** `lib/features/auth/data/models/user_model.dart`

```dart
// PASTE MODEL EXAMPLE
// How does it extend/implement the entity?
```

---

## Main App Setup

**File:** `lib/main.dart`

```dart
// PASTE THE MAIN FUNCTION AND APP SETUP
// Especially:
// - How BLoCs are provided
// - How DI is initialized
// - App structure
```

---

## Navigation Pattern

**File:** Wherever routing is defined

```dart
// PASTE ROUTING SETUP
// - Using go_router?
// - How are routes defined?
// - How do you pass BLoCs through navigation?
```

---

## Key Naming Conventions

- BLoC files: `???_bloc.dart`, `???_event.dart`, `???_state.dart`
- Cubit files: `???_cubit.dart`, `???_state.dart` (or inline state?)
- Repository contracts: `???_repository.dart` in domain
- Repository implementations: `???_repository_impl.dart` in data
- Data sources: `???_remote_data_source.dart`, `???_local_data_source.dart`
- Use cases: `???_usecase.dart` or `???_use_case.dart`?

---

## BLoC vs Cubit Decision Criteria

When do you use BLoC vs Cubit?

- BLoC for: ???
- Cubit for: ???

---

## Testing Patterns

**Example Test File:** `test/features/auth/presentation/bloc/auth_bloc_test.dart`

```dart
// PASTE A BLOC TEST EXAMPLE
// Shows mocking, test structure, etc.
```

---

## Any Other Important Patterns?

(Add anything else that's critical to your architecture)
