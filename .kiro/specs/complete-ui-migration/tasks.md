# Implementation Plan: Complete UI Migration to BLoC

## Task Overview

This implementation plan completes the UI migration by converting the final 3 Riverpod-based screens to BLoC/Cubit. All required cubits exist, so this is purely UI wiring work following established patterns from 13 already-migrated screens.

---

## Tasks

- [ ] 1. Migrate OnboardingScreen to BLoC
  - Create `lib/ui/screens/onboarding_screen_bloc.dart` following the pattern from other migrated screens
  - Replace `ConsumerStatefulWidget` with `StatefulWidget`
  - Add `MultiBlocProvider` wrapping ContactCubit and AuthCubit
  - Replace `ref.watch(onboardingProvider)` with `BlocBuilder<ContactCubit, ContactState>`
  - Replace `ref.read(onboardingProvider.notifier)` calls with `context.read<ContactCubit>()` calls
  - Map onboarding state fields to contact state fields (contacts, isLoading, etc.)
  - Test the onboarding flow to ensure all functionality works (contact permission, selection, navigation)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Migrate SettingsScreen to BLoC
  - Create `lib/ui/screens/settings_screen_bloc.dart` following the pattern from other migrated screens
  - Replace `ConsumerWidget` with `StatelessWidget`
  - Add `MultiBlocProvider` wrapping SettingsCubit, UserProfileCubit, and CalendarsCubit
  - Replace `ref.watch(settingsControllerProvider)` with `BlocBuilder<SettingsCubit, SettingsCubitState>`
  - Replace `ref.watch(userProfileProvider)` with `BlocBuilder<UserProfileCubit, UserProfileState>`
  - Replace `ref.read(calendarListProvider)` with `BlocBuilder<CalendarsCubit, CalendarsState>`
  - Replace AsyncValue `.when()` handling with AppStateStatus checks (`.status.isLoading`, `.status.isFailure`)
  - Replace `controller.updateSetting()` calls with `context.read<SettingsCubit>().updateSetting()` calls
  - Test all settings options (dark mode, privacy, timezone, calendar visibility, profile, data export)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Migrate EventsScreen to BLoC
  - Create `lib/ui/screens/events_screen_bloc.dart` following the pattern from other migrated screens
  - Replace `ConsumerWidget` with `StatelessWidget`
  - Add `MultiBlocProvider` wrapping EventCubit, SettingsCubit, and ContactCubit
  - Replace `ref.watch(eventListProvider)` with `BlocBuilder<EventCubit, EventState>`
  - Replace `ref.watch(settingsControllerProvider)` with `BlocBuilder<SettingsCubit, SettingsCubitState>`
  - Replace `ref.watch(contactListProvider)` with `BlocBuilder<ContactCubit, ContactState>`
  - Replace AsyncValue `.when()` and `.maybeWhen()` handling with AppStateStatus checks
  - Initialize cubits with data loading in the `create` callback (e.g., `EventCubit()..loadEvents()`)
  - Test event display, filtering, and contact highlighting functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 4. Update app router to use BLoC versions
  - Update `lib/presentation/routes/app_router.dart` to import the new BLoC screen versions
  - Replace `import '../../ui/screens/archived_riverpod/onboarding_screen.dart'` with `import '../../ui/screens/onboarding_screen_bloc.dart'`
  - Update SettingsScreen route to use the BLoC version
  - Update EventsScreen route to use the BLoC version (if it has a dedicated route)
  - Verify AccountRecoveryScreen import is correct (it's already in archived_riverpod but is provider-free)
  - Run `flutter analyze lib/presentation/routes/` to verify no errors
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5. Archive old Riverpod screen versions
  - Move `lib/ui/screens/onboarding_screen.dart` to `lib/ui/screens/archived_riverpod/` (if not already there)
  - Move `lib/ui/screens/settings_screen.dart` to `lib/ui/screens/archived_riverpod/`
  - Move `lib/ui/screens/events_screen.dart` to `lib/ui/screens/archived_riverpod/`
  - Create `lib/ui/screens/archived_riverpod/README.md` explaining these are legacy Riverpod versions
  - Document which screens were archived and the migration date
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 6. Verify migration completeness
  - Search for `ConsumerWidget` usage in `lib/ui/screens/*.dart` (excluding archived_riverpod/)
  - Search for `ref.watch` and `ref.read` usage in `lib/ui/screens/*.dart` (excluding archived_riverpod/)
  - Verify all active screens use `BlocProvider`, `BlocBuilder`, or are StatelessWidget/StatefulWidget
  - Run `flutter analyze lib/ui/screens/` and verify zero errors
  - Run `flutter analyze lib/presentation/routes/` and verify zero errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 7. Test migrated screens in running app
  - Run the app with `flutter run -d macos` (or your preferred platform)
  - Navigate to OnboardingScreen and test the complete onboarding flow
  - Navigate to SettingsScreen and test all settings options (theme, privacy, timezone, calendars)
  - Navigate to EventsScreen (if accessible) and test event display and filtering
  - Verify no console errors or warnings appear during usage
  - Verify state updates work correctly (e.g., toggling dark mode updates immediately)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 8. Identify and document remaining Riverpod providers
  - List all provider files in `lib/logic/providers/` directory
  - For each provider, check if it's still referenced in active code (excluding archived_riverpod/)
  - Create a list of providers that are no longer used and can be safely removed
  - Document which providers are still needed (if any) and why
  - Create a follow-up task list for removing unused providers
  - _Requirements: 4.1, 4.2_

- [ ] 9. Run final verification and create completion report
  - Run `flutter analyze` on the entire project and document results
  - Run `flutter pub get` to ensure all dependencies are resolved
  - Attempt to compile the app with `flutter build` (dry run) and document any issues
  - Create a migration completion report documenting:
    - Number of screens migrated (3)
    - Total screens now using BLoC (16)
    - Remaining Riverpod usage (providers only, no UI)
    - Any issues encountered and resolutions
    - Next steps for complete Riverpod removal
  - _Requirements: 4.5, 6.4, 6.5_

---

## Implementation Notes

### Task Execution Order

Tasks 1-3 can be executed in parallel if desired, but sequential execution is recommended to catch patterns and issues early. Tasks 4-5 must be done after 1-3. Tasks 6-9 are verification and documentation tasks that must be done last.

### Reference Implementations

Use these already-migrated screens as templates:
- **auth_screen_bloc.dart** - Simple single-cubit example
- **calendar_sharing_screen_bloc.dart** - Multi-cubit example with nested BlocBuilders
- **events_list_screen_bloc.dart** - Event display with filtering
- **people_groups_screen_bloc.dart** - Contact management example

### Common Patterns

**Single Cubit:**
```dart
return BlocProvider(
  create: (_) => sl<MyCubit>()..loadData(),
  child: BlocBuilder<MyCubit, MyState>(
    builder: (context, state) {
      if (state.status.isLoading) return LoadingWidget();
      if (state.status.isFailure) return ErrorWidget(state.message);
      return SuccessWidget(state.data);
    },
  ),
);
```

**Multiple Cubits:**
```dart
return MultiBlocProvider(
  providers: [
    BlocProvider(create: (_) => sl<Cubit1>()..loadData()),
    BlocProvider(create: (_) => sl<Cubit2>()),
  ],
  child: BlocBuilder<Cubit1, State1>(
    builder: (context, state1) {
      return BlocBuilder<Cubit2, State2>(
        builder: (context, state2) {
          // Use both states
        },
      );
    },
  ),
);
```

**Cubit Method Calls:**
```dart
// Reading cubit to call methods
context.read<MyCubit>().updateValue(newValue);

// Or store reference if calling multiple times
final cubit = context.read<MyCubit>();
cubit.updateValue1(value1);
cubit.updateValue2(value2);
```

### Success Criteria

Each task is complete when:
- Code compiles without errors
- Flutter analyze shows no issues
- Functionality is preserved
- Manual testing passes
- No console errors during usage

### Estimated Timeline

- Task 1 (OnboardingScreen): 1-1.5 hours
- Task 2 (SettingsScreen): 1.5-2 hours
- Task 3 (EventsScreen): 1-1.5 hours
- Task 4 (Router update): 15 minutes
- Task 5 (Archive): 15 minutes
- Task 6 (Verification): 30 minutes
- Task 7 (Testing): 30 minutes
- Task 8 (Provider audit): 30 minutes
- Task 9 (Final report): 30 minutes
- **Total: 5.5-7.5 hours**

### Dependencies

- Task 4 depends on Tasks 1, 2, 3
- Task 5 depends on Task 4
- Tasks 6, 7 depend on Tasks 1-5
- Tasks 8, 9 depend on all previous tasks

### Risk Mitigation

**Risk**: State mapping errors between Riverpod and BLoC
**Mitigation**: Reference existing migrated screens as templates, test incrementally

**Risk**: Missing cubit methods
**Mitigation**: All required cubits already exist and are tested in other screens

**Risk**: Breaking existing functionality
**Mitigation**: Keep old screens in archived folder, test thoroughly before removing

**Risk**: Complex nested BlocBuilders become hard to read
**Mitigation**: Extract to separate private widget methods or classes if needed
