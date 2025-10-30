import 'package:equatable/equatable.dart';
import '../../../domain/event.dart';

/// Base class for all event-related states
abstract class EventState extends Equatable {
  const EventState();

  @override
  List<Object?> get props => [];
}

/// Initial state when the bloc is first created
class EventInitial extends EventState {
  const EventInitial();
}

/// State when an event operation is in progress
class EventLoading extends EventState {
  const EventLoading();
}

/// State when events have been successfully loaded
class EventLoaded extends EventState {
  final List<CalendarEvent> events;

  const EventLoaded(this.events);

  @override
  List<Object?> get props => [events];
}

/// State when a single event has been loaded
class EventDetailLoaded extends EventState {
  final CalendarEvent event;

  const EventDetailLoaded(this.event);

  @override
  List<Object?> get props => [event];
}

/// State when an event operation has completed successfully
/// This state is used to trigger navigation in the UI layer
class EventOperationSuccess extends EventState {
  final String message;
  final CalendarEvent? event; // Optional event data for create/update operations

  const EventOperationSuccess({
    required this.message,
    this.event,
  });

  @override
  List<Object?> get props => [message, event];
}

/// State when an error occurs
class EventError extends EventState {
  final String message;
  final List<CalendarEvent>? previousEvents; // Keep previous data if available

  const EventError({
    required this.message,
    this.previousEvents,
  });

  @override
  List<Object?> get props => [message, previousEvents];
}

/// State when refreshing event data (shows loading with existing data)
class EventRefreshing extends EventState {
  final List<CalendarEvent> currentEvents;

  const EventRefreshing(this.currentEvents);

  @override
  List<Object?> get props => [currentEvents];
}
