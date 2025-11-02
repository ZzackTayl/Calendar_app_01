# Migration Assessment & Execution Plan
**Date:** October 31, 2025  
**Target:** Migrate from Supabase→Firebase and Riverpod→BLoC/Cubit using MyOrbit_CleanArch as canonical framework

---

## Executive Summary

Your project is **mid-migration** with dual systems coexisting:
- **State Management:** ~30 Riverpod providers + ~9 BLoC/Cubit implementations
- **Backend:** Supabase references minimal (mostly in docs/env), Firebase installed but not wired
- **Architecture:** Clean architecture structure exists but inconsistent patterns

**Critical Finding:** The MyOrbit_CleanArch project (your canonical reference) is **outside the workspace** and inaccessible to me. This is the #1 blocker for ensuring exact framework alignment.

---

## Current State Analysis

### ✅ What's Already Done

1. **Firebase Setup (Partial)**
   - All Firebase packages installed in pubspec.yaml
   - Firebase initialization code exists (`lib/core/firebase_initializer.dart`)
   - Environment-specific Firebase options files present
   - Firebase Auth data source implemented (`auth_firebase_data_source.dart`)
   - Firestore data source for users (`user_firestore_data_source.dart`)

2. **BLoC/Cubit Implementation (Partial)**
   - **BLoCs:** User, Event, Notification (3 complete)
   - **Cubits:** Auth, Calendar, Onboarding, Profile, Settings, Expansion (6 complete)
   - Clean DI containers for User and Auth (`injection_container.dart`)
   - BLoC observer configured in main.dart

3. **Clean Architecture Structure**
   - Domain layer: entities, repositories (contracts), use cases
   - Data layer: repositories (implementations), data sources (remote/local)
   - Presentation layer: blocs, cubits, screens
   - Core layer: services, utilities, config

### 🚧 What Needs Migration

1. **Riverpod Providers (30+ files in `lib/logic/providers/`)**
   - `event_providers.dart` - Complex event management with realtime sync
   - `calendar_providers.dart` - Calendar visibility and management
   - `contact_providers.dart` - Contact management
   - `notification_providers.dart` - Notification state
   - `profile_providers.dart` - User profile state
   - `settings_providers.dart` - App settings
   - `signal_providers.dart` - Availability signals
   - `shared_calendar_providers.dart` - Calendar sharing
   - `sync_status_provider.dart` - Sync state
   - `ui_state_providers.dart` - UI state management
   - Plus 20+ more specialized providers

2. **Backend Services (Minimal Supabase References)**
   - Only found in documentation and .env files
   - No active Supabase client code detected
   - Firebase services exist but use mock data (`DevDataService`)

3. **Repository Implementations**
   - Only 4 repositories implemented (auth, user, event, notification)
   - Need repositories for: calendars, contacts, signals, sharing, settings, etc.

4. **Data Sources**
   - Only 5 data sources exist (2 auth, 2 user, 1 notification local)
   - Need Firestore data sources for all domain entities

---

## Why This Approach is Best

### The Problem with Current State
1. **Dual Systems = Technical Debt:** Maintaining both Riverpod and BLoC increases complexity
2. **No Canonical Reference Access:** Can't verify alignment with MyOrbit_CleanArch
3. **Incomplete Firebase Integration:** Services installed but not connected
4. **Test Suite Broken:** 22 analyzer issues, failing tests

### The Solution: Phased, Feature-by-Feature Migration

**Why Feature-by-Feature?**
- ✅ **Maintains working app** at each step
- ✅ **Testable increments** - verify each feature before moving on
- ✅ **Reduces risk** - can rollback individual features
- ✅ **Parallel work possible** - different features can be migrated simultaneously
- ✅ **Aligns with Clean Architecture** - each feature is self-contained

**Why Not Big Bang?**
- ❌ High risk of breaking everything
- ❌ Difficult to debug when issues arise
- ❌ Can't verify MyOrbit_CleanArch alignment without access
- ❌ Long period with non-functional app

---

## Recommended Execution Plan

### Phase 0: Foundation & Access ✅ COMPLETE

**Goal:** Establish access to canonical reference and verify current architecture

**Completed:**
- ✅ Copied MyOrbit_CleanArch files to `REFERENCE_FROM_CLEANARCH/`
- ✅ Analyzed architecture patterns
- ✅ Created `MYORBIT_CLEANARCH_PATTERNS.md` - Complete pattern documentation
- ✅ Identified key differences from current calendar_app

