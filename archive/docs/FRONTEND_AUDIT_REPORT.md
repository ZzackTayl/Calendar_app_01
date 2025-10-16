# Frontend Audit Report - MyOrbit Calendar App
**Date:** October 5, 2025  
**Auditor:** AI Assistant  
**Project:** MyOrbit - Flutter Mobile App

---

## Executive Summary

This comprehensive audit identifies **15 incomplete features** across 8 screens and multiple components. The app has a solid foundation with beautiful UI design, but several key features are either placeholders or partially implemented. The most critical gaps are in the onboarding flow (Step 6), partner management, and backend integration.

**Overall Completion Status:** ~70% (UI complete, functionality partial)

---

## 🔴 CRITICAL - Must Complete for MVP

### 1. **Onboarding Step 6: Contact Selection Screen** 
**Location:** `lib/screens/onboarding_screen.dart` (lines 918-941)  
**Status:** ❌ Placeholder only  
**Impact:** HIGH - Breaks onboarding flow

**Current State:**
```dart
Widget _buildContactSelectionStep() {
  return Padding(
    padding: const EdgeInsets.symmetric(horizontal: 24),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('Select Contacts', ...),
        const Text('Step 6: Contact selection screen\n(To be implemented)', ...),
      ],
    ),
  );
}
```

**What's Missing:**
- No actual contact list display
- No selection mechanism (checkboxes/cards)
- No integration with ContactsService
- No state management for selected contacts
- No validation before proceeding

**Recommended Implementation:**
1. Fetch contacts from `ContactsService` (currently mock)
2. Display scrollable list with selectable cards (similar to Step 4 partner selection)
3. Store selections in state (`Set<String> _selectedContactIds`)
4. Pass selected contacts to Step 7 (AddContactsMethodScreen)
5. Add search/filter functionality for large contact lists

**User Impact:** Users cannot actually select contacts from their phone during onboarding, making the flow incomplete.

---

### 2. **Calendar Day View**
**Location:** `lib/screens/calendar_screen.dart` (lines 620-628)  
**Status:** ⚠️ Shows placeholder message  
**Impact:** MEDIUM - Feature advertised but not available

**Current State:**
```dart
case CalendarViewMode.day:
  _calendarFormat = CalendarFormat.week;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Day view coming soon. Showing week view for now.'),
    ),
  );
  break;
```

**What's Missing:**
- No day view implementation
- Toggle button exists but doesn't work as expected
- Falls back to week view

**Recommended Implementation:**
1. Create a custom day view widget showing hourly timeline (8am-10pm)
2. Display events in time slots with proper positioning
3. Allow drag-to-create new events
4. Show all-day events at the top
5. Consider using a package like `flutter_week_view` or build custom

**User Impact:** Users expect day view when they tap the "Day" toggle, but get week view instead with a confusing message.

---

### 3. **Partner Management - Add Partner**
**Location:** `lib/screens/people_groups_screen.dart` (lines 151-183)  
**Status:** ❌ Shows "coming soon" snackbar  
**Impact:** HIGH - Core feature unavailable

**Current State:**
```dart
Widget _buildAddPartnerButton() {
  return GestureDetector(
    onTap: () {
      // TODO: Implement add partner functionality
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add Partner functionality coming soon')),
      );
    },
    ...
  );
}
```

**What's Missing:**
- No flow to add new partners after onboarding
- No form/dialog to input partner details
- No integration with contacts or manual entry
- Cannot grow partner list post-setup

**Recommended Implementation:**
1. Create `AddPartnerDialog` or `AddPartnerScreen`
2. Offer two options:
   - Select from contacts (reuse contact selection logic)
   - Manual entry (name, email, relationship)
3. Set initial permission level
4. Choose invitation mode (reference only vs. invite to app)
5. Update `UserProfileProvider` with new partner
6. Persist to backend/storage

**User Impact:** After completing onboarding, users have no way to add additional partners, severely limiting the app's utility.

