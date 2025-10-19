import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/contact.dart';
import '../../logic/services/notification_factory_service.dart';
import '../providers/contact_providers.dart';
import '../providers/notification_providers.dart';
import '../providers/settings_providers.dart';

/// Provider that watches for connection status changes and creates notifications
/// When a contact transitions from pending to accepted/declined, creates appropriate notification
final connectionNotificationWatcherProvider = FutureProvider<void>((ref) async {
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

  final existingNotifications = existingNotificationsAsync.maybeWhen(
    data: (n) => n,
    orElse: () => const [],
  );

  final notificationListNotifier = ref.read(notificationListProvider.notifier);

  // For each accepted contact, check if we need to create a notification
  for (final contact in contacts) {
    if (contact.status == ContactStatus.accepted) {
      // Check if we already created a notification for this (including dismissed ones)
      final alreadyNotified = existingNotifications.any(
        (n) =>
            n.metadata?['contact_id'] == contact.id &&
            n.metadata?['action_type'] == 'accepted' &&
            !n.isDismissed,
      );

      if (!alreadyNotified) {
        // Create notification for newly accepted connection
        final notification = NotificationFactoryService.createConnectionAcceptedNotification(contact);
        await notificationListNotifier.addNotification(notification);
      }
    }
  }
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
