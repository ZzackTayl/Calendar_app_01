import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/conflict_resolution_service.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';

void main() {
  group('ConflictResolutionService', () {
    group('Event Conflict Resolution', () {
      test('resolves event conflict with last-write-wins', () {
        final now = DateTime.now();
        final earlier = now.subtract(const Duration(minutes: 5));

        final localEvent = CalendarEvent(
          id: 'test-1',
          title: 'Local Version',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: earlier,
          updatedAt: now, // More recent
        );

        final remoteEvent = CalendarEvent(
          id: 'test-1',
          title: 'Remote Version',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: earlier,
          updatedAt: earlier, // Older
        );

        final resolved = ConflictResolutionService.resolveEventConflict(
          localVersion: localEvent,
          remoteVersion: remoteEvent,
        );

        expect(resolved.title, 'Local Version'); // Local wins because it's newer
      });

      test('detects events in conflict', () {
        final now = DateTime.now();

        final event1 = CalendarEvent(
          id: 'test-1',
          title: 'Title 1',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        final event2 = CalendarEvent(
          id: 'test-1',
          title: 'Title 2', // Different title
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        expect(
          ConflictResolutionService.eventsInConflict(event1, event2),
          isTrue,
        );
      });

      test('detects identical events as not in conflict', () {
        final now = DateTime.now();

        final event1 = CalendarEvent(
          id: 'test-1',
          title: 'Same Title',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        final event2 = CalendarEvent(
          id: 'test-1',
          title: 'Same Title',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        expect(
          ConflictResolutionService.eventsInConflict(event1, event2),
          isFalse,
        );
      });
    });

    group('Contact Conflict Resolution', () {
      test('resolves contact conflict with last-write-wins', () {
        final now = DateTime.now();
        final earlier = now.subtract(const Duration(minutes: 5));

        final localContact = Contact(
          id: 'contact-1',
          name: 'Local Name',
          status: ContactStatus.pending,
          ownerId: 'user-1',
          createdAt: earlier,
          updatedAt: now, // More recent
        );

        final remoteContact = Contact(
          id: 'contact-1',
          name: 'Remote Name',
          status: ContactStatus.pending,
          ownerId: 'user-1',
          createdAt: earlier,
          updatedAt: earlier, // Older
        );

        final resolved = ConflictResolutionService.resolveContactConflict(
          localVersion: localContact,
          remoteVersion: remoteContact,
        );

        expect(resolved.name, 'Local Name'); // Local wins
      });

      test('detects contacts in conflict', () {
        final now = DateTime.now();

        final contact1 = Contact(
          id: 'contact-1',
          name: 'Name 1',
          status: ContactStatus.pending,
          ownerId: 'user-1',
          createdAt: now,
        );

        final contact2 = Contact(
          id: 'contact-1',
          name: 'Name 2', // Different name
          status: ContactStatus.pending,
          ownerId: 'user-1',
          createdAt: now,
        );

        expect(
          ConflictResolutionService.contactsInConflict(contact1, contact2),
          isTrue,
        );
      });
    });

    group('Strategy Configuration', () {
      test('can change resolution strategy', () {
        ConflictResolutionService.strategy =
            ConflictResolutionStrategy.preferLocal;
        expect(
          ConflictResolutionService.strategy,
          ConflictResolutionStrategy.preferLocal,
        );

        // Reset to default
        ConflictResolutionService.strategy =
            ConflictResolutionStrategy.lastWriteWins;
      });

      test('preferLocal strategy always returns local version', () {
        ConflictResolutionService.strategy =
            ConflictResolutionStrategy.preferLocal;

        final now = DateTime.now();
        final localEvent = CalendarEvent(
          id: 'test-1',
          title: 'Local',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        final remoteEvent = CalendarEvent(
          id: 'test-1',
          title: 'Remote',
          start: now,
          end: now.add(const Duration(hours: 1)),
          privacyLevel: EventPrivacyLevel.normal,
          ownerId: 'user-1',
          calendarId: 'cal-1',
          createdAt: now,
        );

        final resolved = ConflictResolutionService.resolveEventConflict(
          localVersion: localEvent,
          remoteVersion: remoteEvent,
        );

        expect(resolved.title, 'Local');

        // Reset
        ConflictResolutionService.strategy =
            ConflictResolutionStrategy.lastWriteWins;
      });
    });
  });
}
