# MyOrbit Calendar – Features & Components

**Last refreshed:** October 29, 2025  
**Scope:** Flutter UI (Riverpod-first implementation), offline preview services, and legacy subsystems that still exist in the repository.

> 🔎 **Reality check:** Production UI uses Riverpod providers, `DevDataService`, and Supabase services. The older BLoC layer under `lib/presentation/bloc` is no longer wired into the app shell; its test suite currently fails (`flutter analyze`/`flutter test`). Treat that code as legacy until it is either removed or modernised.

For build status and release priorities see [`docs/status/PROJECT_STATUS.md`](../status/PROJECT_STATUS.md).

---

## Application Map

### Primary routes (GoRouter)

| Route | Widget | Source file | Key providers/services | Notes |
| --- | --- | --- | --- | --- |
| `/` | `LandingScreen` | `lib/ui/screens/landing_screen.dart` | Static marketing content | CTA routes to `/onboarding`. |
| `/auth` | `AuthScreen` | `lib/ui/screens/auth_screen.dart` | `authControllerProvider` | Email + OAuth entry (Supabase-dependent). |
| `/verify-email` | `EmailVerificationScreen` | `lib/ui/screens/email_verification_screen.dart` | `authControllerProvider` | Expects `state.extra` with email. |
| `/onboarding` | `OnboardingScreen` | `lib/ui/screens/onboarding_screen.dart` | `onboardingProvider`, `DeviceContactsService`, `currentUserProvider` | 8-step onboarding wizard with contact import. |
| `/dashboard` | `DashboardScreen` | `lib/ui/screens/dashboard_screen.dart` | `eventsForDateProvider`, `upcomingEventsProvider`, `activeSignalsProvider`, `settingsControllerProvider`, `contactListProvider` | Default tab inside `AppShell`. |
| `/calendar` | `CalendarScreen` | `lib/ui/screens/calendar_screen.dart` | `calendarViewModeProvider`, `sharedCalendarEventsProvider`, `selectedDateProvider`, `activeSignalsProvider`, `contactListProvider` | Day/Week/Month modes, conflict detection, quick-create sheet. |
| `/activity` | `ActivityScreen` | `lib/ui/screens/activity_screen.dart` | `notificationListProvider`, `contactListProvider` | Activity history grouped by recency. |
| `/people` | `PeopleGroupsScreen` | `lib/ui/screens/people_groups_screen.dart` | `contactListProvider`, `connectedPartnersProvider`, `pendingInvitesProvider`, `contactOnlyContactsProvider`, `eventListProvider` | My Orbit hub, invites, permission management. |
| `/settings` | `SettingsScreen` | `lib/ui/screens/settings_screen.dart` | `settingsControllerProvider`, `calendarListProvider`, `DataExportApi`, `userProfileProvider` | Theme toggle, privacy defaults, calendar visibility, data export request sheet. |
| `/notifications` | `NotificationsScreen` | `lib/ui/screens/notifications_screen.dart` | `notificationListProvider` | Modal stack triggered from dashboard bell. |
| `/create-event` | `CreateEventScreen` | `lib/ui/screens/create_event_screen.dart` | `eventListProvider`, `connectedPartnersProvider`, `settingsControllerProvider`, `signalProviders` | Used for both create & edit flows, recurrence + floating events. |
| `/events` | `EventsListScreen` | `lib/ui/screens/events_list_screen.dart` | `eventListProvider`, `settingsControllerProvider` | Chronological list + filters. |
| `/signal-availability` | `SignalAvailabilityFlowScreen` | `lib/ui/screens/signal_availability_flow.dart` | `signalsDraftProvider`, `connectedPartnersProvider` | Guided flow for creating/updating signals. |
| `/add-contact` | `AddContactSelectionScreen` | `lib/ui/screens/add_contact_selection_screen.dart` | `DeviceContactsService`, `contactListProvider`, `SupabaseService`, `apiServiceProvider` | Two-tab selector (device contacts vs invite). |
| `/calendar-sharing` | `CalendarSharingScreen` | `lib/ui/screens/calendar_sharing_screen.dart` | `sharedCalendarProviders`, `contactListProvider` | Permission management per calendar (UI only pending backend wiring). |
| `/calendar-migration` | `CalendarMigrationScreen` | `lib/ui/screens/calendar_migration_screen.dart` | Static UI + `SupabaseService` flags | Migration helper / placeholder. |
| `/account-recovery` | `AccountRecoveryScreen` | `lib/ui/screens/account_recovery_screen.dart` | `SupabaseService`, `DevDataService` mock flows | Recovery CTA (backend pending). |
| `/updates-guides` | `UpdatesGuidesScreen` | `lib/ui/screens/updates_guides_screen.dart` | Static content | Reachable from dashboard quick-links. |

