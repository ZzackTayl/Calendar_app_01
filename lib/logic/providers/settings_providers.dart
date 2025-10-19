import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/enums.dart';
import '../../domain/event.dart';

part 'settings_providers.g.dart';

@immutable
class SettingsState {
  const SettingsState({
    this.darkModeEnabled = false,
    this.defaultPrivacy = EventPrivacyLevel.normal,
    this.timeZone = 'Pacific Time (PST)',
    this.eventRemindersEnabled = true,
    this.eventReminderMinutes = 30, // Default to 30 minutes before
    this.eventNotificationChannel = EventNotificationChannel.push,
    this.partnerInvitesEnabled = true,
    this.calendarChangesEnabled = true,
    this.smsRescheduleEnabled = true,
    this.autoSmsCancellationEnabled = true,
    this.signalNotificationChannel = SignalNotificationChannel.push,
    this.signalBufferMinutes = 0,
  });

  final bool darkModeEnabled;
  final EventPrivacyLevel defaultPrivacy;
  final String timeZone;
  final bool eventRemindersEnabled;
  final int eventReminderMinutes;
  final EventNotificationChannel eventNotificationChannel;
  final bool partnerInvitesEnabled;
  final bool calendarChangesEnabled;
  final bool smsRescheduleEnabled;
  final bool autoSmsCancellationEnabled;
  final SignalNotificationChannel signalNotificationChannel;
  final int signalBufferMinutes;

  SettingsState copyWith({
    bool? darkModeEnabled,
    EventPrivacyLevel? defaultPrivacy,
    String? timeZone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    EventNotificationChannel? eventNotificationChannel,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
    bool? smsRescheduleEnabled,
    bool? autoSmsCancellationEnabled,
    SignalNotificationChannel? signalNotificationChannel,
    int? signalBufferMinutes,
  }) {
    return SettingsState(
      darkModeEnabled: darkModeEnabled ?? this.darkModeEnabled,
      defaultPrivacy: defaultPrivacy ?? this.defaultPrivacy,
      timeZone: timeZone ?? this.timeZone,
      eventRemindersEnabled: eventRemindersEnabled ?? this.eventRemindersEnabled,
      eventReminderMinutes: eventReminderMinutes ?? this.eventReminderMinutes,
      eventNotificationChannel: eventNotificationChannel ?? this.eventNotificationChannel,
      partnerInvitesEnabled: partnerInvitesEnabled ?? this.partnerInvitesEnabled,
      calendarChangesEnabled: calendarChangesEnabled ?? this.calendarChangesEnabled,
      smsRescheduleEnabled: smsRescheduleEnabled ?? this.smsRescheduleEnabled,
      autoSmsCancellationEnabled: autoSmsCancellationEnabled ?? this.autoSmsCancellationEnabled,
      signalNotificationChannel: signalNotificationChannel ?? this.signalNotificationChannel,
      signalBufferMinutes: signalBufferMinutes ?? this.signalBufferMinutes,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'darkModeEnabled': darkModeEnabled,
      'defaultPrivacy': defaultPrivacy.name,
      'timeZone': timeZone,
      'eventRemindersEnabled': eventRemindersEnabled,
      'eventReminderMinutes': eventReminderMinutes,
      'eventNotificationChannel': eventNotificationChannel.name,
      'partnerInvitesEnabled': partnerInvitesEnabled,
      'calendarChangesEnabled': calendarChangesEnabled,
      'smsRescheduleEnabled': smsRescheduleEnabled,
      'autoSmsCancellationEnabled': autoSmsCancellationEnabled,
      'signalNotificationChannel': signalNotificationChannel.name,
      'signalBufferMinutes': signalBufferMinutes,
    };
  }

