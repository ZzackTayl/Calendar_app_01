// Event Cubit following MyOrbit_CleanArch pattern

import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/event.dart';
import '../../domain/repositories/event_repository.dart';

/// Event state
class EventState {
  final AppStateStatus status;
  final List<CalendarEvent> events;
  final String message;
  final String searchQuery;

  const EventState({
    this.status = AppStateStatus.initial,
    this.events = const [],
    this.message = '',
    this.searchQuery = '',
  });

  /// Get filtered events based on search query
  List<CalendarEvent> get filteredEvents {
    if (searchQuery.isEmpty) return events;
    
    final query = searchQuery.toLowerCase();
    return events.where((event) {
      final titleMatch = event.title.toLowerCase().contains(query);
      final descMatch =
          event.description?.toLowerCase().contains(query) ?? false;
      return titleMatch || descMatch;
    }).toList();
  }

  EventState copyWith({
    AppStateStatus? status,
    List<CalendarEvent>? events,
    String? message,
    String? searchQuery,
  }) {
    return EventState(
      status: status ?? this.status,
      events: events ?? this.events,
      message: message ?? this.message,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }
}

/// Event Cubit for managing event state
class EventCubit extends Cubit<EventState> {
  final EventRepository repository;

  EventCubit({required this.repository}) : super(const EventState());

  /// Load all events
  Future<void> loadEvents() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getEvents();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load events: ${failure.message}',
          name: 'EventCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (events) {
        // Sort events by start time
        events.sort((a, b) => a.start.compareTo(b.start));
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: events,
        ));
      },
    );
  }

  /// Load events in a date range
  Future<void> loadEventsInRange({
    required DateTime start,
    required DateTime end,
  }) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getEventsInRange(start: start, end: end);
    result.fold(
      (failure) {
        developer.log(
          'Failed to load events in range: ${failure.message}',
          name: 'EventCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (events) {
        events.sort((a, b) => a.start.compareTo(b.start));
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: events,
        ));
      },
    );
  }

  /// Load events for a specific calendar
  Future<void> loadEventsForCalendar(String calendarId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getEventsForCalendar(calendarId);
    result.fold(
      (failure) {
        developer.log(
          'Failed to load events for calendar: ${failure.message}',
          name: 'EventCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (events) {
        events.sort((a, b) => a.start.compareTo(b.start));
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: events,
        ));
      },
    );
  }

  /// Create a new event
  Future<void> createEvent(CalendarEvent event) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.createEvent(event);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (created) {
        final updated = [...state.events, created];
        updated.sort((a, b) => a.start.compareTo(b.start));
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: updated,
          message: 'Event created successfully',
        ));
      },
    );
  }

  /// Update an existing event
  Future<void> updateEvent(CalendarEvent event) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.updateEvent(event);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (updated) {
        final events = state.events.map((e) {
          return e.id == updated.id ? updated : e;
        }).toList();
        events.sort((a, b) => a.start.compareTo(b.start));
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: events,
          message: 'Event updated successfully',
        ));
      },
    );
  }

  /// Delete an event
  Future<void> deleteEvent(String eventId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.deleteEvent(eventId);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        final events = state.events.where((e) => e.id != eventId).toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          events: events,
          message: 'Event deleted successfully',
        ));
      },
    );
  }

  /// Set search query
  void setSearchQuery(String query) {
    emit(state.copyWith(searchQuery: query));
  }

  /// Clear search query
  void clearSearch() {
    emit(state.copyWith(searchQuery: ''));
  }

  /// Refresh events
  Future<void> refresh() => loadEvents();
}

