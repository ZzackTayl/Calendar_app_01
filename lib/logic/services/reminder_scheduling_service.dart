import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;

import '../../domain/event.dart';
import '../../domain/notification.dart' as domain;

/// Service for scheduling event reminders using flutter_local_notifications
/// Handles grouping nearby events (within 30 min) and scheduling OS-level notifications
class ReminderSchedulingService {
  static const String _reminderGroupKey = 'event_reminders';
  static const int _reminderGroupingWindowMinutes = 30;
  static const String _reminderChannelId = 'event_reminders';
  static const String _reminderChannelName = 'Event Reminders';
  static FlutterLocalNotificationsPlugin? _pluginOverride;
  static bool? _supportsNativeOverride;
  static bool? _isPluginRegisteredCache;

  static bool _initialized = false;

  /// Initialize the local notifications plugin
  static Future<void> initialize() async {
    if (!_supportsNativeNotifications()) {
      debugPrint(
          '[ReminderSchedulingService] Skipping initialization (unsupported platform)');
      return;
    }

    try {
      final flutterLocalNotificationsPlugin = _obtainPlugin();

      const androidSettings = AndroidInitializationSettings('app_icon');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const macSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
        macOS: macSettings,
      );

      await flutterLocalNotificationsPlugin.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _handleNotificationResponse,
      );

