import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/recurrence_rule.dart';
import 'package:myorbit_calendar/logic/providers/event_invite_providers.dart';

void main() {
  group('Event Invite Providers', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    group('EventInviteDetails Model', () {
      CalendarEvent buildEvent({
        String id = 'event-1',
        String title = 'Test Event',
        DateTime? start,
        DateTime? end,
        String? description,
        bool recurring = false,
        List<String> invitedPartnerIds = const [],
      }) {
        final startTime = start ?? DateTime.now();
        final endTime = end ?? startTime.add(const Duration(hours: 1));

        return CalendarEvent(
          id: id,
          title: title,
          description: description,
          start: startTime,
          end: endTime,
          ownerId: 'owner-1',
          invitedPartnerIds: invitedPartnerIds,
          recurrenceRule: recurring
              ? RecurrenceRule(
                  id: 'rr-1',
                  pattern: RecurrencePattern.weekly,
                  interval: 1,
                  endType: RecurrenceEndType.never,
                  createdAt: DateTime.now(),
                )
              : null,
        );
      }

      Contact buildOrganizer() {
        final now = DateTime.now();
        return Contact(
          id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
          phoneNumber: null,
          colorHex: '#4D8CFF',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: now,
          updatedAt: now,
          externalUserId: 'owner-1',
        );
      }

      test('should calculate duration correctly', () {
        final start = DateTime(2025, 10, 17, 10, 0);
        final end = DateTime(2025, 10, 17, 11, 30);

        final event = buildEvent(start: start, end: end);
        final organizer = buildOrganizer();

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: const [],
        );

        expect(details.duration, const Duration(hours: 1, minutes: 30));
        expect(details.formattedDuration, '1h 30m');
      });

      test('should format duration for whole hours', () {
        final start = DateTime(2025, 10, 17, 10, 0);
        final end = DateTime(2025, 10, 17, 12, 0);

        final event = buildEvent(start: start, end: end);
        final organizer = buildOrganizer();

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: const [],
        );

        expect(details.formattedDuration, '2 hours');
      });

      test('should format duration for minutes only', () {
        final start = DateTime(2025, 10, 17, 10, 0);
        final end = DateTime(2025, 10, 17, 10, 45);

        final event = buildEvent(start: start, end: end);
        final organizer = buildOrganizer();

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: const [],
        );

        expect(details.formattedDuration, '45 min');
      });

      test('should detect recurring events', () {
        final event = buildEvent(recurring: true);
        final organizer = buildOrganizer();

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: event,
          organizer: organizer,
          attendees: const [],
        );

        expect(details.isRecurring, isTrue);
      });

      test('should count other attendees', () {
        final attendees = List.generate(3, (i) {
          final now = DateTime.now();
          return Contact(
            id: 'contact-${i + 2}',
            name: 'Attendee $i',
            email: 'attendee$i@example.com',
            phoneNumber: null,
            colorHex: '#FF6B6B',
            permission: PartnerPermission.private,
            status: ContactStatus.accepted,
            ownerId: 'owner-1',
            createdAt: now,
            updatedAt: now,
            externalUserId: 'user-$i',
          );
        });

        final details = EventInviteDetails(
          inviteId: 'invite-1',
          event: buildEvent(invitedPartnerIds: attendees.map((c) => c.id).toList()),
          organizer: buildOrganizer(),
          attendees: attendees,
        );

        expect(details.otherAttendeesCount, 3);
      });
    });
  });
}
