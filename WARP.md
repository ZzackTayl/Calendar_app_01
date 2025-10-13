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

## Rules for Warp

### User Approval (CRITICAL)
- Before any significant code generation, file creation, or command execution, ALWAYS:
  1. Explain what you are going to do
  2. Wait for explicit user approval
  3. Do not proceed without confirmation
- This applies to: creating files, modifying existing files, running commands, installing packages, etc.
- Only proceed with minor fixes (like syntax errors) without approval if explicitly requested

### Version Control (CRITICAL)
- Always use Git version control for all code changes
- Commit code changes frequently with descriptive commit messages
- Push commits to remote repository regularly to ensure backup and collaboration
- Use conventional commit format: feat:, fix:, chore:, etc.
- Never work on large features without committing intermediate progress

### Flutter Widget Inspection & Runtime Analysis (CRITICAL)
- **Never wait on `flutter run`** - always start it in background with `&` to avoid getting stuck
- **DTD Connection Pattern**: DevTools typically runs on port 9101, DTD URI format is `ws://127.0.0.1:[DevTools_Port]/ws`
- **Quick Setup Commands**:
  ```bash
  flutter run -d chrome --web-port=3000 &  # Start app in background
  lsof -i :9101  # Check DevTools port
  # Connect MCP tools to ws://127.0.0.1:9101/ws
  ```
- **Available MCP Tools**:
  - `get_widget_tree` - Complete widget hierarchy inspection
  - `set_widget_selection_mode` - Enable click-to-inspect widgets
  - `get_selected_widget` - Get details of selected widget
  - `get_runtime_errors` - Monitor runtime errors
  - `hot_reload` - Apply changes without restart
  - `hover` and `signature_help` - Code inspection at cursor position
- **Widget Inspection Workflow**:
  1. Start Flutter app in background (never wait for it)
  2. Check DevTools port with `lsof -i :9101`
  3. Connect MCP tools to DTD URI
  4. Enable selection mode for interactive inspection
  5. Use widget tree analysis for debugging layout issues
- **Visual Testing**: Set up golden tests with `golden_toolkit` for screenshot-based regression testing
- **Files Created**: `WIDGET_INSPECTION_SETUP.md` and `widget_inspection_demo.md` contain complete documentation

### Project Specification Adherence (CRITICAL)
- ALWAYS refer to and follow the project specification in main.md
- The app is MyOrbit - a sophisticated, consent-aware calendar for polyamorous users
- Key principles: Privacy-first defaults, explicitness overrides defaults, progressive disclosure
- Architecture: Landing → Onboarding (8-step) → Dashboard → Calendar/People/Activity/Settings
- Business model: Freemium with Pro tier (unlimited connections/calendars)
- IMPORTANT: If any request or implementation seems inconsistent with the main.md specification, STOP and inform the user before proceeding
- Ask for clarification when implementation details conflict with or deviate from the specification
- Maintain the core identity: MyOrbit (not "Calendar Mobile" or generic calendar app)

### Technical Standards
- This is a multi-platform Flutter app (mobile, web, desktop) but development targets web and mobile first
- Follow README for build targets and deployment instructions
- Lint configuration comes from flutter_lints via analysis_options.yaml
- Prefer `flutter analyze` and `dart format` before commits
- Use proper error handling and null safety throughout
- Follow established architecture patterns (Provider + ChangeNotifier state management)

### Development Workflow
- Test all code changes before committing
- Use dart analyze to check for errors and warnings
- Format code with dart format before commits
- Ensure Flutter app builds successfully before pushing
- Add appropriate comments for complex logic
- Update documentation when changing architecture or adding features
