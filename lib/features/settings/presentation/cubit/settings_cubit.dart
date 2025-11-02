import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/enums.dart';
import '../../../../domain/event.dart';
import '../../../../domain/user_preferences.dart';
import '../../domain/repositories/preferences_repository.dart';

/// State for SettingsCubit
class SettingsState {
  final AppStateStatus status;
  final UserPreferences? preferences;
  final String message;

  const SettingsState({
    this.status = AppStateStatus.initial,
    this.preferences,
    this.message = '',
  });

  SettingsState copyWith({
    AppStateStatus? status,
    UserPreferences? preferences,
    String? message,
  }) {
    return SettingsState(
      status: status ?? this.status,
      preferences: preferences ?? this.preferences,
      message: message ?? this.message,
    );
  }

  // Convenience getters for common settings
  bool get darkModeEnabled => preferences?.darkModeEnabled ?? true;
  String get timezone => preferences?.timezone ?? 'UTC';
  bool get eventRemindersEnabled => preferences?.eventRemindersEnabled ?? true;
  int get eventReminderMinutes => preferences?.eventReminderMinutes ?? 30;
  EventPrivacyLevel get defaultPrivacy =>
      preferences?.defaultPrivacy ?? EventPrivacyLevel.normal;
  Set<EventNotificationChannel> get eventNotificationChannels =>
      preferences?.eventNotificationChannels ??
      {EventNotificationChannel.push};
  bool get partnerInvitesEnabled => preferences?.partnerInvitesEnabled ?? true;
  bool get calendarChangesEnabled =>
      preferences?.calendarChangesEnabled ?? true;
  bool get smsRescheduleEnabled => preferences?.smsRescheduleEnabled ?? true;
  bool get autoSmsCancellationEnabled =>
      preferences?.autoSmsCancellationEnabled ?? true;
  SignalNotificationChannel get signalNotificationChannel =>
      preferences?.signalNotificationChannel ?? SignalNotificationChannel.push;
  int get signalBufferMinutes => preferences?.signalBufferMinutes ?? 0;
}

/// Cubit for managing user settings and preferences
class SettingsCubit extends Cubit<SettingsState> {
  final PreferencesRepository repository;

  SettingsCubit({required this.repository}) : super(const SettingsState());

  /// Load user preferences
  Future<void> loadPreferences() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getPreferences();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (preferences) => emit(state.copyWith(
        status: AppStateStatus.success,
        preferences: preferences,
        message: '',
      )),
    );
  }

  /// Toggle dark mode
  Future<void> toggleDarkMode() async {
    final newValue = !state.darkModeEnabled;
    await _updatePreference(
      darkModeEnabled: newValue,
      successMessage: 'Dark mode ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Set timezone
  Future<void> setTimezone(String timezone) async {
    await _updatePreference(
      timezone: timezone,
      successMessage: 'Timezone updated',
    );
  }

  /// Toggle event reminders
  Future<void> toggleEventReminders() async {
    final newValue = !state.eventRemindersEnabled;
    await _updatePreference(
      eventRemindersEnabled: newValue,
      successMessage: 'Event reminders ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Set event reminder minutes
  Future<void> setEventReminderMinutes(int minutes) async {
    await _updatePreference(
      eventReminderMinutes: minutes,
      successMessage: 'Reminder time updated',
    );
  }

  /// Set default privacy level
  Future<void> setDefaultPrivacy(EventPrivacyLevel privacy) async {
    if (state.preferences == null) return;

    final updated = state.preferences!.copyWith(
      defaultPrivacy: privacy,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(updated, 'Default privacy updated');
  }

  /// Set event notification channels
  Future<void> setEventNotificationChannels(
    Set<EventNotificationChannel> channels,
  ) async {
    if (channels.isEmpty || state.preferences == null) return;

    final updated = state.preferences!.copyWith(
      eventNotificationChannels: channels,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(updated, 'Notification channels updated');
  }

  /// Toggle partner invites
  Future<void> togglePartnerInvites() async {
    final newValue = !state.partnerInvitesEnabled;
    await _updatePreference(
      partnerInvitesEnabled: newValue,
      successMessage: 'Partner invites ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Toggle calendar changes notifications
  Future<void> toggleCalendarChanges() async {
    final newValue = !state.calendarChangesEnabled;
    await _updatePreference(
      calendarChangesEnabled: newValue,
      successMessage:
          'Calendar change notifications ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Toggle SMS reschedule
  Future<void> toggleSmsReschedule() async {
    if (state.preferences == null) return;

    final newValue = !state.smsRescheduleEnabled;
    final updated = state.preferences!.copyWith(
      smsRescheduleEnabled: newValue,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(
      updated,
      'SMS reschedule ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Toggle auto SMS cancellation
  Future<void> toggleAutoSmsCancellation() async {
    if (state.preferences == null) return;

    final newValue = !state.autoSmsCancellationEnabled;
    final updated = state.preferences!.copyWith(
      autoSmsCancellationEnabled: newValue,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(
      updated,
      'Auto SMS cancellation ${newValue ? 'enabled' : 'disabled'}',
    );
  }

  /// Set signal notification channel
  Future<void> setSignalNotificationChannel(
    SignalNotificationChannel channel,
  ) async {
    if (state.preferences == null) return;

    final updated = state.preferences!.copyWith(
      signalNotificationChannel: channel,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(updated, 'Signal notification channel updated');
  }

  /// Set signal buffer minutes
  Future<void> setSignalBufferMinutes(int minutes) async {
    if (state.preferences == null) return;

    final updated = state.preferences!.copyWith(
      signalBufferMinutes: minutes,
      updatedAt: DateTime.now(),
    );

    await _savePreferences(updated, 'Signal buffer time updated');
  }

  /// Helper method to update a single preference field
  Future<void> _updatePreference({
    bool? darkModeEnabled,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
    required String successMessage,
  }) async {
    final result = await repository.updatePreferences(
      darkModeEnabled: darkModeEnabled,
      timezone: timezone,
      eventRemindersEnabled: eventRemindersEnabled,
      eventReminderMinutes: eventReminderMinutes,
      partnerInvitesEnabled: partnerInvitesEnabled,
      calendarChangesEnabled: calendarChangesEnabled,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (updated) => emit(state.copyWith(
        status: AppStateStatus.success,
        preferences: updated,
        message: successMessage,
      )),
    );
  }

  /// Helper method to save complete preferences
  Future<void> _savePreferences(
    UserPreferences preferences,
    String successMessage,
  ) async {
    final result = await repository.savePreferences(preferences);

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (saved) => emit(state.copyWith(
        status: AppStateStatus.success,
        preferences: saved,
        message: successMessage,
      )),
    );
  }
}
