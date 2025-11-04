import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import '../../../core/firebase_app_services.dart';
import '../../../core/timezone_service.dart';
import '../../../domain/enums.dart';
import '../../../domain/event.dart' show EventPrivacyLevel;
import '../../../features/settings/domain/entities/user_preferences.dart';
import '../../../logic/services/api_service.dart';
import '../../../logic/providers/settings_providers.dart' show SettingsState; // reuse model

class SettingsCubitState {
  const SettingsCubitState({
    required this.isLoading,
    required this.settings,
    this.error,
  });

  final bool isLoading;
  final SettingsState settings;
  final String? error;

  SettingsCubitState copyWith({
    bool? isLoading,
    SettingsState? settings,
    String? error,
  }) {
    return SettingsCubitState(
      isLoading: isLoading ?? this.isLoading,
      settings: settings ?? this.settings,
      error: error,
    );
  }
}

class SettingsCubit extends Cubit<SettingsCubitState> {
  SettingsCubit({required SettingsState initialSettings})
      : super(SettingsCubitState(isLoading: true, settings: initialSettings)) {
    _initialize(initialSettings);
  }

  static const _prefsKey = 'settings_state_v1';
  UserPreferences? _remotePreferences;

  Future<void> _initialize(SettingsState initial) async {
    // Start with provided initial settings
    emit(state.copyWith(isLoading: true, settings: initial, error: null));

    // Load local persisted settings to override if present
    final local = await _loadLocalSettings();
    emit(state.copyWith(isLoading: false, settings: local, error: null));

    // Attempt to sync from remote if available
    await _syncFromRemoteIfAvailable();
  }

  Future<SettingsState> _loadLocalSettings() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(_prefsKey);
    if (jsonString == null) {
      return state.settings;
    }
    try {
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      return SettingsState.fromJson(decoded);
    } catch (_) {
      return state.settings;
    }
  }

  Future<void> _saveLocalSettings(SettingsState settings) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefsKey, jsonEncode(settings.toJson()));
  }

  Future<void> _syncFromRemoteIfAvailable() async {
    if (!FirebaseAppServices.isConfigured || !FirebaseAppServices.isAuthenticated) {
      return;
    }

    final remoteResult = await UserPreferencesApi.fetchForCurrentUser();
    await remoteResult.when(
      success: (preferences) async {
        if (preferences == null) {
          final userId = FirebaseAppServices.currentUser?.uid;
          if (userId == null) return;
          final initialModel = _buildPreferencesModel(state.settings, userId);
          final createResult = await UserPreferencesApi.upsert(initialModel);
          await createResult.when(
            success: (saved) async {
              _remotePreferences = saved;
              final remoteState = SettingsState.fromPreferences(saved);
              await _saveLocalSettings(remoteState);
              emit(state.copyWith(settings: remoteState));
            },
            failure: (message, exception) async {
              debugPrint('[SettingsCubit] Failed to create preferences: $message');
            },
          );
          return;
        }

        _remotePreferences = preferences;
        final remoteState = SettingsState.fromPreferences(preferences);
        await _saveLocalSettings(remoteState);
        emit(state.copyWith(settings: remoteState));
      },
      failure: (message, exception) async {
        debugPrint('[SettingsCubit] Failed to load remote preferences: $message');
      },
    );
  }

  Future<void> _syncRemote(SettingsState settings) async {
    if (!FirebaseAppServices.isConfigured || !FirebaseAppServices.isAuthenticated) {
      return;
    }
    final userId = FirebaseAppServices.currentUser?.uid;
    if (userId == null) return;

    final model = _buildPreferencesModel(settings, userId);
    final result = await UserPreferencesApi.upsert(model);
    result.when(
      success: (saved) {
        _remotePreferences = saved;
      },
      failure: (message, exception) {
        debugPrint('[SettingsCubit] Failed to sync preferences: $message');
      },
    );
  }

  UserPreferences _buildPreferencesModel(SettingsState settings, String userId) {
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

  // Mutation methods
  Future<void> toggleDarkMode() async {
    final updated = state.settings.copyWith(darkModeEnabled: !state.settings.darkModeEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setDefaultPrivacy(EventPrivacyLevel privacy) async {
    final updated = state.settings.copyWith(defaultPrivacy: privacy);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setTimeZone(String zone) async {
    final normalized = TimezoneService.normalizeDisplayName(zone);
    final updated = state.settings.copyWith(timeZone: normalized);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> toggleEventReminders() async {
    final updated = state.settings
        .copyWith(eventRemindersEnabled: !state.settings.eventRemindersEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setEventReminderMinutes(int minutes) async {
    final updated = state.settings.copyWith(eventReminderMinutes: minutes);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setEventNotificationChannels(Set<EventNotificationChannel> channels) async {
    if (channels.isEmpty) return;
    final updated = state.settings.copyWith(eventNotificationChannels: channels);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> togglePartnerInvites() async {
    final updated = state.settings
        .copyWith(partnerInvitesEnabled: !state.settings.partnerInvitesEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> toggleCalendarChanges() async {
    final updated = state.settings
        .copyWith(calendarChangesEnabled: !state.settings.calendarChangesEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> toggleSmsReschedule() async {
    final updated = state.settings
        .copyWith(smsRescheduleEnabled: !state.settings.smsRescheduleEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> toggleAutoSmsCancellation() async {
    final updated = state.settings.copyWith(
        autoSmsCancellationEnabled: !state.settings.autoSmsCancellationEnabled);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setSignalNotificationChannel(SignalNotificationChannel channel) async {
    final updated = state.settings.copyWith(signalNotificationChannel: channel);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }

  Future<void> setSignalBufferMinutes(int minutes) async {
    final updated = state.settings.copyWith(signalBufferMinutes: minutes);
    emit(state.copyWith(settings: updated));
    await _saveLocalSettings(updated);
    await _syncRemote(updated);
  }
}


