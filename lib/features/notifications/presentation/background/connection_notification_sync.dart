import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../features/contacts/domain/entities/contact.dart';
import '../../domain/entities/notification.dart';
import '../../../../logic/services/notification_factory_service.dart';
import 'notification_automation_models.dart';

const _processedContactsKey = 'connection_notified_contacts';

/// Abstraction over how processed contact ids are persisted between syncs.
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

/// Synchronize connection notifications with the current contacts list.
///
/// Ensures users receive an in-app notification when a partner invitation is
/// accepted while avoiding duplicates across restarts.
Future<void> synchronizeConnectionNotifications({
  required NotificationAutomationSettings settings,
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
      (notification) =>
          notification.metadata?['contact_id'] == contact.id &&
          notification.metadata?['action_type'] == 'accepted' &&
          !notification.isDismissed,
    );

    if (wasProcessed || alreadyNotified) {
      if (!wasProcessed) {
        shouldPersistProcessedContacts = true;
      }
      continue;
    }

    final notification =
        NotificationFactoryService.createConnectionAcceptedNotification(
      contact,
    );
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
