import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../logic/services/reminder_scheduling_service.dart';
import '../providers/event_providers.dart';
import '../providers/notification_providers.dart';
import '../providers/settings_providers.dart';

/// Provider to initialize the local notification service
final reminderInitializationProvider = FutureProvider<void>((ref) async {
  try {
    await ReminderSchedulingService.initialize();
  } catch (e) {
    debugPrint('[ReminderInitialization] Failed to initialize: $e');
  }
});

/// Provider that watches for reminder scheduling changes
/// Automatically reschedules when events or settings change
final reminderWatcherProvider = FutureProvider<void>((ref) async {
  // Ensure initialization is done first
  await ref.watch(reminderInitializationProvider.future);

  // Watch for changes in events and settings
  final eventsAsync = ref.watch(eventListProvider);
  final settingsAsync = ref.watch(settingsControllerProvider);

  // Extract data from async values
  final events = eventsAsync.maybeWhen(
    data: (e) => e,
    orElse: () => <CalendarEvent>[],
  );

  final settings = settingsAsync.maybeWhen(
    data: (s) => s,
    orElse: () => const SettingsState(),
  );

  // Schedule or cancel reminders based on settings
  if (settings.eventRemindersEnabled && events.isNotEmpty) {
    final channels = settings.eventNotificationChannels;
    final wantsPush = channels.contains(EventNotificationChannel.push);
    final wantsInApp = channels.contains(EventNotificationChannel.inAppOnly);

    if (wantsPush) {
      await ReminderSchedulingService.scheduleReminders(
        events: events,
        reminderMinutesBefore: settings.eventReminderMinutes,
        isEnabled: true,
      );
    } else {
      // Cancel push notifications if the user disabled push delivery
      await ReminderSchedulingService.cancelAllReminders();
    }

    // Create in-app notifications when the in-app channel is selected
    if (wantsInApp) {
      // Get existing notifications to avoid duplicates
      final notificationListAsync = ref.watch(notificationListProvider);
      final existingNotifications = notificationListAsync.maybeWhen(
        data: (n) => n,
        orElse: () => const [],
      );

      final now = DateTime.now();
      final notificationNotifier = ref.read(notificationListProvider.notifier);

      for (final event in events) {
        final reminderTime = event.start
            .subtract(Duration(minutes: settings.eventReminderMinutes));

        // Only create notifications for future reminders
        if (reminderTime.isAfter(now)) {
          // Check if reminder notification already exists for this event
          final alreadyExists = existingNotifications.any(
            (n) =>
                n.metadata?['event_id'] == event.id &&
                n.type.name == 'reminder' &&
                !n.isDismissed,
          );

          // Only add if it doesn't already exist
          if (!alreadyExists) {
            final reminderNotification =
                ReminderSchedulingService.createInAppNotification(
              events: [event],
              scheduledTime: reminderTime,
            );
            await notificationNotifier.addNotification(reminderNotification);
          }
        }
      }
    }
  } else {
    await ReminderSchedulingService.cancelAllReminders();
  }
});
