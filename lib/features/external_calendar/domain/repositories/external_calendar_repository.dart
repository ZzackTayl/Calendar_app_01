import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';

/// External calendar repository contract
///
/// Defines operations for importing from external calendar providers.
abstract class ExternalCalendarRepository {
  /// Check if user has calendar permission
  Future<Result<bool>> hasPermission();

  /// Request calendar permission
  Future<Result<bool>> requestPermission();

  /// Get list of available calendars
  Future<Result<List<ExternalCalendarInfo>>> getCalendars();

  /// Import events from external calendar
  Future<Result<List<CalendarEvent>>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  });

  /// Check if platform is supported
  bool get isPlatformSupported;
}
