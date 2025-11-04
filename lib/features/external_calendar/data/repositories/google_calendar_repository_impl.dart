import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/repositories/external_calendar_repository.dart';
import '../datasources/google_calendar_data_source.dart';

class GoogleCalendarRepositoryImpl implements ExternalCalendarRepository {
  final GoogleCalendarDataSource dataSource;

  GoogleCalendarRepositoryImpl({required this.dataSource});

  @override
  Future<Result<bool>> hasPermission() async {
    try {
      final result = await dataSource.hasPermission();
      return Success(result);
    } catch (e) {
      return Failure('Failed to check calendar permission: $e');
    }
  }

  @override
  Future<Result<bool>> requestPermission() async {
    try {
      final result = await dataSource.hasPermission();
      return Success(result);
    } catch (e) {
      return Failure('Failed to request calendar permission: $e');
    }
  }

  @override
  Future<Result<List<ExternalCalendarInfo>>> getCalendars() async {
    try {
      final calendars = await dataSource.getCalendars();
      return Success(calendars.cast<ExternalCalendarInfo>());
    } catch (e) {
      return Failure('Failed to get calendars: $e');
    }
  }

  @override
  Future<Result<List<CalendarEvent>>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    try {
      final events = await dataSource.importEvents(
        includePastEvents: includePastEvents,
        specificCalendarId: specificCalendarId,
      );
      return Success(events);
    } catch (e) {
      return Failure('Failed to import events: $e');
    }
  }

  @override
  bool get isPlatformSupported => true;
}
