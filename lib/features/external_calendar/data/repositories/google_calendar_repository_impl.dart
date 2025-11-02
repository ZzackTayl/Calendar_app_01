import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/event.dart';
import '../../domain/repositories/external_calendar_repository.dart';
import '../datasources/google_calendar_data_source.dart';

class GoogleCalendarRepositoryImpl
    with EitherMixin
    implements ExternalCalendarRepository {
  final GoogleCalendarDataSource dataSource;

  GoogleCalendarRepositoryImpl({required this.dataSource});

  @override
  Future<Either<Failure, bool>> hasPermission() async {
    return handleFuture(() => dataSource.hasPermission());
  }

  @override
  Future<Either<Failure, bool>> requestPermission() async {
    return handleFuture(() => dataSource.hasPermission());
  }

  @override
  Future<Either<Failure, List<ExternalCalendarInfo>>> getCalendars() async {
    return handleFuture(() => dataSource.getCalendars());
  }

  @override
  Future<Either<Failure, List<CalendarEvent>>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    return handleFuture(() => dataSource.importEvents(
          includePastEvents: includePastEvents,
          specificCalendarId: specificCalendarId,
        ));
  }

  @override
  bool get isPlatformSupported => true;
}
