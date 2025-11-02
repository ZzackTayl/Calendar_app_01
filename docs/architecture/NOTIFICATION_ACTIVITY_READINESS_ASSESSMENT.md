# Notification & Activity System - Readiness Assessment
**Date:** October 23, 2025  
**Conducted by:** Senior Flutter Engineer  
**Status:** ⚠️ PARTIALLY READY - Critical gaps identified

---

## Executive Summary

The notification and activity system is **partially implemented** but has **critical gaps** compared to requirements. The notification banner and 3-day notification center work correctly, but the Activity Overview page is missing essential time-based filtering and auto-cleanup logic.

### 🔴 Critical Issues
1. **No 2-week limit on Activity screen** - Shows ALL notifications indefinitely
2. **No automatic deletion** - Old notifications accumulate forever
3. **Misleading UI copy** - Empty state claims "past week" but shows everything

### 🟢 What's Working Well
1. Notification banners display properly at top of app
2. 3-day notification center filters correctly
3. Individual notification dismissal and clearing works
4. Navigation flow between screens is correct

---

## Current Implementation Details

### 1. Notification Banner System ✅

**Location:** `lib/ui/widgets/event_reminder_banner.dart` + `lib/ui/app_shell.dart`

**How it works:**
- Banner widget displays at the top of all main screens
- Shows highest priority notification with count of additional notifications
- User can tap banner to navigate to `/notifications` route
- User can tap X button to dismiss banner
- Includes slide-in animation for better UX
- Multiple banners shown via `groupedReminderBannerNotificationsProvider`

**Code snippet:**
```dart:12:19:lib/ui/app_shell.dart
import 'widgets/event_reminder_banner.dart';

/// Main app shell with bottom navigation bar
///
/// This widget provides the persistent bottom navigation that appears
/// across all main screens of the app. Now integrated with GoRouter for
/// proper nested navigation and deep linking support.
class AppShell extends ConsumerWidget {
```

```dart:156:178:lib/ui/app_shell.dart
        if (hasBanner)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                child: EventReminderBanner(
                  notifications: bannerNotifications,
                  onDismiss: () {
                    final notifier =
                        ref.read(notificationListProvider.notifier);
                    for (final notification in bannerNotifications) {
                      notifier.dismissNotification(notification.id);
                    }
                  },
                ),
              ),
            ),
          ),
```

**Status:** ✅ **Fully implemented and working correctly**

---

### 2. Notification Center Screen ✅

**Location:** `lib/ui/screens/notifications_screen.dart`  
**Route:** `/notifications`  
**Accessed via:** Notification bell icon (top right of dashboard)

**How it works:**
- Shows notifications from the **past 3 days only**
- Filters applied:
  - `timestamp > (now - 3 days)`
  - `showInCenter == true`
  - `isDismissed == false`
- "Clear All" button dismisses all visible notifications
- Individual notifications can be dismissed with X button
- Dismissed notifications remain in history but hidden from this view
- Footer displays: "Notifications are cleared automatically after 3 days"
- Footer link: "View All Recent Activity" → navigates to `/activity`

**Time filtering code:**
```dart:167:176:lib/ui/screens/notifications_screen.dart
          final windowStart = DateTime.now().subtract(const Duration(days: 3));
          final visible = notifications
              .where(
                (notification) =>
                    notification.showInCenter &&
                    !notification.isDismissed &&
                    notification.timestamp.isAfter(windowStart),
              )
              .toList()
            ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
```

**Auto-dismiss logic in provider:**
```dart:18:51:lib/logic/providers/notification_providers.dart
  static final Duration _centerVisibilityWindow = const Duration(days: 3);
  List<Notification> _sortNotifications(List<Notification> notifications) {
    final sorted = [...notifications]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return sorted;
  }

  List<Notification> _applyCenterVisibilityRules(
    List<Notification> notifications,
  ) {
    final now = DateTime.now();
    final sorted = _sortNotifications(notifications);
    var changed = false;
    final updated = <Notification>[];

    for (final notification in sorted) {
      if (!notification.showInCenter) {
        updated.add(notification);
        continue;
      }

      final tooOld =
          now.difference(notification.timestamp) > _centerVisibilityWindow;

      if (tooOld && !notification.isDismissed) {
        updated.add(notification.dismiss());
        changed = true;
      } else {
        updated.add(notification);
      }
    }

    return changed ? updated : sorted;
  }
```

**Status:** ✅ **Fully implemented and working correctly**

---

### 3. Activity Overview Screen ⚠️

