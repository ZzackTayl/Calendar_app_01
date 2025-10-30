# 🚀 Quick Start: Firebase Backend Integration

**Goal:** connect the MyOrbit calendar app to Firebase (Auth + Firestore) using the new clean architecture layers.

The steps below stand up a development project in ~10 minutes. Mirror them for staging and production once the flows stabilise.

---

## ✅ Prerequisites
- Flutter SDK and FVM installed (see root `README.md`).
- `flutterfire` CLI (`dart pub global activate flutterfire_cli`).
- Firebase account with permission to create projects.
- Node.js 18+ (required for Firebase CLI if you plan to deploy Cloud Functions soon).

---

## Step 1: Create Firebase projects (5 minutes)
1. In the Firebase console create projects for each environment (e.g. `myorbit-dev`, `myorbit-staging`, `myorbit-prod`).
2. During project creation enable Google Analytics if you plan to capture analytics; otherwise you can toggle it later.
3. Record the project IDs—you will reference them when running the FlutterFire CLI.

---

## Step 2: Enable core services (2 minutes)
Enable these products for every project:

- **Authentication:** enable Email/Password. Add Google/Apple providers later if required.
- **Cloud Firestore:** create a database in **production mode**. We will author security rules in the migration checklist.
- **Cloud Functions (optional for now):** required for email/SMS invites and analytics fan-out once the Firebase rewrite is complete. Keep noted.
- **Cloud Messaging & Crashlytics:** optional but recommended before beta testing.

---

## Step 3: Register app targets (3 minutes)
For each platform you actively support:

| Platform | Action |
| --- | --- |
| Android | Add an Android app. Package name: `com.myorbit.app`. Download `google-services.json` but **do not** track it in git. |
| iOS | Add an iOS app. Bundle identifier: `com.myorbit.app`. Download `GoogleService-Info.plist`. |
| macOS | In the same iOS project, enable the macOS build target if required. |
| Web | Register a web app for the Flutter web target. |

Keep the downloaded configs handy; FlutterFire CLI will ingest them.

---

## Step 4: Generate `firebase_options.dart` (2 minutes)
From the repository root:

```bash
fvm flutterfire configure \
  --project=myorbit-dev \
  --out=lib/core/firebase_options_dev.dart \
  --platforms=android,ios,macos,web
```

Repeat for staging/production (adjust `--project` and output filename). The new clean architecture expects to switch based on a build-time flag; see `lib/core/di/injection_container.dart` for the temporary wiring.

Add the generated files to source control—they contain safe identifiers, not secrets.

---

## Step 5: Wire environment selection (2 minutes)
Update your launch scripts or IDE configurations to pass a `--dart-define` indicating the Firebase environment, for example:

```bash
fvm flutter run --dart-define=APP_ENV=dev
```

In `lib/core/env.dart` map the `APP_ENV` flag to the corresponding Firebase options file. Until this logic lands, the app falls back to mock data (`DevDataService`).

---

## Step 6: Configure analytics toggles (2 minutes)
Analytics is now gated behind environment flags so you can enable it only where it makes sense. Add the following keys to your `.env` (or pass them as `--dart-define` values) for each environment:

| Flag | Description | Recommended values |
| --- | --- | --- |
| `ENABLE_ANALYTICS` | Hard override to enable/disable analytics in any build. When set, it wins over the other flags. | `true` in production, `true`/`false` in staging, leave unset in development unless you want to mirror prod. |
| `ENABLE_ANALYTICS_IN_DEV` | Enables analytics when `APP_ENV=dev` and `ENABLE_ANALYTICS` is unset. Useful for QA sessions against a dev backend. | `false` by default, toggle to `true` for opt-in tracking on dev builds. |
| `ENABLE_ANALYTICS_IN_DEBUG` | Allows analytics for debug/profile builds. Release builds ignore this flag. | `false` normally; set to `true` if you need to validate analytics from a debug device. |

When all flags resolve to `false`, `AnalyticsService` becomes a no-op while still wiring navigator observers safely.

## Step 7: Verify the integration (3 minutes)
1. Run `fvm flutter pub get`.
2. Start the app (`fvm flutter run`) and check the logs—the `UserBloc` should still serve mock data but you should see Firebase initialisation succeed.
3. Once Firestore repositories are implemented, repeat the run and confirm read/write access works under your security rules.

---

## ⚙️ Next: Implement the Firebase data layer
- Replace `UserRemoteDataSourceImpl` with a Firestore-backed implementation.
- Introduce Firebase Auth repository methods that return `Result<UserProfile>`.
- Add Cloud Functions (or callable functions) for invitations, notifications, and data export—the legacy Supabase functions in `/supabase/functions` are a good reference point.

All follow-up tasks are tracked in [`docs/MIGRATION_TO_FIREBASE_AND_BLOC.md`](../MIGRATION_TO_FIREBASE_AND_BLOC.md).

---

## 🪦 Legacy Supabase note
Supabase migration scripts remain in `/supabase` for historical context. Do **not** run them as part of the Firebase setup—they are preserved only to help compare data models while we complete the rewrite.

---

## ❗ Troubleshooting
| Issue | Fix |
| --- | --- |
| `firebase_options.dart` not found | Ensure `flutterfire configure` ran and the generated file is added to the correct path. |
| App still using mock data | Check the `APP_ENV` flag and ensure the dependency injection layer reads the Firebase repository instead of the mock implementation. |
| Permission denied errors | Confirm Firestore rules allow the user’s UID to access the target documents. Start with permissive rules in dev, then tighten. |
| Android/iOS build failures | Regenerate platform configs using the Firebase console or rerun `flutterfire configure` if bundle IDs changed. |

Happy building! 🚀
