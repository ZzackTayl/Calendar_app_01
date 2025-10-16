# Tech Stack Alignment Review & Recommendations

**Date:** October 12, 2025  
**Purpose:** Cross-reference techstack.md with FRONTEND_IMPLEMENTATION_PLAN.md to ensure smooth Phase 2 backend integration

---

## Executive Summary

After analyzing the tech stack document and comparing it with our implementation plan and existing code, I've identified several critical areas that need attention to ensure seamless backend integration. The good news: **our domain models and API structure are already well-aligned with the Supabase schema**. However, we need to make strategic adjustments to our implementation approach.

### Key Findings:
✅ **Well Aligned:** Domain models, Riverpod usage, API service structure  
⚠️ **Needs Adjustment:** Mock data strategy, state management patterns, missing domain models  
⚠️ **Needs attention:** Visibility service & profile management; availability signal UI still pending

---

## 1. Current State Analysis

### ✅ What's Working Well

#### 1.1 Domain Models Match Backend Schema
Our existing models align perfectly with the Supabase schema:

- **[`CalendarEvent`](lib/domain/event.dart:2)** matches `events` table:
  - Has `externalProvider` and `externalEventId` for Google Calendar sync ✅
  - Includes `privacyLevel` (normal/exclusive/superExclusive) ✅
  - Has `invitedPartnerIds` for event invitations ✅
  - Proper `ownerId`, `createdAt`, `updatedAt` timestamps ✅

- **[`Contact`](lib/domain/contact.dart:2)** matches `contacts` table:
  - Has `status` (pending/accepted/contactOnly) ✅
  - Has `permission` (private/semiVisible/visible) ✅
  - Includes `externalUserId` for linked MyOrbit users ✅
  - Has `labels` array for custom taxonomy ✅

- **[`EventInvite`](lib/domain/event.dart:151)** matches `event_invites` table ✅

#### 1.2 Riverpod Architecture is Correct
- Using `riverpod_annotation` with code generation ✅
- Proper async state management with `AsyncValue` ✅
- Good separation: providers → services → API ✅
- Already using `StateNotifierProvider` pattern correctly ✅

#### 1.3 API Service Structure is Production-Ready
- [`CalendarApi`](lib/logic/services/api_service.dart:9) and [`ContactApi`](lib/logic/services/api_service.dart:122) already use real Supabase client ✅
- Proper error handling with try-catch ✅
- Owner-scoped queries (RLS-ready) ✅
- Correct use of `.eq('owner_id', userId)` for security ✅

---

## 2. Critical Gaps & Required Changes

### ❌ 2.1 Missing Domain Models

According to techstack.md, we need these additional models:

#### **Signals & Availability**
Domain models (`AvailabilitySignal`, `SignalShare`) and the associated service layer now live in `lib/domain/` and `lib/logic/services/signals_service.dart`. Providers in `lib/logic/providers/signal_providers.dart` expose active/shared signals for widgets.

#### **User Profile** (Medium Priority)
```dart
// lib/domain/profile.dart - NEEDS CREATION
class UserProfile {
  final String id; // matches auth.users.id
  final String displayName;
  final String timezone;
  final String? avatarUrl;
  final DateTime? createdAt;
  final DateTime? updatedAt;
}
```

#### **Labels** (Low Priority - Optional for MVP)
```dart
// lib/domain/label.dart - NEEDS CREATION
class Label {
  final String id;
  final String ownerId;
  final String name;
  final String? color;
  final DateTime? createdAt;
}
```

### ⚠️ 2.2 Missing Services

#### **Visibility Service** (Critical for MVP)
According to techstack.md lines 102-110, we need a service to implement the visibility override hierarchy:

```dart
// lib/logic/services/visibility_service.dart - NEEDS CREATION
class VisibilityService {
  /// Determine what a contact can see for a specific event
  static EventVisibility calculateVisibility({
    required CalendarEvent event,
    required Contact contact,
    required List<String> invitedPartnerIds,
  }) {
    // 1. If invited → FULL visibility
    if (invitedPartnerIds.contains(contact.id)) {
      return EventVisibility.full;
    }
    
    // 2. If event is super-exclusive or exclusive → NONE
    if (event.privacyLevel == EventPrivacyLevel.superExclusive ||
        event.privacyLevel == EventPrivacyLevel.exclusive) {
      return EventVisibility.none;
    }
    
    // 3. Check contact permission level
    switch (contact.permission) {
      case PartnerPermission.visible:
        return EventVisibility.full;
      case PartnerPermission.semiVisible:
        return EventVisibility.busyOnly;
      case PartnerPermission.private:
        return EventVisibility.none;
    }
  }
}

enum EventVisibility {
  full,      // Can see all details
  busyOnly,  // Can only see time is blocked
  none,      // Cannot see event exists
}
```

