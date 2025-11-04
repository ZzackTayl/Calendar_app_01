import 'package:dartz/dartz.dart';
import 'package:myorbit_calendar/core/error/failures.dart';
import 'package:myorbit_calendar/features/calendar/domain/repositories/calendar_repository.dart';

class DeleteCalendar {
  const DeleteCalendar(this._repository);

  final CalendarRepository _repository;

  Future<Either<Failure, void>> call(String calendarId) {
    return _repository.deleteCalendar(calendarId);
  }
}
