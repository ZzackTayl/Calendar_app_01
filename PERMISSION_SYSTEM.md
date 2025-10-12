# MyOrbit Permission System Documentation

**Date:** October 12, 2025  
**Status:** ✅ **Implemented and Fully Tested**  
**Test Coverage:** 26 unit tests, 100% pass rate

---

## Overview

The MyOrbit permission system is the core differentiator that makes this app uniquely suited for polyamorous relationships. It implements a sophisticated three-tier hierarchy that gives users granular control over calendar visibility while respecting consent and privacy.

### Key Principles

1. **Consent-First**: Everything is private by default
2. **Explicit Over Implicit**: Invitations override all other settings
3. **Progressive Disclosure**: Users can reveal as much or as little as they want
4. **Clear Hierarchy**: Well-defined rules prevent confusion

---

## Permission Hierarchy

The system follows this strict hierarchy (highest to lowest priority):

```
1. Explicit Event Invitation
   └─ Always grants full details, regardless of any other setting
   
2. Event Privacy Level
   ├─ Super Exclusive: Invisible to everyone (unless invited)
   ├─ Exclusive: Only invited partners see it
   └─ Normal: Respects partner permissions
   
3. Partner Permission Level (for Normal events only)
   ├─ Visible: Full details for all normal events
   ├─ Semi-Visible: Busy blocks only (no titles/descriptions)
   └─ Private: Cannot see anything (unless invited)
```

---

## Implementation Details

### Core Service

**File:** `lib/logic/services/permission_service.dart`

The `PermissionService` class provides the core visibility calculation logic:

#### Main Method

```dart
EventVisibility calculateEventVisibility(
  CalendarEvent event,
  Contact contact,
)
```

**Returns:** `EventVisibility` object with:
- `visible`: Can the partner see this event at all?
- `detailLevel`: What level of detail? (full, busyOnly, none)
- `reason`: Why this visibility level? (for logging/debugging)

#### Helper Methods

```dart
// Quick boolean checks
bool canSeeEvent(CalendarEvent event, Contact contact)
bool canSeeFullDetails(CalendarEvent event, Contact contact)

// Filter lists
List<EventWithVisibility> filterEventsForContact(...)
List<ContactVisibility> getContactsForEvent(...)

// Validation before permission changes
List<PermissionWarning> validatePermissionChange(...)
```

#### UI Helper Methods

```dart
// Human-readable strings
String getPermissionName(PartnerPermission)
String getPrivacyLevelName(EventPrivacyLevel)
String getVisibilityDescription(EventVisibility)

// Icon and color mappings
String getPermissionIcon(PartnerPermission)
String getPermissionColor(PartnerPermission)
```

---

## Permission Matrix

This matrix shows every combination and its result:

| Event Privacy | Partner Permission | Invited? | Result |
|---------------|-------------------|----------|---------|
| Normal | Visible | No | ✅ Full details |
| Normal | Semi-Visible | No | ⚠️ Busy only |
| Normal | Private | No | ❌ Hidden |
| Normal | Any | **Yes** | ✅ Full details |
| Exclusive | Visible | No | ❌ Hidden |
| Exclusive | Semi-Visible | No | ❌ Hidden |
| Exclusive | Private | No | ❌ Hidden |
| Exclusive | Any | **Yes** | ✅ Full details |
| Super Exclusive | Visible | No | ❌ Hidden |
| Super Exclusive | Semi-Visible | No | ❌ Hidden |
| Super Exclusive | Private | No | ❌ Hidden |
| Super Exclusive | Any | **Yes** | ✅ Full details |

**Key Insight:** Invitation always wins, regardless of any other setting.

---

## Enums & Data Types

### EventPrivacyLevel

```dart
enum EventPrivacyLevel {
  normal,          // Respects partner permissions
  exclusive,       // Only invited partners
  superExclusive,  // Invisible unless invited
}
```

### PartnerPermission

```dart
enum PartnerPermission {
  private,       // Sees nothing (default for new partners)
  semiVisible,   // Sees busy blocks only
  visible,       // Sees full details
}
```

### ContactStatus