**Location:** `lib/ui/screens/activity_screen.dart`  
**Route:** `/activity`  
**Accessed via:** "Activity" tab in bottom navigation bar

**Current implementation:**
- Shows **ALL** notifications without any time filtering
- Groups into "Today" and "Earlier This Week" sections
- Users can delete individual activities with X button
- Empty state says: "New activity from the past week will appear here"

**Current code (NO TIME FILTERING):**
```dart:81:84:lib/ui/screens/activity_screen.dart
            data: (notifications) {
              final sorted = [...notifications]..sort(
                  (a, b) => b.timestamp.compareTo(a.timestamp),
                );
```

**Problems identified:**
1. ❌ **No 2-week filter** - Shows notifications from ANY date
2. ❌ **No automatic deletion** - Old notifications accumulate indefinitely
3. ❌ **Misleading UI copy** - Empty state mentions "past week" but code shows everything
4. ❌ **Section grouping is wrong** - "Earlier This Week" should be "Past 2 Weeks"

**What SHOULD be implemented:**
```dart
// MISSING CODE - Should filter to 2 weeks max
final twoWeeksAgo = DateTime.now().subtract(const Duration(days: 14));
final filtered = notifications
    .where((notification) => notification.timestamp.isAfter(twoWeeksAgo))
    .toList();
```

**Status:** ⚠️ **Partially implemented - CRITICAL gaps in requirements**

---

## Gap Analysis

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| Notification banners for incoming notifications | EventReminderBanner widget at top of app | ✅ Complete |
| Notification icon on dashboard top right | NotificationBellWithBadge with unread count | ✅ Complete |
| Notification screen accessed via bell icon | Routes to `/notifications` | ✅ Complete |
| Show notifications from past 3 days | Filters: `timestamp > now - 3 days` | ✅ Complete |
| Auto-dismiss notifications older than 3 days | `_applyCenterVisibilityRules` marks as dismissed | ✅ Complete |
| Activity tab in nav bar | "Activity" tab (3rd position) | ✅ Complete |
| Activity screen shows all notifications as activities | Shows all, but calls them notifications | ⚠️ Partial |
| Activity screen limited to 2 weeks | **MISSING** - Shows everything | ❌ Not implemented |
| Auto-delete notifications older than 2 weeks | **MISSING** - Never deleted | ❌ Not implemented |
| Users can clear activities manually | Delete button on each card | ✅ Complete |

---

## Data Storage & Lifecycle

### Notification Model
**File:** `lib/domain/notification.dart`

**Key fields:**
- `id` - Unique identifier
- `type` - NotificationType enum (eventInvite, partnerRequest, etc.)
- `title` - Main notification text
- `message` - Detail text
- `isRead` - Whether user has viewed it
- `isDismissed` - Hidden from notification center but kept in history
- `showInCenter` - Whether to show in 3-day notification center (vs activity-only)
- `timestamp` - When notification was created

**Storage:**
- Local: SharedPreferences (`_storageKey = 'notifications'`)
- Remote: Supabase `notifications` table (when configured)

### Current Lifecycle

```
1. Notification created
   ↓
2. Shows in banner (EventReminderBanner)
   ↓
3. Shows in Notification Center (3 days, showInCenter=true, !isDismissed)
   ↓
4. After 3 days: Auto-dismissed (isDismissed=true) → removed from Notification Center
   ↓
5. Still shows in Activity Overview (FOREVER - no time limit)
   ↓
6. User can manually delete from Activity → deleted completely
```

### REQUIRED Lifecycle (not implemented)

```
1. Notification created
   ↓
2. Shows in banner (EventReminderBanner)
   ↓
3. Shows in Notification Center (3 days, showInCenter=true, !isDismissed)
   ↓
4. After 3 days: Auto-dismissed → removed from Notification Center
   ↓
5. Shows in Activity Overview (up to 14 days total)
   ↓
6. After 14 days: AUTO-DELETED → removed completely
   ↓
7. User can manually delete earlier if desired
```

---

## Recommended Fixes

### Unread Badge Behavior (do not regress)

- Keep the dashboard `NotificationBellWithBadge` (`lib/ui/screens/dashboard_screen.dart:973`) and the notifications header badge (`lib/ui/screens/notifications_screen.dart:55`) wired to `unreadNotificationCountProvider`.
- That provider filters to `showInCenter && !isDismissed && !isRead`, so both surfaces report only the unseen items the user still needs to review.
- Simply opening the notifications screen does **not** mark anything as read; counts drop only when a row triggers `markAsRead`, when the user clears/dismisses notifications, or when the retention rules age them out.
- Future changes to notification UI should reuse this provider instead of recalculating counts from ad hoc lists—changing this decouples the two badges.

