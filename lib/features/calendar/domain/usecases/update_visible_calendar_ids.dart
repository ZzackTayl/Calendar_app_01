import 'package:dartz/dartz.dart';
import 'package:myorbit_calendar/core/error/failures.dart';
import 'package:myorbit_calendar/features/calendar/domain/repositories/calendar_repository.dart';

class UpdateVisibleCalendarIds {
  const UpdateVisibleCalendarIds(this._repository);

  final CalendarRepository _repository;

  Future<Either<Failure, void>> call(Set<String> calendarIds) {
    return _repository.updateVisibleCalendarIds(calendarIds);
  }
}