```dart
enum ContactStatus {
  pending,      // Invited, not yet accepted (doesn't count toward limit)
  accepted,     // Connected partner (counts toward free limit of 3)
  contactOnly,  // Reference contact, no permissions (unlimited)
}
```

### EventVisibility (Result)

```dart
class EventVisibility {
  final bool visible;
  final EventDetailLevel detailLevel;
  final VisibilityReason reason;
}

enum EventDetailLevel {
  none,      // Nothing visible
  busyOnly,  // Just shows time as busy
  full,      // Full event details
}

enum VisibilityReason {
  explicitInvitation,
  visiblePartner,
  semiVisiblePartner,
  privatePartner,
  exclusiveEvent,
  superExclusiveEvent,
}
```

---

## Riverpod Providers

**File:** `lib/logic/providers/contact_providers.dart`

### Main Providers

```dart
// Core contact list with CRUD
@riverpod
class ContactList extends _$ContactList { ... }

// Filtered lists
@riverpod List<Contact> acceptedContacts(Ref ref)
@riverpod List<Contact> pendingContacts(Ref ref)
@riverpod List<Contact> contactOnlyContacts(Ref ref)

// Counts and limits
@riverpod ContactCounts contactCounts(Ref ref)
@riverpod bool isAtConnectionLimit(Ref ref)
@riverpod bool canAddConnection(Ref ref, {bool isPro})

// Grouping and lookup
@riverpod Map<PartnerPermission, List<Contact>> contactsByPermission(Ref ref)
@riverpod Contact? contactById(Ref ref, String contactId)
```

### Usage Example

```dart
// In a widget
class PartnerListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contacts = ref.watch(acceptedContactsProvider);
    final counts = ref.watch(contactCountsProvider);
    final atLimit = ref.watch(isAtConnectionLimitProvider);
    
    return ListView.builder(
      itemCount: contacts.length,
      itemBuilder: (context, index) {
        final contact = contacts[index];
        final permissionIcon = PermissionService.getPermissionIcon(
          contact.permission
        );
        // ... build UI
      },
    );
  }
}

// Updating permission
Future<void> changePermission(
  WidgetRef ref,
  String contactId,
  PartnerPermission newPermission,
) async {
  await ref
      .read(contactListProvider.notifier)
      .updateContactPermission(contactId, newPermission);
}
```

---

## Test Coverage

**File:** `test/permission_service_test.dart`

### Test Groups

1. **Core Visibility Rules (15 tests)**
   - Rule 1: Explicit Invitation Wins (3 tests)
   - Rule 2: Event Privacy Overrides (4 tests)
   - Rule 3: Partner Permissions (3 tests)
   - Complete Permission Matrix (5 tests)

2. **Helper Methods (4 tests)**
   - `canSeeEvent`
   - `canSeeFullDetails`
   - `filterEventsForContact`
   - `getContactsForEvent`

3. **Permission Change Validation (2 tests)**
   - Partner permission change warnings
   - Event privacy change warnings

4. **UI Helper Methods (5 tests)**
   - Name getters
   - Description getters
   - Visibility descriptions

### Running Tests

```bash
# All permission tests
flutter test test/permission_service_test.dart

# Specific test group
flutter test test/permission_service_test.dart -n "Rule 1"

# With coverage
flutter test --coverage test/permission_service_test.dart
```

**Current Status:** ✅ 26/26 tests passing

---

## Usage Examples

### Example 1: Checking if a Partner Can See an Event

```dart
final event = CalendarEvent(
  id: 'event-1',
  title: 'Date Night',
  start: DateTime(2025, 10, 15, 19, 0),
  end: DateTime(2025, 10, 15, 22, 0),
  privacyLevel: EventPrivacyLevel.exclusive,
  invitedPartnerIds: ['partner-alice'],
  ownerId: 'user-1',
);

final alice = Contact(
  id: 'partner-alice',
  name: 'Alice',
  permission: PartnerPermission.visible,
  status: ContactStatus.accepted,
  ownerId: 'user-1',
);

final bob = Contact(
  id: 'partner-bob',
  name: 'Bob',
  permission: PartnerPermission.visible,
  status: ContactStatus.accepted,
  ownerId: 'user-1',
);

// Alice is invited → can see
final aliceVis = PermissionService.calculateEventVisibility(event, alice);
print(aliceVis.visible); // true
print(aliceVis.detailLevel); // EventDetailLevel.full
print(aliceVis.reason); // VisibilityReason.explicitInvitation

// Bob is NOT invited, event is Exclusive → cannot see
final bobVis = PermissionService.calculateEventVisibility(event, bob);
print(bobVis.visible); // false
print(bobVis.reason); // VisibilityReason.exclusiveEvent
```

