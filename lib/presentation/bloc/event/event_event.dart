import 'package:equatable/equatable.dart';
import '../../../domain/event.dart';

/// Base class for all event-related events
abstract class EventEvent extends Equatable {
  const EventEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load all events
class LoadEvents extends EventEvent {
  const LoadEvents();
}

/// Event to load a specific event by ID
class LoadEvent extends EventEvent {
  final String eventId;

  const LoadEvent(this.eventId);

  @override
  List<Object?> get props => [eventId];
}

/// Event to create a new event
class CreateEvent extends EventEvent {
  final CalendarEvent event;

  const CreateEvent(this.event);

  @override
  List<Object?> get props => [event];
}

/// Event to update an existing event
class UpdateEvent extends EventEvent {
  final CalendarEvent event;

  const UpdateEvent(this.event);

  @override
  List<Object?> get props => [event];
}

/// Event to delete an event
class DeleteEvent extends EventEvent {
  final String eventId;

  const DeleteEvent(this.eventId);

  @override
  List<Object?> get props => [eventId];
}

/// Event to refresh the event list
class RefreshEvents extends EventEvent {
  const RefreshEvents();
}

/// Event to clear any error states
class ClearEventError extends EventEvent {
  const ClearEventError();
}