      // Create notification channel for Android 8+
      await flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(
            AndroidNotificationChannel(
              _reminderChannelId,
              _reminderChannelName,
              description: 'Notifications for upcoming event reminders',
              importance: Importance.high,
              enableVibration: true,
              playSound: true,
            ),
          );
      _initialized = true;
    } catch (e) {
      debugPrint(
          '[ReminderSchedulingService] Skipping initialization (unavailable platform): $e');
      _initialized = false;
    }
  }

  /// Schedule reminders for a list of events
  /// Groups events that have reminders within 30 minutes of each other
  /// Only schedules if reminders are enabled and not in the past
  static Future<void> scheduleReminders({
    required List<CalendarEvent> events,
    required int reminderMinutesBefore,
    required bool isEnabled,
  }) async {
    if (!_supportsNativeNotifications()) {
      debugPrint(
          '[ReminderSchedulingService] Skipping scheduling (unsupported platform)');
      return;
    }

    if (!_initialized) {
      debugPrint(
          '[ReminderSchedulingService] Skipping scheduling (service not initialized)');
      return;
    }

    try {
      if (!isEnabled || reminderMinutesBefore <= 0) {
        await cancelAllReminders();
        return;
      }

      final now = DateTime.now();
      final flutterLocalNotificationsPlugin = _obtainPlugin();

      // Calculate reminder times for all valid events
      final remindersToSchedule = <({
        DateTime reminderTime,
        List<CalendarEvent> events,
        int notificationId,
      })>[];

      final validEvents = events
          .where((e) => e.start
              .isAfter(now.add(Duration(minutes: reminderMinutesBefore))))
          .toList()
        ..sort((a, b) => a.start.compareTo(b.start));

      if (validEvents.isEmpty) {
        await cancelAllReminders();
        return;
      }

      // Group events by reminder time (within 30 min window)
      int groupIndex = 0;
      for (int i = 0; i < validEvents.length; i++) {
        final event = validEvents[i];
        final reminderTime =
            event.start.subtract(Duration(minutes: reminderMinutesBefore));

        // Check if this event belongs to an existing group
        bool addedToGroup = false;
        for (final group in remindersToSchedule) {
          final timeDifference =
              group.reminderTime.difference(reminderTime).abs();
          if (timeDifference.inMinutes <= _reminderGroupingWindowMinutes) {
            // Add to existing group (modify by creating new list)
            final index = remindersToSchedule.indexOf(group);
            remindersToSchedule[index] = (
              reminderTime: group.reminderTime,
              events: [...group.events, event],
              notificationId: group.notificationId,
            );
            addedToGroup = true;
            break;
          }
        }

        // Create new group if not added to existing
        if (!addedToGroup) {
          remindersToSchedule.add((
            reminderTime: reminderTime,
            events: [event],
            notificationId: _generateNotificationId(groupIndex),
          ));
          groupIndex++;
        }
      }

      // Schedule notifications for each group
      for (final reminder in remindersToSchedule) {
        await _scheduleNotification(
          flutterLocalNotificationsPlugin,
          notificationId: reminder.notificationId,
          reminderTime: reminder.reminderTime,
          events: reminder.events,
        );
      }

      debugPrint(
          '[ReminderSchedulingService] Scheduled ${remindersToSchedule.length} reminder groups');
    } catch (e) {
      debugPrint(
          '[ReminderSchedulingService] Skipping scheduling (unavailable platform): $e');
    }
  }

  /// Schedule a single notification for a group of events
  static Future<void> _scheduleNotification(
    FlutterLocalNotificationsPlugin plugin, {
    required int notificationId,
    required DateTime reminderTime,
    required List<CalendarEvent> events,
  }) async {
    final title = events.length == 1 ? 'Upcoming Event' : 'Upcoming Events';
    final eventNames = events.map((e) => e.title).take(3).join(', ');
    final message = events.length == 1
        ? 'Event "${events.first.title}" starts in ${_minutesUntil(reminderTime)} minutes'
        : 'You have ${events.length} events starting soon: $eventNames';

    try {
      // Convert to local timezone
      final tzLocation = tz.local;
      final tzTime = tz.TZDateTime.from(reminderTime, tzLocation);

      await plugin.zonedSchedule(
        notificationId,
        title,
        message,
        tzTime,
        NotificationDetails(
          android: AndroidNotificationDetails(
            _reminderChannelId,
            _reminderChannelName,
            channelDescription: 'Event reminder notifications',
            groupKey: _reminderGroupKey,
            importance: Importance.high,
            priority: Priority.high,
            enableVibration: true,
            playSound: true,
          ),
          iOS: const DarwinNotificationDetails(
            presentAlert: true,
            presentBadge: true,
            presentSound: true,
            threadIdentifier: _reminderGroupKey,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.alarmClock,
        matchDateTimeComponents: DateTimeComponents.dateAndTime,
      );

      debugPrint(
        '[ReminderSchedulingService] Scheduled reminder for ${events.length} event(s) at $reminderTime',
      );
    } catch (e) {
      debugPrint(
          '[ReminderSchedulingService] Error scheduling notification: $e');
    }
  }

  /// Cancel all scheduled reminders
  static Future<void> cancelAllReminders() async {
    if (!_supportsNativeNotifications()) {
      debugPrint(
          '[ReminderSchedulingService] Skipping cancelAll (unsupported platform)');
      return;
    }

    if (!_initialized) {
      debugPrint(
          '[ReminderSchedulingService] Skipping cancelAll (service not initialized)');
      return;
    }

    try {
      final flutterLocalNotificationsPlugin = _obtainPlugin();
      await flutterLocalNotificationsPlugin.cancelAll();
      debugPrint('[ReminderSchedulingService] Cancelled all reminders');
    } catch (e) {
      debugPrint(
          '[ReminderSchedulingService] Skipping cancelAll (unavailable platform): $e');
    }
  }

  /// Handle notification tap
  static Future<void> _handleNotificationResponse(
    NotificationResponse notificationResponse,
  ) async {
    debugPrint(
        '[ReminderSchedulingService] Notification tapped: ${notificationResponse.id}');
    // Could navigate to calendar or event details here
    // For now, just log it
  }

  /// Generate a unique notification ID based on group index
  static int _generateNotificationId(int groupIndex) {
    return 10000 +
        groupIndex; // Offset to avoid conflicts with other notification IDs
  }

  /// Calculate minutes until a time
  static String _minutesUntil(DateTime time) {
    final minutes = time.difference(DateTime.now()).inMinutes;
    return minutes.toString();
  }

  static FlutterLocalNotificationsPlugin _obtainPlugin() {
    return _pluginOverride ?? FlutterLocalNotificationsPlugin();
  }

  static bool _supportsNativeNotifications() {
    if (_supportsNativeOverride != null) {
      return _supportsNativeOverride!;
    }

    if (kIsWeb) {
      return false;
    }

    if (!_ensurePluginRegistered()) {
      return false;
    }

    return defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;
  }

  /// Create an in-app notification for the notification center
  static domain.Notification createInAppNotification({
    required List<CalendarEvent> events,
    required DateTime scheduledTime,
  }) {
    final title = events.length == 1 ? 'Upcoming Event' : 'Upcoming Events';
    final eventNames = events.map((e) => e.title).take(3).join(', ');
    final message = events.length == 1
        ? 'Event "${events.first.title}" starts soon'
        : 'You have ${events.length} events starting soon: $eventNames';

    return domain.Notification(
      id: 'reminder_${DateTime.now().millisecondsSinceEpoch}',
      type: domain.NotificationType.eventReminder,
      title: title,
      message: message,
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_ids': events.map((e) => e.id).toList(),
        'event_count': events.length,
      },
      showInCenter: true,
    );
  }

  /// Testing hook to override plugin/native support detection.
  @visibleForTesting
  static void debugConfigure({
    FlutterLocalNotificationsPlugin? pluginOverride,
    bool? supportsNativeOverride,
  }) {
    _pluginOverride = pluginOverride;
    _supportsNativeOverride = supportsNativeOverride;
    _initialized = pluginOverride != null;
    _isPluginRegisteredCache = pluginOverride != null;
  }

  /// Reset overrides set via [debugConfigure].
  @visibleForTesting
  static void resetDebugConfiguration() {
    _pluginOverride = null;
    _supportsNativeOverride = null;
    _initialized = false;
    _isPluginRegisteredCache = null;
  }

  static bool _ensurePluginRegistered() {
    if (_isPluginRegisteredCache != null) {
      return _isPluginRegisteredCache!;
    }

    try {
      FlutterLocalNotificationsPlatform.instance;
      _isPluginRegisteredCache = true;
      return true;
    } catch (error) {
      if (_isPluginRegisteredCache != false) {
        debugPrint(
          '[ReminderSchedulingService] Local notifications plugin not registered on this platform; reminders disabled. ($error)',
        );
      }
      _isPluginRegisteredCache = false;
      return false;
    }
  }
}
