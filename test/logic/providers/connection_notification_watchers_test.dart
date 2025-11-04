import 'package:flutter_test/flutter_test.dart';

import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/features/contacts/domain/entities/contact.dart';
import 'package:myorbit_calendar/features/notifications/domain/entities/notification.dart'
    as app_notification;
import 'package:myorbit_calendar/features/notifications/presentation/background/connection_notification_sync.dart';
import 'package:myorbit_calendar/features/notifications/presentation/background/notification_automation_models.dart';
import 'package:myorbit_calendar/logic/services/notification_factory_service.dart';

class _FakeConnectionNotificationPersistence
    implements ConnectionNotificationPersistence {
  Set<String> stored = <String>{};

  @override
  Future<Set<String>> loadProcessedContacts() async => Set.unmodifiable(stored);

  @override
  Future<void> saveProcessedContacts(Set<String> contacts) async {
    stored = {...contacts};
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const automationSettings = NotificationAutomationSettings(
    partnerInvitesEnabled: true,
    calendarChangesEnabled: true,
    eventRemindersEnabled: true,
    eventReminderMinutes: 30,
    eventNotificationChannels: <EventNotificationChannel>{},
  );

  Contact acceptedContact() {
    return const Contact(
      id: 'contact-1',
      name: 'Jordan Miles',
      email: 'jordan@example.com',
      status: ContactStatus.accepted,
      ownerId: 'owner-1',
      permission: PartnerPermission.visible,
    );
  }

  test(
    'Deleting a connection acceptance activity does not trigger recreation',
    () async {
      final contact = acceptedContact();
      final existing = <app_notification.Notification>[
        NotificationFactoryService.createConnectionAcceptedNotification(
          contact,
        ),
      ];

      final persistence = _FakeConnectionNotificationPersistence();
      final addedNotifications = <app_notification.Notification>[];

      Future<void> addNotification(
          app_notification.Notification notification) async {
        addedNotifications.add(notification);
        existing.add(notification);
      }

      // Initial synchronization should record the contact but not create duplicates.
      await synchronizeConnectionNotifications(
        settings: automationSettings,
        contacts: [contact],
        existingNotifications: List.of(existing),
        persistence: persistence,
        addNotification: addNotification,
      );

      expect(addedNotifications, isEmpty);
      expect(persistence.stored, contains(contact.id));

      // Simulate user deleting the notification from activity overview.
      existing.clear();
      addedNotifications.clear();

      await synchronizeConnectionNotifications(
        settings: automationSettings,
        contacts: [contact],
        existingNotifications: List.of(existing),
        persistence: persistence,
        addNotification: addNotification,
      );

      expect(addedNotifications, isEmpty);
      expect(persistence.stored, contains(contact.id));
    },
  );
}