**Key Findings:**
- **DI:** MyOrbit_CleanArch uses GetIt, calendar_app uses manual factories
- **Error Handling:** MyOrbit_CleanArch uses Either (dartz), calendar_app uses Result<T>
- **Organization:** MyOrbit_CleanArch is strict features-first
- **State:** MyOrbit_CleanArch uses simple state classes with AppStateStatus enum
- **Naming:** Shorter names (AuthRepo vs AuthRepository)

**Next Steps:**
- Install required packages (get_it, dartz)
- Setup GetIt DI structure
- Begin Phase 1

---

### Phase 1: Core Infrastructure

**Goal:** Complete Firebase wiring and establish first complete feature as template

**Priority Order:**
1. **Authentication (Already 80% done)**
   - ✅ AuthCubit exists
   - ✅ Firebase Auth data source exists
   - ✅ Repository exists
   - 🔧 Wire up to real Firebase project
   - 🔧 Remove any Supabase auth references
   - 🔧 Test end-to-end

2. **User Profile (Already 70% done)**
   - ✅ UserBloc exists
   - ✅ Firestore data source exists
   - ✅ Repository exists
   - 🔧 Migrate `profile_providers.dart` → UserProfileCubit (already exists!)
   - 🔧 Wire up to Firestore
   - 🔧 Test CRUD operations

**Why Start Here:**
- Auth is foundational - everything depends on it
- User profile is simple and already mostly done
- Creates working template for other features
- Validates Firebase connection end-to-end

**Deliverables:**
- Working Firebase Auth (email, Google, Apple)
- Working User Profile CRUD via Firestore
- First complete feature following MyOrbit_CleanArch patterns
- Template for remaining features

**Estimated Time:** 4-8 hours

---

### Phase 2: Calendar & Events (Core Feature)

**Goal:** Migrate calendar and event management to BLoC + Firestore

**Current State:**
- ✅ EventBloc exists (basic structure)
- ✅ Event repository implementation exists
- 🚧 `event_providers.dart` has complex logic (realtime sync, conflict resolution)
- 🚧 `calendar_providers.dart` manages visibility and selection

**Migration Steps:**

1. **Design Firestore Schema**
   ```
   users/{uid}/calendars/{calendarId}
   users/{uid}/calendars/{calendarId}/events/{eventId}
   users/{uid}/calendar_visibility/{visibilityId}
   ```

2. **Create Data Sources**
   - `calendar_firestore_data_source.dart`
   - `event_firestore_data_source.dart`
   - `calendar_local_data_source.dart` (offline support)

3. **Create/Enhance Repositories**
   - `calendar_repository.dart` (contract in domain)
   - `calendar_repository_impl.dart` (implementation in data)
   - `event_repository_impl.dart` (enhance existing)

4. **Create BLoCs/Cubits**
   - `CalendarBloc` - Calendar CRUD and visibility
   - Enhance `EventBloc` - Event CRUD, recurring events, conflict resolution
   - `CalendarSelectionCubit` - Selected date/calendar state
   - `EventSearchCubit` - Search query state

5. **Migrate Providers → BLoCs**
   - `event_providers.dart` → `EventBloc` + `EventSearchCubit`
   - `calendar_providers.dart` → `CalendarBloc` + `CalendarSelectionCubit`
   - `sync_status_provider.dart` → `SyncStatusCubit`

6. **Update UI Screens**
   - Replace `ref.watch()` with `BlocBuilder`/`BlocConsumer`
   - Replace `ref.read().method()` with `context.read<Bloc>().add(Event())`

**Deliverables:**
- Complete calendar management via Firestore
- Complete event management via Firestore
- Offline support with local caching
- Realtime sync via Firestore listeners
- All calendar/event screens migrated to BLoC

**Estimated Time:** 12-20 hours

---

### Phase 3: Contacts & Sharing

**Goal:** Migrate contact management and calendar sharing

**Current State:**
- 🚧 `contact_providers.dart` - Contact management
- 🚧 `shared_calendar_providers.dart` - Calendar sharing
- 🚧 `calendar_sharing_provider.dart` - Sharing logic

**Migration Steps:**

1. **Firestore Schema**
   ```
   users/{uid}/contacts/{contactId}
   users/{uid}/contact_requests/{requestId}
   calendars/{calendarId}/shares/{shareId}
   ```

