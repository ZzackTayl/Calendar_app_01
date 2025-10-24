import 'package:flutter_test/flutter_test.dart';

import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/notification.dart' as app_notification;
import 'package:myorbit_calendar/logic/providers/connection_notification_watchers.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/logic/services/notification_factory_service.dart';

class _FakeConnectionNotificationPersistence
    implements ConnectionNotificationPersistence {
  Set<String> stored = <String>{};

  @override
  Future<Set<String>> loadProcessedContacts() async =>
      Set.unmodifiable(stored);

  @override
  Future<void> saveProcessedContacts(Set<String> contacts) async {
    stored = {...contacts};
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const settingsState = SettingsState(partnerInvitesEnabled: true);

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

      Future<void> addNotification(app_notification.Notification notification) async {
        addedNotifications.add(notification);
        existing.add(notification);
      }

      // Initial synchronization should record the contact but not create duplicates.
      await synchronizeConnectionNotifications(
        settings: settingsState,
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
        settings: settingsState,
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