### Example 2: Filtering Calendar for a Partner

```dart
final myEvents = [
  CalendarEvent(
    id: '1',
    title: 'Work Meeting',
    privacyLevel: EventPrivacyLevel.normal,
    invitedPartnerIds: [],
    // ... other fields
  ),
  CalendarEvent(
    id: '2',
    title: 'Private Therapy',
    privacyLevel: EventPrivacyLevel.superExclusive,
    invitedPartnerIds: [],
    // ... other fields
  ),
  CalendarEvent(
    id: '3',
    title: 'Group Dinner',
    privacyLevel: EventPrivacyLevel.normal,
    invitedPartnerIds: ['partner-charlie'],
    // ... other fields
  ),
];

final charlie = Contact(
  id: 'partner-charlie',
  name: 'Charlie',
  permission: PartnerPermission.semiVisible,
  status: ContactStatus.accepted,
  ownerId: 'user-1',
);

final charlieView = PermissionService.filterEventsForContact(
  myEvents,
  charlie,
);

// charlieView contains:
// - Work Meeting (busy block only - semi-visible partner)
// - Group Dinner (full details - explicitly invited)
// Therapy is hidden (super exclusive, not invited)

for (final eventVis in charlieView) {
  print('${eventVis.event.title}: ${eventVis.visibility.detailLevel}');
}
// Output:
// Work Meeting: EventDetailLevel.busyOnly
// Group Dinner: EventDetailLevel.full
```

### Example 3: Validating Permission Changes

```dart
final alice = Contact(
  id: 'partner-alice',
  name: 'Alice',
  permission: PartnerPermission.visible,
  // ... other fields
);

final allEvents = await ref.read(eventListProvider.future);
final allContacts = await ref.read(contactListProvider.future);

// User wants to change Alice from Visible to Private
final warnings = PermissionService.validatePermissionChange(
  contact: alice,
  newPermission: PartnerPermission.private,
  allEvents: allEvents,
  allContacts: allContacts,
);

if (warnings.isNotEmpty) {
  // Show confirmation dialog
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Confirm Permission Change'),
      content: Text(warnings[0].message),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, true),
          child: Text('Change Anyway'),
        ),
      ],
    ),
  );
  
  if (confirmed == true) {
    // User confirmed, proceed with change
    await ref.read(contactListProvider.notifier).updateContactPermission(
      alice.id,
      PartnerPermission.private,
    );
  }
}
```

---

## UI Integration Guidelines

### Displaying Permission Icons

```dart
Widget buildPermissionBadge(Contact contact) {
  final color = switch (contact.permission) {
    PartnerPermission.visible => Colors.green,
    PartnerPermission.semiVisible => Colors.orange,
    PartnerPermission.private => Colors.red,
  };
  
  final icon = switch (contact.permission) {
    PartnerPermission.visible => Icons.visibility,
    PartnerPermission.semiVisible => Icons.schedule,
    PartnerPermission.private => Icons.visibility_off,
  };
  
  return Chip(
    avatar: Icon(icon, color: color, size: 16),
    label: Text(
      PermissionService.getPermissionName(contact.permission),
      style: TextStyle(color: color),
    ),
    backgroundColor: color.withValues(alpha: 0.1),
  );
}
```

### Event Privacy Picker

```dart
class EventPrivacyPicker extends StatelessWidget {
  final EventPrivacyLevel value;
  final ValueChanged<EventPrivacyLevel> onChanged;
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: EventPrivacyLevel.values.map((level) {
        return RadioListTile<EventPrivacyLevel>(
          title: Text(PermissionService.getPrivacyLevelName(level)),
          subtitle: Text(
            PermissionService.getPrivacyLevelDescription(level),
          ),
          value: level,
          groupValue: value,
          onChanged: (newValue) => onChanged(newValue!),
        );
      }).toList(),
    );
  }
}
```

