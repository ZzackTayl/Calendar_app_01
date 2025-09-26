# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands

- Install dependencies
  ```bash
  flutter pub get
  ```

- Run the app
  ```bash
  flutter run            # select a device; use -d chrome for web
  flutter run -d chrome  # run on web (as used during development)
  ```

- Build (from README)
  ```bash
  # Android
  flutter build apk --release

  # iOS
  flutter build ios --release

  # Web
  flutter build web
  ```

- Lint and format
  ```bash
  flutter analyze                  # uses analysis_options.yaml (flutter_lints)
  dart format .                    # format all Dart files
  dart format --set-exit-if-changed .  # CI-friendly format check
  ```

- Tests
  ```bash
  flutter test                                   # run all tests
  flutter test test/widget_test.dart             # run a single test file
  flutter test -r compact -n "pattern"           # run tests with names matching pattern
  ```

## Architecture overview

- Entry and routing
  - lib/main.dart initializes SharedPreferences and reads hasOnboarded to choose the initial screen.
  - Providers are set up with MultiProvider: EventProvider and UserProfileProvider.
  - MaterialApp routes: /landing, /onboarding, /dashboard, /calendar.

- State management
  - Provider + ChangeNotifier via two providers in lib/providers.
    - EventProvider: in-memory list of CalendarEvent with persistence to SharedPreferences under key "calendar_events" (JSON-encoded). Exposes selected/focused dates and CRUD for events.
    - UserProfileProvider: onboarding-related app state (googleConnected flag, PartnerProfile list) with derived counts and update helpers.

- Persistence
  - SharedPreferences is used for:
    - hasOnboarded (bool) to skip onboarding on subsequent launches.
    - calendar_events (List<String>) storing JSON for CalendarEvent models.

- Screens and flow
  - LandingScreen: marketing/hero page with CTA to onboarding.
  - OnboardingScreen: 6-step flow (connect Google [mock], syncing, invite decision, select partners, summary, all set). On completion sets hasOnboarded and seeds UserProfileProvider; navigates to Dashboard.
  - DashboardScreen: reads providers to show summary stats (upcoming events, partners, invites) and a highlight card; navigates to Calendar.
  - CalendarScreen: TableCalendar-based month/week view with custom styling and markers, synchronized with EventProvider selected/focused dates; bottom section shows schedule for the selected date and allows adding events.

- Widgets
  - widgets/add_event_dialog.dart: modal dialog to create events; writes via EventProvider and closes.
  - widgets/event_list.dart: list and delete UI for events on a given date.

- Packages
  - provider for state management, shared_preferences for local storage, table_calendar for calendar UI, intl for formatting.

- Assets
  - pubspec.yaml declares assets/images/ and icons/ (used by LandingScreen and app icons).

## Notes for Warp

- This is a multi-platform Flutter app (mobile, web, desktop) but development targets web and mobile first. Follow README for build targets.
- Lint configuration comes from flutter_lints via analysis_options.yaml; prefer `flutter analyze` and `dart format` before commits.
