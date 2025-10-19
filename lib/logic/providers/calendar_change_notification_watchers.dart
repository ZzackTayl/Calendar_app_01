import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/event.dart';
import '../../logic/services/notification_factory_service.dart';
import '../providers/event_providers.dart';
import '../providers/notification_providers.dart';
import '../providers/settings_providers.dart';

/// Provider that watches for calendar changes and creates notifications
/// When events are shared with user or modified, creates appropriate notification
final calendarChangeNotificationWatcherProvider = FutureProvider<void>((ref) async {
  final settingsAsync = ref.watch(settingsControllerProvider);
  final eventsAsync = ref.watch(eventListProvider);

  // Extract setting
  final settings = settingsAsync.maybeWhen(
    data: (s) => s,
    orElse: () => const SettingsState(),
  );

  // Only proceed if setting is enabled
  if (!settings.calendarChangesEnabled) {
    return;
  }

  // Extract events
  final events = eventsAsync.maybeWhen(
    data: (e) => e,
    orElse: () => <CalendarEvent>[],
  );

  if (events.isEmpty) {
    return;
  }

  // Get existing notifications to detect duplicates
  final existingNotificationsAsync = ref.watch(notificationListProvider);

  final existingNotifications = existingNotificationsAsync.maybeWhen(
    data: (n) => n,
    orElse: () => const [],
  );

  final notificationListNotifier = ref.read(notificationListProvider.notifier);

  // For each event with invited partners, check if we need to create a notification
  for (final event in events) {
    // Only notify about shared events (those with invited partners)
    if (event.invitedPartnerIds.isNotEmpty) {
      // Check if we already created a notification for this event
      final alreadyNotified = existingNotifications.any(
        (n) =>
            n.metadata?['event_id'] == event.id &&
            (n.metadata?['action_type'] == 'shared' || n.type.name == 'eventUpdate'),
      );

      if (!alreadyNotified && event.createdAt != null) {
        // Only create notification if event was recently created
        final createdRecently =
            DateTime.now().difference(event.createdAt!).inMinutes < 5;

        if (createdRecently) {
          // For now, use a placeholder name since we don't have owner info in this context
          // In production, you'd fetch the owner contact name
          final notification = NotificationFactoryService.createEventSharedNotification(
            event,
            sharerName: 'A contact',
            permission: event.privacyLevel.name,
          );
          await notificationListNotifier.addNotification(notification);
        }
      }
    }
  }
});

/// Provider that watches for event list changes and triggers re-checking
final eventChangeNotificationProvider = FutureProvider<void>((ref) async {
  // This provider watches events and settings
  // and triggers the watcher when either changes
  ref.watch(eventListProvider);
  ref.watch(settingsControllerProvider);

  // Trigger the watcher
  await ref.watch(calendarChangeNotificationWatcherProvider.future);
});
