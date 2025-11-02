// Event repository contract following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../domain/event.dart';

/// Repository contract for event operations
abstract class EventRepository {
  /// Get all events for the current user
  Future<Either<Failure, List<CalendarEvent>>> getEvents();

  /// Get a specific event by ID
  Future<Either<Failure, CalendarEvent>> getEvent(String eventId);

  /// Create a new event
  Future<Either<Failure, CalendarEvent>> createEvent(CalendarEvent event);

  /// Update an existing event
  Future<Either<Failure, CalendarEvent>> updateEvent(CalendarEvent event);

  /// Delete an event
  Future<Either<Failure, void>> deleteEvent(String eventId);

  /// Get events for a specific date range
  Future<Either<Failure, List<CalendarEvent>>> getEventsInRange({
    required DateTime start,
    required DateTime end,
  });

  /// Get events for a specific calendar
  Future<Either<Failure, List<CalendarEvent>>> getEventsForCalendar(
    String calendarId,
  );

  /// Search events by query
  Future<Either<Failure, List<CalendarEvent>>> searchEvents(String query);

  /// Get pending event invites
  Future<Either<Failure, List<EventInvite>>> getPendingInvites();

  /// Get event for a specific invite
  Future<Either<Failure, CalendarEvent>> getEventForInvite(String inviteId);

  /// Respond to an event invitation
  Future<Either<Failure, void>> respondToEventInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  });
}

