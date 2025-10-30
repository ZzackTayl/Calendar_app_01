// Clean dependency injection for event management
// This creates all the dependencies needed for the event management feature

import '../../data/repositories/event_repository_impl.dart';
import '../../domain/repositories/event_repository.dart';
import '../../presentation/bloc/event/event_bloc.dart';

/// Simple dependency injection container for event management
/// This follows clean architecture principles by managing dependencies
class EventDependencyInjection {
  // Singleton instances
  static EventRepository? _eventRepository;

  /// Gets the event repository with all dependencies injected
  static EventRepository get eventRepository {
    return _eventRepository ??= EventRepositoryImpl();
  }

  /// Creates a new EventBloc instance with all dependencies
  /// Use this in your UI widgets to create the bloc
  static EventBloc createEventBloc() {
    return EventBloc(eventRepository: eventRepository);
  }

  /// Resets all dependencies (useful for testing)
  static void reset() {
    _eventRepository = null;
  }

  /// Allows injecting custom repository (useful for testing)
  static void setEventRepository(EventRepository repository) {
    _eventRepository = repository;
  }
}
