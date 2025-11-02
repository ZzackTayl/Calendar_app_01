# Firebase Authentication Migration Plan

**Version:** 1.0
**Date:** 2025-10-31
**Status:** Planning
**Stakeholders:** Backend Squad, Mobile Squad, Architecture Guild

---

## Executive Summary

This document outlines the authentication migration from Supabase Auth to Firebase Authentication within the MyOrbit calendar application. Based on the current codebase audit (2025-10-31), **significant progress has already been made** toward Firebase integration, but **Supabase dependencies remain in configuration and environment variables**.

### Current State Assessment

**✅ Completed:**
- Firebase Auth SDK integrated and configured (`FirebaseAppServices`, `FirebaseInitializer`)
- BLoC/Cubit presentation layer migrated (`AuthCubit`, `UserBloc`, `EventBloc`)
- Dependency injection system with Firebase/mock toggle (`AuthDependencyInjection`)
- Bootstrap system with progress tracking (`BootstrapCubit`, `AppBootstrapper`)
- Config registry pattern (`AppConfig`, `ConfigRegistry`)
- Firebase auth repositories implemented (`FirebaseAuthRemoteDataSource`)
- Auth state management via BLoC patterns
- **No Supabase Auth SDK imports detected in lib/ directory** (config variables remain but unused)

**⚠️  Partially Complete:**
- Environment configuration still includes Supabase variables (`Env.supabaseUrl`, `Env.supabaseAnonKey`) in lib/core/env.dart:150-173
- AppConfig still includes Supabase fields (lib/core/config/app_config.dart:10-14, 26-27) - actively read but not consumed by application logic
- `.env.example` still documents Supabase as "fallback" (lines 57-68) - needs deprecation notice
- Feature flags control Firebase/mock toggle but Supabase config persists
- UI screens still use Riverpod extensively alongside BLoC (14 screens verified)

**❌ Not Started:**
- User data migration from Supabase to Firebase
- Supabase config cleanup
- Complete Riverpod → BLoC migration across all screens
- Production Firebase environment setup
- Cloud Functions migration

---

## Phase Overview

### Phase 1: Authentication Foundation ✅ **COMPLETE**
**Timeline:** Already completed
**Status:** Deployed in codebase

- ✅ Firebase Auth SDK integrated
- ✅ Auth repository pattern implemented
- ✅ BLoC-based auth state management (`AuthCubit`)
- ✅ Email/password + Google Sign-In support
- ✅ Bootstrap integration with auth state

### Phase 2: Config & Environment Cleanup ⚠️  **IN PROGRESS**
**Timeline:** 2 weeks (revised from 1 week)
**Status:** Needs finalization

**Goals:**
- Remove Supabase configuration from `Env` class
- Update `AppConfig` to remove Supabase fields
- Consolidate environment variables to Firebase-only
- Update `.env.example` to reflect Firebase-first architecture

**Current Blockers:**
1. Need to verify no runtime dependencies on `Env.supabaseUrl` or `Env.supabaseAnonKey`
2. Legacy code may still reference these values
3. Need migration path for existing `.env` files in developer environments

**Action Items:**
- [ ] Audit all references to `Env.supabaseUrl` and `Env.supabaseAnonKey` (17 files contain "supabase" string)
- [ ] Remove Supabase fields from `AppConfig` (lines 10-11, 18-19, 26-27, 34-35)
- [ ] Update `Env` class to remove Supabase getters (lines 150-173)
- [ ] Update `.env.example` to mark Supabase variables as DEPRECATED (lines 57-68)
- [ ] Create developer migration guide for local environment updates
- [ ] Add config validation to fail if Supabase vars are set in production

### Phase 3: Data Layer Completion 🔄 **NEXT PRIORITY**
**Timeline:** 2-3 weeks
**Status:** Not started

**Goals:**
- Complete Firestore data source implementations
- Implement user profile migration
- Ensure parity between mock and Firestore data sources
- Production-grade error handling and retry logic

**Current State:**
- `UserFirestoreDataSource` exists in codebase
- `EventRepository` uses dependency injection toggle
- Feature flags control data source selection (`Env.useFirestoreDataSource`)