#### **Signals Service** (Medium Priority)
```dart
// lib/logic/services/signals_service.dart - NEEDS CREATION
class SignalsService {
  static Future<List<AvailabilitySignal>> getSignals() async { ... }
  static Future<void> createSignal(AvailabilitySignal signal) async { ... }
  static Future<void> shareSignal(String signalId, List<String> contactIds) async { ... }
  static Future<void> consumeSignal(String signalId) async { ... }
}
```

### ⚠️ 2.3 Mock Data Strategy Needs Revision

**Current Issue:** The implementation plan suggests creating mock data providers, but this conflicts with our production-ready API structure.

**Recommended Approach:**

1. **Keep Real API Calls** - Don't create separate mock providers
2. **Use Feature Flags** - Add a development mode toggle
3. **Seed Development Database** - Create a Supabase seeding script

```dart
// lib/core/env.dart - ADD THIS
class AppConfig {
  static const bool isDevelopment = bool.fromEnvironment('DEV_MODE', defaultValue: false);
  static const bool useMockData = bool.fromEnvironment('USE_MOCKS', defaultValue: false);
}

// Then in providers, optionally return mock data:
@riverpod
class EventList extends _$EventList {
  @override
  Future<List<CalendarEvent>> build() async {
    if (AppConfig.useMockData) {
      return _getMockEvents(); // Only for testing
    }
    return await CalendarApi.getEvents(); // Real API
  }
}
```

**Better Alternative:** Create a Supabase seed script:
```sql
-- supabase/seed.sql
INSERT INTO profiles (id, display_name, timezone) VALUES
  ('user-1', 'Test User', 'America/Los_Angeles');

INSERT INTO contacts (id, owner_id, name, status, permission) VALUES
  ('contact-1', 'user-1', 'Alex Partner', 'accepted', 'visible'),
  ('contact-2', 'user-1', 'Sam Friend', 'accepted', 'semi_visible');

INSERT INTO events (id, owner_id, title, start, end, privacy_level) VALUES
  ('event-1', 'user-1', 'Coffee with Sam', '2025-10-15 10:00:00', '2025-10-15 11:00:00', 'normal');
```

---

## 3. Implementation Plan Adjustments

### 3.1 Changes to FRONTEND_IMPLEMENTATION_PLAN.md

#### **Remove/Modify These Sections:**

1. **Mock Data Strategy (lines 310-351)** → Replace with:
   - Use real Supabase with seeded development data
   - Add feature flag for optional mock mode
   - Focus on building UI that works with real API responses

2. **Mock Data Providers (line 396)** → Change to:
   - `development_seed_data.dart` - SQL seed scripts
   - `feature_flags.dart` - Development mode toggles

#### **Add These New Sections:**

1. **Phase 1A-bis: Missing Domain Models**
   ```markdown
   - [ ] Create AvailabilitySignal model
   - [ ] Create SignalShare model
   - [ ] Create UserProfile model
   - [ ] Create Label model (optional)
   - [ ] Add EventVisibility enum
   ```

2. **Phase 1A-ter: Core Services**
   ```markdown
   - [ ] Create VisibilityService with hierarchy logic
- [x] Create SignalsService for availability features
   - [ ] Create ProfileService for user profile management
   - [ ] Update providers to use new services
   ```

### 3.2 Recommended Priority Reordering

**Before starting UI work, complete these foundation items:**

1. **Week 0: Backend-Ready Foundation** (NEW)
   - Create missing domain models (Signals, Profile, Labels)
   - Implement VisibilityService
   - Create Supabase seed scripts for development
   - Add feature flags for dev mode

2. **Week 1: Core UI Components** (as planned)
   - Reusable widgets
   - Bottom navigation
   - Theme standardization

3. **Week 2-4: Feature Implementation** (as planned)
   - But now with proper backend-ready models

---

## 4. Specific Code Recommendations

### 4.1 Update Existing Models

