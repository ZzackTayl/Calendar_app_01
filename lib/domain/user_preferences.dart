import 'event.dart';
import 'enums.dart';

/// User preferences domain model that syncs across devices via Supabase
class UserPreferences {
  final String id;
  final String userId;
  final bool darkModeEnabled;
  final EventPrivacyLevel defaultPrivacy;
  final String timezone;
  final bool eventRemindersEnabled;
  final int eventReminderMinutes;
  final Set<EventNotificationChannel> eventNotificationChannels;
  final bool partnerInvitesEnabled;
  final bool calendarChangesEnabled;
  final bool smsRescheduleEnabled;
  final bool autoSmsCancellationEnabled;
  final SignalNotificationChannel signalNotificationChannel;
  final int signalBufferMinutes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserPreferences({
    required this.id,
    required this.userId,
    this.darkModeEnabled = false,
    this.defaultPrivacy = EventPrivacyLevel.normal,
    this.timezone = 'UTC',
    this.eventRemindersEnabled = true,
    this.eventReminderMinutes = 30,
    this.eventNotificationChannels = const {EventNotificationChannel.push},
    this.partnerInvitesEnabled = true,
    this.calendarChangesEnabled = true,
    this.smsRescheduleEnabled = true,
    this.autoSmsCancellationEnabled = true,
    this.signalNotificationChannel = SignalNotificationChannel.push,
    this.signalBufferMinutes = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Create UserPreferences from JSON (from Supabase)
  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      darkModeEnabled: json['dark_mode_enabled'] as bool? ?? false,
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

  /// Create a copy with modified fields
  UserPreferences copyWith({
    String? id,
    String? userId,
    bool? darkModeEnabled,
    EventPrivacyLevel? defaultPrivacy,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    Set<EventNotificationChannel>? eventNotificationChannels,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
    bool? smsRescheduleEnabled,
    bool? autoSmsCancellationEnabled,
    SignalNotificationChannel? signalNotificationChannel,
    int? signalBufferMinutes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserPreferences(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      darkModeEnabled: darkModeEnabled ?? this.darkModeEnabled,
      defaultPrivacy: defaultPrivacy ?? this.defaultPrivacy,
      timezone: timezone ?? this.timezone,
      eventRemindersEnabled: eventRemindersEnabled ?? this.eventRemindersEnabled,
      eventReminderMinutes: eventReminderMinutes ?? this.eventReminderMinutes,
      eventNotificationChannels: eventNotificationChannels ??
          this.eventNotificationChannels,
      partnerInvitesEnabled:
          partnerInvitesEnabled ?? this.partnerInvitesEnabled,
      calendarChangesEnabled:
          calendarChangesEnabled ?? this.calendarChangesEnabled,
      smsRescheduleEnabled: smsRescheduleEnabled ?? this.smsRescheduleEnabled,
      autoSmsCancellationEnabled:
          autoSmsCancellationEnabled ?? this.autoSmsCancellationEnabled,
      signalNotificationChannel:
          signalNotificationChannel ?? this.signalNotificationChannel,
      signalBufferMinutes: signalBufferMinutes ?? this.signalBufferMinutes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is UserPreferences &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userId == other.userId &&
          darkModeEnabled == other.darkModeEnabled &&
          defaultPrivacy == other.defaultPrivacy &&
          timezone == other.timezone &&
          eventRemindersEnabled == other.eventRemindersEnabled &&
          eventReminderMinutes == other.eventReminderMinutes &&
          eventNotificationChannels == other.eventNotificationChannels &&
          partnerInvitesEnabled == other.partnerInvitesEnabled &&
          calendarChangesEnabled == other.calendarChangesEnabled &&
          smsRescheduleEnabled == other.smsRescheduleEnabled &&
          autoSmsCancellationEnabled == other.autoSmsCancellationEnabled &&
          signalNotificationChannel == other.signalNotificationChannel &&
          signalBufferMinutes == other.signalBufferMinutes;

  @override
  int get hashCode =>
      id.hashCode ^
      userId.hashCode ^
      darkModeEnabled.hashCode ^
      defaultPrivacy.hashCode ^
      timezone.hashCode ^
      eventRemindersEnabled.hashCode ^
      eventReminderMinutes.hashCode ^
      eventNotificationChannels.hashCode ^
      partnerInvitesEnabled.hashCode ^
      calendarChangesEnabled.hashCode ^
      smsRescheduleEnabled.hashCode ^
      autoSmsCancellationEnabled.hashCode ^
      signalNotificationChannel.hashCode ^
      signalBufferMinutes.hashCode;
}

Set<EventNotificationChannel> _decodeEventNotificationChannels(
    Map<String, dynamic> json) {
  final channels = json['event_notification_channels'] as List<dynamic>?;
  if (channels == null || channels.isEmpty) {
    return {EventNotificationChannel.push};
  }

  return channels
      .map((c) {
        try {
          return EventNotificationChannel.values.firstWhere(
            (e) => e.name == c,
            orElse: () => EventNotificationChannel.push,
          );
        } catch (_) {
          return EventNotificationChannel.push;
        }
      })
      .toSet();
}
