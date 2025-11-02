# Reference Files from MyOrbit_CleanArch

**⚠️ DO NOT MODIFY THESE FILES**

---

## Purpose

These files are copied from the **MyOrbit_CleanArch** project, which is the **source of truth** for all architecture patterns, naming conventions, and implementation details.

## Source

**Location:** `../MyOrbit_CleanArch` (sibling directory to this project)

**Copied:** October 31, 2025

## Contents

This directory contains example implementations from MyOrbit_CleanArch:

- `features/` - Example feature structure (auth, home, onboarding, splash)
- `core/` - Example core setup (DI, config, theme, services)
- `main.dart` - Example app initialization
- `app.dart` - Example app structure

## Usage

**These files are for REFERENCE ONLY:**

1. **Study the patterns** - See how features are structured
2. **Copy the approach** - Use the same patterns in calendar_app
3. **Don't modify** - These are read-only reference materials

## Key Patterns to Study

### 1. Feature Structure

```
features/{feature}/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
├── domain/
│   └── repositories/
└── presentation/
    ├── cubit/
    ├── pages/
    └── widgets/
```

### 2. Dependency Injection (GetIt)

See: `core/di/di.dart` and `core/di/core_injection.dart`

- Uses GetIt service locator
- Registers singletons, lazy singletons, and factories
- Initialized in main.dart before runApp()

### 3. Error Handling (Either)

See: `core/config/custom_exception.dart` and `core/utils/exception_mixins.dart`

- Uses Either<Failure, Success> pattern
- Custom exception classes
- EitherMixin for repositories

### 4. State Management (Cubit)

See: `features/auth/presentation/cubit/`

- Simple state classes with copyWith
- AppStateStatus enum for loading/success/failure
- Uses .fold() for Either pattern

### 5. Routing (GoRouter)

See: `core/config/app_router.dart`

- Declarative routing
- Route constants
- Simple navigation

## Documentation

For detailed pattern documentation, see:

**`../MYORBIT_CLEANARCH_PATTERNS.md`**

This file contains all patterns extracted from MyOrbit_CleanArch with examples and explanations.

---

## Important Notes

1. **Source of Truth:** MyOrbit_CleanArch is the canonical reference
2. **Read-Only:** Do not modify files in this directory
3. **Patterns:** Follow these patterns exactly in calendar_app
4. **Updates:** If MyOrbit_CleanArch changes, re-copy these files

---

**When in doubt, refer to MyOrbit_CleanArch project.**
