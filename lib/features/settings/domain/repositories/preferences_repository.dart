import '../../../../core/result.dart';
import '../entities/user_preferences.dart';

/// Preferences repository contract
///
/// Defines operations for managing user preferences.
abstract class PreferencesRepository {
  /// Get user preferences
  Future<Result<UserPreferences?>> getPreferences();

  /// Save or update user preferences
  Future<Result<UserPreferences>> savePreferences(
    UserPreferences preferences,
  );

  /// Update specific preference fields
  Future<Result<UserPreferences>> updatePreferences({
    bool? darkModeEnabled,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
  });

  /// Delete user preferences
  Future<Result<void>> deletePreferences();
}
