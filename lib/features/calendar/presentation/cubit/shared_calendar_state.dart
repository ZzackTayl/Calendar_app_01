part of 'shared_calendar_cubit.dart';

/// Shared Calendar state
class SharedCalendarState {
  final String selectedFilter;
  final List<ConnectionCalendarOption> connectionOptions;
  final List<SharedCalendarEvent> sharedEvents;
  final ConflictDetectionResult? conflicts;
  final bool isLoadingEvents;

  const SharedCalendarState({
    this.selectedFilter = 'self',
    this.connectionOptions = const [],
    this.sharedEvents = const [],
    this.conflicts,
    this.isLoadingEvents = false,
  });

  SharedCalendarState copyWith({
    String? selectedFilter,
    List<ConnectionCalendarOption>? connectionOptions,
    List<SharedCalendarEvent>? sharedEvents,
    ConflictDetectionResult? conflicts,
    bool? isLoadingEvents,
  }) {
    return SharedCalendarState(
      selectedFilter: selectedFilter ?? this.selectedFilter,
      connectionOptions: connectionOptions ?? this.connectionOptions,
      sharedEvents: sharedEvents ?? this.sharedEvents,
      conflicts: conflicts ?? this.conflicts,
      isLoadingEvents: isLoadingEvents ?? this.isLoadingEvents,
    );
  }
}
