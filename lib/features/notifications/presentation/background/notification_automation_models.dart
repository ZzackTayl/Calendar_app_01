import '../../../../domain/enums.dart' as legacy_enums;

/// Snapshot of settings required for background notification automation.
class NotificationAutomationSettings {
  const NotificationAutomationSettings({
    required this.partnerInvitesEnabled,
    required this.calendarChangesEnabled,
    required this.eventRemindersEnabled,
    required this.eventReminderMinutes,
    required this.eventNotificationChannels,
  });

  final bool partnerInvitesEnabled;
  final bool calendarChangesEnabled;
  final bool eventRemindersEnabled;
  final int eventReminderMinutes;
  final Set<legacy_enums.EventNotificationChannel> eventNotificationChannels;

  static const NotificationAutomationSettings defaults =
      NotificationAutomationSettings(
    partnerInvitesEnabled: true,
    calendarChangesEnabled: true,
    eventRemindersEnabled: true,
    eventReminderMinutes: 30,
    eventNotificationChannels: {
      legacy_enums.EventNotificationChannel.push,
    },
  );
}
