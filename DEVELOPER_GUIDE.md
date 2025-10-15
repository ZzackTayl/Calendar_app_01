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
- **State Management:** Riverpod 2.6+
- **Backend:** Supabase (Postgres + Auth)
- **Routing:** go_router 12+
- **Code Generation:** Freezed + build_runner

---

## Current Status

### ✅ What's Complete

**Backend Architecture:**
- ✅ Supabase integration (`lib/core/supabase_client.dart`)
- ✅ Environment configuration (`lib/core/env.dart`)
- ✅ Domain models with Freezed (`lib/domain/`)
  - Contact, Event, EventInvite models
  - Full JSON serialization
- ✅ API service layer (`lib/logic/services/api_service.dart`)
  - CalendarApi, ContactApi, AuthApi
- ✅ Riverpod providers (`lib/logic/providers/`)
  - eventListProvider, authStateProvider
- ✅ go_router navigation setup
- ✅ Landing Screen (no state, works as-is)

### ❌ What Needs Rebuilding

**UI Screens (currently using old Provider system):**
- ❌ Dashboard Screen
- ❌ Calendar Screen
- ❌ Events Screen
- ❌ People & Groups Screen
- ❌ Settings Screen
- ❌ Onboarding Flow (8 steps)
- ❌ Contact Permission Screen
- ❌ Add Contacts Method Screen

**Estimated Time:** 3-4 weeks for all screens

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

### Old vs New System

| Aspect | Old (Provider) | New (Riverpod) |
|--------|---------------|----------------|
| **Import** | `package:provider/provider.dart` | `package:flutter_riverpod/flutter_riverpod.dart` |
| **Widget Base** | `StatelessWidget` | `ConsumerWidget` |
| **Access State** | `context.watch<EventProvider>()` | `ref.watch(eventListProvider)` |
| **Mutations** | `context.read<EventProvider>().addEvent()` | `ref.read(eventListProvider.notifier).addEvent()` |
| **Provider Type** | `ChangeNotifierProvider` | `@riverpod class` with code generation |

---

## Getting Started

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

### 2. Set Up Supabase

**Follow `SUPABASE_SETUP.md` to:**
- Create Supabase project
- Get API credentials
- Update `.env` file
- Create database tables

### 3. Run the App

```bash
# For Windows
flutter run -d windows

# For Chrome (web)
flutter run -d chrome

# For Android emulator
flutter run -d emulator-5554
```

---

## Screen Rebuilding Priority

### Phase 1: Core Screens (Week 1-2)

**1. Dashboard Screen** ⏱️ 3-4 hours
- **Priority:** HIGH
- **Why First:** Central hub, most visible
- **Complexity:** Medium
- **Features:**
  - Display upcoming events count
  - Show connected partners count
  - Quick action cards
  - Uses: `eventListProvider`, `authStateProvider`

**2. Calendar Screen - Basic** ⏱️ 4-5 hours
- **Priority:** HIGH
- **Complexity:** Medium-High
- **Features:**
  - Month/Week views (skip Day view for now)
  - Display events from Riverpod
  - Tap to view event details
  - Uses: `eventListProvider`, `selectedDateProvider`

**3. Events Screen** ⏱️ 2-3 hours
- **Priority:** MEDIUM
- **Complexity:** Low-Medium
- **Features:**
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
