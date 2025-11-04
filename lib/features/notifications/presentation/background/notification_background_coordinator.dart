import 'dart:async';

import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/enums.dart' as legacy_enums;
import '../../../../domain/event.dart';
import '../../../../features/contacts/domain/entities/contact.dart';
import '../../../../features/contacts/presentation/cubit/contact_cubit.dart';
import '../../../../features/notifications/domain/entities/notification.dart';
import '../../../../features/notifications/presentation/cubit/notification_cubit.dart';
import '../../../../features/calendar/presentation/cubit/event_cubit.dart';
import '../../../../logic/services/reminder_scheduling_service.dart';
import '../../../../presentation/cubit/settings/settings_cubit.dart'
    as legacy_settings;
import 'calendar_notification_sync.dart';
import 'connection_notification_sync.dart';
import 'notification_automation_models.dart';

/// Coordinates background automation that previously relied on Riverpod watchers.
class NotificationBackgroundCoordinator {
  NotificationBackgroundCoordinator({
    required NotificationCubit notificationCubit,
    required ContactCubit contactCubit,
    required EventCubit eventCubit,
    required legacy_settings.SettingsCubit settingsCubit,
    ConnectionNotificationPersistence? persistence,
  })  : _notificationCubit = notificationCubit,
        _contactCubit = contactCubit,
        _eventCubit = eventCubit,
        _settingsCubit = settingsCubit,
        _persistence = persistence ??
            const SharedPreferencesConnectionNotificationPersistence() {
    _settings = _extractSettings(settingsCubit.state);
    _contacts = contactCubit.state.contacts;
    _events = eventCubit.state.events;
    _notifications = notificationCubit.state.notifications;
  }

  final NotificationCubit _notificationCubit;
  final ContactCubit _contactCubit;
  final EventCubit _eventCubit;
  final legacy_settings.SettingsCubit _settingsCubit;
  final ConnectionNotificationPersistence _persistence;

  late NotificationAutomationSettings _settings;
  List<Contact> _contacts = const [];
  List<CalendarEvent> _events = const [];
  List<Notification> _notifications = const [];

  StreamSubscription<ContactState>? _contactSub;
  StreamSubscription<EventState>? _eventSub;
  StreamSubscription<legacy_settings.SettingsCubitState>? _settingsSub;
  StreamSubscription<NotificationState>? _notificationSub;

  bool _connectionSyncInProgress = false;
  bool _calendarSyncInProgress = false;
  bool _reminderSyncInProgress = false;

  /// Start listening for updates.
  void start() {
    _contactSub = _contactCubit.stream.listen(_handleContactState);
    _eventSub = _eventCubit.stream.listen(_handleEventState);
    _settingsSub = _settingsCubit.stream.listen(_handleSettingsState);
    _notificationSub =
        _notificationCubit.stream.listen(_handleNotificationState);

    // Apply initial state
    _handleContactState(_contactCubit.state, initial: true);
    _handleEventState(_eventCubit.state, initial: true);
    _handleSettingsState(_settingsCubit.state, initial: true);
  }

  void dispose() {
    _contactSub?.cancel();
    _eventSub?.cancel();
    _settingsSub?.cancel();
    _notificationSub?.cancel();
  }

  void _handleNotificationState(NotificationState state) {
    _notifications = state.notifications;
  }

  void _handleContactState(ContactState state, {bool initial = false}) {
    if (state.status != AppStateStatus.success) {
      if (initial && state.contacts.isNotEmpty) {
        _contacts = state.contacts;
      }
      return;
    }
    _contacts = state.contacts;
    _triggerConnectionSync();
  }

  void _handleEventState(EventState state, {bool initial = false}) {
    if (state.status != AppStateStatus.success) {
      if (initial && state.events.isNotEmpty) {
        _events = state.events;
      }
      return;
    }
    _events = state.events;
    _triggerCalendarSync();
    _triggerReminderSync();
  }

  void _handleSettingsState(
    legacy_settings.SettingsCubitState state, {
    bool initial = false,
  }) {
    _settings = _extractSettings(state);
    if (initial) {
      _triggerConnectionSync();
      _triggerCalendarSync();
      _triggerReminderSync();
      return;
    }
    _triggerConnectionSync();
    _triggerCalendarSync();
    _triggerReminderSync();
  }

