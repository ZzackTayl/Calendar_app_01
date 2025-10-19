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
    await ReminderSchedulingService.scheduleReminders(
      events: events,
      reminderMinutesBefore: settings.eventReminderMinutes,
      isEnabled: true,
    );

    // Create in-app reminder notifications for the Notification Center
    // This shows users their upcoming reminders in the app UI
    final now = DateTime.now();
    for (final event in events) {
      final reminderTime = event.start.subtract(Duration(minutes: settings.eventReminderMinutes));
      
      // Only create notifications for future reminders
      if (reminderTime.isAfter(now)) {
        final reminderNotification = ReminderSchedulingService.createInAppNotification(
          events: [event],
          scheduledTime: reminderTime,
        );
        
        // Add to notification center (if settings allow in-app notifications)
        if (settings.eventNotificationChannel == EventNotificationChannel.inAppOnly) {
          await ref.read(notificationListProvider.notifier).addNotification(reminderNotification);
        }
      }
    }
  } else {
    await ReminderSchedulingService.cancelAllReminders();
  }
});
