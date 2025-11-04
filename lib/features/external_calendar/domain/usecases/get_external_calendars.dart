

import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';
import 'package:myorbit_calendar/core/result.dart';import 'package:myorbit_calendar/features/external_calendar/domain/repositories/external_calendar_repository.dart';

class GetExternalCalendars {
  const GetExternalCalendars(this._repository);

  final ExternalCalendarRepository _repository;

  Future<Result<List<ExternalCalendarInfo>>> call() {
    return _repository.getCalendars();
  }
}
