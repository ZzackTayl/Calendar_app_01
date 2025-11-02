import 'package:dartz/dartz.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/user_preferences.dart';
import '../../domain/repositories/preferences_repository.dart';
import '../datasources/preferences_local_data_source.dart';
import '../datasources/preferences_remote_data_source.dart';

/// Implementation of PreferencesRepository
class PreferencesRepositoryImpl
    with EitherMixin
    implements PreferencesRepository {
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
  Future<Either<Failure, UserPreferences?>> getPreferences() async {
    return handleFuture(() async {
      final localPrefs = await localDataSource.getPreferences();

      try {
        final remotePrefs = await remoteDataSource.getPreferences();

        if (remotePrefs != null) {
          await localDataSource.savePreferences(remotePrefs);
          return remotePrefs;
        }

        return localPrefs;
      } catch (e) {
        return localPrefs;
      }
    });
  }

  @override
  Future<Either<Failure, UserPreferences>> savePreferences(
    UserPreferences preferences,
  ) async {
    return handleFuture(() async {
      await localDataSource.savePreferences(preferences);

      try {
        final saved = await remoteDataSource.savePreferences(preferences);
        return saved;
      } catch (e) {
        return preferences;
      }
    });
  }

  @override
  Future<Either<Failure, UserPreferences>> updatePreferences({
    bool? darkModeEnabled,
    String? timezone,
    bool? eventRemindersEnabled,
    int? eventReminderMinutes,
    bool? partnerInvitesEnabled,
    bool? calendarChangesEnabled,
  }) async {
    return handleFuture(() async {
      final currentResult = await getPreferences();
      UserPreferences? current;

      currentResult.fold(
        (failure) => null,
        (prefs) => current = prefs,
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
        return saved;
      } catch (e) {
        return updated;
      }
    });
  }

  @override
  Future<Either<Failure, void>> deletePreferences() async {
    return handleFuture(() async {
      await localDataSource.deletePreferences();
      try {
        await remoteDataSource.deletePreferences();
      } catch (e) {
        // Ignore remote errors
      }
    });
  }
}
