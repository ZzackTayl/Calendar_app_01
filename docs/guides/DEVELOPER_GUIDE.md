# Developer Guide: Rebuilding UI Screens

**Project:** MyOrbit Calendar  
**Architecture:** Flutter + Riverpod + Supabase  
**Status:** Backend complete, UI screens need rebuilding

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Status](#current-status)
3. [Architecture Explanation](#architecture-explanation)
4. [Getting Started](#getting-started)
5. [Screen Rebuilding Priority](#screen-rebuilding-priority)
6. [How to Rebuild a Screen](#how-to-rebuild-a-screen)
7. [Code Examples](#code-examples)
8. [Common Patterns](#common-patterns)
9. [Testing](#testing)

---

## Project Overview

MyOrbit is a privacy-first calendar app for managing relationships with consent-based visibility controls.

**Key Features:**
- Multi-partner calendar management
- Granular privacy controls (Private, Semi-Visible, Visible)
- Event privacy levels (Normal, Exclusive, Super Exclusive)
- Google Calendar sync
- Contact management

**Tech Stack:**
- **Frontend:** Flutter (Dart 3.9+)
- **State Management:** Riverpod 3.0+ with code generation via @riverpod annotation
- **Backend:** Supabase (Postgres + Auth)
- **Routing:** go_router 12+
- **Code Generation:** Freezed + riverpod_annotation + build_runner

---

## Current Status

The application is feature-complete for the MVP experience and already wired with Riverpod providers, Supabase API facades, and an offline-first development mode. The focus for incoming contributors is maintenance, hardening, and extending behaviour rather than rebuilding screens from scratch.

### ✅ Production Quality Surfaces
- Fully built dashboard, calendar (month/week/day), events list, signal centre, notifications, activity feed, people/permissions hub, settings, onboarding, and invite flows.
- Supabase service layer (`lib/logic/services/api_service.dart`) mirrors the live schema but gracefully falls back to mock data via `DevDataService` + `OfflineCacheService` when credentials are not present.
- Routing (`createAppRouter` in `lib/main.dart`) already reflects the complete navigation map used in QA/staging builds.

### 🔄 Ongoing Maintenance (what new developers should expect)
1. **Platform parity:** keep widgets behaving identically across web/mobile/desktop when adjusting layouts.
2. **Provider hygiene:** whenever you add network calls, extend both branches—`SupabaseService.isConfigured` and the offline mocks—so the app continues to boot without backend credentials.
3. **Accessibility + semantics:** new UI elements must include semantic wrappers or follow the existing `Semantic*` helper pattern.
4. **Test resilience:** many suites exist under `test/`; stabilise long-running tests (see the updated Test Summary for current flaky areas) before adding new ones.
5. **Docs + scripts:** update the docs whenever routes or flows change; several guides are developer-facing dependencies (this guide, README, Project Status, etc.).

### 🔌 Extension Points to Know
- **Navigation:** Add new primary routes inside `createAppRouter` and ensure they fit into the `ShellRoute` if they belong under the bottom nav.
- **State:** Use `riverpod_annotation` to generate providers (`@riverpod` classes/functions). Keep business logic under `lib/logic/services` and call them from providers; UI should simply `ref.watch`/`ref.listen`.
- **Themeing:** Shared colours live in `lib/core/theme_constants.dart`. Respect `AppPalette` when introducing new surfaces so both light/dark work automatically.
- **Supabase integration:** All server calls live in `CalendarApi`, `ContactApi`, `SignalApi`, etc. Add new endpoints there and expose them through providers; keep Result/Failure patterns for error handling consistent.
- **Offline cache:** Persist user changes locally through `OfflineCacheService` when Supabase is not configured. If you add new data types, provide analogous load/save helpers.
- **Automation hooks:** Reminder scheduling, notification listeners, and watch providers (see `lib/ui/app_shell.dart`) initialise side-effects once—extend those rather than creating duplicate background tasks.

### 🧭 Offline vs Online Modes (Data Pipeline)

| Step | Offline behaviour | Online behaviour |
|------|-------------------|------------------|
| Supabase bootstrap (`SupabaseService.initialize`) | Skips client setup when `.env` contains placeholders and logs "running in offline mode" | Creates Supabase client and enables auth streams |
| Providers (e.g., `eventListProvider`) | Load seeded data via `DevDataService`, track edits with `SharedPreferences` through `OfflineCacheService` | Execute Supabase queries, refresh network results, and save local caches for backup |
| Mutations (create/update/delete) | Update the in-memory list and persist to cache synchronously | Call Supabase APIs; on success refresh provider state, on failure surface `AsyncError` |
| Signals/Notifications | Derived from mock timeline + cached edits | Hit Supabase endpoints; watch realtime updates (when enabled) |
| Onboarding/Google sync | Simulated delay then auto-advance with informational snackbar | Fetch remote calendars, store success/failure messaging |

**Developer tip:** Always test a change with env vars **absent** and again with real Supabase credentials. If both paths succeed, the feature is ready for teammates who may not have backend access yet.

---

## Architecture Explanation

### The 3-Layer Architecture

```
┌─────────────────────────────────────────┐
│           UI Layer (lib/ui/)             │
│  Screens & Widgets - What users see     │
│  Uses Riverpod to access state          │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│         Logic Layer (lib/logic/)         │
│  Providers: State management (Riverpod) │
│  Services: Business logic & API calls   │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│        Domain Layer (lib/domain/)        │
│  Models: Data structures (Freezed)      │
│  Pure Dart classes, no dependencies     │
└──────────────────────────────────────────┘
```

### Riverpod 3 Pattern

Riverpod 3 uses code generation with `@riverpod` annotation and `riverpod_annotation` for concise, type-safe state management:

| Aspect | Implementation |
|--------|----------------|
| **Import** | `package:flutter_riverpod/flutter_riverpod.dart` |
| **Widget Base** | `ConsumerWidget` or `ConsumerStatefulWidget` |
| **Access State** | `ref.watch(eventListProvider)` |
| **Mutations** | `ref.read(eventListProvider.notifier).addEvent()` |
| **Provider Definition** | `@riverpod` class or function with auto-generated `.notifier` |
| **Code Generation** | `dart run build_runner build --delete-conflicting-outputs` |
| **Rebuilding** | Hot-reload supported; triggers rebuilds of watched providers |

---

## Getting Started

### 🚀 **Quickest Way to Start**

**Mac or Windows - Just double-click:**
- **Mac:** Double-click `launch_flutter.command`
- **Windows:** Double-click `launcher.bat`

**Then see the relevant guide:**
- **All developers:** Read [`HOW_TO_RUN.md`](../setup/HOW_TO_RUN.md)
- **Windows developers:** Also read [`WINDOWS_SETUP.md`](../setup/WINDOWS_SETUP.md) - especially the part about NOT modifying the `ios/` folder
- **Mac developers:** You can modify any folder safely

---

### 1. Prerequisites

```bash
# Ensure you have Flutter installed
flutter --version  # Should be 3.35+

# Install dependencies
cd Calendar_Mobile
flutter pub get

# Run code generation
dart run build_runner build --delete-conflicting-outputs
```

### 2. Set Up Supabase (Optional for devs without credentials)

1. Follow [`SUPABASE_SETUP.md`](../setup/SUPABASE_SETUP.md) if you need a live backend.
2. Otherwise skip this step—the app will run in seeded offline mode.

### 3. Run the App

**Easiest:** Use the launcher files (see above)

**Or manually:**
```bash
# For Chrome (web) - works on both Mac and Windows
flutter run -d chrome

# For macOS (Mac only)
flutter run -d macos

# For Windows (Windows only)
flutter run -d windows

# For Android emulator
flutter run -d emulator-5554
```

---

## Screen Rebuilding Priority

### Where to Extend Next

Now that all major surfaces exist, consider the following backlog instead of rebuilding:

1. **Performance polishing:** virtualise long lists (activity feed, contacts) if you notice jank on older devices.
2. **Calendar sync enhancements:** add delta-sync logic or conflict reconciliation in `CalendarApi` once Supabase sync endpoints are ready.
3. **Deeper notifications:** wire realtime listeners (`supabase.client.channel`) so invites land instantly.
4. **Accessibility QA:** add golden snapshot tests and voiceover passes for new components.
5. **Automation guards:** build more automated tests around onboarding, invite responses, and signal management once current suites stabilise.

## Feature Matrix (code lookup cheat sheet)

| Surface / Flow | Primary UI Entry | Key Providers | Supporting Services / Notes |
|----------------|------------------|---------------|-----------------------------|
| Landing + Auth | `LandingScreen`, `AuthScreen` (`lib/ui/screens/`) | `authControllerProvider` | Stateless marketing view + email/OAuth auth gates |
| Onboarding Wizard | `OnboardingScreen` | `onboardingNotifierProvider`, `contactListProvider` | Handles Google sync simulation, contact invites, SharedPreferences flag |
| Dashboard | `DashboardScreen` | `eventsForWeekProvider`, `pendingInvitesProvider`, `activeSignalsProvider`, `signalsSharedWithMeProvider` | Aggregates upcoming events, signals, invites, mock “What’s new” cards |
| Calendar (Month/Week/Day) | `CalendarScreen` | `eventListProvider`, `selectedDateProvider`, `activeSignalsProvider`, `sharedSignalsProvider` | Advanced rendering, shared-signal pulse, event creation routes |
| Create / Edit Event | `CreateEventScreen` | `eventListProvider.notifier`, `activeSignalsProvider.notifier`, `settingsControllerProvider` | Conflict resolution trims/cancels availability signals |
| Events List | `EventsListScreen` | `eventSearchQueryProvider`, `eventListProvider` | Filtering + quick actions |
| People & Permissions | `PeopleGroupsScreen` | `connectedPartnersProvider`, `pendingInvitesProvider`, `contactOnlyContactsProvider` | Uses `PermissionService` for warnings & status badges |
| Signal Centre & Flow | `SignalCenterScreen`, `SignalAvailabilityFlowScreen` | `activeSignalsProvider`, `signalsSharedWithMeProvider`, `signalSharesProvider` | Availability creation, history timeline, mock timeline data |
| Activity & Notifications | `ActivityScreen`, `NotificationsScreen` | `notificationListProvider`, `pendingEventInvitesProvider` | Invite tap opens `EventInviteResponseSheet`; supports undo |
| Settings | `SettingsScreen` | `settingsControllerProvider`, `calendarVisibilityProvider` | Appearance, timezone, reminders, signal buffer, calendar visibility |
| Invites UI | `EventInviteResponseSheet`, `event_invite_card.dart` | `inviteDetailsProvider`, `eventInviteNotifierProvider` | Responds to invites, checks for conflicts, updates notifications |

Use this table as a starting point when exploring the codebase: follow the provider into `lib/logic/providers`, then locate the backing service/DevData fallback if you need to adjust business logic.
  - List all events
  - Add new event dialog
  - Delete events
  - Uses: `eventListProvider`

### Phase 2: Feature Screens (Week 3)

**4. People & Groups Screen** ⏱️ 5-6 hours
- **Priority:** HIGH
- **Complexity:** High
- **Features:**
  - Display contacts by status (Accepted, Pending, Contact-Only)
  - Add partner functionality
  - Change permissions
  - Delete contacts
  - Need to create: `contactListProvider`

**5. Settings Screen** ⏱️ 2-3 hours
- **Priority:** MEDIUM
- **Complexity:** Low
- **Features:**
  - User profile display
  - Notification settings toggles
  - Privacy settings
  - Sign out button

### Phase 3: Advanced (Week 4)

**6. Onboarding Flow** ⏱️ 6-8 hours
- **Priority:** MEDIUM
- **Complexity:** High
- **Features:**
  - 8-step flow
  - Google Calendar OAuth
  - Contact permission request
  - Partner invitation

---

## How to Rebuild a Screen

### Step-by-Step Process

#### 1. Analyze the Old Screen

Look at the current implementation in `lib/ui/screens/[screen_name].dart`:

```dart
// OLD CODE (don't use this)
class DashboardScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final eventProvider = context.watch<EventProvider>();  // ❌ Old way
    // ...
  }
}
```

**Identify:**
- What data does it need? (events, contacts, user profile)
- What actions can users take? (add event, delete contact, etc.)
- What providers does it reference? (EventProvider, UserProfileProvider)

#### 2. Check if Required Providers Exist

Look in `lib/logic/providers/`:
- ✅ `event_providers.dart` - eventListProvider exists
- ✅ `auth_providers.dart` - authStateProvider exists
- ❌ `contact_providers.dart` - NEED TO CREATE
- ❌ `user_profile_providers.dart` - NEED TO CREATE

#### 3. Create Missing Providers (if needed)

Example: Creating contact provider

```dart
// lib/logic/providers/contact_providers.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/contact.dart';
import '../services/api_service.dart';

part 'contact_providers.g.dart';

@riverpod
class ContactList extends _$ContactList {
  @override
  Future<List<Contact>> build() async {
    return await ContactApi.getContacts();
  }

  Future<void> addContact(Contact contact) async {
    state = const AsyncValue.loading();
    try {
      await ContactApi.createContact(contact);
      state = AsyncValue.data(await ContactApi.getContacts());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}
```

#### 4. Rebuild the Screen

Convert to `ConsumerWidget` and use Riverpod:

```dart
// NEW CODE ✅
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/event_providers.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch the event list
    final eventsAsync = ref.watch(eventListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: eventsAsync.when(
        data: (events) => _buildDashboard(context, ref, events),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }

  Widget _buildDashboard(BuildContext context, WidgetRef ref, List<CalendarEvent> events) {
    final upcomingCount = events.where((e) => e.start.isAfter(DateTime.now())).length;
    
    return Column(
      children: [
        Text('Upcoming Events: $upcomingCount'),
        // ... rest of UI
      ],
    );
  }
}
```

#### 5. Test the Screen

```bash
# Hot reload to see changes
# Press 'r' in terminal while app is running

# Or hot restart
# Press 'R' in terminal
```

---

## Code Examples

### Example 1: Simple Screen with Read-Only Data

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/event_providers.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: eventsAsync.when(
        // Success state - show data
        data: (events) {
          if (events.isEmpty) {
            return const Center(child: Text('No events yet'));
          }
          return ListView.builder(
            itemCount: events.length,
            itemBuilder: (context, index) {
              final event = events[index];
              return ListTile(
                title: Text(event.title),
                subtitle: Text(event.start.toString()),
              );
            },
          );
        },
        // Loading state
        loading: () => const Center(child: CircularProgressIndicator()),
        // Error state
        error: (error, stack) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
```

### Example 2: Screen with Mutations (Add/Delete)

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../domain/event.dart';
import '../../logic/providers/event_providers.dart';

class EventsScreen extends ConsumerWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final eventsAsync = ref.watch(eventListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Events'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showAddEventDialog(context, ref),
          ),
        ],
      ),
      body: eventsAsync.when(
        data: (events) => ListView.builder(
          itemCount: events.length,
          itemBuilder: (context, index) {
            final event = events[index];
            return ListTile(
              title: Text(event.title),
              subtitle: Text(event.start.toString()),
              trailing: IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () => _deleteEvent(ref, event.id),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
      ),
    );
  }

  void _showAddEventDialog(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AddEventDialog(
        onSave: (title, description, start, end) {
          final event = CalendarEvent(
            id: const Uuid().v4(),
            title: title,
            description: description,
            start: start,
            end: end,
            ownerId: 'current-user-id', // Get from auth provider
          );
          ref.read(eventListProvider.notifier).addEvent(event);
        },
      ),
    );
  }

  void _deleteEvent(WidgetRef ref, String eventId) {
    ref.read(eventListProvider.notifier).deleteEvent(eventId);
  }
}
```

### Example 3: Combining Multiple Providers

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/providers/event_providers.dart';
import '../../logic/providers/contact_providers.dart';
import '../../logic/providers/auth_providers.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch multiple providers
    final eventsAsync = ref.watch(eventListProvider);
    final contactsAsync = ref.watch(contactListProvider);
    final user = ref.watch(authStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${user?.email ?? "User"}'),
      ),
      body: Column(
        children: [
          // Events summary card
          eventsAsync.when(
            data: (events) => _EventsSummaryCard(events: events),
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const Text('Error loading events'),
          ),
          
          // Contacts summary card
          contactsAsync.when(
            data: (contacts) => _ContactsSummaryCard(contacts: contacts),
            loading: () => const CircularProgressIndicator(),
            error: (_, __) => const Text('Error loading contacts'),
          ),
        ],
      ),
    );
  }
}
```

---

## Common Patterns

### Pattern 1: Handling AsyncValue States

```dart
// Always use .when() for AsyncValue
ref.watch(someProvider).when(
  data: (value) => Text('Loaded: $value'),
  loading: () => CircularProgressIndicator(),
  error: (error, stack) => Text('Error: $error'),
);

// Or use .maybeWhen() for partial handling
ref.watch(someProvider).maybeWhen(
  data: (value) => Text('Loaded: $value'),
  orElse: () => CircularProgressIndicator(),
);
```

### Pattern 2: Refreshing Data

```dart
// Add refresh method to provider
@riverpod
class EventList extends _$EventList {
  @override
  Future<List<CalendarEvent>> build() async {
    return await CalendarApi.getEvents();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => CalendarApi.getEvents());
  }
}

// Use in UI
ElevatedButton(
  onPressed: () => ref.read(eventListProvider.notifier).refresh(),
  child: const Text('Refresh'),
);
```

### Pattern 3: Navigation with go_router

```dart
import 'package:go_router/go_router.dart';

// Navigate to another screen
ElevatedButton(
  onPressed: () => context.go('/events'),
  child: const Text('View Events'),
);

// Navigate with parameters
context.go('/event/${event.id}');

// Go back
context.pop();
```

---

## Availability Signals Guidelines

- Signals are read-only for partners; only the person who created a signal can update or cancel it.
- Always tint timeline and calendar chips with the signal owner's color (partners see a translucent version on their own view).
- Timeline copy stays neutral (no “You”) and should reference the actor via name/`partnerId` when the action comes from someone else.
- Signal detail modals reuse the event layout but only expose the invited partners list and the original toggle choices for editing.
- Canceling an unbooked signal is silent (no push or in-app alert), though the change still appears in Recent Activity for auditing.
- Events created off a signal remain on the calendar even if the originating signal is later withdrawn.

---

## Testing

### Unit Testing Providers

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  test('EventList provider loads events', () async {
    final container = ProviderContainer();
    
    // Wait for provider to load
    final events = await container.read(eventListProvider.future);
    
    expect(events, isA<List<CalendarEvent>>());
  });
}
```

### Widget Testing

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('Dashboard shows event count', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: DashboardScreen(),
        ),
      ),
    );

    // Wait for async data to load
    await tester.pumpAndSettle();

    // Verify UI
    expect(find.text('Upcoming Events:'), findsOneWidget);
  });
}
```

---

## Common Issues & Solutions

### Issue 1: "Undefined class 'WidgetRef'"

**Solution:** Change `StatelessWidget` to `ConsumerWidget`:

```dart
// ❌ Wrong
class MyScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) { ... }
}