**Deliverables:**
1. User profile migration script (Supabase → Firestore)
2. Event data migration script
3. Contact data migration script
4. Data validation and reconciliation tooling
5. Rollback procedures

### Phase 4: UI Migration Completion 🔄 **IN PROGRESS**
**Timeline:** 3-4 weeks
**Status:** Partial - many screens still use Riverpod

**Goals:**
- Migrate remaining Riverpod screens to BLoC/Cubit
- Remove `flutter_riverpod` dependency
- Establish consistent state management patterns

**Current State:**
- **Migrated:** Auth flow, Event management (partial), User management
- **Not Migrated:** Calendar screen, Settings screen, People/Groups screen, Dashboard, Notifications
- Template exists: `CREATE_EVENT_SCREEN_MIGRATION_PLAN.md`

**Migration Template** (from `CREATE_EVENT_SCREEN_MIGRATION_PLAN.md`):
1. Replace `ConsumerStatefulWidget` with `StatefulWidget`
2. Wrap build with `BlocConsumer<TargetBloc, TargetState>`
3. Move navigation to `BlocListener`
4. Replace provider reads with `context.read<Bloc>()`
5. Remove manual loading state management
6. Test navigation patterns thoroughly

**Remaining Screens:**
- [ ] `calendar_screen.dart` (uses `flutter_riverpod`)
- [ ] `settings_screen.dart` (uses `flutter_riverpod`)
- [ ] `people_groups_screen.dart` (uses `flutter_riverpod`)
- [ ] `dashboard_screen.dart` (uses `flutter_riverpod`)
- [ ] `notifications_screen.dart` (uses `flutter_riverpod`)
- [ ] `events_screen.dart` (uses `flutter_riverpod`)
- [ ] `calendar_sharing_screen.dart` (uses `flutter_riverpod`)
- [ ] `signal_availability_flow.dart` (uses `flutter_riverpod`)

### Phase 5: Production Deployment 📋 **PLANNED**
**Timeline:** 1-2 weeks
**Status:** Not started

**Prerequisites:**
- All config cleanup complete (Phase 2)
- Data migration tested (Phase 3)
- UI migration complete (Phase 4)
- Firebase project environments configured (dev, staging, prod)

**Deliverables:**
1. Firebase production project setup
2. Security rules deployment
3. Cloud Functions deployment (if applicable)
4. Monitoring and alerting configuration
5. Staged rollout plan

---

## Section 1: Authentication Architecture

### Current Implementation (lib/presentation/cubit/auth/auth_cubit.dart)

**AuthCubit State Machine:**
```
unknown → loading → authenticated
                 ↘ unauthenticated
                 ↘ error
```

**Supported Auth Methods:**
- Email/password sign-in (`signInWithEmail`)
- Email/password sign-up (`signUpWithEmail`)
- Google Sign-In (`signInWithGoogle`)
- Sign-out (`signOut`)

**User Bootstrapping Flow:**
1. Firebase auth state change detected
2. `_bootstrapCurrentUser()` triggered
3. Profile upsert via `ProfileApi.upsertCurrentUserProfile()`
4. Primary calendar creation via `CalendarApi.ensurePrimaryCalendarForCurrentUser()`
5. State emitted as `AuthState.authenticated(user)`

**Integration Points:**
- Bootstrap system: `lib/core/bootstrap/bootstrap_app_bloc.dart:73-78`
- Repository injection: `RepositoryProvider<AuthRepository>`
- Analytics integration: `AnalyticsService.logAuthEvent()`
- Sentry error tracking: Bootstrap error listener (line 34-44)

---

## Section 2: Dependency Injection Architecture

### Current System (lib/core/di/injection_container.dart)

**Design Pattern:**
- Singleton-based manual DI
- Feature flag toggles between Firebase and mock implementations
- Lazy initialization with caching