### Showing Event Visibility to Partners

```dart
Widget buildEventSharingInfo(CalendarEvent event, List<Contact> contacts) {
  final visibleContacts = PermissionService.getContactsForEvent(
    event,
    contacts,
  );
  
  return Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Shared with ${visibleContacts.length} people',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      SizedBox(height: 8),
      ...visibleContacts.map((contactVis) {
        final detailText = contactVis.visibility.detailLevel == 
            EventDetailLevel.busyOnly ? ' (busy only)' : '';
        return ListTile(
          leading: CircleAvatar(child: Text(contactVis.contact.name[0])),
          title: Text(contactVis.contact.name),
          trailing: Text(detailText),
        );
      }),
    ],
  );
}
```

---

## Backend Considerations

### Row-Level Security (RLS)

The permission system MUST be enforced on the backend to prevent data leaks. Here's conceptual Supabase RLS:

```sql
-- Events table RLS
CREATE POLICY "Users can read events they can see"
ON events FOR SELECT
USING (
  -- Owner can see all their events
  owner_id = auth.uid()
  OR
  -- OR partner can see based on permission rules
  EXISTS (
    SELECT 1 FROM contacts
    WHERE contacts.owner_id = events.owner_id
    AND contacts.external_user_id = auth.uid()
    AND (
      -- Explicit invitation
      auth.uid() = ANY(events.invited_partner_ids)
      OR
      -- Normal event + Visible partner
      (events.privacy_level = 'normal' AND contacts.permission = 'visible')
      OR
      -- Normal event + Semi-visible partner (will show busy only in app)
      (events.privacy_level = 'normal' AND contacts.permission = 'semi-visible')
    )
  )
);
```

**Important:** The client-side permission service determines HOW to display events (full vs busy-only), but RLS determines WHETHER the user can access the data at all.

---

## Future Enhancements

### Planned Features

1. **Availability Signals** (from spec)
   - Proactive availability broadcasting
   - Per-connection customization
   - Auto-confirm for "Free to Schedule" signals

2. **Permission Templates**
   - Pre-configured permission sets
   - "New Partner", "Close Partner", "Acquaintance"
   - Quick apply to new contacts

3. **Bulk Permission Changes**
   - Change multiple contacts at once
   - With preview of affected events

4. **Permission History**
   - Audit log of permission changes
   - Rollback capability

5. **Smart Suggestions**
   - ML-based permission recommendations
   - "You usually set romantic partners to Visible"

---

## Troubleshooting

### Common Issues

**Issue:** Partner can see events they shouldn't  
**Check:**
1. Is the partner explicitly invited to those events?
2. Are the events marked as Normal (not Exclusive)?
3. Is the partner's permission level Visible or Semi-Visible?

**Issue:** Partner can't see events they should  
**Check:**
1. Is the event privacy level Exclusive or Super Exclusive?
2. If so, is the partner in the `invitedPartnerIds` list?
3. For Normal events, is the partner's permission Private?

**Issue:** Warning validation not working  
**Check:**
1. Are you calling `validatePermissionChange` before the change?
2. Are you passing all current events and contacts?
3. Check the returned warnings array

---

## Performance Considerations

### Optimization Tips

1. **Cache Visibility Calculations**
   - For frequently accessed event-partner pairs
   - Invalidate on permission or event changes

2. **Batch Filtering**
   - Use `filterEventsForContact` instead of calling `calculateEventVisibility` in a loop

3. **Provider Memoization**
   - Riverpod automatically memoizes provider results
   - Use `select` to subscribe to specific fields only

4. **Backend Filtering**
   - Let Supabase RLS filter as much as possible
   - Client-side filtering is for display logic (busy-only vs full)

---

## References

- **Specification:** `main.md` (Section 5: Relationships & Permissions)
- **Service Implementation:** `lib/logic/services/permission_service.dart`
- **Providers:** `lib/logic/providers/contact_providers.dart`
- **Tests:** `test/permission_service_test.dart`
- **Domain Models:** `lib/domain/contact.dart`, `lib/domain/event.dart`

---

**Document Version:** 1.0  
**Last Updated:** October 12, 2025  
**Status:** Production-Ready ✅
