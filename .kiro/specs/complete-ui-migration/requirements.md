# Requirements Document: Complete UI Migration to BLoC

## Introduction

This specification addresses the completion of the UI migration from Riverpod to BLoC/Cubit state management. After thorough analysis, 3 screens remain that still use Riverpod providers and need to be migrated to use the existing BLoC/Cubit architecture. All required cubits already exist, so this is purely a UI wiring task.

## Glossary

- **Riverpod**: Legacy state management solution using ConsumerWidget and ref.watch/ref.read
- **BLoC/Cubit**: Target state management using BlocProvider and BlocBuilder
- **Provider**: Riverpod state provider being phased out
- **Cubit**: State management class following MyOrbit_CleanArch patterns
- **AppStateStatus**: Enum for tracking state (initial, loading, success, failure)
- **UI Migration**: Process of replacing Riverpod widgets with BLoC widgets
- **SettingsController**: Legacy Riverpod provider for settings management
- **SettingsCubit**: BLoC replacement for settings management
- **EventListProvider**: Legacy Riverpod provider for event list
- **EventCubit**: BLoC replacement for event management
- **OnboardingProvider**: Legacy Riverpod provider for onboarding flow
- **ContactCubit**: BLoC replacement for contact management

## Requirements

### Requirement 1: Migrate OnboardingScreen to BLoC

**User Story:** As a developer, I want OnboardingScreen to use BLoC instead of Riverpod, so that all screens follow the same state management pattern.

#### Acceptance Criteria

1. WHEN OnboardingScreen is migrated, THE System SHALL replace ConsumerStatefulWidget with StatefulWidget
2. WHEN OnboardingScreen is migrated, THE System SHALL replace onboardingProvider with appropriate cubits (ContactCubit, AuthCubit)
3. WHEN OnboardingScreen is migrated, THE System SHALL replace ref.watch() calls with BlocBuilder widgets
4. WHEN OnboardingScreen is migrated, THE System SHALL replace ref.read() calls with context.read() calls
5. WHEN OnboardingScreen is migrated, THE System SHALL maintain all existing functionality and UI behavior

### Requirement 2: Migrate SettingsScreen to BLoC

**User Story:** As a developer, I want SettingsScreen to use BLoC instead of Riverpod, so that settings management follows the clean architecture pattern.

#### Acceptance Criteria

1. WHEN SettingsScreen is migrated, THE System SHALL replace ConsumerWidget with StatelessWidget
2. WHEN SettingsScreen is migrated, THE System SHALL replace settingsControllerProvider with SettingsCubit
3. WHEN SettingsScreen is migrated, THE System SHALL replace userProfileProvider with UserProfileCubit
4. WHEN SettingsScreen is migrated, THE System SHALL replace calendarListProvider with CalendarsCubit
5. WHEN SettingsScreen is migrated, THE System SHALL maintain all settings functionality including theme, privacy, timezone, and calendar visibility

### Requirement 3: Migrate EventsScreen to BLoC

**User Story:** As a developer, I want EventsScreen to use BLoC instead of Riverpod, so that event display follows the clean architecture pattern.

#### Acceptance Criteria

1. WHEN EventsScreen is migrated, THE System SHALL replace ConsumerWidget with StatelessWidget
2. WHEN EventsScreen is migrated, THE System SHALL replace eventListProvider with EventCubit
3. WHEN EventsScreen is migrated, THE System SHALL replace settingsControllerProvider with SettingsCubit
4. WHEN EventsScreen is migrated, THE System SHALL replace contactListProvider with ContactCubit
5. WHEN EventsScreen is migrated, THE System SHALL maintain all event display functionality including filtering and contact highlighting

### Requirement 4: Remove Legacy Riverpod Providers

**User Story:** As a developer, I want to remove unused Riverpod providers, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. WHEN all screens are migrated, THE System SHALL identify all Riverpod providers that are no longer used
2. WHEN all screens are migrated, THE System SHALL remove unused provider files from lib/logic/providers/
3. WHEN all screens are migrated, THE System SHALL remove Riverpod dependencies from pubspec.yaml
4. WHEN all screens are migrated, THE System SHALL verify no remaining references to removed providers exist
5. WHEN all screens are migrated, THE System SHALL run flutter analyze to confirm zero errors

### Requirement 5: Update Router and Imports

**User Story:** As a developer, I want the router to use only BLoC screens, so that the application uses consistent state management throughout.

#### Acceptance Criteria

1. WHEN screens are migrated, THE System SHALL update app_router.dart to import migrated screens
2. WHEN screens are migrated, THE System SHALL remove imports from archived_riverpod/ folder
3. WHEN screens are migrated, THE System SHALL verify all routes use BLoC versions of screens
4. WHEN screens are migrated, THE System SHALL ensure AccountRecoveryScreen import is correct (it's already provider-free)
5. WHEN screens are migrated, THE System SHALL verify the app compiles without errors

### Requirement 6: Verify Migration Completeness

**User Story:** As a developer, I want to verify the migration is complete, so that I can confidently remove legacy code.

#### Acceptance Criteria

1. WHEN migration verification is performed, THE System SHALL search for all ConsumerWidget usage in active screens
2. WHEN migration verification is performed, THE System SHALL search for all ref.watch and ref.read usage in active screens
3. WHEN migration verification is performed, THE System SHALL verify all screens use BlocProvider or BlocBuilder
4. WHEN migration verification is performed, THE System SHALL run flutter analyze and report zero errors
5. WHEN migration verification is performed, THE System SHALL confirm the app runs without runtime errors

### Requirement 7: Archive Old Screen Versions

**User Story:** As a developer, I want old Riverpod screen versions properly archived, so that they don't interfere with the migrated code.

#### Acceptance Criteria

1. WHEN screens are migrated, THE System SHALL move old Riverpod versions to archived_riverpod/ folder if not already there
2. WHEN screens are migrated, THE System SHALL ensure archived screens are not imported anywhere in active code
3. WHEN screens are migrated, THE System SHALL add README.md to archived_riverpod/ explaining these are legacy files
4. WHEN screens are migrated, THE System SHALL verify no active code references archived files
5. WHEN screens are migrated, THE System SHALL document which screens were archived and when

### Requirement 8: Test Migrated Screens

**User Story:** As a developer, I want to test migrated screens, so that I ensure functionality is preserved.

#### Acceptance Criteria

1. WHEN screens are migrated, THE System SHALL manually test OnboardingScreen flow
2. WHEN screens are migrated, THE System SHALL manually test SettingsScreen all settings options
3. WHEN screens are migrated, THE System SHALL manually test EventsScreen event display and filtering
4. WHEN screens are migrated, THE System SHALL verify state updates work correctly with BLoC
5. WHEN screens are migrated, THE System SHALL verify no console errors or warnings appear during usage