**AuthDependencyInjection:**
```dart
static bool _useFirebaseAuth = false;

static set useFirebaseAuth(bool value) {
  if (value && !FirebaseInitializer.isInitialized) {
    throw StateError('Cannot enable Firebase auth before initialization');
  }
  _useFirebaseAuth = value;
  _authRemoteDataSource = null;
  _authRepository = null;
}

static AuthRemoteDataSource get authRemoteDataSource {
  if (_useFirebaseAuth && FirebaseInitializer.isInitialized) {
    return FirebaseAuthRemoteDataSource();
  } else {
    return MockAuthRemoteDataSource();
  }
}
```

**UserDependencyInjection:**
- Similar pattern for Firestore vs. mock data sources
- Controlled by `Env.useFirestoreDataSource` flag
- Supports testing overrides

**Configuration Flow:**
1. `AppBootstrapper._configureDependencyInjection()` (line 250-271)
2. Reads `Env.useFirebaseAuth` and `Env.useFirestoreDataSource`
3. Sets flags on DI containers
4. Repositories initialized lazily on first access

---

## Section 3: Bootstrap Architecture

### Current System (lib/core/bootstrap/app_bootstrapper.dart)

**Bootstrap Sequence (11 steps):**
1. Initialize Firebase (`FirebaseInitializer.initialize()`)
2. Configure dependency injection
3. Initialize analytics
4. Initialize timezone service
5. Load sync queue
6. Initialize connectivity service
7. Initialize reminder scheduling
8. Prepare real-time sync
9. Load onboarding status
10. Load persisted settings
11. Build navigation router

**Progress Tracking:**
- `BootstrapCubit` manages state
- `BootstrapProgress` callbacks for UI updates
- `BootstrapStatusScreen` shows progress to user

**Error Handling:**
- Try/catch with graceful degradation
- Sentry integration for error tracking
- Retry capability via `BootstrapCubit.retry()`

**Testing Support:**
- `BootstrapOverrides` for dependency injection during tests
- Each step can be overridden independently
- Supports deterministic testing

---

## Section 4: Configuration Management

### Current Issues (lib/core/config/app_config.dart)

**Problem:** Supabase fields still present despite Firebase-first architecture

**Lines 10-14:**
```dart
final String? apiBaseUrl;
final String supabaseUrl;
final String supabaseAnonKey;
final String? sentryDsn;
final bool analyticsEnabled;
```

**Lines 26-29:**
```dart
final supabaseUrl = Env.supabaseUrl;
final supabaseAnon = Env.supabaseAnonKey;
```

**Recommended Changes:**
1. Remove `supabaseUrl` and `supabaseAnonKey` fields
2. Update `fromEnv()` factory to remove Supabase reads
3. Add Firebase-specific config if needed (e.g., project ID, region)
4. Maintain `apiBaseUrl` for backend API if still in use

**Migration Path:**
- Create `AppConfig.v2` with new structure
- Deprecate old fields with `@Deprecated` annotations
- Provide grace period for code references to update
- Remove deprecated fields in follow-up PR

---

## Section 5: Environment Variable Strategy

### Current Issues (lib/core/env.dart)

**Problem:** Supabase environment variables (lines 150-173) remain despite no active usage

**Recommendations:**
1. **Short-term (Phase 2):**
   - Add deprecation warnings to Supabase getters
   - Document that these will be removed
   - Create audit report of any remaining references

2. **Medium-term (Phase 3):**
   - Remove Supabase getters from `Env` class
   - Update `.env.example` to remove Supabase variables
   - Create developer migration guide

3. **Long-term (Phase 4-5):**
   - Consolidate all Firebase environment config
   - Consider moving to Firebase Remote Config for dynamic values
   - Implement environment validation at startup

**Environment Structure:**
```dart
// Current (mixed)
static String get supabaseUrl { ... }  // ❌ Remove
static String get firebaseProjectId { ... }  // ✅ Keep

// Future (Firebase-only)
static String get firebaseProjectId { ... }
static String get firebaseWebApiKey { ... }
static String get firebaseFunctionsRegion { ... }
static bool get firebaseEmulatorsEnabled { ... }
```

---

## Section 6: UI State Management Migration

### Status: In Progress

