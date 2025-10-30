import '../../core/result.dart';
import '../event.dart';

abstract class EventRepository {
  Future<Result<List<CalendarEvent>>> getEvents();
  Future<Result<CalendarEvent>> getEventById(String id);
  Future<Result<CalendarEvent>> createEvent(CalendarEvent event);
  Future<Result<CalendarEvent>> updateEvent(CalendarEvent event);
  Future<Result<void>> deleteEvent(String id);
}
