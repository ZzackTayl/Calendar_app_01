import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../domain/user_preferences.dart';

/// Preferences repository contract
///
/// Defines operations for managing user preferences.
abstract class PreferencesRepository {
  /// Get user preferences
  Future<Either<Failure, UserPreferences?>> getPreferences();

  /// Save or update user preferences
  Future<Either<Failure, UserPreferences>> savePreferences(
    UserPreferences preferences,
  );

  /// Update specific preference fields
  Future<Either<Failure, UserPreferences>> updatePreferences({
    bool? darkModeEnabled,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
  });

  /// Delete user preferences
  Future<Either<Failure, void>> deletePreferences();
}
