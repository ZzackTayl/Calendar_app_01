# MyOrbit Frontend Implementation Plan

**Date:** October 12, 2025  
**Phase:** Phase 1 - UI/Frontend Implementation (No Backend Required)

---

## Executive Summary

This document outlines the complete frontend implementation plan for MyOrbit calendar app. All items listed can be built without requiring Supabase, external APIs, or cloud services. We'll use mock data and local state management to build fully functional UI components.

---

## Current Status

### ✅ Completed Screens
1. **Landing Screen** - Fully implemented with gradient design
2. **Onboarding Screen** - 8-step flow with Google Calendar connection, partner invites, and contact permissions
3. **Dashboard Screen** - Main hub with cards, signals overview, and navigation
4. **Calendar Screen** - Month, week, and day views with event + signal overlays
5. **Signal Center** - Dedicated availability management hub with history timeline

### 🚧 Partially Implemented
1. **People & Groups Screen** - Placeholder only
2. **Settings Screen** - Placeholder only
3. **Events Screen** - Placeholder only

### ❌ Remaining Core Features
1. Partner groups management and bulk permission editing
2. Advanced calendar interactions (drag & drop, agenda view, multi-week overview)
3. Confirmation dialogs for destructive actions (event cancel/delete, partner removal)
4. Offline/real backend data wiring (Supabase integration + seeding strategy)
5. Expanded accessibility testing and polish across new components

---

## Implementation Phases

### Phase 1A: Core UI Components & Widgets (Priority 1)

#### 1.1 Reusable Widgets
- [ ] **PartnerAvatar** - Colored avatar with initials/photo
- [ ] **PermissionBadge** - Visual indicator for permission levels (Private/Semi-Visible/Visible)
- [ ] **EventCard** - Reusable event display component
- [ ] **PartnerCard** - Display partner with status badge
- [ ] **PrivacyLevelSelector** - Dropdown for event privacy (Normal/Exclusive/Super Exclusive)
- [ ] **ConfirmationDialog** - Reusable confirmation with custom actions
- [ ] **EmptyState** - Consistent empty state component
- [ ] **LoadingState** - Consistent loading indicator

#### 1.2 Bottom Navigation Bar
- [ ] Create bottom tab bar component
- [ ] Implement navigation between: Dashboard, Calendar, People, Activity
- [ ] Add active state indicators
- [ ] Integrate with existing screens

#### 1.3 Event Management Components
- [ ] **Enhanced AddEventDialog** with:
  - Title, Description, Date, Start/End time
  - Privacy level selector (Normal/Exclusive/Super Exclusive)
  - Partner invitation multi-select
  - Visual permission indicators per partner
- [ ] **EditEventDialog** - Similar to add but with existing data
- [ ] **EventDetailsSheet** - Bottom sheet showing full event details
- [ ] **DeleteEventDialog** - Confirmation with reschedule options

---

### Phase 1B: Complete Onboarding Flow (Priority 1)

Current: 8 steps → Target: 8 steps per specification

#### Missing Steps:
- [x] **Step 4: Add Partners** - Optional partner addition
- [x] **Step 5: Contact Permission** - Request device contacts
- [x] **Step 6: Select Contacts** - Multi-select contact list
- [x] **Step 7: Invite Method** - Choose invite vs reference contact
- [x] Update step counter (4 → 8)
- [x] Add skip functionality for optional steps

---

### Phase 1C: Calendar Enhancements (Priority 1)

#### Week View
- [ ] Horizontal 7-day layout
- [ ] 2 event bars per day
- [ ] Swipe navigation between weeks
- [ ] Event overflow indicator

#### Day View
- [ ] Large date header
- [ ] Detailed hourly schedule
- [ ] Event blocks with time slots
- [ ] Scroll to current time

#### Month View Improvements
- [ ] Long-press (800ms) to create event
- [ ] Event dots (max 2 + overflow)
- [ ] Today highlight with orange→pink gradient
- [ ] Better event indicators from real data

---

### Phase 1D: People & Groups Screen (Priority 2)

#### Main Features:
- [ ] **Partner List** with:
  - Search/filter functionality
  - Status badges (Connected/Pending/Contact-Only)
  - Permission level indicators
  - Tap to view details
- [ ] **Add Partner Flow**:
  - Manual entry form
  - Contact import (mock)
  - Send invite UI
- [ ] **Partner Details Sheet**:
  - Profile information
  - Permission level editor
  - Custom labels
  - Event history
  - Remove partner option
- [ ] **Groups Management** (if time):
  - Create/edit groups
  - Add partners to groups
  - Group-based event invites

#### Mock Data Structure:
```dart
class Partner {
  String id;
  String name;
  String? email;
  PartnerStatus status; // accepted, pending, contact-only
  PermissionLevel permission; // private, semi-visible, visible
  List<String> customLabels;
  Color avatarColor;
}
```

---

### Phase 1E: Settings Screen (Priority 2)

