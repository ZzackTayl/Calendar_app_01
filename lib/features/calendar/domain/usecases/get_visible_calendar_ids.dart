import 'package:dartz/dartz.dart';
import 'package:myorbit_calendar/core/error/failures.dart';
import 'package:myorbit_calendar/features/calendar/domain/repositories/calendar_repository.dart';

class GetVisibleCalendarIds {
  const GetVisibleCalendarIds(this._repository);

  final CalendarRepository _repository;

  Future<Either<Failure, Set<String>>> call() {
    return _repository.getVisibleCalendarIds();
  }
}
