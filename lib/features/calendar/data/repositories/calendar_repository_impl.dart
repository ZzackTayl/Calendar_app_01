// Calendar repository implementation following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';
import '../../domain/repositories/calendar_repository.dart';
import '../datasources/calendar_remote_data_source.dart';
import '../models/user_calendar_model.dart';

class CalendarRepositoryImpl with EitherMixin implements CalendarRepository {
  final CalendarRemoteDataSource remoteDataSource;

  CalendarRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<UserCalendar>>> getCalendars() async {
    try {
      final calendars = await remoteDataSource.getCalendars();
      return Right(calendars);
    } catch (e) {
      return Left(Failure(message: 'Failed to load calendars: $e'));
    }
  }

  @override
  Future<Either<Failure, UserCalendar>> getCalendar(String calendarId) async {
    try {
      final calendar = await remoteDataSource.getCalendar(calendarId);
      return Right(calendar);
    } catch (e) {
      return Left(Failure(message: 'Failed to load calendar: $e'));
    }
  }

  @override
  Future<Either<Failure, UserCalendar>> createCalendar(
    UserCalendar calendar,
  ) async {
    try {
      final created = await remoteDataSource.createCalendar(
        UserCalendarModel.fromEntity(calendar),
      );
      return Right(created);
    } catch (e) {
      return Left(Failure(message: 'Failed to create calendar: $e'));
    }
  }

  @override
  Future<Either<Failure, UserCalendar>> updateCalendar(
    UserCalendar calendar,
  ) async {
    try {
      final updated = await remoteDataSource.updateCalendar(
        UserCalendarModel.fromEntity(calendar),
      );
      return Right(updated);
    } catch (e) {
      return Left(Failure(message: 'Failed to update calendar: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteCalendar(String calendarId) async {
    try {
      await remoteDataSource.deleteCalendar(calendarId);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to delete calendar: $e'));
    }
  }

  @override
  Future<Either<Failure, Set<String>>> getVisibleCalendarIds() async {
    try {
      final ids = await remoteDataSource.getVisibleCalendarIds();
      return Right(ids);
    } catch (e) {
      return Left(Failure(message: 'Failed to load visible calendars: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> updateVisibleCalendarIds(
    Set<String> calendarIds,
  ) async {
    try {
      await remoteDataSource.updateVisibleCalendarIds(calendarIds);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to update visible calendars: $e'));
    }
  }

  @override
  Future<Either<Failure, UserCalendar>> ensurePrimaryCalendar() async {
    try {
      final calendars = await remoteDataSource.getCalendars();
      final primary = calendars.where((c) => c.id == 'primary').firstOrNull;

      if (primary != null) {
        return Right(primary);
      }

      // Create primary calendar if it doesn't exist
      final newPrimary = UserCalendar(
        id: 'primary',
        name: 'My Calendar',
        colorValue: 0xFF4285F4, // Google Blue
        isPrimary: true,
      );

      final created = await remoteDataSource.createCalendar(
        UserCalendarModel.fromEntity(newPrimary),
      );
      return Right(created);
    } catch (e) {
      return Left(Failure(message: 'Failed to ensure primary calendar: $e'));
    }
  }
}