2. **Create Data Sources**
   - `contact_firestore_data_source.dart`
   - `calendar_share_firestore_data_source.dart`

3. **Create Repositories**
   - `contact_repository.dart` + implementation
   - `calendar_share_repository.dart` + implementation

4. **Create BLoCs**
   - `ContactBloc` - Contact CRUD and invitations
   - `CalendarShareBloc` - Sharing management

5. **Migrate Providers**
   - `contact_providers.dart` → `ContactBloc`
   - `shared_calendar_providers.dart` → `CalendarShareBloc`
   - `calendar_sharing_provider.dart` → `CalendarShareBloc`

**Deliverables:**
- Contact management via Firestore
- Calendar sharing via Firestore
- Contact invitation flow
- All contact/sharing screens migrated

**Estimated Time:** 10-16 hours

---

### Phase 4: Notifications & Signals

**Goal:** Migrate notifications and availability signals

**Current State:**
- ✅ NotificationBloc exists
- ✅ Notification repository exists
- 🚧 `notification_providers.dart` - Notification state
- 🚧 `signal_providers.dart` - Availability signals

**Migration Steps:**

1. **Firestore Schema**
   ```
   users/{uid}/notifications/{notificationId}
   users/{uid}/signals/{signalId}
   users/{uid}/signals/{signalId}/shares/{shareId}
   ```

2. **Create Data Sources**
   - `notification_firestore_data_source.dart`
   - `signal_firestore_data_source.dart`

3. **Enhance Repositories**
   - Enhance `notification_repository_impl.dart`
   - Create `signal_repository.dart` + implementation

4. **Enhance/Create BLoCs**
   - Enhance `NotificationBloc`
   - Create `SignalBloc` - Availability signal management

5. **Setup FCM**
   - Configure Firebase Cloud Messaging
   - Create notification handlers
   - Setup topic subscriptions

**Deliverables:**
- Notification system via Firestore + FCM
- Availability signals via Firestore
- Push notification support
- All notification/signal screens migrated

**Estimated Time:** 10-16 hours

---

### Phase 5: Settings & Preferences

**Goal:** Migrate app settings and user preferences

**Current State:**
- ✅ SettingsCubit exists
- 🚧 `settings_providers.dart` - Settings state
- 🚧 `ui_state_providers.dart` - UI state

**Migration Steps:**

1. **Firestore Schema**
   ```
   users/{uid}/preferences/{preferenceId}
   users/{uid}/settings/{settingId}
   ```

2. **Create Data Sources**
   - `preferences_firestore_data_source.dart`
   - `preferences_local_data_source.dart` (SharedPreferences)

3. **Create Repository**
   - `preferences_repository.dart` + implementation

4. **Enhance Cubit**
   - Enhance `SettingsCubit` with Firestore sync

5. **Migrate Providers**
   - `settings_providers.dart` → `SettingsCubit`
   - `ui_state_providers.dart` → Individual Cubits as needed

**Deliverables:**
- Settings synced via Firestore
- Local preferences cached
- All settings screens migrated

**Estimated Time:** 6-10 hours

---

### Phase 6: External Calendar Integration

**Goal:** Migrate Google/Apple calendar integration

**Current State:**
- 🚧 `google_calendar_provider.dart` - Google Calendar sync
- 🚧 `apple_calendar_provider.dart` - Apple Calendar sync

**Migration Steps:**

1. **Create BLoCs**
   - `GoogleCalendarBloc` - Google Calendar sync
   - `AppleCalendarBloc` - Apple Calendar sync
   - `CalendarMigrationBloc` - Migration flow

2. **Migrate Providers**
   - `google_calendar_provider.dart` → `GoogleCalendarBloc`
   - `apple_calendar_provider.dart` → `AppleCalendarBloc`
   - `calendar_migration_provider.dart` → `CalendarMigrationBloc`

**Deliverables:**
- Google Calendar integration via BLoC
- Apple Calendar integration via BLoC
- Calendar migration flow
- All external calendar screens migrated

**Estimated Time:** 8-12 hours

---

### Phase 7: Cleanup & Polish

**Goal:** Remove all Riverpod dependencies and Supabase references

**Tasks:**