  factory SettingsState.fromJson(Map<String, dynamic> json) {
    return SettingsState(
      darkModeEnabled: json['darkModeEnabled'] as bool? ?? false,
      defaultPrivacy: EventPrivacyLevel.values.firstWhere(
        (level) => level.name == json['defaultPrivacy'],
        orElse: () => EventPrivacyLevel.normal,
      ),
      timeZone: json['timeZone'] as String? ?? 'Pacific Time (PST)',
      eventRemindersEnabled: json['eventRemindersEnabled'] as bool? ?? true,
      eventReminderMinutes: json['eventReminderMinutes'] as int? ?? 30,
      eventNotificationChannel: EventNotificationChannel.values.firstWhere(
        (channel) => channel.name == json['eventNotificationChannel'],
        orElse: () => EventNotificationChannel.push,
      ),
      partnerInvitesEnabled: json['partnerInvitesEnabled'] as bool? ?? true,
      calendarChangesEnabled: json['calendarChangesEnabled'] as bool? ?? true,
      smsRescheduleEnabled: json['smsRescheduleEnabled'] as bool? ?? true,
      autoSmsCancellationEnabled: json['autoSmsCancellationEnabled'] as bool? ?? true,
      signalNotificationChannel: SignalNotificationChannel.values.firstWhere(
        (channel) => channel.name == json['signalNotificationChannel'],
        orElse: () => SignalNotificationChannel.push,
      ),
      signalBufferMinutes: json['signalBufferMinutes'] as int? ?? 0,
    );
  }
}

@riverpod
class SettingsController extends _$SettingsController {
  static const _prefsKey = 'settings_state_v1';

  @override
  Future<SettingsState> build() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_prefsKey);
    if (jsonString == null) {
      return const SettingsState();
    }

    try {
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      return SettingsState.fromJson(decoded);
    } catch (_) {
      return const SettingsState();
    }
  }

  Future<void> toggleDarkMode() async {
    await _update((state) => state.copyWith(darkModeEnabled: !state.darkModeEnabled));
  }

  Future<void> setDefaultPrivacy(EventPrivacyLevel privacy) async {
    await _update((state) => state.copyWith(defaultPrivacy: privacy));
  }

  Future<void> setTimeZone(String zone) async {
    await _update((state) => state.copyWith(timeZone: zone));
  }

  Future<void> toggleEventReminders() async {
    await _update((state) => state.copyWith(eventRemindersEnabled: !state.eventRemindersEnabled));
  }

  Future<void> setEventReminderMinutes(int minutes) async {
    await _update((state) => state.copyWith(eventReminderMinutes: minutes));
  }

  Future<void> setEventNotificationChannel(EventNotificationChannel channel) async {
    await _update((state) => state.copyWith(eventNotificationChannel: channel));
  }

  Future<void> togglePartnerInvites() async {
    await _update((state) => state.copyWith(partnerInvitesEnabled: !state.partnerInvitesEnabled));
  }

  Future<void> toggleCalendarChanges() async {
    await _update((state) => state.copyWith(calendarChangesEnabled: !state.calendarChangesEnabled));
  }

  Future<void> toggleSmsReschedule() async {
    await _update((state) => state.copyWith(smsRescheduleEnabled: !state.smsRescheduleEnabled));
  }

  Future<void> toggleAutoSmsCancellation() async {
    await _update(
        (state) => state.copyWith(autoSmsCancellationEnabled: !state.autoSmsCancellationEnabled));
  }

  Future<void> setSignalNotificationChannel(SignalNotificationChannel channel) async {
    await _update((state) => state.copyWith(signalNotificationChannel: channel));
  }

  Future<void> setSignalBufferMinutes(int minutes) async {
    await _update((state) => state.copyWith(signalBufferMinutes: minutes));
  }

  Future<void> _update(SettingsState Function(SettingsState state) transform) async {
    final current = state.value ?? await future;
    final updated = transform(current);
    state = AsyncValue.data(updated);
    await _save(updated);
  }

  Future<void> _save(SettingsState settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(settings.toJson()));
  }
}
