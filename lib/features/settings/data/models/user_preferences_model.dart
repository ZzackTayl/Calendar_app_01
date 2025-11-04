import '../../../../domain/enums.dart';
import '../../../../domain/event.dart';
import '../../domain/entities/user_preferences.dart';

/// User preferences data model
///
/// Extends the domain entity and adds JSON serialization capabilities.
/// Used by data sources to convert between API/database format and domain entities.
class UserPreferencesModel extends UserPreferences {
  const UserPreferencesModel({
    required super.id,
    required super.userId,
    super.darkModeEnabled,
    super.defaultPrivacy,
    super.timezone,
    super.eventRemindersEnabled,
    super.eventReminderMinutes,
    super.eventNotificationChannels,
    super.partnerInvitesEnabled,
    super.calendarChangesEnabled,
    super.smsRescheduleEnabled,
    super.autoSmsCancellationEnabled,
    super.signalNotificationChannel,
    super.signalBufferMinutes,
    required super.createdAt,
    required super.updatedAt,
  });

  /// Create model from domain entity
  factory UserPreferencesModel.fromEntity(UserPreferences preferences) {
    return UserPreferencesModel(
      id: preferences.id,
      userId: preferences.userId,
      darkModeEnabled: preferences.darkModeEnabled,
      defaultPrivacy: preferences.defaultPrivacy,
      timezone: preferences.timezone,
      eventRemindersEnabled: preferences.eventRemindersEnabled,
      eventReminderMinutes: preferences.eventReminderMinutes,
      eventNotificationChannels: preferences.eventNotificationChannels,
      partnerInvitesEnabled: preferences.partnerInvitesEnabled,
      calendarChangesEnabled: preferences.calendarChangesEnabled,
      smsRescheduleEnabled: preferences.smsRescheduleEnabled,
      autoSmsCancellationEnabled: preferences.autoSmsCancellationEnabled,
      signalNotificationChannel: preferences.signalNotificationChannel,
      signalBufferMinutes: preferences.signalBufferMinutes,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    );
  }

  /// Create UserPreferences from JSON (from Supabase)
  factory UserPreferencesModel.fromJson(Map<String, dynamic> json) {
    return UserPreferencesModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      darkModeEnabled: json['dark_mode_enabled'] as bool? ?? true,
      defaultPrivacy: EventPrivacyLevel.values.firstWhere(
        (e) => e.name == json['default_privacy'],
        orElse: () => EventPrivacyLevel.normal,
      ),
      timezone: json['timezone'] as String? ?? 'UTC',
      eventRemindersEnabled: json['event_reminders_enabled'] as bool? ?? true,
      eventReminderMinutes: json['event_reminder_minutes'] as int? ?? 30,
      eventNotificationChannels: _decodeEventNotificationChannels(json),
      partnerInvitesEnabled: json['partner_invites_enabled'] as bool? ?? true,
      calendarChangesEnabled: json['calendar_changes_enabled'] as bool? ?? true,
      smsRescheduleEnabled: json['sms_reschedule_enabled'] as bool? ?? true,
      autoSmsCancellationEnabled:
          json['auto_sms_cancellation_enabled'] as bool? ?? true,
      signalNotificationChannel: SignalNotificationChannel.values.firstWhere(
        (e) => e.name == json['signal_notification_channel'],
        orElse: () => SignalNotificationChannel.push,
      ),
      signalBufferMinutes: json['signal_buffer_minutes'] as int? ?? 0,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  /// Convert to JSON for Supabase
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'dark_mode_enabled': darkModeEnabled,
      'default_privacy': defaultPrivacy.name,
      'timezone': timezone,
      'event_reminders_enabled': eventRemindersEnabled,
      'event_reminder_minutes': eventReminderMinutes,
      'event_notification_channels':
          eventNotificationChannels.map((c) => c.name).toList(),
      'partner_invites_enabled': partnerInvitesEnabled,
      'calendar_changes_enabled': calendarChangesEnabled,
      'sms_reschedule_enabled': smsRescheduleEnabled,
      'auto_sms_cancellation_enabled': autoSmsCancellationEnabled,
      'signal_notification_channel': signalNotificationChannel.name,
      'signal_buffer_minutes': signalBufferMinutes,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

Set<EventNotificationChannel> _decodeEventNotificationChannels(
    Map<String, dynamic> json) {
  final channels = json['event_notification_channels'] as List<dynamic>?;
  if (channels == null || channels.isEmpty) {
    return {EventNotificationChannel.push};
  }

  return channels.map((c) {
    try {
      return EventNotificationChannel.values.firstWhere(
        (e) => e.name == c,
        orElse: () => EventNotificationChannel.push,
      );
    } catch (_) {
      return EventNotificationChannel.push;
    }
  }).toSet();
}