1. **Remove Riverpod**
   - Delete all files in `lib/logic/providers/`
   - Remove Riverpod packages from pubspec.yaml
   - Remove `ProviderScope` from main.dart
   - Run `flutter pub get`

2. **Remove Supabase**
   - Remove Supabase env vars from `.env` and `.env.example`
   - Delete `supabase/` folder (archive if needed)
   - Remove Supabase references from docs

3. **Fix Tests**
   - Update all tests to use BLoC testing patterns
   - Run `flutter gen-l10n`
   - Fix analyzer issues
   - Achieve passing test suite

4. **Documentation**
   - Update all docs to reflect new architecture
   - Create migration completion report
   - Update README with new setup instructions

**Deliverables:**
- Zero Riverpod dependencies
- Zero Supabase references
- Passing test suite
- Updated documentation

**Estimated Time:** 6-10 hours

---

## Total Estimated Time

- **Phase 0:** 2-4 hours (with your help)
- **Phase 1:** 4-8 hours
- **Phase 2:** 12-20 hours
- **Phase 3:** 10-16 hours
- **Phase 4:** 10-16 hours
- **Phase 5:** 6-10 hours
- **Phase 6:** 8-12 hours
- **Phase 7:** 6-10 hours

**Total: 58-96 hours** (7-12 working days for one developer)

---

## Risk Mitigation

### High Risks
1. **No access to MyOrbit_CleanArch** → Can't verify pattern alignment
   - **Mitigation:** Get access ASAP or detailed documentation
   
2. **Complex Riverpod logic** → May miss edge cases in migration
   - **Mitigation:** Thorough testing at each phase, feature flags
   
3. **Firebase not configured** → Can't test until wired
   - **Mitigation:** Use Firebase emulators for local development

### Medium Risks
1. **Breaking changes during migration** → App becomes unusable
   - **Mitigation:** Feature flags, gradual rollout, maintain Riverpod until BLoC proven
   
2. **Data migration complexity** → Supabase to Firestore
   - **Mitigation:** Dual-write period, data validation scripts

---

## Success Criteria

### Phase Completion Criteria
- ✅ All Riverpod providers for feature migrated to BLoC/Cubit
- ✅ All UI screens for feature use BLoC pattern
- ✅ All tests passing for feature
- ✅ No analyzer errors for feature
- ✅ Feature works end-to-end with Firebase
- ✅ Patterns match MyOrbit_CleanArch exactly

### Final Completion Criteria
- ✅ Zero Riverpod dependencies in pubspec.yaml
- ✅ Zero Supabase references in code
- ✅ All 30+ providers migrated to BLoC/Cubit
- ✅ Full test suite passing
- ✅ Zero analyzer errors
- ✅ App runs on all platforms
- ✅ Firebase fully integrated and tested
- ✅ Documentation complete and accurate

---

## Recommended Next Steps

### Immediate (Today)
1. **Provide access to MyOrbit_CleanArch** or export key files
2. **Review and approve this plan**
3. **Decide on execution approach:**
   - Option A: I do it (with your guidance on MyOrbit_CleanArch patterns)
   - Option B: You do it (I provide detailed step-by-step instructions)
   - Option C: Hybrid (we work together, you handle MyOrbit_CleanArch alignment)

### This Week
1. Complete Phase 0 (Foundation & Access)
2. Start Phase 1 (Core Infrastructure)
3. Establish working template for remaining phases

### This Month
1. Complete Phases 1-4 (Core features)
2. Begin Phase 5-6 (Secondary features)
3. Regular check-ins to verify MyOrbit_CleanArch alignment

---

## Questions for You

1. **Can you provide access to MyOrbit_CleanArch?** This is critical for ensuring exact pattern alignment.

2. **What's your priority order?** Should we focus on specific features first?

3. **Do you have Firebase projects set up?** (dev, staging, prod)

4. **Are there any deviations from MyOrbit_CleanArch you want?** Or is it 100% strict adherence?

5. **Timeline expectations?** Is this urgent or can we take time to do it right?

6. **Who will execute?** You, me, or collaborative?

---

## Conclusion

This migration is **substantial but manageable** with the right approach. The phased, feature-by-feature strategy minimizes risk while maintaining a working app throughout. The key blocker is access to MyOrbit_CleanArch to ensure exact pattern alignment.

**My recommendation:** Start with Phase 0 immediately to establish the foundation, then proceed systematically through each phase with thorough testing at each step.