All shell routes render inside `AppShell` (`lib/ui/app_shell.dart`) which owns the bottom navigation bar, reminder banners, and provider watchers for sync notifications.

---

## Screen Details

### Dashboard (`/dashboard`)
- **Primary widgets:** `_buildCalendarCard`, `_buildSignalsCard`, `_buildBottomCards`.
- **Data sources:** `eventsForDateProvider`, `eventsForWeekProvider`, `activeSignalsProvider`, `signalsSharedWithMeProvider`, `contactListProvider`, `settingsControllerProvider`.
- **Interactions:** Quick-create bottom sheet (event vs signal), cards navigate via `context.push` to calendar, events list, notifications, settings, updates/guides.
- **Offline behaviour:** Falls back to `DevDataService` through the event/contact providers when Supabase is not configured; still shows mock metrics.

### Calendar (`/calendar`)
- **Views:** Day, week, and month toggles stored in `calendarViewModeProvider`.
- **Features:** Long-press to create event, availability overlays, conflict grouping (`sharedEventConflictsProvider`), connection filter bar, “Go to today” affordance when viewing another year.
- **Data:** Real events from `sharedCalendarEventsProvider`; when Supabase is unavailable the providers read from `OfflineCacheService` seeded by `DevDataService`.
- **Modals:** Quick actions include creating events or signals tied to the selected day.

### Activity (`/activity`)
- **Purpose:** Two-week notification digest with older activity accordion.
- **Providers:** `notificationListProvider` (local store backed by `NotificationFactoryService` when offline) and `contactListProvider` for name resolution.
- **Actions:** Swipe-to-remove with undo via `Snackbar`; grouped by “Today” vs “Older”.

### My Orbit (`/people`)
- **Tabs:** Connected, Pending, Contacts. Tab index maintained in stateful widget.
- **Data sources:** `connectedPartnersProvider`, `pendingInvitesProvider`, `contactOnlyContactsProvider`, `eventListProvider` for per-contact history.
- **Interactions:** Permission chips, inline editing of contact names/colors, invites via `SendInviteButton`, launch `AddContactSelectionScreen`.
- **Permissions:** When Supabase is not configured the screen displays an offline notice while still using mock data from `DevDataService`.

### Settings (`/settings`)
- **Sections:** Profile (avatar picker), Appearance (dark mode), Calendar defaults (privacy, timezone, visibility), Notifications, Data export.
- **Data export:** Bottom sheet `_DataExportSheet` submits through `DataExportApi.requestExport` and references support/help URLs from `Env`.
- **Providers:** `settingsControllerProvider` storing shared preferences state, `calendarListProvider` for visibility toggles, `userProfileProvider`.

### Notifications (`/notifications`)
- **Entry:** Modal list pushed from the dashboard bell icon (uses `context.push('/notifications')`).
- **Sections:** Primary list (first 6), collapsible “Older notifications”, footer CTA to manage reminders.
- **Inline actions:** Accept/decline event invites via `EventInviteResponseSheet`.

### Events surfaces
- **Events list (`/events`):** Filtered list of events, quick actions to create new events.
- **Create event (`/create-event`):** Handles new + edit flows, recurrence suggestions via `RecurrenceSuggestionService`, signal conflict handling with `_SignalConflictDecision`.
- **Quick sheet:** Triggered from dashboard add button providing “Create event” vs “Signal availability”.

### Signals & availability
- **Signal availability flow (`/signal-availability`):** Multi-step wizard anchored by `signalsDraftProvider`, surfaces contact selection, recurrence, and expiration.
- **Signal cards:** Reusable components under `lib/ui/widgets/availability/`.
- **Color resolution:** `SignalColorService` ensures consistent palette per contact.

