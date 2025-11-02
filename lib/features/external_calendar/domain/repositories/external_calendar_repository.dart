import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../domain/event.dart';

/// External calendar repository contract
///
/// Defines operations for importing from external calendar providers.
abstract class ExternalCalendarRepository {
  /// Check if user has calendar permission
  Future<Either<Failure, bool>> hasPermission();

  /// Request calendar permission
  Future<Either<Failure, bool>> requestPermission();

  /// Get list of available calendars
  Future<Either<Failure, List<ExternalCalendarInfo>>> getCalendars();

  /// Import events from external calendar
  Future<Either<Failure, List<CalendarEvent>>> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  });

  /// Check if platform is supported
  bool get isPlatformSupported;
}

/// Information about an external calendar
class ExternalCalendarInfo {
  final String id;
  final String name;
  final String? description;
  final bool isPrimary;

  const ExternalCalendarInfo({
    required this.id,
    required this.name,
    this.description,
    this.isPrimary = false,
  });
}
