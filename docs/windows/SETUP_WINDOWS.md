# Windows Development Setup

Follow these steps to keep the project healthy on Windows while the iOS work continues on macOS.

## 1. Required tools
- Install Flutter 3.35 or newer and add it to `PATH`.
- Install Android Studio for the Android SDK and device emulators.
- Use Visual Studio 2019/2022 with the Desktop development with C++ workload for Windows builds.
- Install the Supabase CLI (`winget install Supabase.CLI` or `npm install -g supabase`).

## 2. Enable Developer Mode
Flutter plugins rely on symbolic links. Enable Developer Mode:
- Run `start ms-settings:developers` from PowerShell.
- Toggle **Developer Mode** on.
- Restart PowerShell to pick up permissions.

## 3. Validate the toolchain
```powershell
flutter doctor
```
Resolve any ❌ items before proceeding (Android SDK and Visual Studio workloads are the common gaps).

## 4. Fetch dependencies
```powershell
flutter pub get
```
If you still see the symbolic link warning, confirm Developer Mode is enabled or run the terminal as Administrator.

## 5. Run analysis and tests
```powershell
flutter analyze
flutter test
```
The recent backend work added many tests—running them once locally ensures Windows path handling continues to work.

## 6. Supabase migrations (when needed)
Use the new helper for Windows:
```powershell
.\supabase\schema\apply_migrations.ps1
```
Supply credentials via `.env` (see `QUICK_START_BACKEND.md` for keys).

## 7. Troubleshooting
- Terminal cannot create symlinks: reopen after enabling Developer Mode or run as Administrator.
- Missing Google OAuth config: update `.env` plus `ios/Runner/GoogleOAuth.xcconfig` for iOS builds.
- Need to re-run all migrations: `supabase db reset` followed by the PowerShell script above.

## 8. Before pushing changes (cross-platform checklist)
- Run `dart run build_runner build --delete-conflicting-outputs` so generated files (.g.dart/.freezed.dart) stay in sync across platforms.
- Run `flutter analyze` and `flutter test` locally; fix failures before committing.
- Remove machine-specific file paths from docs/scripts—prefer placeholders like `<project-root>` or environment variables.
- Keep temporary artifacts (e.g., `test_output.txt`, `.flutter-plugins-deps`) out of commits.