### Priority 1: Add 2-week filtering to Activity Screen

**File to modify:** `lib/ui/screens/activity_screen.dart`

**Change required at lines 81-84:**
```dart
// BEFORE (current - shows everything)
data: (notifications) {
  final sorted = [...notifications]..sort(
      (a, b) => b.timestamp.compareTo(a.timestamp),
    );

// AFTER (filter to 2 weeks)
data: (notifications) {
  final twoWeeksAgo = DateTime.now().subtract(const Duration(days: 14));
  final recentNotifications = notifications
      .where((notification) => notification.timestamp.isAfter(twoWeeksAgo))
      .toList();
  final sorted = [...recentNotifications]..sort(
      (a, b) => b.timestamp.compareTo(a.timestamp),
    );
```

**Also update empty state message at line 485:**
```dart
// BEFORE
'New activity from the past week will appear here.',

// AFTER
'Activity from the past 2 weeks will appear here.',
```

**Update section heading at line 598:**
```dart
// BEFORE
'Earlier This Week',

// AFTER (more accurate)
'Past 2 Weeks',
```

---

### Priority 2: Add automatic deletion of old notifications

**File to modify:** `lib/logic/providers/notification_providers.dart`

**Add new constant after line 18:**
```dart
static final Duration _centerVisibilityWindow = const Duration(days: 3);
static final Duration _activityRetentionWindow = const Duration(days: 14); // NEW
```

**Add new method after `_applyCenterVisibilityRules` (around line 51):**
```dart
/// Remove notifications older than 2 weeks to prevent data accumulation
List<Notification> _applyRetentionRules(
  List<Notification> notifications,
) {
  final now = DateTime.now();
  final cutoffDate = now.subtract(_activityRetentionWindow);
  
  return notifications
      .where((notification) => notification.timestamp.isAfter(cutoffDate))
      .toList();
}
```

**Update the `build` method to apply retention (around line 54-70):**
```dart
@override
Future<List<Notification>> build() async {
  if (!SupabaseService.isConfigured) {
    final seeded = _applyCenterVisibilityRules(_getMockNotifications());
    final retained = _applyRetentionRules(seeded); // NEW
    await _persistLocalBackup(retained); // NEW (was seeded)
    return retained; // NEW (was seeded)
  }

  final notifications = await _loadInitialNotifications();
  final enforced = _applyCenterVisibilityRules(notifications);
  final retained = _applyRetentionRules(enforced); // NEW
  if (!identical(retained, notifications)) { // NEW (was enforced)
    await _saveNotifications(retained); // NEW (was enforced)
  }
  return retained; // NEW (was enforced)
}
```

**Also update database operations** to delete from Supabase when applying retention rules (if using remote storage).

---

### Priority 3: Database cleanup (if using Supabase)

**Option A: Client-side cleanup (simpler)**
Already handled by Priority 2 changes above - client filters out old records on load.

**Option B: Server-side cleanup (more efficient, recommended for production)**

Add a database function to auto-delete old notifications:

**New migration file:** `supabase/migrations/YYYYMMDD_auto_cleanup_old_notifications.sql`
```sql
-- Auto-delete notifications older than 14 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < (NOW() - INTERVAL '14 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',
  'SELECT cleanup_old_notifications();'
);
```

**Note:** Requires `pg_cron` extension to be enabled in Supabase project.

---

### Priority 4: Update UI copy for clarity

**File:** `lib/ui/screens/notifications_screen.dart`

**Line 473 - Update footer text:**
```dart
// BEFORE
'Notifications are cleared automatically after 3 days',

// AFTER (more accurate)
'Recent notifications disappear after 3 days. View full history in Activity.',
```

**Lines 456-457 - Update link text:**
```dart
// BEFORE
'View All Recent Activity',

// AFTER (clearer time frame)
'View 2-Week Activity History',
```

---

## Testing Recommendations

### Test Case 1: Notification Banner
- [ ] Create a new notification
- [ ] Verify banner appears at top of screen
- [ ] Tap banner → navigates to `/notifications`
- [ ] Dismiss banner with X → banner disappears
- [ ] Create multiple notifications → banner shows count