#### Sections:
- [ ] **Profile Settings**:
  - Display name editor
  - Time zone selector
  - Profile photo placeholder
- [ ] **Privacy & Permissions**:
  - Default permission level for new partners
  - Default event privacy level
  - Contact access toggle
- [ ] **Appearance**:
  - Dark mode toggle
  - Theme preview
- [ ] **Notifications** (UI only):
  - Per-feature toggles
  - Channel preferences (Push/Email/In-App)
- [ ] **Calendar Sync** (UI only):
  - Connected calendars list
  - Add calendar button (disabled with "Coming Soon")
- [ ] **Account**:
  - Email display
  - Change password (UI only)
  - Delete account (confirmation dialog)
- [ ] **About**:
  - App version
  - Privacy policy link
  - Terms of service link

---

### Phase 1F: Activity & Notifications Screen (Priority 2)

#### Features:
- [ ] **Notification Center**:
  - List of notifications with icons
  - Timestamp display
  - Read/unread states
  - Swipe to dismiss
  - Tap to navigate to relevant screen
- [ ] **Recent Activity Feed**:
  - Event invitations
  - Partner requests
  - Event updates
  - Calendar sync status
- [ ] **Filter/Sort Options**:
  - All/Unread toggle
  - Date range filter
  - Category filter

#### Mock Notification Types:
- Event invitation
- Event accepted
- Event canceled
- Connection request
- Connection accepted
- Calendar sync complete

---

### Phase 1G: Events Screen Enhancement (Priority 2)

#### Features:
- [ ] **Event List View**:
  - Upcoming events section
  - Past events section
  - Search functionality
  - Filter by partner/privacy level
- [ ] **Event Creation Entry Point**:
  - Floating action button
  - Quick add from header
- [ ] **Event Cards** with:
  - Title, date, time
  - Attendee avatars
  - Privacy level indicator
  - Tap to view details

---

### Phase 1H: Advanced Features (Priority 3)

#### Availability Signals (UI Only)
- [x] **Signal Creation Dialog**:
  - Time block selector
  - Connection multi-select
  - Notification toggle per connection (notify & auto-accept)
  - Optional note and “keep showing until I turn it off” toggle
- [x] **Signal Display**:
  - Visual layer on calendar
  - Different styling from events
  - Edit/delete options
- [x] **Calendar entry point**: Long-press day → choose Create Event vs Signal Availability
- [x] **Conflict handling**: Event creation warns about overlapping signals and offers cancel/trim options

#### Confirmation Dialogs
- [ ] **Delete Event**:
  - Show event title
  - Mention attendee notifications
  - "Set reminder to reschedule" toggle
  - "Auto-reschedule" toggle (AI feature)
- [ ] **Cancel Event**:
  - Similar to delete
  - Reschedule options
- [ ] **Permission Change**:
  - Show partner name
  - Show old → new permission
  - Visibility implications warning
- [ ] **Remove Partner**:
  - Confirmation
  - Explain event retention

#### Updates & Guides Screen
- [ ] **What's New** section
- [ ] **Tutorial Cards**:
  - How to add partners
  - Understanding privacy levels
  - Creating events
  - Using availability signals
- [ ] **Tips & Best Practices**
- [ ] **FAQ Section**

---

### Phase 1I: Dark Mode Implementation (Priority 3)