---

### 4. **Partner Management - Delete Partner**
**Location:** `lib/screens/people_groups_screen.dart` (lines 521-546)  
**Status:** ⚠️ Shows confirmation but doesn't delete  
**Impact:** MEDIUM - Confusing UX

**Current State:**
```dart
void _showDeleteConfirmation(PartnerProfile partner) {
  showDialog(
    ...
    TextButton(
      onPressed: () {
        Navigator.of(context).pop();
        // TODO: Implement delete functionality
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${partner.name} removed')),
        );
      },
      ...
    ),
  );
}
```

**What's Missing:**
- Confirmation dialog appears but doesn't actually remove partner
- No call to `UserProfileProvider.removePartner()` (method doesn't exist)
- Shows success message even though nothing happened

**Recommended Implementation:**
1. Add `removePartner(String id)` method to `UserProfileProvider`
2. Call it in the delete confirmation handler
3. Update UI to reflect removal
4. Persist change to backend
5. Consider soft delete vs. hard delete

**User Impact:** Users think they deleted a partner but the partner remains in the list, causing confusion and trust issues.

---

### 5. **Partner Management - Change Permissions**
**Location:** `lib/screens/people_groups_screen.dart` (lines 549-615)  
**Status:** ⚠️ Shows dialog but doesn't save changes  
**Impact:** MEDIUM - Core privacy feature broken

**Current State:**
```dart
Widget _buildPermissionOption(...) {
  return ListTile(
    ...
    onTap: () {
      Navigator.of(context).pop();
      // TODO: Implement permission change functionality
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Permission changed to $title')),
      );
    },
  );
}
```

**What's Missing:**
- Permission dialog shows but doesn't update partner
- No call to `UserProfileProvider.updatePartner()`
- Shows success message but permission stays the same

**Recommended Implementation:**
1. Update `UserProfileProvider.updatePartner()` to handle permission changes
2. Call it when user selects new permission
3. Refresh UI to show new permission badge
4. Persist to backend
5. Consider showing what each permission level means in detail

**User Impact:** Users cannot actually control what partners see, which is a core privacy feature of the app. This is a major trust and functionality issue.

---

## 🟡 HIGH PRIORITY - Important for User Experience

### 6. **Edit Profile Functionality**
**Location:** `lib/screens/settings_screen.dart` (lines 324-352)  
**Status:** ⚠️ Button exists but shows "coming soon"  
**Impact:** MEDIUM

**What's Missing:**
- No profile editing screen/dialog
- Cannot change name, email, avatar
- Profile data is hardcoded ("Your Name", "your.email@example.com")

**Recommended Implementation:**
1. Create `EditProfileScreen` or `EditProfileDialog`
2. Add fields for name, email, phone, avatar
3. Add avatar picker (camera/gallery)
4. Validate email format
5. Save to `UserProfileProvider` and backend

---

### 7. **Notifications System**
**Location:** `lib/screens/dashboard_screen.dart` (lines 44-65)  
**Status:** ⚠️ Bell icon exists but shows "coming soon"  
**Impact:** MEDIUM - Expected feature

**What's Missing:**
- No notification center/list
- No actual notification delivery
- Settings exist but don't connect to anything
- Red dot indicator is static (not dynamic)

**Recommended Implementation:**
1. Create `NotificationsScreen` to list all notifications
2. Implement notification types:
   - Event reminders
   - Partner invitations
   - Calendar changes
   - Partner accepted invitation
3. Add push notification support (Firebase Cloud Messaging)
4. Connect notification settings to actual behavior
5. Make red dot dynamic based on unread count

---

### 8. **Event Editing**
**Location:** Multiple files - no edit functionality exists  
**Status:** ❌ Can only create and delete events  
**Impact:** MEDIUM - Basic feature missing

**What's Missing:**
- No way to edit existing events
- No "Edit" option in event cards
- No pre-filled form for editing
- Must delete and recreate to change event

**Recommended Implementation:**
1. Add edit icon/button to event cards
2. Modify `AddEventDialog` to accept optional `CalendarEvent` parameter
3. Pre-fill form fields when editing
4. Update `EventProvider.updateEvent()` method
5. Show "Save Changes" vs "Create Event" based on mode

---

### 9. **Groups Functionality**
**Location:** `lib/screens/people_groups_screen.dart`  
**Status:** ❌ Screen is called "People & Groups" but only shows people  
**Impact:** MEDIUM - Misleading name

**What's Missing:**
- No groups feature at all
- No way to create groups
- No way to assign partners to groups
- No group-based event creation

**Recommended Implementation:**
1. Add "Groups" tab to the screen
2. Create `Group` model (id, name, memberIds, color)
3. Allow creating groups and adding partners
4. Use groups when creating events (invite whole group)
5. Show group indicators on calendar

---

## 🟢 MEDIUM PRIORITY - Backend & Integration

### 10. **Real Contacts Service Integration**
**Location:** `lib/services/contacts_service.dart`  
**Status:** ⚠️ Using mock service  
**Impact:** HIGH for production

**Current State:**
- `MockContactsService` returns fake data
- Simulates permission requests with delays
- No actual device contact access

**Recommended Implementation:**
1. Add packages: `permission_handler`, `contacts_service`
2. Create `RealContactsService` implementing `ContactsService`
3. Request actual device permissions
4. Fetch real contacts from device
5. Handle permission denied scenarios
6. Add platform-specific permission declarations (Info.plist, AndroidManifest.xml)

---

### 11. **Backend/Database Integration**
**Location:** All providers (currently using SharedPreferences)  
**Status:** ⚠️ Local storage only  
**Impact:** HIGH for production

**What's Missing:**
- No cloud sync
- Data lost if app uninstalled
- Cannot sync across devices
- No multi-user support

**Recommended Implementation:**
1. Choose backend: Supabase (per your rules), Firebase, or custom
2. Create API service layer
3. Implement authentication
4. Migrate from SharedPreferences to cloud storage
5. Add offline-first sync strategy
6. Handle conflicts and merging

---

### 12. **Google Calendar Sync**
**Location:** `lib/screens/onboarding_screen.dart` (mock implementation)  
**Status:** ⚠️ Simulated only  
**Impact:** HIGH - Core feature

**What's Missing:**
- No actual Google Calendar API integration
- No OAuth flow
- No real event import
- No bidirectional sync

**Recommended Implementation:**
1. Add `googleapis` and `google_sign_in` packages
2. Implement OAuth 2.0 flow
3. Request calendar read/write permissions
4. Import existing events
5. Set up webhook for real-time sync
6. Handle sync conflicts
7. Add disconnect option

---

### 13. **Authentication System**
**Location:** None - no auth exists  
**Status:** ❌ Missing entirely  
**Impact:** HIGH for production

**What's Missing:**
- No login/signup
- No user accounts
- No password management
- No session handling
- No security

**Recommended Implementation:**
1. Implement auth with Supabase Auth or Firebase Auth
2. Add email/password signup
3. Add social login (Google, Apple)
4. Implement password reset
5. Add session management
6. Secure API calls with tokens

---

### 14. **Partner Invitation System**
**Location:** Onboarding mentions invites but no implementation  
**Status:** ❌ Missing  
**Impact:** HIGH - Core feature

**What's Missing:**
- No way to actually send invitations
- No email/SMS integration
- No invitation tracking
- No invitation acceptance flow

**Recommended Implementation:**
1. Generate unique invitation links
2. Send via email/SMS (Twilio, SendGrid)
3. Create invitation landing page
4. Handle invitation acceptance
5. Update partner status to "connected"
6. Notify inviter when accepted

---

### 15. **Event Visibility Controls**
**Location:** Events have partnerId but no visibility logic  
**Status:** ⚠️ Partial implementation  
**Impact:** HIGH - Core privacy feature

**What's Missing:**
- Events have partner association but no actual sharing
- No logic to filter what each partner sees
- Permission levels (visible/semi-visible/private) not enforced
- No API to query "what can Partner X see?"

**Recommended Implementation:**
1. Implement visibility filter in `EventProvider`
2. Add `getEventsVisibleToPartner(partnerId)` method
3. Respect permission levels:
   - **Private:** Partner sees nothing
   - **Semi-Visible:** Partner sees "busy" blocks only
   - **Visible:** Partner sees full event details
4. Add UI to set per-event visibility overrides
5. Sync visibility rules to backend

---

## 📊 Completion Breakdown by Screen

| Screen | Completion | Critical Issues |
|--------|-----------|-----------------|
| **Landing Screen** | ✅ 100% | None |
| **Onboarding Screen** | ⚠️ 85% | Step 6 placeholder, mock Google sync |
| **Dashboard Screen** | ⚠️ 90% | Notifications not implemented |
| **Calendar Screen** | ⚠️ 85% | Day view missing, no event editing |
| **Events Screen** | ✅ 95% | No event editing |
| **People & Groups Screen** | ⚠️ 60% | Add/delete/permissions broken, no groups |
| **Settings Screen** | ⚠️ 80% | Edit profile not implemented |
| **Contact Permission Screen** | ✅ 95% | Using mock service |
| **Add Contacts Method Screen** | ✅ 100% | None (but depends on Step 6) |
| **Change Log Screen** | ✅ 100% | None |

---

## 🎨 UI/UX Observations

### ✅ What's Working Well
1. **Beautiful, consistent design** - Gradient backgrounds, rounded corners, modern aesthetic
2. **Smooth animations** - Page transitions, card interactions
3. **Touch-friendly** - Large tap targets, good spacing
4. **Responsive layouts** - Works on different screen sizes
5. **Clear visual hierarchy** - Good use of typography and color
6. **Onboarding flow** - Well-structured (except Step 6)
7. **Empty states** - Thoughtful messages when no data exists

### ⚠️ Areas for Improvement
1. **Misleading buttons** - Many buttons show "coming soon" instead of working
2. **Inconsistent feedback** - Some actions give feedback, others don't
3. **No loading states** - Most async operations don't show loading indicators
4. **Limited error handling** - No error messages for failed operations
5. **No confirmation patterns** - Some destructive actions need confirmation
6. **Accessibility** - No semantic labels, screen reader support unclear

---

## 🔧 Technical Debt

### Code Quality Issues
1. **Hardcoded data** - Many screens use hardcoded strings and mock data
2. **No error handling** - Try-catch blocks mostly absent
3. **No input validation** - Forms don't validate thoroughly
4. **Tight coupling** - Some screens directly manipulate providers
5. **Missing tests** - No unit or widget tests found
6. **TODO comments** - 9 TODO/FIXME comments in codebase

### Architecture Concerns
1. **No routing package** - Using basic Navigator, should use GoRouter/AutoRoute (per your rules)
2. **No state management best practices** - Using Provider but could use Riverpod (per your rules)
3. **No dependency injection** - Services instantiated directly in widgets
4. **No repository pattern** - Providers doing too much
5. **No API layer** - No separation between data and presentation

---

## 📋 Recommended Testing Checklist

Before considering the frontend "complete," test these flows:

### Onboarding Flow
- [ ] Complete all 8 steps without errors
- [ ] Skip onboarding and verify dashboard loads
- [ ] Go back through steps and verify state persists
- [ ] **Step 6: Actually select contacts from device**
- [ ] Verify selected partners appear in People & Groups

### Event Management
- [ ] Create event with all fields filled
- [ ] Create event with minimal fields
- [ ] **Edit existing event**
- [ ] Delete event with confirmation
- [ ] View events in month/week/day views
- [ ] **Day view actually works**
- [ ] Events persist after app restart

### Partner Management
- [ ] **Add new partner after onboarding**
- [ ] View partner in all three tabs (Connected/Pending/Contacts)
- [ ] **Change partner permissions and verify it saves**
- [ ] **Delete partner and verify removal**
- [ ] Invite partner to app (send actual invitation)

### Settings
- [ ] **Edit profile and save changes**
- [ ] Toggle notification settings
- [ ] Change default event privacy
- [ ] Change timezone
- [ ] Verify settings persist

### Notifications
- [ ] **View notification center**
- [ ] Receive event reminders
- [ ] Receive partner invitation notifications
- [ ] Mark notifications as read
- [ ] Clear all notifications

### Calendar Integration
- [ ] **Connect real Google Calendar**
- [ ] Import existing events
- [ ] Sync new events to Google
- [ ] Disconnect calendar

---

## 🚀 Recommended Implementation Order

### Phase 1: Complete Core Flows (Week 1-2)
1. ✅ **Onboarding Step 6** - Contact selection
2. ✅ **Add Partner** - Post-onboarding partner addition
3. ✅ **Delete Partner** - Actually remove partners
4. ✅ **Change Permissions** - Save permission changes
5. ✅ **Edit Events** - Modify existing events

### Phase 2: Essential Features (Week 3-4)
6. ✅ **Day View** - Implement calendar day view
7. ✅ **Edit Profile** - User profile editing
8. ✅ **Real Contacts Service** - Replace mock with actual device contacts
9. ✅ **Event Visibility** - Enforce permission-based visibility

### Phase 3: Backend Integration (Week 5-6)
10. ✅ **Authentication** - User accounts and login
11. ✅ **Database Integration** - Replace SharedPreferences with Supabase
12. ✅ **Google Calendar Sync** - Real OAuth and sync
13. ✅ **Partner Invitations** - Send and accept invitations

### Phase 4: Polish & Features (Week 7-8)
14. ✅ **Notifications** - Full notification system
15. ✅ **Groups** - Create and manage partner groups
16. ✅ **Testing** - Unit and integration tests
17. ✅ **Error Handling** - Comprehensive error handling
18. ✅ **Accessibility** - Screen reader support, semantic labels

---

## 💡 Quick Wins (Can Complete in 1-2 Hours Each)

1. **Delete Partner** - Just add the provider method call
2. **Change Permissions** - Just save the selection
3. **Edit Profile** - Create simple form dialog
4. **Event Editing** - Modify existing AddEventDialog
5. **Remove "coming soon" messages** - Either implement or hide buttons

---

## ❓ Questions for Product Owner

Before proceeding, clarify these decisions:

1. **Onboarding Step 6:** Should users select from device contacts, or manually enter partner info, or both?
2. **Groups Feature:** Is this MVP-critical or can it wait for v2?
3. **Google Calendar:** Is real sync required for MVP or can it stay mock?
4. **Backend:** Confirmed using Supabase? Need to set up project?
5. **Authentication:** Email/password only or also social login?
6. **Notifications:** Push notifications required or in-app only for MVP?
7. **Day View:** Hourly timeline or simple list view?
8. **Partner Invitations:** Email, SMS, or both? Need Twilio/SendGrid accounts?

---

## 📝 Summary

**Total Issues Found:** 15  
**Critical (Must Fix):** 5  
**High Priority:** 4  
**Medium Priority:** 6  

**Estimated Time to Complete:**
- Critical issues: 3-4 weeks
- All issues: 6-8 weeks

**Next Steps:**
1. Review this report with stakeholders
2. Prioritize which features are MVP-critical
3. Start with Phase 1 (Complete Core Flows)
4. Set up backend infrastructure (Supabase)
5. Implement authentication
6. Replace mocks with real integrations

---

**Note:** This app has excellent UI/UX design and a solid foundation. The main gaps are in functionality completion and backend integration. With focused effort on the critical issues, this could be production-ready in 4-6 weeks.
