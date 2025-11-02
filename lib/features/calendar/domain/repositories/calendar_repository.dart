// Calendar repository contract following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../domain/user_calendar.dart';

/// Repository contract for calendar operations
abstract class CalendarRepository {
  /// Get all calendars for the current user
  Future<Either<Failure, List<UserCalendar>>> getCalendars();

  /// Get a specific calendar by ID
  Future<Either<Failure, UserCalendar>> getCalendar(String calendarId);

  /// Create a new calendar
  Future<Either<Failure, UserCalendar>> createCalendar(UserCalendar calendar);

  /// Update an existing calendar
  Future<Either<Failure, UserCalendar>> updateCalendar(UserCalendar calendar);

  /// Delete a calendar
  Future<Either<Failure, void>> deleteCalendar(String calendarId);

  /// Get visible calendar IDs for the current user
  Future<Either<Failure, Set<String>>> getVisibleCalendarIds();

  /// Update visible calendar IDs
  Future<Either<Failure, void>> updateVisibleCalendarIds(Set<String> calendarIds);

  /// Ensure primary calendar exists for current user
  Future<Either<Failure, UserCalendar>> ensurePrimaryCalendar();
}

