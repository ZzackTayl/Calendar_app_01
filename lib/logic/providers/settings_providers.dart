import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../core/supabase_client.dart';
import '../../core/timezone_service.dart';
import '../../domain/enums.dart';
import '../../domain/event.dart';
import '../../domain/user_preferences.dart';
import '../services/api_service.dart';

part 'settings_providers.g.dart';

@immutable
class SettingsState {
  const SettingsState({
    this.darkModeEnabled = true,
    this.defaultPrivacy = EventPrivacyLevel.normal,
    this.timeZone = 'Pacific Time (PST/PDT)',
    this.eventRemindersEnabled = true,
    this.eventReminderMinutes = 30, // Default to 30 minutes before
    this.eventNotificationChannels = const {EventNotificationChannel.push},
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
  final Set<EventNotificationChannel> eventNotificationChannels;
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
    Set<EventNotificationChannel>? eventNotificationChannels,
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
      timeZone: timeZone != null
          ? TimezoneService.normalizeDisplayName(timeZone)
          : this.timeZone,
      eventRemindersEnabled:
          eventRemindersEnabled ?? this.eventRemindersEnabled,
      eventReminderMinutes: eventReminderMinutes ?? this.eventReminderMinutes,
      eventNotificationChannels: eventNotificationChannels != null
          ? Set<EventNotificationChannel>.unmodifiable(
              eventNotificationChannels)
          : this.eventNotificationChannels,
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
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'darkModeEnabled': darkModeEnabled,
      'defaultPrivacy': defaultPrivacy.name,
      'timeZone': timeZone,
      'eventRemindersEnabled': eventRemindersEnabled,
      'eventReminderMinutes': eventReminderMinutes,
      'eventNotificationChannels':
          eventNotificationChannels.map((channel) => channel.name).toList(),
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
      darkModeEnabled: json['darkModeEnabled'] as bool? ?? true,
      defaultPrivacy: EventPrivacyLevel.values.firstWhere(
        (level) => level.name == json['defaultPrivacy'],
        orElse: () => EventPrivacyLevel.normal,
      ),
      timeZone: TimezoneService.normalizeDisplayName(
        json['timeZone'] as String? ?? 'Pacific Time (PST/PDT)',
      ),
      eventRemindersEnabled: json['eventRemindersEnabled'] as bool? ?? true,
      eventReminderMinutes: json['eventReminderMinutes'] as int? ?? 30,
      eventNotificationChannels: _decodeEventNotificationChannels(json),
      partnerInvitesEnabled: json['partnerInvitesEnabled'] as bool? ?? true,
      calendarChangesEnabled: json['calendarChangesEnabled'] as bool? ?? true,
      smsRescheduleEnabled: json['smsRescheduleEnabled'] as bool? ?? true,
      autoSmsCancellationEnabled:
          json['autoSmsCancellationEnabled'] as bool? ?? true,
      signalNotificationChannel: SignalNotificationChannel.values.firstWhere(
        (channel) => channel.name == json['signalNotificationChannel'],
        orElse: () => SignalNotificationChannel.push,
      ),
      signalBufferMinutes: json['signalBufferMinutes'] as int? ?? 0,
    );
  }

  static SettingsState fromPreferences(UserPreferences preferences) {
    return SettingsState(
      darkModeEnabled: preferences.darkModeEnabled,
      defaultPrivacy: preferences.defaultPrivacy,
      timeZone: TimezoneService.normalizeDisplayName(preferences.timezone),
      eventRemindersEnabled: preferences.eventRemindersEnabled,
      eventReminderMinutes: preferences.eventReminderMinutes,
      eventNotificationChannels: Set<EventNotificationChannel>.unmodifiable(
        preferences.eventNotificationChannels,
      ),
      partnerInvitesEnabled: preferences.partnerInvitesEnabled,
      calendarChangesEnabled: preferences.calendarChangesEnabled,
      smsRescheduleEnabled: preferences.smsRescheduleEnabled,
      autoSmsCancellationEnabled: preferences.autoSmsCancellationEnabled,
      signalNotificationChannel: preferences.signalNotificationChannel,
      signalBufferMinutes: preferences.signalBufferMinutes,
    );
  }
}

@riverpod
class SettingsController extends _$SettingsController {
  static const _prefsKey = 'settings_state_v1';
  UserPreferences? _remotePreferences;

  @override
  Future<SettingsState> build() async {
    final localSettings = await _loadLocalSettings();

    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return localSettings;
    }

