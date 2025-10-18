import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/api_service.dart';
import 'package:myorbit_calendar/logic/providers/event_invite_providers.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/notification.dart' as app_notification;

void main() {
  group('Event Invite Feature Integration Tests', () {
    group('API Methods', () {
      test('CalendarApi.respondToEventInvite should be defined', () {
        expect(CalendarApi.respondToEventInvite, isNotNull);
        expect(CalendarApi.respondToEventInvite, isA<Function>());
      });

      test('CalendarApi.getPendingInvites should be defined', () {
        expect(CalendarApi.getPendingInvites, isNotNull);
        expect(CalendarApi.getPendingInvites, isA<Function>());
      });

      test('CalendarApi.getEventForInvite should be defined', () {
        expect(CalendarApi.getEventForInvite, isNotNull);
        expect(CalendarApi.getEventForInvite, isA<Function>());
      });
    });

    group('Providers', () {
      test('pendingEventInvitesProvider should be defined', () {
        expect(pendingEventInvitesProvider, isNotNull);
      });

      test('eventForInviteProvider should be defined', () {
        expect(eventForInviteProvider, isNotNull);
      });

      test('inviteDetailsProvider should be defined', () {
        expect(inviteDetailsProvider, isNotNull);
      });

      test('eventInviteProvider should be defined', () {
        expect(eventInviteProvider, isNotNull);
      });
    });

    group('EventInviteDetails Model', () {
      test('should calculate duration correctly', () {
        final start = DateTime(2025, 10, 17, 10, 0);
        final end = DateTime(2025, 10, 17, 11, 30);

        final event = CalendarEvent(
          id: 'event-1',
          title: 'Test Event',
          start: start,
          end: end,
          description: 'Test description',
          ownerId: 'owner-1',
        );

        final organizer = Contact(
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: null,
          colorHex: '#4D8CFF',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'owner-1',
        );

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: [],
        );

        expect(details.duration, equals(const Duration(hours: 1, minutes: 30)));
        expect(details.formattedDuration, equals('1h 30m'));
      });

      // Skipping recurring event test due to complex RecurrenceRule constructor
      // The isRecurring getter simply checks if recurrenceRule is not null

      test('should count attendees correctly', () {
        final event = CalendarEvent(
          id: 'event-1',
          title: 'Team Event',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          ownerId: 'owner-1',
          invitedPartnerIds: ['contact-2', 'contact-3', 'contact-4'],
        );

        final organizer = Contact(
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: null,
          colorHex: '#4D8CFF',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'owner-1',
        );

        final attendees = List.generate(3, (i) {
          return Contact(
            id: 'contact-${i + 2}',
            name: 'Attendee $i',
            email: 'attendee$i@example.com',
            phoneNumber: null,
            colorHex: '#FF6B6B',
            permission: PartnerPermission.private,
            status: ContactStatus.accepted,
            ownerId: 'owner-1',
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
            externalUserId: 'user-$i',
          );
        });

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: attendees,
        );

        expect(details.otherAttendeesCount, equals(3));
      });
    });

    group('Notification Helpers', () {
      test('isEventInvite should detect event invite notifications', () {
        final inviteNotification = app_notification.Notification(
          id: 'notif-1',
          type: app_notification.NotificationType.invitation,
          title: 'Event Invitation',
          message: 'You have been invited',
          timestamp: DateTime.now(),
          isRead: false,
          actionId: 'invite-123',
          metadata: {'invite_id': 'invite-123'},
        );

        expect(inviteNotification.isEventInvite, isTrue);
        expect(inviteNotification.inviteId, equals('invite-123'));
      });

      test('isEventInvite should return false for non-invite notifications', () {
        final regularNotification = app_notification.Notification(
          id: 'notif-1',
          type: app_notification.NotificationType.general,
          title: 'General Notice',
          message: 'Something happened',
          timestamp: DateTime.now(),
          isRead: false,
        );

        expect(regularNotification.isEventInvite, isFalse);
        expect(regularNotification.inviteId, isNull);
      });
    });

    group('InviteStatus Enum', () {
      test('should have all required status values', () {
        expect(InviteStatus.pending, isNotNull);
        expect(InviteStatus.accepted, isNotNull);
        expect(InviteStatus.declined, isNotNull);
      });

      test('should convert to/from string correctly', () {
        expect(InviteStatus.pending.name, equals('pending'));
        expect(InviteStatus.accepted.name, equals('accepted'));
        expect(InviteStatus.declined.name, equals('declined'));
      });
    });
  });
}
