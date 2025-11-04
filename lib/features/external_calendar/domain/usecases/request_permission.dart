

import 'package:myorbit_calendar/core/result.dart';import 'package:myorbit_calendar/features/external_calendar/domain/repositories/external_calendar_repository.dart';

class RequestExternalCalendarPermission {
  const RequestExternalCalendarPermission(this._repository);

  final ExternalCalendarRepository _repository;

  Future<Result<bool>> call() {
    return _repository.requestPermission();
  }
}
