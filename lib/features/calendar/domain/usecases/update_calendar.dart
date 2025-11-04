import 'package:dartz/dartz.dart';
import 'package:myorbit_calendar/core/error/failures.dart';
import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';
import 'package:myorbit_calendar/features/calendar/domain/repositories/calendar_repository.dart';

class UpdateCalendar {
  const UpdateCalendar(this._repository);

  final CalendarRepository _repository;

  Future<Either<Failure, UserCalendar>> call(UserCalendar calendar) {
    return _repository.updateCalendar(calendar);
  }
}
