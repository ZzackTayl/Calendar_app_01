import 'package:equatable/equatable.dart';
import '../../../../domain/enums.dart';
import '../../../../domain/event.dart';

/// User preferences domain entity
///
/// Pure domain object representing user settings and preferences.
/// NO JSON serialization - that's handled by UserPreferencesModel in the data layer.
class UserPreferences extends Equatable {
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
    this.darkModeEnabled = true,
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
      eventRemindersEnabled:
          eventRemindersEnabled ?? this.eventRemindersEnabled,
      eventReminderMinutes: eventReminderMinutes ?? this.eventReminderMinutes,
      eventNotificationChannels:
          eventNotificationChannels ?? this.eventNotificationChannels,
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
  List<Object?> get props => [
        id,
        userId,
        darkModeEnabled,
        defaultPrivacy,
        timezone,
        eventRemindersEnabled,
        eventReminderMinutes,
        eventNotificationChannels,
        partnerInvitesEnabled,
        calendarChangesEnabled,
        smsRescheduleEnabled,
        autoSmsCancellationEnabled,
        signalNotificationChannel,
        signalBufferMinutes,
        createdAt,
        updatedAt,
      ];
}
