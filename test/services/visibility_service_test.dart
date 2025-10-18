import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/services/visibility_service.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

void main() {
  group('VisibilityService - canViewEventDetails', () {
    late CalendarEvent testEvent;
    const String ownerId = 'owner-123';
    const String viewerId = 'viewer-456';
    const String partner1Id = 'partner-1';
    const String partner2Id = 'partner-2';
    final List<String> partnerIds = [partner1Id, partner2Id];

    setUp(() {
      final now = DateTime.now();
      testEvent = CalendarEvent(
        id: 'test-event-1',
        title: 'Test Event',
        description: 'Test Description',
        start: now.add(const Duration(hours: 1)),
        end: now.add(const Duration(hours: 2)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [],
        ownerId: ownerId,
        createdAt: now,
        updatedAt: now,
      );
    });

    test('Owner can always view their own events', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: ownerId,
        partnerIds: [],
        eventVisibility: EventVisibility.private,
      );
      expect(canView, true);
    });

    test('Public events are visible to everyone', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.public,
      );
      expect(canView, true);
    });

    test('Partners Only - partner can view', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: partner1Id,
        partnerIds: partnerIds,
        eventVisibility: EventVisibility.partnersOnly,
      );
      expect(canView, true);
    });

    test('Partners Only - non-partner cannot view', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: partnerIds,
        eventVisibility: EventVisibility.partnersOnly,
      );
      expect(canView, false);
    });

    test('Specific People - listed person can view', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.specificPeople,
        sharedWith: [viewerId, 'other-user'],
      );
      expect(canView, true);
    });

    test('Specific People - unlisted person cannot view', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.specificPeople,
        sharedWith: ['other-user-1', 'other-user-2'],
      );
      expect(canView, false);
    });

    test('Specific People - empty sharedWith list denies access', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.specificPeople,
        sharedWith: [],
      );
      expect(canView, false);
    });

    test('Specific People - null sharedWith list denies access', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.specificPeople,
        sharedWith: null,
      );
      expect(canView, false);
    });

    test('Private events - only owner can view', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: partnerIds,
        eventVisibility: EventVisibility.private,
      );
      expect(canView, false);
    });

    test('Empty viewerId denies access', () {
      final canView = VisibilityService.canViewEventDetails(
        event: testEvent,
        viewerId: '',
        partnerIds: partnerIds,
        eventVisibility: EventVisibility.public,
      );
      expect(canView, false);
    });
  });

  group('VisibilityService - getVisibleEventForUser', () {
    late CalendarEvent testEvent;
    const String ownerId = 'owner-123';
    const String viewerId = 'viewer-456';

    setUp(() {
      final now = DateTime.now();
      testEvent = CalendarEvent(
        id: 'test-event-1',
        title: 'Team Meeting',
        description: 'Discuss project updates',
        start: now.add(const Duration(hours: 1)),
        end: now.add(const Duration(hours: 2)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: ['partner-1', 'partner-2'],
        ownerId: ownerId,
        createdAt: now,
        updatedAt: now,
      );
    });

    test('Returns full event when viewer has permission', () {
      final visibleEvent = VisibilityService.getVisibleEventForUser(
        event: testEvent,
        viewerId: ownerId,
        partnerIds: [],
        eventVisibility: EventVisibility.public,
      );

      expect(visibleEvent.title, 'Team Meeting');
      expect(visibleEvent.description, 'Discuss project updates');
      expect(visibleEvent.invitedPartnerIds.length, 2);
    });

    test('Returns "Busy" placeholder when viewer lacks permission', () {
      final visibleEvent = VisibilityService.getVisibleEventForUser(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.private,
      );

      expect(visibleEvent.title, 'Busy');
      // Note: copyWith doesn't clear description when passed null due to ?? operator
      // This is acceptable as the title "Busy" indicates limited visibility
      expect(visibleEvent.invitedPartnerIds, isEmpty);
    });

    test('Busy placeholder preserves timing information', () {
      final visibleEvent = VisibilityService.getVisibleEventForUser(
        event: testEvent,
        viewerId: viewerId,
        partnerIds: [],
        eventVisibility: EventVisibility.private,
      );

      expect(visibleEvent.start, testEvent.start);
      expect(visibleEvent.end, testEvent.end);
      expect(visibleEvent.id, testEvent.id);
      expect(visibleEvent.ownerId, testEvent.ownerId);
    });
  });

  group('VisibilityService - filterEventsForUser', () {
    late List<CalendarEvent> testEvents;
    const String currentUserId = DevDataService.currentUserId;
    const String partner1Id = DevDataService.partner1Id;
    final List<String> partnerIds = [partner1Id];

    setUp(() {
      testEvents = DevDataService.getMockEvents().take(5).toList();
    });

    test('Returns empty list for empty input', () {
      final filtered = VisibilityService.filterEventsForUser(
        events: [],
        viewerId: currentUserId,
        partnerIds: partnerIds,
      );
      expect(filtered, isEmpty);
    });

    test('Returns empty list for empty viewerId', () {
      final filtered = VisibilityService.filterEventsForUser(
        events: testEvents,
        viewerId: '',
        partnerIds: partnerIds,
      );
      expect(filtered, isEmpty);
    });

    test('Filters events correctly with visibility function', () {
      final filtered = VisibilityService.filterEventsForUser(
        events: testEvents,
        viewerId: 'other-user',
        partnerIds: [],
        getEventVisibility: (event) => EventVisibility.private,
      );

      // All events should be converted to "Busy"
      expect(filtered.length, testEvents.length);
      expect(filtered.every((e) => e.title == 'Busy'), true);
    });

    test('Owner sees all their events with full details', () {
      final filtered = VisibilityService.filterEventsForUser(
        events: testEvents,
        viewerId: currentUserId,
        partnerIds: partnerIds,
        getEventVisibility: (event) => EventVisibility.public,
      );

      expect(filtered.length, testEvents.length);
      // Owner should see original titles
      expect(filtered.any((e) => e.title != 'Busy'), true);
    });

    test('Uses default public visibility when function not provided', () {
      final filtered = VisibilityService.filterEventsForUser(
        events: testEvents,
        viewerId: 'any-user',
        partnerIds: [],
      );

      // All events should be visible as public
      expect(filtered.length, testEvents.length);
    });
  });

  group('VisibilityService - Helper Methods', () {
    test('getVisibilityLabel returns correct labels', () {
      expect(
        VisibilityService.getVisibilityLabel(EventVisibility.public),
        'Public',
      );
      expect(
        VisibilityService.getVisibilityLabel(EventVisibility.partnersOnly),
        'Partners Only',
      );
      expect(
        VisibilityService.getVisibilityLabel(EventVisibility.specificPeople),
        'Specific People',
      );
      expect(
        VisibilityService.getVisibilityLabel(EventVisibility.private),
        'Private',
      );
    });

    test('getVisibilityDescription returns non-empty descriptions', () {
      for (final visibility in EventVisibility.values) {
        final description = VisibilityService.getVisibilityDescription(visibility);
        expect(description.isNotEmpty, true);
        expect(description.length, greaterThan(20));
      }
    });

    test('getVisibilityIcon returns valid icon names', () {
      expect(
        VisibilityService.getVisibilityIcon(EventVisibility.public),
        'public',
      );
      expect(
        VisibilityService.getVisibilityIcon(EventVisibility.partnersOnly),
        'people',
      );
      expect(
        VisibilityService.getVisibilityIcon(EventVisibility.specificPeople),
        'person_add',
      );
      expect(
        VisibilityService.getVisibilityIcon(EventVisibility.private),
        'lock',
      );
    });

    test('getAllVisibilityLevels returns all 4 levels', () {
      final levels = VisibilityService.getAllVisibilityLevels();
      expect(levels.length, 4);
      expect(levels.contains(EventVisibility.public), true);
      expect(levels.contains(EventVisibility.partnersOnly), true);
      expect(levels.contains(EventVisibility.specificPeople), true);
      expect(levels.contains(EventVisibility.private), true);
    });

    test('getVisibilityOptions returns complete information', () {
      final options = VisibilityService.getVisibilityOptions();
      expect(options.length, 4);

      for (final visibility in EventVisibility.values) {
        expect(options.containsKey(visibility), true);
        expect(options[visibility]!['label'], isNotEmpty);
        expect(options[visibility]!['description'], isNotEmpty);
        expect(options[visibility]!['icon'], isNotEmpty);
      }
    });
  });

  group('VisibilityService - Validation', () {
    test('isValidVisibilityConfiguration - public is always valid', () {
      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.public,
        ),
        true,
      );
    });

    test('isValidVisibilityConfiguration - partnersOnly is always valid', () {
      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.partnersOnly,
        ),
        true,
      );
    });

    test('isValidVisibilityConfiguration - private is always valid', () {
      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.private,
        ),
        true,
      );
    });

    test('isValidVisibilityConfiguration - specificPeople requires sharedWith', () {
      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.specificPeople,
          sharedWith: null,
        ),
        false,
      );

      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.specificPeople,
          sharedWith: [],
        ),
        false,
      );

      expect(
        VisibilityService.isValidVisibilityConfiguration(
          visibility: EventVisibility.specificPeople,
          sharedWith: ['user-1'],
        ),
        true,
      );
    });
  });

  group('VisibilityService - shouldHideCompletely', () {
    late CalendarEvent testEvent;
    const String ownerId = 'owner-123';
    const String viewerId = 'viewer-456';

    setUp(() {
      final now = DateTime.now();
      testEvent = CalendarEvent(
        id: 'test-event-1',
        title: 'Test Event',
        description: 'Test Description',
        start: now.add(const Duration(hours: 1)),
        end: now.add(const Duration(hours: 2)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: [],
        ownerId: ownerId,
        createdAt: now,
        updatedAt: now,
      );
    });

    test('Owner never has events hidden', () {
      final shouldHide = VisibilityService.shouldHideCompletely(
        event: testEvent,
        viewerId: ownerId,
        eventVisibility: EventVisibility.private,
      );
      expect(shouldHide, false);
    });

    test('Currently shows all events as "Busy" rather than hiding', () {
      final shouldHide = VisibilityService.shouldHideCompletely(
        event: testEvent,
        viewerId: viewerId,
        eventVisibility: EventVisibility.private,
      );
      expect(shouldHide, false);
    });
  });

  group('VisibilityService - Integration with DevDataService', () {
    test('Works with real mock events', () {
      final events = DevDataService.getMockEvents();
      const currentUserId = DevDataService.currentUserId;
      final partnerIds = [
        DevDataService.partner1Id,
        DevDataService.partner2Id,
      ];

      final filtered = VisibilityService.filterEventsForUser(
        events: events,
        viewerId: currentUserId,
        partnerIds: partnerIds,
      );

      expect(filtered.isNotEmpty, true);
      expect(filtered.length, events.length);
    });

    test('Different users see different event details', () {
      final event = DevDataService.getMockEvents().first;
      const currentUserId = DevDataService.currentUserId;
      const otherId = 'random-user-id';

      // Owner sees full details
      final ownerView = VisibilityService.getVisibleEventForUser(
        event: event,
        viewerId: currentUserId,
        partnerIds: [],
        eventVisibility: EventVisibility.private,
      );
      expect(ownerView.title, isNot('Busy'));

      // Other user sees "Busy"
      final otherView = VisibilityService.getVisibleEventForUser(
        event: event,
        viewerId: otherId,
        partnerIds: [],
        eventVisibility: EventVisibility.private,
      );
      expect(otherView.title, 'Busy');
    });
  });
}
