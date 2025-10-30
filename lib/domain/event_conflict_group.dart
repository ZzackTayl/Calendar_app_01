import 'shared_event.dart';

/// Represents a group of events that overlap in time.
class EventConflictGroup {
  EventConflictGroup({
    required this.id,
    required Set<String> eventIds,
    required this.start,
    required this.end,
  }) : eventIds = Set<String>.from(eventIds);

  /// Stable identifier derived from the overlapping event ids.
  final String id;

  /// Set of event ids participating in the overlap.
  final Set<String> eventIds;

  /// Earliest start time across the group.
  final DateTime start;

  /// Latest end time across the group.
  final DateTime end;

  /// Whether this group includes the provided shared event.
  bool contains(SharedCalendarEvent event) => eventIds.contains(event.event.id);
}

/// Mapping of events to their conflict groups plus the unique group list.
class ConflictDetectionResult {
  const ConflictDetectionResult({
    required this.eventToGroup,
    required this.groups,
  });

  /// Quick lookup of conflict group given an event id.
  final Map<String, EventConflictGroup> eventToGroup;

  /// All unique conflict groups in the evaluated range.
  final List<EventConflictGroup> groups;

  /// Convenience for retrieving a group for a given event.
  EventConflictGroup? groupFor(String eventId) => eventToGroup[eventId];
}
