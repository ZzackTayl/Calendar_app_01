import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/result.dart';
import '../../domain/entities/user_preferences.dart';
import '../../domain/repositories/preferences_repository.dart';
import '../datasources/preferences_local_data_source.dart';
import '../datasources/preferences_remote_data_source.dart';

/// Implementation of PreferencesRepository
class PreferencesRepositoryImpl implements PreferencesRepository {
  final PreferencesRemoteDataSource remoteDataSource;
  final PreferencesLocalDataSource localDataSource;
  final FirebaseAuth _auth;
  final Uuid _uuid = const Uuid();

  PreferencesRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    FirebaseAuth? auth,
  }) : _auth = auth ?? FirebaseAuth.instance;

  @override
  Future<Result<UserPreferences?>> getPreferences() async {
    try {
      final localPrefs = await localDataSource.getPreferences();

      try {
        final remotePrefs = await remoteDataSource.getPreferences();

        if (remotePrefs != null) {
          await localDataSource.savePreferences(remotePrefs);
          return Success(remotePrefs);
        }

        return Success(localPrefs);
      } catch (e) {
        return Success(localPrefs);
      }
    } catch (e) {
      return Failure('Failed to get preferences: $e');
    }
  }

  @override
  Future<Result<UserPreferences>> savePreferences(
    UserPreferences preferences,
  ) async {
    try {
      await localDataSource.savePreferences(preferences);

      try {
        final saved = await remoteDataSource.savePreferences(preferences);
        return Success(saved);
      } catch (e) {
        return Success(preferences);
      }
    } catch (e) {
      return Failure('Failed to save preferences: $e');
    }
  }

  @override
  Future<Result<UserPreferences>> updatePreferences({
    bool? darkModeEnabled,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
  }) async {
    try {
      final currentResult = await getPreferences();
      UserPreferences? current;

      currentResult.when(
        success: (prefs) => current = prefs,
        failure: (_, __) => null,
      );

      final userId = _auth.currentUser?.uid ?? 'unknown';
      final now = DateTime.now();

      final updated = current?.copyWith(
            darkModeEnabled: darkModeEnabled,
            timezone: timezone,
            eventRemindersEnabled: eventRemindersEnabled,
            eventReminderMinutes: eventReminderMinutes,
            partnerInvitesEnabled: partnerInvitesEnabled,
            calendarChangesEnabled: calendarChangesEnabled,
            updatedAt: now,
          ) ??
          UserPreferences(
            id: _uuid.v4(),
            userId: userId,
            darkModeEnabled: darkModeEnabled ?? true,
            timezone: timezone ?? 'UTC',
            eventRemindersEnabled: eventRemindersEnabled ?? true,
            eventReminderMinutes: eventReminderMinutes ?? 30,
            partnerInvitesEnabled: partnerInvitesEnabled ?? true,
            calendarChangesEnabled: calendarChangesEnabled ?? true,
            createdAt: now,
            updatedAt: now,
          );

      await localDataSource.savePreferences(updated);

      try {
        final saved = await remoteDataSource.savePreferences(updated);
        return Success(saved);
      } catch (e) {
        return Success(updated);
      }
    } catch (e) {
      return Failure('Failed to update preferences: $e');
    }
  }

  @override
  Future<Result<void>> deletePreferences() async {
    try {
      await localDataSource.deletePreferences();
      try {
        await remoteDataSource.deletePreferences();
      } catch (e) {
        // Ignore remote errors
      }
      return const Success(null);
    } catch (e) {
      return Failure('Failed to delete preferences: $e');
    }
  }
}
