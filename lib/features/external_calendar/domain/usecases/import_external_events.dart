

import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/core/result.dart';import 'package:myorbit_calendar/features/external_calendar/domain/repositories/external_calendar_repository.dart';

class ImportExternalCalendarEvents {
  const ImportExternalCalendarEvents(this._repository);

  final ExternalCalendarRepository _repository;

  Future<Result<List<CalendarEvent>>> call({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) {
    return _repository.importEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );
  }
}