    final remoteResult = await UserPreferencesApi.fetchForCurrentUser();
    return await remoteResult.when(
      success: (preferences) async {
        if (preferences == null) {
          final userId = SupabaseService.currentUser?.id;
          if (userId == null) {
            return localSettings;
          }

          final initialModel = _buildPreferencesModel(
            localSettings,
            userId,
          );

          final createResult = await UserPreferencesApi.upsert(initialModel);
          return await createResult.when(
            success: (saved) async {
              _remotePreferences = saved;
              final remoteState = SettingsState.fromPreferences(saved);
              await _saveLocalSettings(remoteState);
              return remoteState;
            },
            failure: (message, exception) async {
              debugPrint(
                '[SettingsController] Failed to create preferences: $message',
              );
              return localSettings;
            },
          );
        }

        _remotePreferences = preferences;
        final remoteState = SettingsState.fromPreferences(preferences);
        await _saveLocalSettings(remoteState);
        return remoteState;
      },
      failure: (message, exception) async {
        debugPrint(
          '[SettingsController] Failed to load remote preferences: $message',
        );
        return localSettings;
      },
    );
  }

  Future<void> toggleDarkMode() async {
    await _update(
        (state) => state.copyWith(darkModeEnabled: !state.darkModeEnabled));
  }

  Future<void> setDefaultPrivacy(EventPrivacyLevel privacy) async {
    await _update((state) => state.copyWith(defaultPrivacy: privacy));
  }

  Future<void> setTimeZone(String zone) async {
    final normalized = TimezoneService.normalizeDisplayName(zone);
    await _update((state) => state.copyWith(timeZone: normalized));
  }

  Future<void> toggleEventReminders() async {
    await _update((state) =>
        state.copyWith(eventRemindersEnabled: !state.eventRemindersEnabled));
  }

  Future<void> setEventReminderMinutes(int minutes) async {
    await _update((state) => state.copyWith(eventReminderMinutes: minutes));
  }

  Future<void> setEventNotificationChannels(
    Set<EventNotificationChannel> channels,
  ) async {
    if (channels.isEmpty) {
      return;
    }
    await _update(
        (state) => state.copyWith(eventNotificationChannels: channels));
  }

  Future<void> togglePartnerInvites() async {
    await _update((state) =>
        state.copyWith(partnerInvitesEnabled: !state.partnerInvitesEnabled));
  }

  Future<void> toggleCalendarChanges() async {
    await _update((state) =>
        state.copyWith(calendarChangesEnabled: !state.calendarChangesEnabled));
  }

  Future<void> toggleSmsReschedule() async {
    await _update((state) =>
        state.copyWith(smsRescheduleEnabled: !state.smsRescheduleEnabled));
  }

  Future<void> toggleAutoSmsCancellation() async {
    await _update((state) => state.copyWith(
        autoSmsCancellationEnabled: !state.autoSmsCancellationEnabled));
  }

  Future<void> setSignalNotificationChannel(
      SignalNotificationChannel channel) async {
    await _update(
        (state) => state.copyWith(signalNotificationChannel: channel));
  }

  Future<void> setSignalBufferMinutes(int minutes) async {
    await _update((state) => state.copyWith(signalBufferMinutes: minutes));
  }

  Future<void> _update(
      SettingsState Function(SettingsState state) transform) async {
    final current = state.value ?? await future;
    final updated = transform(current);
    state = AsyncValue.data(updated);
    await _save(updated);
  }

  Future<void> _save(SettingsState settings) async {
    await _saveLocalSettings(settings);
    await _syncRemoteSettings(settings);
  }

  Future<SettingsState> _loadLocalSettings() async {
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

  Future<void> _saveLocalSettings(SettingsState settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(settings.toJson()));
  }

  Future<void> _syncRemoteSettings(SettingsState settings) async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return;
    }

    final userId = SupabaseService.currentUser?.id;
    if (userId == null) {
      return;
    }

    final model = _buildPreferencesModel(settings, userId);
    final result = await UserPreferencesApi.upsert(model);
    result.when(
      success: (saved) {
        _remotePreferences = saved;
      },
      failure: (message, exception) {
        debugPrint(
          '[SettingsController] Failed to sync preferences: $message',
        );
      },
    );
  }

  UserPreferences _buildPreferencesModel(
    SettingsState settings,
    String userId,
  ) {
    final existing = _remotePreferences;
    final now = DateTime.now();
    return UserPreferences(
      id: existing?.id ?? const Uuid().v4(),
      userId: userId,
      darkModeEnabled: settings.darkModeEnabled,
      defaultPrivacy: settings.defaultPrivacy,
      timezone: TimezoneService.normalizeDisplayName(settings.timeZone),
      eventRemindersEnabled: settings.eventRemindersEnabled,
      eventReminderMinutes: settings.eventReminderMinutes,
      eventNotificationChannels: settings.eventNotificationChannels,
      partnerInvitesEnabled: settings.partnerInvitesEnabled,
      calendarChangesEnabled: settings.calendarChangesEnabled,
      smsRescheduleEnabled: settings.smsRescheduleEnabled,
      autoSmsCancellationEnabled: settings.autoSmsCancellationEnabled,
      signalNotificationChannel: settings.signalNotificationChannel,
      signalBufferMinutes: settings.signalBufferMinutes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );
  }
}

Set<EventNotificationChannel> _decodeEventNotificationChannels(
  Map<String, dynamic> json,
) {
  final multi = json['eventNotificationChannels'];
  if (multi is List) {
    final names = multi.whereType<String>().toSet();
    final selected = EventNotificationChannel.values.where(
      (channel) => names.contains(channel.name),
    );
    if (selected.isNotEmpty) {
      return Set<EventNotificationChannel>.unmodifiable(selected);
    }
  }

  final single = json['eventNotificationChannel'];
  if (single is String) {
    final channel = EventNotificationChannel.values.firstWhere(
      (value) => value.name == single,
      orElse: () => EventNotificationChannel.push,
    );
    return Set<EventNotificationChannel>.unmodifiable({channel});
  }

  return const {EventNotificationChannel.push};
}