**Completed BLoC/Cubit Migrations:**
- ✅ `AuthCubit` (lib/presentation/cubit/auth/auth_cubit.dart)
- ✅ `UserBloc` (lib/presentation/bloc/user/user_bloc.dart)
- ✅ `EventBloc` (lib/presentation/bloc/event/event_bloc.dart)
- ✅ `SettingsCubit` (lib/presentation/cubit/settings/settings_cubit.dart)
- ✅ `UserProfileCubit` (lib/presentation/cubit/profile/user_profile_cubit.dart)
- ✅ `CalendarsCubit` (lib/presentation/cubit/calendar/calendars_cubit.dart)
- ✅ `OnboardingCubit` (lib/presentation/cubit/onboarding/onboarding_cubit.dart)
- ✅ `NotificationBloc` (lib/presentation/bloc/notification/notification_bloc.dart)

**Hybrid State (BLoC + Riverpod):**
- Bootstrap app uses `BlocProvider` + `MultiBlocProvider`
- But wraps with `ProviderScope` for legacy Riverpod screens (lib/core/bootstrap/bootstrap_app_bloc.dart:104-109)
- Many UI screens still consume Riverpod providers

**Migration Strategy:**
1. Follow `CREATE_EVENT_SCREEN_MIGRATION_PLAN.md` template
2. One screen at a time to minimize risk
3. Test thoroughly after each migration
4. Remove `ProviderScope` wrapper once all screens migrated

---

## Section 7: Rollout & Testing Strategy

### Testing Pyramid

**Unit Tests:**
- Auth repository tests (mock vs. Firebase implementations)
- BLoC/Cubit state transition tests
- DI container configuration tests

**Widget Tests:**
- Auth screen rendering
- BLoC listener navigation tests
- Error state handling

**Integration Tests:**
- Full auth flow (sign-up → sign-in → sign-out)
- Bootstrap sequence validation
- DI toggles between Firebase and mock

**Manual Testing:**
- Email/password auth flow
- Google Sign-In flow
- Auth state persistence across app restarts
- Error handling (network failures, invalid credentials)

### Staged Rollout

**Stage 1: Internal Testing (Dev environment)**
- Enable Firebase auth via `Env.useFirebaseAuth = true`
- Test with Firebase emulators
- Verify all auth flows
- Monitor error rates

**Stage 2: Staging Environment**
- Deploy to staging Firebase project
- Beta tester group (10-20 users)
- Monitor for 1 week
- Collect feedback

**Stage 3: Production Rollout**
- Feature flag for gradual rollout (10% → 50% → 100%)
- Monitor auth success rates
- Rollback plan prepared
- Support team briefed

---

## Section 8: Supabase Identity Linking Decision

### Decision: **DEFERRED**

See detailed rationale in `docs/migration/supabase_identity_linking.md`.

**Summary:**
- Firebase auth is now primary
- No Supabase auth imports detected in current codebase
- Identity linking only needed if historical Supabase users exist
- Defer until business case emerges

**Revisit Triggers:**
1. Historical user migration requirement
2. Cross-platform identity reconciliation needed
3. Legacy data access patterns discovered
4. Compliance/audit requirements

**Architecture Guild Decision:** PENDING (see architecture_review_request_2025-10-31.md)

---

## Section 9: Action Items & Ownership

### Immediate (Week 1)
| Item | Owner | Status | Blocker |
|------|-------|--------|---------|
| Audit `Env.supabase*` references | Backend Squad | 🔴 Not Started | - |
| Remove Supabase fields from `AppConfig` | Backend Squad | 🔴 Not Started | Audit completion |
| Update `.env.example` | DevOps | 🔴 Not Started | Config cleanup |
| Create developer migration guide | Tech Writing | 🔴 Not Started | - |

### Short-term (Weeks 2-3)
| Item | Owner | Status | Blocker |
|------|-------|--------|---------|
| Migrate `calendar_screen.dart` to BLoC | Mobile Squad | 🔴 Not Started | - |
| Migrate `settings_screen.dart` to BLoC | Mobile Squad | 🔴 Not Started | - |
| Implement user data migration script | Backend Squad | 🔴 Not Started | Firestore schema finalized |
| Setup Firebase staging environment | DevOps | 🔴 Not Started | - |

