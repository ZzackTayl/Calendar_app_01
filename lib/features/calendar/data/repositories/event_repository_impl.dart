// Event repository implementation following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/event.dart';
import '../../domain/repositories/event_repository.dart';
import '../datasources/event_remote_data_source.dart';

class EventRepositoryImpl with EitherMixin implements EventRepository {
  final EventRemoteDataSource remoteDataSource;

  EventRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<CalendarEvent>>> getEvents() async {
    try {
      final events = await remoteDataSource.getEvents();
      return Right(events);
    } catch (e) {
      return Left(Failure(message: 'Failed to load events: $e'));
    }
  }

  @override
  Future<Either<Failure, CalendarEvent>> getEvent(String eventId) async {
    try {
      final event = await remoteDataSource.getEvent(eventId);
      return Right(event);
    } catch (e) {
      return Left(Failure(message: 'Failed to load event: $e'));
    }
  }

  @override
  Future<Either<Failure, CalendarEvent>> createEvent(
    CalendarEvent event,
  ) async {
    try {
      final created = await remoteDataSource.createEvent(event);
      return Right(created);
    } catch (e) {
      return Left(Failure(message: 'Failed to create event: $e'));
    }
  }

  @override
  Future<Either<Failure, CalendarEvent>> updateEvent(
    CalendarEvent event,
  ) async {
    try {
      final updated = await remoteDataSource.updateEvent(event);
      return Right(updated);
    } catch (e) {
      return Left(Failure(message: 'Failed to update event: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteEvent(String eventId) async {
    try {
      await remoteDataSource.deleteEvent(eventId);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to delete event: $e'));
    }
  }

  @override
  Future<Either<Failure, List<CalendarEvent>>> getEventsInRange({
    required DateTime start,
    required DateTime end,
  }) async {
    try {
      final events = await remoteDataSource.getEventsInRange(
        start: start,
        end: end,
      );
      return Right(events);
    } catch (e) {
      return Left(Failure(message: 'Failed to load events in range: $e'));
    }
  }

  @override
  Future<Either<Failure, List<CalendarEvent>>> getEventsForCalendar(
    String calendarId,
  ) async {
    try {
      final events = await remoteDataSource.getEventsForCalendar(calendarId);
      return Right(events);
    } catch (e) {
      return Left(
        Failure(message: 'Failed to load events for calendar: $e'),
      );
    }
  }

  @override
  Future<Either<Failure, List<CalendarEvent>>> searchEvents(
    String query,
  ) async {
    try {
      // Client-side filtering: Firestore lacks native full-text search.
      // For production scale, consider Algolia, Elasticsearch, or Cloud Functions
      // with a search index for server-side filtering.
      final events = await remoteDataSource.getEvents();
      final filtered = events.where((event) {
        final titleMatch =
            event.title.toLowerCase().contains(query.toLowerCase());
        final descMatch = event.description
                ?.toLowerCase()
                .contains(query.toLowerCase()) ??
            false;
        return titleMatch || descMatch;
      }).toList();
      return Right(filtered);
    } catch (e) {
      return Left(Failure(message: 'Failed to search events: $e'));
    }
  }

  @override
  Future<Either<Failure, List<EventInvite>>> getPendingInvites() async {
    try {
      final invites = await remoteDataSource.getPendingInvites();
      return Right(invites);
    } catch (e) {
      return Left(Failure(message: 'Failed to load pending invites: $e'));
    }
  }

  @override
  Future<Either<Failure, CalendarEvent>> getEventForInvite(
    String inviteId,
  ) async {
    try {
      final event = await remoteDataSource.getEventForInvite(inviteId);
      return Right(event);
    } catch (e) {
      return Left(Failure(message: 'Failed to load event for invite: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> respondToEventInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  }) async {
    try {
      await remoteDataSource.respondToEventInvite(
        inviteId,
        response,
        note: note,
      );
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to respond to invite: $e'));
    }
  }
}

