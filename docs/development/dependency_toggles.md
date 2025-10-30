# Dependency Toggle Reference

The app bootstrap sequence now reads explicit environment flags to decide which data and auth backends to activate. This makes it easy to switch between Firebase-backed services and the mock implementations used for local development.

## Environment flags

| Flag | Default | Description |
| --- | --- | --- |
| `USE_FIRESTORE_DATASOURCE` | `true` in production (`APP_ENV=prod`), `false` otherwise | When `true`, `UserDependencyInjection.useFirestore` is enabled after Firebase initialises, wiring the Firestore-backed user data source. Set to `false` to fall back to the in-memory mock implementation. |
| `USE_FIREBASE_AUTH` | `true` in production (`APP_ENV=prod`), `false` otherwise | When `true`, `AuthDependencyInjection.useFirebaseAuth` is enabled, wiring the Firebase Auth remote source. Set to `false` to run against the mock auth service. |

> The flags are only applied after `FirebaseInitializer.initialize()` succeeds. If Firebase cannot start (for example on unsupported platforms), the app will continue using the mock implementations regardless of the flag values.

## Usage examples

Run with Firebase services enabled locally:

```bash
flutter run \
  --dart-define USE_FIRESTORE_DATASOURCE=true \
  --dart-define USE_FIREBASE_AUTH=true
```

Disable Firebase-backed services entirely (for example when working offline):

```bash
flutter run \
  --dart-define USE_FIRESTORE_DATASOURCE=false \
  --dart-define USE_FIREBASE_AUTH=false
```

Both flags may also be populated via `.env` files. The bootstrap logs (prefixed with 🧩 / 🔐) confirm which implementation is active at runtime.