### Medium-term (Weeks 4-6)
| Item | Owner | Status | Blocker |
|------|-------|--------|---------|
| Complete all UI screen migrations | Mobile Squad | 🔴 Not Started | Template validation |
| Remove `ProviderScope` wrapper | Mobile Squad | 🔴 Not Started | All screens migrated |
| Remove `flutter_riverpod` dependency | Mobile Squad | 🔴 Not Started | ProviderScope removed |
| Production Firebase deployment | DevOps | 🔴 Not Started | Staging validation |

---

## Section 10: Risk Assessment

### High Risk
1. **Data Migration Failures**
   - **Impact:** User data loss, auth failures
   - **Mitigation:** Extensive validation, rollback procedures, backup strategy
   - **Owner:** Backend Squad

2. **Production Auth Outages**
   - **Impact:** Users cannot sign in
   - **Mitigation:** Staged rollout, feature flags, monitoring
   - **Owner:** DevOps + Backend Squad

### Medium Risk
3. **Incomplete Riverpod Migration**
   - **Impact:** Inconsistent state management, maintenance burden
   - **Mitigation:** Follow migration template, thorough testing
   - **Owner:** Mobile Squad

4. **Config Cleanup Breaking Changes**
   - **Impact:** Developer environment breakage
   - **Mitigation:** Clear migration guide, deprecation warnings
   - **Owner:** Backend Squad + DevOps

### Low Risk
5. **Third-party Auth Provider Issues**
   - **Impact:** Google Sign-In failures
   - **Mitigation:** Fallback to email/password, monitoring
   - **Owner:** Mobile Squad

---

## Section 11: Success Criteria

### Phase 2 Success (Config Cleanup)
- [ ] Zero references to `Env.supabaseUrl` or `Env.supabaseAnonKey` in lib/
- [ ] `AppConfig` class has no Supabase fields
- [ ] Developer migration guide published
- [ ] All environments using Firebase-only config

### Phase 3 Success (Data Layer)
- [ ] User profile migration script tested
- [ ] Data parity validation passing
- [ ] Firestore data sources production-ready
- [ ] Error handling meets SLA requirements

### Phase 4 Success (UI Migration)
- [ ] All screens using BLoC/Cubit patterns
- [ ] Zero Riverpod provider references
- [ ] `flutter_riverpod` dependency removed
- [ ] Navigation patterns consistent

### Phase 5 Success (Production)
- [ ] Auth success rate >99.5%
- [ ] Error rate <0.1%
- [ ] Response time <500ms p95
- [ ] Zero critical incidents in first week

---

## Appendices

### Appendix A: File Reference Index
- Bootstrap: `lib/core/bootstrap/app_bootstrapper.dart`
- Auth Cubit: `lib/presentation/cubit/auth/auth_cubit.dart`
- DI Container: `lib/core/di/injection_container.dart`
- Config: `lib/core/config/app_config.dart`
- Env: `lib/core/env.dart`
- Firebase Services: `lib/core/firebase_app_services.dart`

### Appendix B: Related Documentation
- General Migration Roadmap: `docs/firebase/MIGRATION_TO_FIREBASE_AND_BLOC.md`
- Socialization Brief: `docs/firebase/FIREBASE_MIGRATION_SOCIALIZATION.md`
- UI Migration Template: `docs/architecture/CREATE_EVENT_SCREEN_MIGRATION_PLAN.md`
- Architecture Review: `docs/migration/architecture_review_request_2025-10-31.md`

### Appendix C: Key Decisions
- **Decision 001:** Defer Supabase identity linking (see Section 8)
- **Decision 002:** Use manual DI over automated frameworks (existing pattern)
- **Decision 003:** BLoC for complex features, Cubit for simple state (established)

---

**Last Updated:** 2025-10-31
**Next Review:** Week of 2025-11-07
**Document Owner:** Backend Squad Lead