### Test Case 2: Notification Center (3-day window)
- [ ] Navigate to `/notifications` via bell icon
- [ ] Verify only notifications from past 3 days appear
- [ ] Create notification with timestamp 2 days ago → appears
- [ ] Create notification with timestamp 4 days ago → does NOT appear
- [ ] Tap "Clear All" → all visible notifications dismissed
- [ ] Dismissed notifications don't reappear on reload

### Test Case 3: Activity Overview (2-week window) - AFTER FIXES
- [ ] Navigate to `/activity` via bottom nav
- [ ] Verify only notifications from past 14 days appear
- [ ] Create notification with timestamp 10 days ago → appears
- [ ] Create notification with timestamp 15 days ago → does NOT appear
- [ ] Delete individual activity → activity removed
- [ ] Empty state appears when no activities in past 2 weeks

### Test Case 4: Auto-cleanup - AFTER FIXES
- [ ] Create notification with timestamp 15 days ago
- [ ] Restart app
- [ ] Verify old notification is automatically deleted
- [ ] Check local storage size doesn't grow indefinitely

---

## Performance Considerations

### Current State
- ✅ Notifications stored in SharedPreferences (efficient for small datasets)
- ✅ Providers use Riverpod for reactive updates
- ⚠️ Activity screen shows unlimited history (performance risk over time)

### After Implementing Fixes
- ✅ Max 14 days of notifications = ~50-200 items typically
- ✅ Client-side filtering is efficient for this dataset size
- ✅ No memory leaks from unlimited history accumulation
- ✅ Local storage size capped automatically

### Recommendations
- Consider pagination if users generate >100 notifications per day
- Add analytics to monitor notification volume per user
- Consider archiving very important notifications separately if needed

---

## Code Quality Assessment

### Strengths ✅
- Clean separation of concerns (UI, domain, logic layers)
- Good use of Riverpod for state management
- Proper error handling in async operations
- Accessibility support (semantic labels)
- Comprehensive notification types (9 different types)

### Areas for Improvement ⚠️
- Missing time-based filtering in Activity screen
- No automatic cleanup of old data
- Inconsistent terminology (notifications vs activities)
- Hard-coded duration constants should be configurable
- No unit tests found for notification lifecycle rules

---

## Summary & Recommendations

### Current Readiness: 70%

**What's working:**
- ✅ Banner notification system
- ✅ 3-day notification center
- ✅ Manual dismissal and deletion
- ✅ Navigation between screens
- ✅ Unread count badges

**What's missing:**
- ❌ 2-week limit on Activity screen
- ❌ Automatic deletion of old notifications
- ❌ Clear distinction between "notifications" and "activities" in UI copy
- ❌ Testing coverage for time-based rules

### Recommended Action Plan

**Phase 1: Critical Fixes (2-4 hours)**
1. Add 2-week filtering to Activity screen
2. Add retention rules to notification provider
3. Update UI copy for accuracy
4. Test basic scenarios

**Phase 2: Production Hardening (4-6 hours)**
1. Add database cleanup function (if using Supabase)
2. Add unit tests for time filtering logic
3. Add integration tests for notification lifecycle
4. Performance testing with large datasets

**Phase 3: Enhancement (optional)**
1. Make time windows configurable (3 days, 14 days)
2. Add user setting for "keep activity history longer"
3. Add analytics tracking for notification engagement
4. Consider archive feature for important notifications

### Go/No-Go Assessment

**Can ship to production as-is?** ⚠️ **NOT RECOMMENDED**

The Activity screen will accumulate unlimited notifications over time, which could:
- Degrade performance after several months
- Consume excessive storage
- Show confusing/overwhelming UI to long-term users

**Minimum viable fix:** Implement Priority 1 & 2 (estimated 3 hours of work)

**Production-ready:** Implement Priorities 1-4 + testing (estimated 8 hours of work)

---

## Questions for Product Team

1. **Is 2 weeks the right retention period for activities?**
   - Current: 3 days in notification center, forever in activity
   - Proposed: 3 days in notification center, 14 days in activity
   - Alternative: 3 days / 30 days / 90 days?

2. **Should users be able to configure retention periods?**
   - Some users may want to keep activity history longer
   - Could add setting: "Activity history: 1 week / 2 weeks / 1 month"

3. **Are there any notifications that should be kept forever?**
   - Example: Partner connection accepted
   - Could add `isPermanent` flag to notification model

4. **Should deleted notifications be archived instead of hard-deleted?**
   - Could add soft-delete for data recovery
   - May be required for compliance/audit trails

---

**Prepared by:** Senior Flutter Engineer  
**Date:** October 23, 2025  
**Next Review:** After implementing Priority 1 & 2 fixes