  NotificationAutomationSettings _extractSettings(
    legacy_settings.SettingsCubitState state,
  ) {
    final settings = state.settings;
    return NotificationAutomationSettings(
      partnerInvitesEnabled: settings.partnerInvitesEnabled,
      calendarChangesEnabled: settings.calendarChangesEnabled,
      eventRemindersEnabled: settings.eventRemindersEnabled,
      eventReminderMinutes: settings.eventReminderMinutes,
      eventNotificationChannels: Set<legacy_enums.EventNotificationChannel>.from(
        settings.eventNotificationChannels,
      ),
    );
  }

  void _triggerConnectionSync() {
    unawaited(_runConnectionSync());
  }

  void _triggerCalendarSync() {
    unawaited(_runCalendarSync());
  }

  void _triggerReminderSync() {
    unawaited(_runReminderSync());
  }

  Future<void> _runConnectionSync() async {
    if (_connectionSyncInProgress) {
      return;
    }
    _connectionSyncInProgress = true;
    try {
      await synchronizeConnectionNotifications(
        settings: _settings,
        contacts: _contacts,
        existingNotifications: _notifications,
        persistence: _persistence,
        addNotification: _notificationCubit.addNotification,
      );
    } finally {
      _connectionSyncInProgress = false;
    }
  }

  Future<void> _runCalendarSync() async {
    if (_calendarSyncInProgress) {
      return;
    }
    _calendarSyncInProgress = true;
    try {
      await synchronizeCalendarShareNotifications(
        settings: _settings,
        events: _events,
        contacts: _contacts,
        existingNotifications: _notifications,
        addNotification: _notificationCubit.addNotification,
      );
    } finally {
      _calendarSyncInProgress = false;
    }
  }

  Future<void> _runReminderSync() async {
    if (_reminderSyncInProgress) {
      return;
    }
    _reminderSyncInProgress = true;
    try {
      if (!_settings.eventRemindersEnabled) {
        await ReminderSchedulingService.cancelAllReminders();
        return;
      }

      final wantsPush = _settings.eventNotificationChannels
          .contains(legacy_enums.EventNotificationChannel.push);
      final wantsInApp = _settings.eventNotificationChannels
          .contains(legacy_enums.EventNotificationChannel.inAppOnly);

      if (wantsPush) {
        await ReminderSchedulingService.scheduleReminders(
          events: _events,
          reminderMinutesBefore: _settings.eventReminderMinutes,
          isEnabled: true,
        );
      } else {
        await ReminderSchedulingService.cancelAllReminders();
      }

      if (wantsInApp) {
        await _createInAppReminders();
      }
    } finally {
      _reminderSyncInProgress = false;
    }
  }

  Future<void> _createInAppReminders() async {
    if (_events.isEmpty) {
      return;
    }
    final now = DateTime.now();
    for (final event in _events) {
      final reminderTime = event.start
          .subtract(Duration(minutes: _settings.eventReminderMinutes));

      if (!reminderTime.isAfter(now)) {
        continue;
      }

      if (_hasExistingReminder(event)) {
        continue;
      }

      final notification = ReminderSchedulingService.createInAppNotification(
        events: [event],
        scheduledTime: reminderTime,
      );

      final metadata = Map<String, dynamic>.from(notification.metadata ?? {})
        ..['event_id'] = event.id
        ..['action_type'] = 'reminder';

      await _notificationCubit.addNotification(
        notification.copyWith(metadata: metadata),
      );
    }
  }

  bool _hasExistingReminder(CalendarEvent event) {
    for (final notification in _notifications) {
      if (notification.type != NotificationType.eventReminder ||
          notification.isDismissed) {
        continue;
      }
      final metadata = notification.metadata;
      if (metadata == null) {
        continue;
      }

      final eventIds = metadata['event_ids'];
      if (eventIds is List) {
        if (eventIds.cast<String>().contains(event.id)) {
          return true;
        }
      }

      final singleEventId = metadata['event_id'];
      if (singleEventId == event.id) {
        return true;
      }
    }
    return false;
  }
}
