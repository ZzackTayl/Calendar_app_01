import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/repositories/event_repository.dart';
import '../../../domain/event.dart';
import 'event_event.dart';
import 'event_state.dart';
import '../../../core/services/analytics_service.dart';

/// Business logic component for event management
/// Handles all event-related operations and state management
///
/// IMPORTANT: This BLoC contains NO navigation logic.
/// Navigation is handled in the Presentation Layer (screens/widgets) using
/// BlocListener or BlocConsumer in response to state changes.
class EventBloc extends Bloc<EventEvent, EventState> {
  final EventRepository eventRepository;

  EventBloc({required this.eventRepository}) : super(const EventInitial()) {
    on<LoadEvents>(_onLoadEvents);
    on<LoadEvent>(_onLoadEvent);
    on<CreateEvent>(_onCreateEvent);
    on<UpdateEvent>(_onUpdateEvent);
    on<DeleteEvent>(_onDeleteEvent);
    on<RefreshEvents>(_onRefreshEvents);
    on<ClearEventError>(_onClearEventError);
  }

  /// Handles loading all events
  Future<void> _onLoadEvents(LoadEvents event, Emitter<EventState> emit) async {
    try {
      emit(const EventLoading());

      final result = await eventRepository.getEvents();

      result.when(
        success: (events) {
          developer.log('Bloc: Loaded ${events.length} events', name: 'EventBloc');
          emit(EventLoaded(events));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to load events: $message', name: 'EventBloc');
          emit(EventError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error loading events: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while loading events'));
    }
  }

  /// Handles loading a specific event
  Future<void> _onLoadEvent(LoadEvent event, Emitter<EventState> emit) async {
    try {
      emit(const EventLoading());

      final result = await eventRepository.getEventById(event.eventId);

      result.when(
        success: (calendarEvent) {
          developer.log('Bloc: Loaded event ${event.eventId}', name: 'EventBloc');
          emit(EventDetailLoaded(calendarEvent));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to load event ${event.eventId}: $message',
              name: 'EventBloc');
          emit(EventError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error loading event ${event.eventId}: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while loading event'));
    }
  }

  /// Handles creating a new event
  ///
  /// After successful creation, emits EventOperationSuccess which the UI layer
  /// should listen to using BlocListener to perform navigation.
  Future<void> _onCreateEvent(CreateEvent event, Emitter<EventState> emit) async {
    try {
      emit(const EventLoading());

      final result = await eventRepository.createEvent(event.event);

      result.when(
        success: (createdEvent) {
          developer.log('Bloc: Created event ${createdEvent.id}', name: 'EventBloc');
          // Emit success state - UI layer will handle navigation in BlocListener
          emit(EventOperationSuccess(
            message: 'Event created successfully',
            event: createdEvent,
          ));
          unawaited(
            AnalyticsService.logCalendarEventAction(
              'created',
              calendarId: createdEvent.calendarId,
              invitedCount: createdEvent.invitedPartnerIds.length,
              privacyLevel: createdEvent.privacyLevel.name,
              recurring: createdEvent.isRecurring,
              durationMinutes: createdEvent.duration.inMinutes,
            ),
          );
          // Automatically reload events to show updated list
          add(const LoadEvents());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to create event: $message', name: 'EventBloc');
          emit(EventError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error creating event: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while creating event'));
    }
  }

  /// Handles updating an existing event
  ///
  /// After successful update, emits EventOperationSuccess which the UI layer
  /// should listen to using BlocListener to perform navigation.
  Future<void> _onUpdateEvent(UpdateEvent event, Emitter<EventState> emit) async {
    try {
      emit(const EventLoading());

      final result = await eventRepository.updateEvent(event.event);

      result.when(
        success: (updatedEvent) {
          developer.log('Bloc: Updated event ${updatedEvent.id}', name: 'EventBloc');
          // Emit success state - UI layer will handle navigation in BlocListener
          emit(EventOperationSuccess(
            message: 'Event updated successfully',
            event: updatedEvent,
          ));
          unawaited(
            AnalyticsService.logCalendarEventAction(
              'updated',
              calendarId: updatedEvent.calendarId,
              invitedCount: updatedEvent.invitedPartnerIds.length,
              privacyLevel: updatedEvent.privacyLevel.name,
              recurring: updatedEvent.isRecurring,
              durationMinutes: updatedEvent.duration.inMinutes,
            ),
          );
          // Automatically reload events to show updated list
          add(const LoadEvents());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to update event: $message', name: 'EventBloc');
          emit(EventError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error updating event: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while updating event'));
    }
  }

  /// Handles deleting an event
  Future<void> _onDeleteEvent(DeleteEvent event, Emitter<EventState> emit) async {
    try {
      // Keep current events list to show while deleting
      List<CalendarEvent>? currentEvents;
      if (state is EventLoaded) {
        currentEvents = (state as EventLoaded).events;
      }
      CalendarEvent? deletedEvent;
      if (currentEvents != null) {
        try {
          deletedEvent = currentEvents.firstWhere((e) => e.id == event.eventId);
        } catch (_) {
          deletedEvent = null;
        }
      }

      emit(const EventLoading());

      final result = await eventRepository.deleteEvent(event.eventId);

      result.when(
        success: (_) {
          developer.log('Bloc: Deleted event ${event.eventId}', name: 'EventBloc');
          emit(const EventOperationSuccess(message: 'Event deleted successfully'));
          unawaited(
            AnalyticsService.logCalendarEventAction(
              'deleted',
              calendarId: deletedEvent?.calendarId ?? 'unspecified',
              invitedCount: deletedEvent?.invitedPartnerIds.length ?? 0,
              privacyLevel: deletedEvent?.privacyLevel.name ?? 'unknown',
              recurring: deletedEvent?.isRecurring ?? false,
              durationMinutes: deletedEvent?.duration.inMinutes ?? 0,
            ),
          );
          // Automatically reload events to show updated list
          add(const LoadEvents());
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to delete event ${event.eventId}: $message',
              name: 'EventBloc');
          emit(EventError(
            message: message,
            previousEvents: currentEvents,
          ));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error deleting event ${event.eventId}: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while deleting event'));
    }
  }

  /// Handles refreshing the event list
  Future<void> _onRefreshEvents(RefreshEvents event, Emitter<EventState> emit) async {
    try {
      // If we have current events, show refreshing state
      if (state is EventLoaded) {
        emit(EventRefreshing((state as EventLoaded).events));
      } else {
        emit(const EventLoading());
      }

      final result = await eventRepository.getEvents();

      result.when(
        success: (events) {
          developer.log('Bloc: Refreshed ${events.length} events', name: 'EventBloc');
          emit(EventLoaded(events));
        },
        failure: (message, exception) {
          developer.log('Bloc: Failed to refresh events: $message', name: 'EventBloc');
          emit(EventError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error refreshing events: $e',
        name: 'EventBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const EventError(message: 'An unexpected error occurred while refreshing events'));
    }
  }

  /// Handles clearing error states
  void _onClearEventError(ClearEventError event, Emitter<EventState> emit) {
    if (state is EventError) {
      final errorState = state as EventError;
      if (errorState.previousEvents != null) {
        emit(EventLoaded(errorState.previousEvents!));
      } else {
        emit(const EventInitial());
      }
    }
  }
}
