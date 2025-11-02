import '../../../../domain/event.dart';
import '../../domain/repositories/external_calendar_repository.dart';
import '../../../../logic/services/apple_calendar_sync_service.dart';

abstract class AppleCalendarDataSource {
  Future<bool> hasPermission();
  Future<List<ExternalCalendarInfo>> getCalendars();
  Future<List<CalendarEvent>> importEvents({
    bool includePastEvents,
    String? specificCalendarId,
  });
  bool get isPlatformSupported;
}

class AppleCalendarDataSourceImpl implements AppleCalendarDataSource {
  @override
  Future<bool> hasPermission() async {
    return await AppleCalendarSyncService.hasCalendarPermission();
  }

  @override
  Future<List<ExternalCalendarInfo>> getCalendars() async {
    final result = await AppleCalendarSyncService.getAppleCalendars();
    return result.when(
      success: (calendars) {
        return calendars
            .map((cal) => ExternalCalendarInfo(
                  id: cal.id,
                  name: cal.name,
                  description: cal.description,
                  isPrimary: cal.isPrimary,
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
    final result = await AppleCalendarSyncService.importAppleCalendarEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    return result.when(
      success: (events) => events,
      failure: (message, exception) => throw Exception(message),
    );
  }

  @override
  bool get isPlatformSupported => AppleCalendarSyncService.isPlatformSupported;
}
