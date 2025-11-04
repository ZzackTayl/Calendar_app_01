import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/features/external_calendar/data/models/external_calendar_info_model.dart';
import '../../../../logic/services/apple_calendar_sync_service.dart';

abstract class AppleCalendarDataSource {
  Future<bool> hasPermission();
  Future<List<ExternalCalendarInfoModel>> getCalendars();
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
  Future<List<ExternalCalendarInfoModel>> getCalendars() async {
    final result = await AppleCalendarSyncService.getAppleCalendars();
    return result.when(
      success: (calendars) {
        return calendars
            .map((cal) => ExternalCalendarInfoModel(
                  id: cal.id,
                  name: cal.name,
                  description: null,
                  isPrimary: cal.isDefault,
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
