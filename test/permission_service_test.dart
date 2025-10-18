import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/logic/services/permission_service.dart';

void main() {
  group('PermissionService - Core Visibility Rules', () {
    late CalendarEvent normalEvent;
    late CalendarEvent exclusiveEvent;
    late CalendarEvent superExclusiveEvent;
    late Contact visiblePartner;
    late Contact semiVisiblePartner;
    late Contact privatePartner;

    setUp(() {
      // Create test events
      normalEvent = CalendarEvent(
        id: 'event-1',
        title: 'Normal Event',
        start: DateTime(2025, 10, 15, 10, 0),
        end: DateTime(2025, 10, 15, 11, 0),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      exclusiveEvent = CalendarEvent(
        id: 'event-2',
        title: 'Exclusive Event',
        start: DateTime(2025, 10, 15, 14, 0),
        end: DateTime(2025, 10, 15, 15, 0),
        privacyLevel: EventPrivacyLevel.exclusive,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      superExclusiveEvent = CalendarEvent(
        id: 'event-3',
        title: 'Super Exclusive Event',
        start: DateTime(2025, 10, 15, 18, 0),
        end: DateTime(2025, 10, 15, 19, 0),
        privacyLevel: EventPrivacyLevel.superExclusive,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      // Create test contacts
      visiblePartner = const Contact(
        id: 'contact-1',
        name: 'Alice (Visible)',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'user-1',
      );

      semiVisiblePartner = const Contact(
        id: 'contact-2',
        name: 'Bob (Semi-Visible)',
        status: ContactStatus.accepted,
        permission: PartnerPermission.semiVisible,
        ownerId: 'user-1',
      );

      privatePartner = const Contact(
        id: 'contact-3',
        name: 'Charlie (Private)',
        status: ContactStatus.accepted,
        permission: PartnerPermission.private,
        ownerId: 'user-1',
      );
    });

    group('Rule 1: Explicit Invitation Wins', () {
      test('Invited private partner can see exclusive event', () {
        final invitedEvent = exclusiveEvent.copyWith(
          invitedPartnerIds: [privatePartner.id],
        );

        final visibility = PermissionService.calculateEventVisibility(
          invitedEvent,
          privatePartner,
        );

        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
        expect(visibility.reason, VisibilityReason.explicitInvitation);
      });

      test('Invited private partner can see super exclusive event', () {
        final invitedEvent = superExclusiveEvent.copyWith(
          invitedPartnerIds: [privatePartner.id],
        );

        final visibility = PermissionService.calculateEventVisibility(
          invitedEvent,
          privatePartner,
        );

        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
        expect(visibility.reason, VisibilityReason.explicitInvitation);
      });

      test('Invitation overrides all permission levels', () {
        final invitedEvent = normalEvent.copyWith(
          invitedPartnerIds: [privatePartner.id],
        );

        final visibility = PermissionService.calculateEventVisibility(
          invitedEvent,
          privatePartner,
        );

        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
        expect(visibility.reason, VisibilityReason.explicitInvitation);
      });
    });

    group('Rule 2: Event Privacy Overrides Partner Permissions', () {
      test('Exclusive event hidden from visible partner (not invited)', () {
        final visibility = PermissionService.calculateEventVisibility(
          exclusiveEvent,
          visiblePartner,
        );

        expect(visibility.visible, false);
        expect(visibility.detailLevel, EventDetailLevel.none);
        expect(visibility.reason, VisibilityReason.exclusiveEvent);
      });

      test('Super exclusive event hidden from visible partner (not invited)', () {
        final visibility = PermissionService.calculateEventVisibility(
          superExclusiveEvent,
          visiblePartner,
        );

        expect(visibility.visible, false);
        expect(visibility.detailLevel, EventDetailLevel.none);
        expect(visibility.reason, VisibilityReason.superExclusiveEvent);
      });

      test('Exclusive event hidden from semi-visible partner', () {
        final visibility = PermissionService.calculateEventVisibility(
          exclusiveEvent,
          semiVisiblePartner,
        );

        expect(visibility.visible, false);
        expect(visibility.reason, VisibilityReason.exclusiveEvent);
      });

      test('Super exclusive event hidden from all partners', () {
        for (final partner in [visiblePartner, semiVisiblePartner, privatePartner]) {
          final visibility = PermissionService.calculateEventVisibility(
            superExclusiveEvent,
            partner,
          );

          expect(visibility.visible, false,
              reason: '${partner.name} should not see super exclusive event');
        }
      });
    });

    group('Rule 3: Partner Default Permissions (Normal Events)', () {
      test('Visible partner sees full details of normal event', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          visiblePartner,
        );

        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
        expect(visibility.reason, VisibilityReason.visiblePartner);
      });

      test('Semi-visible partner sees busy block only', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          semiVisiblePartner,
        );

        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.busyOnly);
        expect(visibility.reason, VisibilityReason.semiVisiblePartner);
      });

      test('Private partner sees nothing', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          privatePartner,
        );

        expect(visibility.visible, false);
        expect(visibility.detailLevel, EventDetailLevel.none);
        expect(visibility.reason, VisibilityReason.privatePartner);
      });
    });

    group('Complete Permission Matrix', () {
      test('Normal event + Visible partner = Full details', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          visiblePartner,
        );
        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
      });

      test('Normal event + Semi-visible partner = Busy only', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          semiVisiblePartner,
        );
        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.busyOnly);
      });

      test('Normal event + Private partner = Hidden', () {
        final visibility = PermissionService.calculateEventVisibility(
          normalEvent,
          privatePartner,
        );
        expect(visibility.visible, false);
      });

      test('Exclusive event + Visible partner + Not invited = Hidden', () {
        final visibility = PermissionService.calculateEventVisibility(
          exclusiveEvent,
          visiblePartner,
        );
        expect(visibility.visible, false);
      });

      test('Exclusive event + Private partner + Invited = Full details', () {
        final invitedEvent = exclusiveEvent.copyWith(
          invitedPartnerIds: [privatePartner.id],
        );
        final visibility = PermissionService.calculateEventVisibility(
          invitedEvent,
          privatePartner,
        );
        expect(visibility.visible, true);
        expect(visibility.detailLevel, EventDetailLevel.full);
      });

      test('Super exclusive event + Anyone + Not invited = Hidden', () {
        for (final partner in [visiblePartner, semiVisiblePartner, privatePartner]) {
          final visibility = PermissionService.calculateEventVisibility(
            superExclusiveEvent,
            partner,
          );
          expect(visibility.visible, false);
        }
      });

      test('Super exclusive event + Anyone + Invited = Full details', () {
        for (final partner in [visiblePartner, semiVisiblePartner, privatePartner]) {
          final invitedEvent = superExclusiveEvent.copyWith(
            invitedPartnerIds: [partner.id],
          );
          final visibility = PermissionService.calculateEventVisibility(
            invitedEvent,
            partner,
          );
          expect(visibility.visible, true);
          expect(visibility.detailLevel, EventDetailLevel.full);
        }
      });
    });
  });

  group('PermissionService - Helper Methods', () {
    test('canSeeEvent returns correct boolean', () {
      final event = CalendarEvent(
        id: 'event-1',
        title: 'Test Event',
        start: DateTime.now(),
        end: DateTime.now().add(const Duration(hours: 1)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      const visiblePartner = Contact(
        id: 'contact-1',
        name: 'Alice',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'user-1',
      );

      const privatePartner = Contact(
        id: 'contact-2',
        name: 'Bob',
        status: ContactStatus.accepted,
        permission: PartnerPermission.private,
        ownerId: 'user-1',
      );

      expect(PermissionService.canSeeEvent(event, visiblePartner), true);
      expect(PermissionService.canSeeEvent(event, privatePartner), false);
    });

    test('canSeeFullDetails distinguishes between full and busy-only', () {
      final event = CalendarEvent(
        id: 'event-1',
        title: 'Test Event',
        start: DateTime.now(),
        end: DateTime.now().add(const Duration(hours: 1)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      const visiblePartner = Contact(
        id: 'contact-1',
        name: 'Alice',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'user-1',
      );

      const semiVisiblePartner = Contact(
        id: 'contact-2',
        name: 'Bob',
        status: ContactStatus.accepted,
        permission: PartnerPermission.semiVisible,
        ownerId: 'user-1',
      );

      expect(PermissionService.canSeeFullDetails(event, visiblePartner), true);
      expect(PermissionService.canSeeFullDetails(event, semiVisiblePartner), false);
    });

    test('filterEventsForContact returns only visible events', () {
      final events = [
        CalendarEvent(
          id: 'event-1',
          title: 'Normal Event',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          invitedPartnerIds: const [],
          ownerId: 'user-1',
        ),
        CalendarEvent(
          id: 'event-2',
          title: 'Exclusive Event',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.exclusive,
          invitedPartnerIds: const [],
          ownerId: 'user-1',
        ),
      ];

      const visiblePartner = Contact(
        id: 'contact-1',
        name: 'Alice',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'user-1',
      );

      final filtered = PermissionService.filterEventsForContact(events, visiblePartner);

      expect(filtered.length, 1);
      expect(filtered[0].event.title, 'Normal Event');
    });

    test('getContactsForEvent returns contacts who can see event', () {
      final event = CalendarEvent(
        id: 'event-1',
        title: 'Normal Event',
        start: DateTime.now(),
        end: DateTime.now().add(const Duration(hours: 1)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      final contacts = [
        const Contact(
          id: 'contact-1',
          name: 'Alice (Visible)',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'user-1',
        ),
        const Contact(
          id: 'contact-2',
          name: 'Bob (Semi-Visible)',
          status: ContactStatus.accepted,
          permission: PartnerPermission.semiVisible,
          ownerId: 'user-1',
        ),
        const Contact(
          id: 'contact-3',
          name: 'Charlie (Private)',
          status: ContactStatus.accepted,
          permission: PartnerPermission.private,
          ownerId: 'user-1',
        ),
      ];

      final visibleContacts = PermissionService.getContactsForEvent(event, contacts);

      expect(visibleContacts.length, 2); // Alice and Bob, not Charlie
      expect(visibleContacts[0].contact.name, 'Alice (Visible)');
      expect(visibleContacts[1].contact.name, 'Bob (Semi-Visible)');
    });
  });

  group('PermissionService - Permission Change Validation', () {
    test('validates partner permission change with warnings', () {
      const contact = Contact(
        id: 'contact-1',
        name: 'Alice',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'user-1',
      );

      final events = [
        CalendarEvent(
          id: 'event-1',
          title: 'Event 1',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          invitedPartnerIds: const [],
          ownerId: 'user-1',
        ),
        CalendarEvent(
          id: 'event-2',
          title: 'Event 2',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          invitedPartnerIds: const [],
          ownerId: 'user-1',
        ),
      ];

      final warnings = PermissionService.validatePermissionChange(
        contact: contact,
        newPermission: PartnerPermission.private,
        allEvents: events,
        allContacts: [],
      );

      expect(warnings.length, 1);
      expect(warnings[0].type, PermissionWarningType.partnerPermissionChange);
      expect(warnings[0].affectedEventCount, 2);
    });

    test('validates event privacy change with warnings', () {
      final event = CalendarEvent(
        id: 'event-1',
        title: 'Test Event',
        start: DateTime.now(),
        end: DateTime.now().add(const Duration(hours: 1)),
        privacyLevel: EventPrivacyLevel.normal,
        invitedPartnerIds: const [],
        ownerId: 'user-1',
      );

      final contacts = [
        const Contact(
          id: 'contact-1',
          name: 'Alice',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'user-1',
        ),
        const Contact(
          id: 'contact-2',
          name: 'Bob',
          status: ContactStatus.accepted,
          permission: PartnerPermission.semiVisible,
          ownerId: 'user-1',
        ),
      ];

      final warnings = PermissionService.validatePermissionChange(
        event: event,
        newPrivacyLevel: EventPrivacyLevel.exclusive,
        allEvents: [],
        allContacts: contacts,
      );

      expect(warnings.length, 1);
      expect(warnings[0].type, PermissionWarningType.eventPrivacyChange);
      expect(warnings[0].affectedContactCount, 2);
    });
  });

  group('PermissionService - UI Helper Methods', () {
    test('getPermissionName returns correct names', () {
      expect(PermissionService.getPermissionName(PartnerPermission.visible), 'Visible');
      expect(PermissionService.getPermissionName(PartnerPermission.semiVisible), 'Semi-Visible');
      expect(PermissionService.getPermissionName(PartnerPermission.private), 'Private');
    });

    test('getPrivacyLevelName returns correct names', () {
      expect(PermissionService.getPrivacyLevelName(EventPrivacyLevel.normal), 'Normal');
      expect(PermissionService.getPrivacyLevelName(EventPrivacyLevel.exclusive), 'Exclusive');
      expect(PermissionService.getPrivacyLevelName(EventPrivacyLevel.superExclusive),
          'Super Exclusive');
    });

    test('getVisibilityDescription returns correct descriptions', () {
      const fullVis = EventVisibility(
        visible: true,
        detailLevel: EventDetailLevel.full,
        reason: VisibilityReason.visiblePartner,
      );
      expect(PermissionService.getVisibilityDescription(fullVis), 'Full details visible');

      const busyVis = EventVisibility(
        visible: true,
        detailLevel: EventDetailLevel.busyOnly,
        reason: VisibilityReason.semiVisiblePartner,
      );
      expect(PermissionService.getVisibilityDescription(busyVis), 'Busy block only (no details)');

      const hiddenVis = EventVisibility(
        visible: false,
        detailLevel: EventDetailLevel.none,
        reason: VisibilityReason.privatePartner,
      );
      expect(PermissionService.getVisibilityDescription(hiddenVis), 'Hidden');
    });
  });
}
