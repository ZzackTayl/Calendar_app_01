import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/contact.dart';
import '../../domain/notification.dart';
import '../../logic/services/notification_factory_service.dart';
import '../providers/contact_providers.dart';
import '../providers/notification_providers.dart';
import '../providers/settings_providers.dart';

/// Provider that watches for connection status changes and creates notifications
/// When a contact transitions from pending to accepted/declined, creates appropriate notification
const _processedContactsKey = 'connection_notified_contacts';

final connectionNotificationPersistenceProvider =
    Provider<ConnectionNotificationPersistence>(
  (ref) => const SharedPreferencesConnectionNotificationPersistence(),
);

final connectionNotificationWatcherProvider = FutureProvider<void>((ref) async {
  final persistence = ref.read(connectionNotificationPersistenceProvider);

  final settingsAsync = ref.watch(settingsControllerProvider);
  final contactsAsync = ref.watch(contactListProvider);

  // Extract setting
  final settings = settingsAsync.maybeWhen(
    data: (s) => s,
    orElse: () => const SettingsState(),
  );

  // Only proceed if setting is enabled
  if (!settings.partnerInvitesEnabled) {
    return;
  }

  // Extract contacts
  final contacts = contactsAsync.maybeWhen(
    data: (c) => c,
    orElse: () => <Contact>[],
  );

  if (contacts.isEmpty) {
    return;
  }

  // Get existing notifications to detect duplicates
  final existingNotificationsAsync = ref.watch(notificationListProvider);

  final existingNotifications =
      existingNotificationsAsync.maybeWhen<List<Notification>>(
    data: (n) => n,
    orElse: () => const <Notification>[],
  );

  final notificationListNotifier = ref.read(notificationListProvider.notifier);

  await synchronizeConnectionNotifications(
    settings: settings,
    contacts: contacts,
    existingNotifications: existingNotifications,
    persistence: persistence,
    addNotification: notificationListNotifier.addNotification,
  );
});

/// Provider that watches for contact list changes and triggers re-checking
final contactChangeNotificationProvider = FutureProvider<void>((ref) async {
  // This provider watches contacts and settings
  // and triggers the watcher when either changes
  ref.watch(contactListProvider);
  ref.watch(settingsControllerProvider);

  // Trigger the watcher
  await ref.watch(connectionNotificationWatcherProvider.future);
});

abstract class ConnectionNotificationPersistence {
  Future<Set<String>> loadProcessedContacts();
  Future<void> saveProcessedContacts(Set<String> contacts);
}

class SharedPreferencesConnectionNotificationPersistence
    implements ConnectionNotificationPersistence {
  const SharedPreferencesConnectionNotificationPersistence();

  @override
  Future<Set<String>> loadProcessedContacts() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getStringList(_processedContactsKey);
      if (stored == null) {
        return const <String>{};
      }
      return stored.toSet();
    } catch (_) {
      return const <String>{};
    }
  }

  @override
  Future<void> saveProcessedContacts(Set<String> contacts) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(
        _processedContactsKey,
        contacts.toList(),
      );
    } catch (_) {
      // Ignore persistence failures; they are non-critical for functionality.
    }
  }
}

@visibleForTesting
Future<void> synchronizeConnectionNotifications({
  required SettingsState settings,
  required List<Contact> contacts,
  required List<Notification> existingNotifications,
  required ConnectionNotificationPersistence persistence,
  required Future<void> Function(Notification notification) addNotification,
}) async {
  if (!settings.partnerInvitesEnabled || contacts.isEmpty) {
    return;
  }

  Set<String> storedContacts;
  try {
    storedContacts = await persistence.loadProcessedContacts();
  } catch (_) {
    storedContacts = const <String>{};
  }

  final nextProcessedContacts = <String>{};
  var shouldPersistProcessedContacts = false;

  for (final contact in contacts) {
    if (contact.status != ContactStatus.accepted) {
      continue;
    }

    nextProcessedContacts.add(contact.id);

    final wasProcessed = storedContacts.contains(contact.id);

    final alreadyNotified = existingNotifications.any(
      (n) =>
          n.metadata?['contact_id'] == contact.id &&
          n.metadata?['action_type'] == 'accepted' &&
          !n.isDismissed,
    );

    if (wasProcessed || alreadyNotified) {
      if (!wasProcessed) {
        shouldPersistProcessedContacts = true;
      }
      continue;
    }

    final notification =
        NotificationFactoryService.createConnectionAcceptedNotification(
            contact);
    await addNotification(notification);
    shouldPersistProcessedContacts = true;
  }

  if (shouldPersistProcessedContacts ||
      !setEquals(storedContacts, nextProcessedContacts)) {
    try {
      await persistence.saveProcessedContacts(nextProcessedContacts);
    } catch (_) {
      // Ignore persistence failures; they are non-critical for functionality.
    }
  }
}
