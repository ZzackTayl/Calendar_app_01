import '../../core/result.dart';
import '../../domain/event.dart';
import '../../domain/repositories/event_repository.dart';
import '../../logic/services/api_service.dart';

/// Implementation of EventRepository using CalendarApi
class EventRepositoryImpl implements EventRepository {
  @override
  Future<Result<List<CalendarEvent>>> getEvents() {
    return CalendarApi.getEvents();
  }

  @override
  Future<Result<CalendarEvent>> getEventById(String id) async {
    // For now, we'll get all events and filter
    // In the future, this could be optimized with a specific API endpoint
    final result = await CalendarApi.getEvents();
    return result.when(
      success: (events) {
        final event = events.where((e) => e.id == id).firstOrNull;
        if (event != null) {
          return Success(event);
        }
        return const Failure('Event not found');
      },
      failure: (message, exception) => Failure(message, exception),
    );
  }

  @override
  Future<Result<CalendarEvent>> createEvent(CalendarEvent event) {
    return CalendarApi.createEvent(event);
  }

  @override
  Future<Result<CalendarEvent>> updateEvent(CalendarEvent event) {
    return CalendarApi.updateEvent(event);
  }

  @override
  Future<Result<void>> deleteEvent(String id) {
    return CalendarApi.deleteEvent(id);
  }
}
