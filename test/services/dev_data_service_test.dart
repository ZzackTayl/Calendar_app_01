import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/user_profile.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

void main() {
  group('DevDataService - User IDs', () {
    test('User IDs are consistent and non-empty', () {
      expect(DevDataService.currentUserId.isNotEmpty, true);
      expect(DevDataService.partner1Id.isNotEmpty, true);
      expect(DevDataService.partner2Id.isNotEmpty, true);
      expect(DevDataService.partner3Id.isNotEmpty, true);
      expect(DevDataService.partner4Id.isNotEmpty, true);
      expect(DevDataService.partner5Id.isNotEmpty, true);
    });

    test('User IDs are unique', () {
      final ids = [
        DevDataService.currentUserId,
        DevDataService.partner1Id,
        DevDataService.partner2Id,
        DevDataService.partner3Id,
        DevDataService.partner4Id,
        DevDataService.partner5Id,
      ];

      final uniqueIds = ids.toSet();
      expect(uniqueIds.length, ids.length);
    });
  });

  group('DevDataService - User Profiles', () {
    test('getMockCurrentUser returns valid user', () {
      final user = DevDataService.getMockCurrentUser();

      expect(user.id, DevDataService.currentUserId);
      expect(user.email.isNotEmpty, true);
      expect(user.displayName.isNotEmpty, true);
      expect(user.createdAt.isBefore(DateTime.now()), true);
      expect(user.updatedAt.isBefore(DateTime.now()), true);
      expect(user.preferences, isNotNull);
    });

    test('getMockPartners returns 5 partners', () {
      final partners = DevDataService.getMockPartners();

      expect(partners.length, 5);
      expect(partners.every((p) => p.id.isNotEmpty), true);
      expect(partners.every((p) => p.email.isNotEmpty), true);
      expect(partners.every((p) => p.displayName.isNotEmpty), true);
    });

    test('Partner IDs match expected IDs', () {
      final partners = DevDataService.getMockPartners();
      final partnerIds = partners.map((p) => p.id).toList();

      expect(partnerIds.contains(DevDataService.partner1Id), true);
      expect(partnerIds.contains(DevDataService.partner2Id), true);
      expect(partnerIds.contains(DevDataService.partner3Id), true);
      expect(partnerIds.contains(DevDataService.partner4Id), true);
      expect(partnerIds.contains(DevDataService.partner5Id), true);
    });

    test('getMockUserById returns correct user', () {
      final currentUser =
          DevDataService.getMockUserById(DevDataService.currentUserId);
      expect(currentUser, isNotNull);
      expect(currentUser!.id, DevDataService.currentUserId);

      final partner = DevDataService.getMockUserById(DevDataService.partner1Id);
      expect(partner, isNotNull);
      expect(partner!.id, DevDataService.partner1Id);
    });

    test('getMockUserById returns null for non-existent user', () {
      final user = DevDataService.getMockUserById('non-existent-id');
      expect(user, isNull);
    });

    test('All users have timestamps relative to now', () {
      final now = DateTime.now();
      final currentUser = DevDataService.getMockCurrentUser();
      final partners = DevDataService.getMockPartners();

      expect(currentUser.createdAt.isBefore(now), true);
      expect(currentUser.updatedAt.isBefore(now), true);

      for (final partner in partners) {
        expect(partner.createdAt.isBefore(now), true);
        expect(partner.updatedAt.isBefore(now), true);
      }
    });
  });

  group('DevDataService - Calendar Events', () {
    test('getMockEvents returns multiple events', () {
      final events = DevDataService.getMockEvents();

      expect(events.length, greaterThanOrEqualTo(10));
      expect(events.every((e) => e.id.isNotEmpty), true);
      expect(events.every((e) => e.title.isNotEmpty), true);
      expect(
          events.every((e) => e.ownerId == DevDataService.currentUserId), true);
    });

    test('Events have valid timestamps', () {
      final events = DevDataService.getMockEvents();

      for (final event in events) {
        expect(event.start.isBefore(event.end), true);
        expect(event.createdAt?.isBefore(DateTime.now()), true);
        expect(event.updatedAt?.isBefore(DateTime.now()), true);
      }
    });

    test('Events span multiple days', () {
      final events = DevDataService.getMockEvents();
      final dates = events
          .map((e) => DateTime(e.start.year, e.start.month, e.start.day))
          .toSet();

      expect(dates.length, greaterThan(5));
    });

    test('Events have all privacy levels represented', () {
      final events = DevDataService.getMockEvents();
      final privacyLevels = events.map((e) => e.privacyLevel).toSet();

      expect(privacyLevels.contains(EventPrivacyLevel.normal), true);
      expect(privacyLevels.contains(EventPrivacyLevel.exclusive), true);
      expect(privacyLevels.contains(EventPrivacyLevel.superExclusive), true);
    });

    test('Events have valid invited partner IDs', () {
      final events = DevDataService.getMockEvents();
      final validPartnerIds = [
        DevDataService.partner1Id,
        DevDataService.partner2Id,
        DevDataService.partner3Id,
        DevDataService.partner4Id,
        DevDataService.partner5Id,
      ];

      for (final event in events) {
        for (final partnerId in event.invitedPartnerIds) {
          expect(validPartnerIds.contains(partnerId), true,
              reason: 'Event ${event.id} has invalid partner ID: $partnerId');
        }
      }
    });

    test('getMockEventsForDate filters correctly', () {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final todayEvents = DevDataService.getMockEventsForDate(today);

      for (final event in todayEvents) {
        final eventDate =
            DateTime(event.start.year, event.start.month, event.start.day);
        expect(eventDate, today);
      }
    });

    test('getMockEventsForWeek filters correctly', () {
      final now = DateTime.now();
      final weekStart = DateTime(now.year, now.month, now.day);
      final weekEnd = weekStart.add(const Duration(days: 7));
      final weekEvents = DevDataService.getMockEventsForWeek(weekStart);

      for (final event in weekEvents) {
        expect(event.start.isAfter(weekStart), true);
        expect(event.start.isBefore(weekEnd), true);
      }
    });

    test('getMockEventWithPrivacyLevel creates event with correct privacy', () {
      for (final privacyLevel in EventPrivacyLevel.values) {
        final event = DevDataService.getMockEventWithPrivacyLevel(privacyLevel);
        expect(event.privacyLevel, privacyLevel);
        expect(event.ownerId, DevDataService.currentUserId);
      }
    });

    test('Events are relative to DateTime.now()', () {
      final events = DevDataService.getMockEvents();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);

      // Should have events in the past, today, and future
      final pastEvents = events.where((e) => e.start.isBefore(today)).toList();
      final todayEvents = events.where((e) {
        final eventDate = DateTime(e.start.year, e.start.month, e.start.day);
        return eventDate == today;
      }).toList();
      final futureEvents = events
          .where((e) => e.start.isAfter(today.add(const Duration(days: 1))))
          .toList();

      expect(pastEvents.isNotEmpty, true);
      expect(todayEvents.isNotEmpty, true);
      expect(futureEvents.isNotEmpty, true);
    });
  });

  group('DevDataService - Availability Signals', () {
    test('getMockSignals returns multiple signals', () {
      final signals = DevDataService.getMockSignals();

      expect(signals.length, greaterThanOrEqualTo(5));
      expect(signals.every((s) => s.id.isNotEmpty), true);
      expect(signals.every((s) => s.userId.isNotEmpty), true);
    });

    test('Signals have all types represented', () {
      final signals = DevDataService.getMockSignals();
      final types = signals.map((s) => s.signalType).toSet();

      expect(types.contains(SignalType.available), true);
      expect(types.contains(SignalType.busy), true);
      expect(types.contains(SignalType.flexible), true);
      expect(types.contains(SignalType.unavailable), true);
    });

    test('Signals have multiple durations represented', () {
      final signals = DevDataService.getMockSignals();
      final durations = signals.map((s) => s.duration).toSet();

      // Mock data should have at least 3 different durations
      expect(durations.length, greaterThanOrEqualTo(3));
      // Verify some common durations are present
      expect(
          durations.any((d) => [
                SignalDuration.hour,
                SignalDuration.hours2,
                SignalDuration.hours4,
                SignalDuration.day
              ].contains(d)),
          true);
    });

    test('Signals have valid timestamps', () {
      final signals = DevDataService.getMockSignals();

      for (final signal in signals) {
        expect(signal.startTime.isBefore(signal.endTime), true);
        expect(signal.createdAt.isBefore(DateTime.now()), true);
      }
    });

    test('Signals belong to valid users', () {
      final signals = DevDataService.getMockSignals();
      final validUserIds = [
        DevDataService.currentUserId,
        DevDataService.partner1Id,
        DevDataService.partner2Id,
        DevDataService.partner3Id,
        DevDataService.partner4Id,
        DevDataService.partner5Id,
      ];

      for (final signal in signals) {
        expect(validUserIds.contains(signal.userId), true,
            reason:
                'Signal ${signal.id} has invalid user ID: ${signal.userId}');
      }
    });

    test('getMockActiveSignal creates active signal', () {
      for (final type in SignalType.values) {
        final signal = DevDataService.getMockActiveSignal(type);
        expect(signal.signalType, type);
        expect(signal.userId, DevDataService.currentUserId);
        expect(signal.isActive, true);
      }
    });

    test('getMockActiveSignals returns only active signals', () {
      final activeSignals = DevDataService.getMockActiveSignals();

      for (final signal in activeSignals) {
        expect(signal.isActive, true);
      }
    });

    test('getMockFutureSignals returns only future signals', () {
      final futureSignals = DevDataService.getMockFutureSignals();

      for (final signal in futureSignals) {
        expect(signal.isFuture, true);
      }
    });

    test('Signals are relative to DateTime.now()', () {
      final signals = DevDataService.getMockSignals();
      final now = DateTime.now();

      // Should have active, expired, and future signals
      final activeSignals = signals.where((s) => s.isActive).toList();
      final expiredSignals =
          signals.where((s) => s.endTime.isBefore(now)).toList();
      final futureSignals =
          signals.where((s) => s.startTime.isAfter(now)).toList();

      expect(activeSignals.isNotEmpty, true);
      expect(expiredSignals.isNotEmpty, true);
      expect(futureSignals.isNotEmpty, true);
    });
  });

  group('DevDataService - Signal Shares', () {
    test('getMockSignalShares returns multiple shares', () {
      final shares = DevDataService.getMockSignalShares();

      expect(shares.length, greaterThanOrEqualTo(5));
      expect(shares.every((s) => s.id.isNotEmpty), true);
      expect(shares.every((s) => s.signalId.isNotEmpty), true);
      expect(shares.every((s) => s.sharedWithUserId.isNotEmpty), true);
      expect(shares.every((s) => s.sharedByUserId.isNotEmpty), true);
    });

    test('Signal shares reference existing signals', () {
      final signals = DevDataService.getMockSignals();
      final shares = DevDataService.getMockSignalShares();
      final signalIds = signals.map((s) => s.id).toSet();

      for (final share in shares) {
        expect(signalIds.contains(share.signalId), true,
            reason:
                'Share ${share.id} references non-existent signal ${share.signalId}');
      }
    });

    test('Signal shares reference valid users', () {
      final shares = DevDataService.getMockSignalShares();
      final validUserIds = [
        DevDataService.currentUserId,
        DevDataService.partner1Id,
        DevDataService.partner2Id,
        DevDataService.partner3Id,
        DevDataService.partner4Id,
        DevDataService.partner5Id,
      ];

      for (final share in shares) {
        expect(validUserIds.contains(share.sharedWithUserId), true,
            reason:
                'Share ${share.id} has invalid sharedWithUserId: ${share.sharedWithUserId}');
        expect(validUserIds.contains(share.sharedByUserId), true,
            reason:
                'Share ${share.id} has invalid sharedByUserId: ${share.sharedByUserId}');
      }
    });

    test('Current user has signals shared with them', () {
      final shares = DevDataService.getMockSignalShares();
      final currentUserShares = shares
          .where((s) => s.sharedWithUserId == DevDataService.currentUserId)
          .toList();

      expect(currentUserShares.isNotEmpty, true);
    });

    test('getMockSignalsSharedWith returns correct signals', () {
      final sharedSignals =
          DevDataService.getMockSignalsSharedWith(DevDataService.partner1Id);

      for (final signal in sharedSignals) {
        // These signals should be shared with partner1
        final shares = DevDataService.getMockSignalShares();
        final hasShare = shares.any((s) =>
            s.signalId == signal.id &&
            s.sharedWithUserId == DevDataService.partner1Id);
        expect(hasShare, true);
      }
    });

    test('getMockSignalsReceivedFrom returns correct signals', () {
      final receivedSignals =
          DevDataService.getMockSignalsReceivedFrom(DevDataService.partner1Id);

      for (final signal in receivedSignals) {
        expect(signal.userId, DevDataService.partner1Id);

        // Should be shared with current user
        final shares = DevDataService.getMockSignalShares();
        final hasShare = shares.any((s) =>
            s.signalId == signal.id &&
            s.sharedWithUserId == DevDataService.currentUserId &&
            s.sharedByUserId == DevDataService.partner1Id);
        expect(hasShare, true);
      }
    });
  });

  group('DevDataService - Contacts', () {
    test('getMockContacts returns multiple contacts', () {
      final contacts = DevDataService.getMockContacts();

      expect(contacts.length, greaterThanOrEqualTo(8));
      expect(contacts.every((c) => c.id.isNotEmpty), true);
      expect(contacts.every((c) => c.name.isNotEmpty), true);
      expect(contacts.every((c) => c.email?.isNotEmpty ?? false), true);
      expect(contacts.every((c) => c.ownerId == DevDataService.currentUserId),
          true);
    });

    test('Contacts have all statuses represented', () {
      final contacts = DevDataService.getMockContacts();
      final statuses = contacts.map((c) => c.status).toSet();

      expect(statuses.contains(ContactStatus.accepted), true);
      expect(statuses.contains(ContactStatus.pending), true);
      expect(statuses.contains(ContactStatus.contactOnly), true);
    });

    test('Contacts have all permission levels represented', () {
      final contacts = DevDataService.getMockContacts();
      final permissions = contacts.map((c) => c.permission).toSet();

      expect(permissions.contains(PartnerPermission.visible), true);
      expect(permissions.contains(PartnerPermission.semiVisible), true);
      expect(permissions.contains(PartnerPermission.private), true);
    });

    test('Accepted contacts have external user IDs', () {
      final contacts = DevDataService.getMockContacts();
      final acceptedContacts =
          contacts.where((c) => c.status == ContactStatus.accepted).toList();

      expect(acceptedContacts.isNotEmpty, true);
      for (final contact in acceptedContacts) {
        expect(contact.externalUserId, isNotNull);
        expect(contact.externalUserId!.isNotEmpty, true);
      }
    });

    test('Accepted contacts reference valid partner IDs', () {
      final contacts = DevDataService.getMockContacts();
      final acceptedContacts =
          contacts.where((c) => c.status == ContactStatus.accepted).toList();
      final validPartnerIds = [
        DevDataService.partner1Id,
        DevDataService.partner2Id,
        DevDataService.partner3Id,
        DevDataService.partner4Id,
        DevDataService.partner5Id,
      ];

      for (final contact in acceptedContacts) {
        expect(validPartnerIds.contains(contact.externalUserId), true,
            reason:
                'Contact ${contact.id} has invalid externalUserId: ${contact.externalUserId}');
      }
    });

    test('Non-accepted contacts have null external user IDs', () {
      final contacts = DevDataService.getMockContacts();
      final nonAcceptedContacts =
          contacts.where((c) => c.status != ContactStatus.accepted).toList();

      for (final contact in nonAcceptedContacts) {
        expect(contact.externalUserId, isNull);
      }
    });

    test('Contacts have valid timestamps', () {
      final contacts = DevDataService.getMockContacts();
      final now = DateTime.now();

      for (final contact in contacts) {
        expect(contact.createdAt?.isBefore(now), true);
        expect(contact.updatedAt?.isBefore(now), true);
      }
    });
  });

  group('DevDataService - Recent Activity', () {
    test('getMockRecentActivity returns multiple activities', () {
      final activities = DevDataService.getMockRecentActivity();

      expect(activities.length, greaterThanOrEqualTo(5));
      expect(activities.every((a) => a['id'] != null), true);
      expect(activities.every((a) => a['type'] != null), true);
      expect(activities.every((a) => a['title'] != null), true);
      expect(activities.every((a) => a['message'] != null), true);
      expect(activities.every((a) => a['timestamp'] != null), true);
    });

    test('Activities have all notification types represented', () {
      final activities = DevDataService.getMockRecentActivity();
      final types =
          activities.map((a) => a['type'] as NotificationType).toSet();

      expect(types.contains(NotificationType.signalReceived), true);
      expect(types.contains(NotificationType.eventInvite), true);
      expect(types.contains(NotificationType.partnerAccepted), true);
      expect(types.contains(NotificationType.eventReminder), true);
    });

    test('Activities have both read and unread items', () {
      final activities = DevDataService.getMockRecentActivity();
      final readStatuses = activities.map((a) => a['read'] as bool).toSet();

      expect(readStatuses.contains(true), true);
      expect(readStatuses.contains(false), true);
    });

    test('getMockUnreadActivity returns only unread items', () {
      final unreadActivities = DevDataService.getMockUnreadActivity();

      expect(unreadActivities.isNotEmpty, true);
      expect(unreadActivities.every((a) => a['read'] == false), true);
    });

    test('getMockActivityByType filters correctly', () {
      final signalActivities =
          DevDataService.getMockActivityByType(NotificationType.signalReceived);

      expect(signalActivities.isNotEmpty, true);
      expect(
          signalActivities
              .every((a) => a['type'] == NotificationType.signalReceived),
          true);
    });

    test('Activities have valid timestamps relative to now', () {
      final activities = DevDataService.getMockRecentActivity();
      final now = DateTime.now();

      for (final activity in activities) {
        final timestamp = activity['timestamp'] as DateTime;
        expect(timestamp.isBefore(now), true);
      }
    });
  });

  group('DevDataService - Helper Methods', () {
    test('getMockPartnerWithEvents returns valid data', () {
      final result =
          DevDataService.getMockPartnerWithEvents(DevDataService.partner1Id);

      expect(result['partner'], isNotNull);
      expect(result['events'], isNotNull);

      final partner = result['partner'] as UserProfile;
      expect(partner.id, DevDataService.partner1Id);

      final events = result['events'] as List<CalendarEvent>;
      for (final event in events) {
        expect(
            event.invitedPartnerIds.contains(DevDataService.partner1Id), true);
      }
    });

    test('getMockPartnerWithEvents returns null for invalid partner', () {
      final result = DevDataService.getMockPartnerWithEvents('invalid-id');

      expect(result['partner'], isNull);
      expect(result['events'], isEmpty);
    });
  });

  group('DevDataService - Data Consistency', () {
    test('All event invited partners exist as contacts', () {
      final events = DevDataService.getMockEvents();
      final contacts = DevDataService.getMockContacts();
      final acceptedContactIds = contacts
          .where((c) => c.status == ContactStatus.accepted)
          .map((c) => c.externalUserId)
          .where((id) => id != null)
          .toSet();

      for (final event in events) {
        for (final partnerId in event.invitedPartnerIds) {
          expect(acceptedContactIds.contains(partnerId), true,
              reason:
                  'Event ${event.id} invites non-contact partner: $partnerId');
        }
      }
    });

    test('All signal shares reference valid users', () {
      final shares = DevDataService.getMockSignalShares();
      final allUserIds = [
        DevDataService.currentUserId,
        ...DevDataService.getMockPartners().map((p) => p.id),
      ].toSet();

      for (final share in shares) {
        expect(allUserIds.contains(share.sharedWithUserId), true);
        expect(allUserIds.contains(share.sharedByUserId), true);
      }
    });

    test('All activity references valid entities', () {
      final activities = DevDataService.getMockRecentActivity();
      final allUserIds = [
        DevDataService.currentUserId,
        ...DevDataService.getMockPartners().map((p) => p.id),
      ].toSet();
      final eventIds = DevDataService.getMockEvents().map((e) => e.id).toSet();
      final signalIds =
          DevDataService.getMockSignals().map((s) => s.id).toSet();

      for (final activity in activities) {
        if (activity['relatedUserId'] != null) {
          final userId = activity['relatedUserId'] as String;
          // Some activities may reference pending users not in our mock data
          if (!userId.startsWith('user-pending-')) {
            expect(allUserIds.contains(userId), true,
                reason:
                    'Activity ${activity['id']} references invalid user: $userId');
          }
        }

        if (activity['relatedEventId'] != null) {
          final eventId = activity['relatedEventId'] as String;
          expect(eventIds.contains(eventId), true,
              reason:
                  'Activity ${activity['id']} references invalid event: $eventId');
        }

        if (activity['relatedSignalId'] != null) {
          final signalId = activity['relatedSignalId'] as String;
          expect(signalIds.contains(signalId), true,
              reason:
                  'Activity ${activity['id']} references invalid signal: $signalId');
        }
      }
    });

    test('All data uses consistent date calculations', () {
      final now = DateTime.now();

      // All created/updated timestamps should be in the past
      final users = [
        DevDataService.getMockCurrentUser(),
        ...DevDataService.getMockPartners()
      ];
      for (final user in users) {
        expect(user.createdAt.isBefore(now), true);
        expect(user.updatedAt.isBefore(now), true);
      }

      final events = DevDataService.getMockEvents();
      for (final event in events) {
        expect(event.createdAt?.isBefore(now), true);
        expect(event.updatedAt?.isBefore(now), true);
      }

      final signals = DevDataService.getMockSignals();
      for (final signal in signals) {
        expect(signal.createdAt.isBefore(now), true);
      }

      final contacts = DevDataService.getMockContacts();
      for (final contact in contacts) {
        expect(contact.createdAt?.isBefore(now), true);
        expect(contact.updatedAt?.isBefore(now), true);
      }
    });
  });

  group('DevDataService - Enum Coverage', () {
    test('All EventPrivacyLevel values are used', () {
      final events = DevDataService.getMockEvents();
      final usedLevels = events.map((e) => e.privacyLevel).toSet();

      for (final level in EventPrivacyLevel.values) {
        expect(usedLevels.contains(level), true,
            reason: 'EventPrivacyLevel.$level is not used in mock data');
      }
    });

    test('All SignalType values are used', () {
      final signals = DevDataService.getMockSignals();
      final usedTypes = signals.map((s) => s.signalType).toSet();

      for (final type in SignalType.values) {
        expect(usedTypes.contains(type), true,
            reason: 'SignalType.$type is not used in mock data');
      }
    });

    test('All ContactStatus values are used', () {
      final contacts = DevDataService.getMockContacts();
      final usedStatuses = contacts.map((c) => c.status).toSet();

      for (final status in ContactStatus.values) {
        expect(usedStatuses.contains(status), true,
            reason: 'ContactStatus.$status is not used in mock data');
      }
    });

    test('All PartnerPermission values are used', () {
      final contacts = DevDataService.getMockContacts();
      final usedPermissions = contacts.map((c) => c.permission).toSet();

      for (final permission in PartnerPermission.values) {
        expect(usedPermissions.contains(permission), true,
            reason: 'PartnerPermission.$permission is not used in mock data');
      }
    });
  });
}