// ✅ Correct
class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) { ... }
}
```

### Issue 2: "The method 'watch' isn't defined for BuildContext"

**Solution:** Use `ref.watch()` instead of `context.watch()`:

```dart
// ❌ Wrong (old Provider way)
final events = context.watch<EventProvider>();

// ✅ Correct (new Riverpod way)
final events = ref.watch(eventListProvider);
```

### Issue 3: "Provider not found"

**Solution:** Ensure the provider is generated:

```bash
# Run code generation
dart run build_runner build --delete-conflicting-outputs
```

### Issue 4: "Type mismatch with AsyncValue"

**Solution:** Use `.when()` to handle all states:

```dart
// ❌ Wrong - trying to use AsyncValue directly
final events = ref.watch(eventListProvider);
ListView.builder(itemCount: events.length); // Error!

// ✅ Correct - handle async states
final eventsAsync = ref.watch(eventListProvider);
eventsAsync.when(
  data: (events) => ListView.builder(itemCount: events.length),
  loading: () => CircularProgressIndicator(),
  error: (e, s) => Text('Error: $e'),
);
```

---

## Resources

- **Riverpod Docs:** https://riverpod.dev/
- **Freezed Docs:** https://pub.dev/packages/freezed
- **go_router Docs:** https://pub.dev/packages/go_router
- **Supabase Flutter:** https://supabase.com/docs/reference/dart
- **Project Spec:** See `main.md` for full feature specification

---

## Next Steps

1. ✅ Complete Supabase setup (see `SUPABASE_SETUP.md`)
2. ✅ Run code generation
3. ✅ Start with Dashboard Screen (easiest to rebuild)
4. ✅ Move to Calendar Screen
5. ✅ Build remaining screens in priority order

**Questions?** Check `main.md` for product specifications or `SETUP_STATUS.md` for migration notes.

**Good luck! 🚀**