#### Requirements:
- [ ] Create dark theme in main.dart
- [ ] Update all screens to respect theme
- [ ] Pure black background (#000000)
- [ ] Dark gray cards
- [ ] Adjust gradient colors for dark mode
- [ ] Test all screens in both modes
- [ ] Add theme toggle in settings

---

### Phase 1J: Code Quality Improvements (Ongoing)

#### Issues to Fix:
1. **Inconsistent Gradients**:
   - Landing: `Color(0xFFE6F3FF) → Color(0xFFFDE6FF)`
   - Onboarding/Dashboard/Calendar: `Color(0xFFB7F0FF) → Color(0xFFF7C8FF)`
   - **Action**: Standardize to cyan→pink per spec

2. **Missing Navigation**:
   - Add bottom navigation bar
   - Implement proper back navigation
   - Add navigation to Activity screen

3. **Hardcoded Data**:
   - Replace mock data with proper state management
   - Create mock data providers for development

4. **Missing Error States**:
   - Add error handling UI
   - Network error states
   - Empty states

5. **Accessibility**:
   - Add semantic labels
   - Ensure proper contrast ratios
   - Add screen reader support

---

## Mock Data Strategy

### Local State Management
Use Riverpod providers with mock data:

```dart
// Mock Partners
final mockPartnersProvider = Provider<List<Partner>>((ref) => [
  Partner(id: '1', name: 'Alex', status: PartnerStatus.accepted, 
          permission: PermissionLevel.visible, avatarColor: Colors.purple),
  Partner(id: '2', name: 'Sam', status: PartnerStatus.accepted,
          permission: PermissionLevel.semiVisible, avatarColor: Colors.blue),
  Partner(id: '3', name: 'Jordan', status: PartnerStatus.pending,
          permission: PermissionLevel.private, avatarColor: Colors.green),
]);

// Mock Events
final mockEventsProvider = Provider<List<CalendarEvent>>((ref) => [
  CalendarEvent(
    id: '1',
    title: 'Coffee with Sam',
    start: DateTime.now().add(Duration(hours: 2)),
    end: DateTime.now().add(Duration(hours: 3)),
    privacyLevel: PrivacyLevel.normal,
    invitedPartnerIds: ['2'],
  ),
  // ... more mock events
]);

// Mock Notifications
final mockNotificationsProvider = Provider<List<Notification>>((ref) => [
  Notification(
    id: '1',
    type: NotificationType.eventInvitation,
    title: 'New event invitation',
    message: 'Alex invited you to Date Night',
    timestamp: DateTime.now().subtract(Duration(hours: 2)),
    isRead: false,
  ),
  // ... more notifications
]);
```

---

## File Structure

```
lib/
├── ui/
│   ├── screens/
│   │   ├── landing_screen.dart ✅
│   │   ├── onboarding_screen.dart ✅ (needs expansion)
│   │   ├── dashboard_screen.dart ✅
│   │   ├── calendar_screen.dart ✅ (needs week/day views)
│   │   ├── people_groups_screen.dart 🚧 (needs full implementation)
│   │   ├── activity_screen.dart ❌ (needs creation)
│   │   ├── events_screen.dart 🚧 (needs enhancement)
│   │   ├── settings_screen.dart 🚧 (needs full implementation)
│   │   └── updates_guides_screen.dart ❌ (needs creation)
│   ├── widgets/
│   │   ├── add_event_dialog.dart ✅ (needs enhancement)
│   │   ├── partner_avatar.dart ❌
│   │   ├── permission_badge.dart ❌
│   │   ├── event_card.dart ❌
│   │   ├── partner_card.dart ❌
│   │   ├── privacy_level_selector.dart ❌
│   │   ├── confirmation_dialog.dart ❌
│   │   ├── empty_state.dart ❌
│   │   ├── loading_state.dart ❌
│   │   ├── bottom_nav_bar.dart ❌
│   │   ├── partner_details_sheet.dart ❌
│   │   ├── event_details_sheet.dart ❌
│   │   └── notification_card.dart ❌
│   └── theme/
│       ├── app_colors.dart ❌
│       ├── app_text_styles.dart ❌
│       └── app_theme.dart ❌
├── domain/
│   ├── event.dart ✅
│   ├── contact.dart ✅
│   ├── partner.dart ❌ (needs creation)
│   ├── notification.dart ❌ (needs creation)
│   └── enums.dart ❌ (needs creation)
└── logic/
    └── providers/
        ├── mock_data_providers.dart ❌ (needs creation)
        ├── theme_provider.dart ❌ (needs creation)
        └── navigation_provider.dart ❌ (needs creation)
```

---

## Testing Strategy (UI Only)

### Manual Testing Checklist:
- [ ] All screens render correctly
- [ ] Navigation flows work
- [ ] Dialogs open/close properly
- [ ] Forms validate correctly
- [ ] Mock data displays properly
- [ ] Dark mode works on all screens
- [ ] Responsive on different screen sizes
- [ ] Animations are smooth
- [ ] No console errors

---

## Success Criteria

### Phase 1 Complete When:
1. ✅ All 8 onboarding steps implemented
2. ✅ Bottom navigation bar working
3. ✅ All main screens fully implemented (not placeholders)
4. ✅ Event creation/editing with full privacy controls
5. ✅ Partner management with permission levels
6. ✅ Activity/Notifications screen functional
7. ✅ Week and Day calendar views working
8. ✅ Settings screen with all sections
9. ✅ Dark mode fully implemented
10. ✅ All reusable widgets created
11. ✅ Mock data providers in place
12. ✅ Consistent design system applied

---

## Next Steps After Phase 1

**Phase 2** will involve:
- Supabase integration
- Real authentication
- Backend API connections
- Google Calendar sync
- Push notifications
- Real-time updates

But for now, we focus on building a complete, polished UI that works with mock data!

---

## Priority Order for Implementation

### Week 1: Foundation
1. Create reusable widgets (PartnerAvatar, PermissionBadge, etc.)
2. Implement bottom navigation bar
3. Create mock data providers
4. Standardize gradients and theme

### Week 2: Core Features
1. Complete onboarding flow (8 steps)
2. Enhanced event creation dialog
3. Week and Day calendar views
4. People & Groups screen full implementation

### Week 3: Secondary Features
1. Activity/Notifications screen
2. Settings screen full implementation
3. Events screen enhancement
4. Confirmation dialogs

### Week 4: Polish
1. Dark mode implementation
2. Updates & Guides screen
3. Availability signals UI
4. Code quality improvements
5. Testing and bug fixes

---

**Ready to start building! 🚀**