### Onboarding (`/onboarding`)
- **Implementation:** PageView-based wizard managed by `onboardingProvider`.
- **Contacts import:** Uses `flutter_contacts` to pull device contacts into `Contact` domain objects, gracefully handles permission denial.
- **Output:** Emits navigation events via provider (`navigationRoute` → `context.go`).

### Auth & Recovery
- **Auth screen (`/auth`):** Email/password plus OAuth buttons (Supabase-backed).
- **Email verification (`/verify-email`):** Accepts email string via router extra.
- **Account recovery (`/account-recovery`):** UI scaffolding with offline placeholders; backend pending.

### Utilities & Informational screens
- **Calendar migration / sharing / change log / updates guides:** UI stubs that document expected future flows. They reuse `AppGradientBackground` and semantics-focused widgets for consistent look & accessibility.

---

## Component Library

- **`AppShell` (`lib/ui/app_shell.dart`):** Hosts bottom navigation, reminder banners (`groupedReminderBannerNotificationsProvider`), and orchestrates tab syncing with GoRouter.
- **`AppGradientBackground` (`lib/ui/widgets/app_gradient_background.dart`):** Shared gradient backdrop for newly refreshed screens.
- **Accessibility wrappers:** `SemanticCard`, `SemanticButton`, `SemanticHeading`, `SemanticImage` ensure voice-over friendly output.
- **Calendar widgets:** `calendar_view_widget.dart`, `day_cell_widget.dart`, `events_section_widget.dart` encapsulate the month grid, event strips, and conflict markers.
- **Dashboard components:** Under `lib/ui/widgets/dashboard/` (hero cards, CTA rows).
- **Error/empty state widgets:** `lib/ui/widgets/error/` used by Activity, Notifications, etc.
- **Profile widgets:** `ProfilePicturePicker`, `UserProfileAvatar` integrate with `ProfilePictureService`.

---

## Data & Service Layer (Riverpod)

- **Providers:** Located under `lib/logic/providers/`. They combine Supabase APIs (`CalendarApi`, `ContactApi`, etc.), offline caches (`OfflineCacheService`), and mock data via `DevDataService`.
- **Offline-first:** When `SupabaseService.isConfigured` is false, providers load from local storage or `DevDataService`, keep UI interactive, and queue mutations through `SyncQueueService`.
- **Realtime sync:** `RealtimeSyncService` hooks are set inside providers such as `EventList` to update state when Supabase broadcasts changes.
- **Reminder + notifications:** `ReminderSchedulingService`, `NotificationFactoryService`, and `ReminderBanner` providers schedule in-app banners.
- **Device integrations:** `DeviceContactsService`, `PermissionService`, `TimezoneService`, `ProfilePictureService`, `UserProfileService` wrap platform APIs with Riverpod-friendly interfaces.

---

## Legacy / Technical Debt

- **BLoC stack:** `lib/presentation/bloc/user/*`, `test/presentation/bloc/user/*`, and `test/data/repositories/*` constitute an older architecture. Those files still import `MockUserRepository`, `MockUserRemoteDataSource`, and expect generated mocks (`build_runner`). They also reference the outdated `UserProfile.photoUrl` field. Current UI does not depend on them.
- **Generated mocks missing:** Running analyzer/tests fails until `user_bloc_test.mocks.dart` + `user_repository_test.mocks.dart` are regenerated or the specs are removed.
- **Localization assets:** `flutter gen-l10n` output is absent from source control; many widget tests assume it exists.

---

## Related Documentation

- [`docs/guides/DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md) – development workflows, code generation commands, testing tips.
- [`docs/reference/main.md`](../reference/main.md) – product narrative, permission model, onboarding copy.
- [`docs/REALTIME_IMPLEMENTATION_SUMMARY.md`](../REALTIME_IMPLEMENTATION_SUMMARY.md) – realtime service architecture.
- [`docs/setup/HOW_TO_RUN.md`](../setup/HOW_TO_RUN.md) – launcher scripts, required commands (`flutter gen-l10n`).
- [`docs/status/PROJECT_STATUS.md`](../status/PROJECT_STATUS.md) – live build/test readiness tracker.

Use this guide as the structural map while exploring the Flutter codebase. Update it whenever routes change, providers move, or new subsystems (e.g., data export, analytics) land.