#### **Add to [`CalendarEvent`](lib/domain/event.dart:2):**
```dart
// Add helper method for visibility checks
bool isVisibleTo(Contact contact, List<String> invitedPartnerIds) {
  return VisibilityService.calculateVisibility(
    event: this,
    contact: contact,
    invitedPartnerIds: invitedPartnerIds,
  ) != EventVisibility.none;
}
```

#### **Add to [`Contact`](lib/domain/contact.dart:2):**
```dart
// Add helper for avatar color generation
Color get avatarColor {
  // Generate consistent color from name hash
  final hash = name.hashCode;
  return Color(0xFF000000 + (hash % 0xFFFFFF));
}

// Add helper for display status
String get statusDisplay {
  switch (status) {
    case ContactStatus.accepted:
      return 'Connected';
    case ContactStatus.pending:
      return 'Pending';
    case ContactStatus.contactOnly:
      return 'Contact Only';
  }
}
```

### 4.2 Enhance Providers

#### **Add to [`event_providers.dart`](lib/logic/providers/event_providers.dart:1):**
```dart
// Provider for events with visibility filtering
@riverpod
List<CalendarEvent> visibleEventsForContact(
  Ref ref,
  String contactId,
  DateTime date,
) {
  final events = ref.watch(eventsForDateProvider(date));
  final contact = ref.watch(contactByIdProvider(contactId));
  
  if (contact == null) return [];
  
  return events.where((event) {
    final visibility = VisibilityService.calculateVisibility(
      event: event,
      contact: contact,
      invitedPartnerIds: event.invitedPartnerIds,
    );
    return visibility != EventVisibility.none;
  }).toList();
}
```

### 4.3 Add Missing Providers

```dart
// lib/logic/providers/signal_providers.dart - NEEDS CREATION
@riverpod
class SignalList extends _$SignalList {
  @override
  Future<List<AvailabilitySignal>> build() async {
    return await SignalsService.getSignals();
  }
  
  Future<void> createSignal(AvailabilitySignal signal) async { ... }
  Future<void> shareSignal(String signalId, List<String> contactIds) async { ... }
}

// lib/logic/providers/profile_providers.dart - NEEDS CREATION
@riverpod
class UserProfileNotifier extends _$UserProfileNotifier {
  @override
  Future<UserProfile?> build() async {
    return await ProfileService.getCurrentProfile();
  }
  
  Future<void> updateProfile(UserProfile profile) async { ... }
}
```

---

## 5. Best Practices for Backend Integration

### 5.1 State Management Patterns

✅ **DO:**
- Use `AsyncValue` for all async data (loading/error states)
- Invalidate providers after mutations to trigger refetch
- Use `ref.watch` for reactive dependencies
- Keep business logic in services, not providers

❌ **DON'T:**
- Store backend data in local state unnecessarily
- Create duplicate mock providers alongside real ones
- Mix UI logic with data fetching logic
- Forget to handle loading and error states

### 5.2 Data Model Best Practices

✅ **DO:**
- Use `copyWith` for immutable updates
- Include `toJson`/`fromJson` for serialization
- Match field names to Supabase column names (snake_case in JSON)
- Use nullable types appropriately
- Store all timestamps in UTC

❌ **DON'T:**
- Use mutable classes for domain models
- Forget `createdAt`/`updatedAt` timestamps
- Store timezone-aware DateTime objects
- Use different field names than backend schema

### 5.3 API Integration Patterns

✅ **DO:**
- Always check `currentUser` before API calls
- Use `.eq('owner_id', userId)` for RLS compliance
- Handle errors gracefully (return empty lists, not throw)
- Log errors for debugging
- Use proper HTTP status codes

❌ **DON'T:**
- Make API calls without authentication check
- Expose sensitive data in error messages
- Forget to order query results
- Skip error handling

### 5.4 Riverpod Provider Patterns

```dart
// ✅ GOOD: Proper async provider with error handling
@riverpod
class EventList extends _$EventList {
  @override
  Future<List<CalendarEvent>> build() async {
    return await CalendarApi.getEvents();
  }
  
  Future<void> addEvent(CalendarEvent event) async {
    state = const AsyncValue.loading();
    try {
      await CalendarApi.createEvent(event);
      state = AsyncValue.data(await CalendarApi.getEvents());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }
}

// ❌ BAD: Mixing mock and real data
@riverpod
class EventList extends _$EventList {
  @override
  Future<List<CalendarEvent>> build() async {
    if (useMockData) {
      return mockEvents; // Don't do this
    }
    return await CalendarApi.getEvents();
  }
}
```

