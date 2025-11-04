import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/data/models/external_calendar_info_model.dart';
import '../../../../logic/services/google_calendar_sync_service.dart';

/// Data source for Google Calendar integration
abstract class GoogleCalendarDataSource {
  Future<bool> hasPermission();
  Future<List<ExternalCalendarInfoModel>> getCalendars();
  Future<List<CalendarEvent>> importEvents({
    bool includePastEvents,
    String? specificCalendarId,
  });
}

/// Implementation using existing GoogleCalendarSyncService
class GoogleCalendarDataSourceImpl implements GoogleCalendarDataSource {
  @override
  Future<bool> hasPermission() async {
    return await GoogleCalendarSyncService.hasCalendarPermission();
  }

  @override
  Future<List<ExternalCalendarInfoModel>> getCalendars() async {
    final result = await GoogleCalendarSyncService.getGoogleCalendars();
    return result.when(
      success: (calendars) {
        return calendars
            .map((cal) => ExternalCalendarInfoModel(
                  id: cal.id,
                  name: cal.name,
                  description: cal.description,
                  isPrimary: cal.primary,
                ))
            .toList();
      },
      failure: (message, exception) => throw Exception(message),
    );
  }

  @override
  Future<List<CalendarEvent>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    final result = await GoogleCalendarSyncService.importGoogleCalendarEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    return result.when(
      success: (events) => events,
      failure: (message, exception) => throw Exception(message),
    );
  }
}