---

## 6. Phase 2 Preparation Checklist

Before starting Phase 2 (backend integration), ensure:

### Domain Layer
- [ ] All domain models created (Events ✅, Contacts ✅, Signals ✅, Profile ❌)
- [ ] Models have proper `toJson`/`fromJson` methods
- [ ] All enums defined and match backend schema
- [ ] Helper methods added for common operations

### Service Layer
- [ ] VisibilityService implemented with hierarchy logic
- [ ] SignalsService created for availability features
- [ ] ProfileService created for user management
- [ ] All services use Supabase client correctly
- [ ] Error handling is consistent across services

### Provider Layer
- [ ] All providers use `AsyncValue` properly
- [ ] Providers invalidate/refetch after mutations
- [ ] No mock data mixed with real providers
- [ ] Proper dependency injection with `ref.watch`

### UI Layer
- [ ] All screens handle loading states
- [ ] All screens handle error states
- [ ] All screens handle empty states
- [ ] Forms validate before API calls
- [ ] Success/error feedback shown to users

### Configuration
- [ ] Environment variables properly configured
- [ ] Supabase URL and anon key in `.env`
- [ ] Development seed data created
- [ ] Feature flags for dev mode (optional)

---

## 7. Recommended File Structure Updates

```
lib/
├── core/
│   ├── env.dart ✅
│   ├── supabase_client.dart ✅
│   └── feature_flags.dart ❌ (ADD)
├── domain/
│   ├── event.dart ✅
│   ├── contact.dart ✅
│   ├── signal.dart ❌ (ADD)
│   ├── profile.dart ❌ (ADD)
│   ├── label.dart ❌ (ADD - optional)
│   └── enums.dart ❌ (ADD - consolidate all enums)
├── logic/
│   ├── services/
│   │   ├── api_service.dart ✅
│   │   ├── visibility_service.dart ❌ (ADD)
│   │   ├── signals_service.dart ❌ (ADD)
│   │   ├── profile_service.dart ❌ (ADD)
│   │   ├── contacts_service.dart ✅
│   │   └── permission_service.dart ✅
│   └── providers/
│       ├── auth_providers.dart ✅
│       ├── event_providers.dart ✅
│       ├── contact_providers.dart ✅
│       ├── signal_providers.dart ❌ (ADD)
│       ├── profile_providers.dart ❌ (ADD)
│       └── visibility_providers.dart ❌ (ADD)
└── ui/
    └── (as planned in implementation plan)
```

---

## 8. Migration Strategy

### For Existing Code:

1. **Don't break what works** - Keep existing Event and Contact models
2. **Add, don't replace** - Create new models alongside existing ones
3. **Gradual integration** - Add services one at a time
4. **Test incrementally** - Verify each service works before moving on

### For New Features:

1. **Start with domain model** - Define the data structure first
2. **Create service layer** - Implement business logic
3. **Add providers** - Wire up state management
4. **Build UI** - Create screens that consume providers

---

## 9. Key Takeaways

### ✅ Good News:
1. Your domain models are **already backend-ready**
2. Your Riverpod architecture is **correct and production-ready**
3. Your API service structure **matches Supabase patterns perfectly**
4. You're using **proper security patterns** (owner-scoped queries)

### ⚠️ Action Items (updated):
1. **Create remaining domain models** (Profile still outstanding)
2. **Implement VisibilityService** - critical for MVP functionality
3. **Replace mock data** with real API once backend is ready (signals providers already wired for mutation)
4. **Add profile management providers** when the domain model lands

### 🎯 Strategic Recommendation:

**Current guidance:** Signal infrastructure now exists; focus next on VisibilityService + profile model so the UI can plug into real permissions without rework.

---

## 10. Next Steps

1. **Review this document** with the team
2. **Update FRONTEND_IMPLEMENTATION_PLAN.md** with new priorities
3. **Create missing domain models** (Profile)
4. **Implement core services** (VisibilityService first)
5. **Create Supabase seed data** for development
6. **Resume UI development** with proper foundations

---

**Questions or concerns?** This analysis ensures Phase 2 will be smooth sailing! 🚀
