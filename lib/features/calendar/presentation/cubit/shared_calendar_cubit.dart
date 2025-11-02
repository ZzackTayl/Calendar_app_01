import 'dart:collection';
import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/firebase_app_services.dart';
import '../../../../domain/contact.dart';
import '../../../../domain/event.dart';
import '../../../../domain/event_conflict_group.dart';
import '../../../../domain/shared_event.dart';
import '../../../../domain/visibility.dart';
import '../../../../logic/services/api_service.dart';

part 'shared_calendar_state.dart';

const _kSelfFilterId = 'self';
const _kSelectedConnectionPrefKey = 'calendar_selected_connection_filter';

enum ConnectionCalendarOptionType { self, connection }

/// Represents a dropdown option for the connection calendar selector.
class ConnectionCalendarOption {
  const ConnectionCalendarOption._({
    required this.filterId,
    required this.type,
    this.contact,
  });

  factory ConnectionCalendarOption.me() =>
      const ConnectionCalendarOption._(
        filterId: _kSelfFilterId,
        type: ConnectionCalendarOptionType.self,
      );

  factory ConnectionCalendarOption.fromContact(Contact contact) =>
      ConnectionCalendarOption._(
        filterId: contact.externalUserId!,
        type: ConnectionCalendarOptionType.connection,
        contact: contact,
      );

  final String filterId;
  final ConnectionCalendarOptionType type;
  final Contact? contact;

  bool get isSelf => filterId == _kSelfFilterId;
}

/// Request object for shared events.
class SharedEventsRequest {
  const SharedEventsRequest({
    required this.rangeStart,
    required this.rangeEnd,
  });

  final DateTime rangeStart;
  final DateTime rangeEnd;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is SharedEventsRequest &&
        other.rangeStart == rangeStart &&
        other.rangeEnd == rangeEnd;
  }

  @override
  int get hashCode => Object.hash(rangeStart, rangeEnd);
}

/// Cubit for managing shared calendar events and connection filtering.
class SharedCalendarCubit extends Cubit<SharedCalendarState> {
  SharedCalendarCubit() : super(const SharedCalendarState()) {
    _loadSelectedFilter();
  }

  Future<void> _loadSelectedFilter() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kSelectedConnectionPrefKey);
    emit(state.copyWith(selectedFilter: saved ?? _kSelfFilterId));
  }

  /// Updates the connection calendar options based on contacts.
  void updateConnectionOptions(List<Contact> contacts) {
    final base = <ConnectionCalendarOption>[ConnectionCalendarOption.me()];
    
    final filtered = contacts
        .where(_hasSharedVisibility)
        .map(ConnectionCalendarOption.fromContact)
        .toList()
      ..sort(
        (a, b) => (a.contact?.name ?? '').compareTo(b.contact?.name ?? ''),
      );

    final options = List<ConnectionCalendarOption>.unmodifiable([...base, ...filtered]);
    emit(state.copyWith(connectionOptions: options));
  }

  /// Sets the selected connection filter.
  Future<void> setFilter(String filterId) async {
    emit(state.copyWith(selectedFilter: filterId));
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kSelectedConnectionPrefKey, filterId);
  }

  /// Loads shared calendar events for the given date range.
  Future<void> loadSharedEvents(
    SharedEventsRequest request,
    List<CalendarEvent> localEvents,
  ) async {
    emit(state.copyWith(isLoadingEvents: true));

    try {
      final isBackendReady = FirebaseAppServices.isConfigured &&
          FirebaseAppServices.isAuthenticated;

      List<SharedCalendarEvent> events;

      if (!isBackendReady) {
        developer.log(
          'Firebase backend not configured; falling back to local events only.',
          name: 'SharedCalendarCubit',
        );
        events = _mapLocalEvents(localEvents);
      } else {
        final response = await CalendarApi.getConnectionVisibleEvents(
          rangeStart: request.rangeStart,
          rangeEnd: request.rangeEnd,
          connectionUserId:
              state.selectedFilter == _kSelfFilterId ? null : state.selectedFilter,
        );

        events = response.when(
          success: (events) => events,
          failure: (message, exception) {
            developer.log(
              'Failed to load shared events: $message',
              name: 'SharedCalendarCubit',
              error: exception,
            );
            return _mapLocalEvents(localEvents);
          },
        );
      }

      // Detect conflicts
      final conflicts = _detectConflicts(events);

      emit(state.copyWith(
        sharedEvents: events,
        conflicts: conflicts,
        isLoadingEvents: false,
      ));
    } catch (e, stackTrace) {
      developer.log(
        'Error loading shared events',
        name: 'SharedCalendarCubit',
        error: e,
        stackTrace: stackTrace,
      );
      emit(state.copyWith(
        sharedEvents: _mapLocalEvents(localEvents),
        isLoadingEvents: false,
      ));
    }
  }

  List<SharedCalendarEvent> _mapLocalEvents(List<CalendarEvent> source) {
    return source
        .map(
          (event) => SharedCalendarEvent(
            event: event,
            ownerUserId: event.ownerId,
            ownerContactId: null,
            detailLevel: EventDetailLevel.full,
            visibilityReason: VisibilityReason.eventOwner,
            isInvited: false,
            sharedAt: event.createdAt,
          ),
        )
        .toList(growable: false);
  }

  ConflictDetectionResult _detectConflicts(List<SharedCalendarEvent> events) {
    if (events.length <= 1) {
      return const ConflictDetectionResult(
        eventToGroup: {},
        groups: [],
      );
    }

    final sorted = [...events]
      ..sort(
        (a, b) => a.event.start.compareTo(b.event.start),
      );

    final adjacency = HashMap<String, Set<String>>();
    final eventLookup = <String, SharedCalendarEvent>{
      for (final entry in sorted) entry.event.id: entry,
    };

    for (final entry in sorted) {
      adjacency[entry.event.id] = <String>{};
    }

    for (var i = 0; i < sorted.length; i++) {
      final a = sorted[i];
      for (var j = i + 1; j < sorted.length; j++) {
        final b = sorted[j];

        if (b.event.start.isAfter(a.event.end) &&
            !b.event.start.isAtSameMomentAs(a.event.end)) {
          break;
        }

        if (_eventsOverlap(a.event, b.event)) {
          adjacency[a.event.id]!.add(b.event.id);
          adjacency[b.event.id]!.add(a.event.id);
        }
      }
    }

    final visited = <String>{};
    final eventToGroup = <String, EventConflictGroup>{};
    final groups = <EventConflictGroup>[];

    for (final entry in sorted) {
      final eventId = entry.event.id;
      if (visited.contains(eventId)) {
        continue;
      }

      final component = <String>{};
      final queue = Queue<String>()..add(eventId);

      var earliestStart = entry.event.start;
      var latestEnd = entry.event.end;

      while (queue.isNotEmpty) {
        final currentId = queue.removeFirst();
        if (!visited.add(currentId)) {
          continue;
        }
        component.add(currentId);

        final currentEvent = eventLookup[currentId];
        if (currentEvent != null) {
          if (currentEvent.event.start.isBefore(earliestStart)) {
            earliestStart = currentEvent.event.start;
          }
          if (currentEvent.event.end.isAfter(latestEnd)) {
            latestEnd = currentEvent.event.end;
          }
        }

        for (final neighbor in adjacency[currentId] ?? const <String>{}) {
          if (!visited.contains(neighbor)) {
            queue.add(neighbor);
          }
        }
      }

      if (component.length <= 1) {
        continue;
      }

      final sortedIds = component.toList()..sort();
      final groupId = 'conflict_${sortedIds.join('_')}';
      final group = EventConflictGroup(
        id: groupId,
        eventIds: Set.unmodifiable(component),
        start: earliestStart,
        end: latestEnd,
      );

      groups.add(group);
      for (final id in component) {
        eventToGroup[id] = group;
      }
    }

    return ConflictDetectionResult(
      eventToGroup: Map.unmodifiable(eventToGroup),
      groups: List.unmodifiable(groups),
    );
  }

  bool _eventsOverlap(CalendarEvent a, CalendarEvent b) {
    final startsBeforeOtherEnds =
        a.start.isBefore(b.end) || a.start.isAtSameMomentAs(b.end);
    final otherStartsBeforeEnds =
        b.start.isBefore(a.end) || b.start.isAtSameMomentAs(a.end);

    final boundaryTouching =
        a.end.isAtSameMomentAs(b.start) || b.end.isAtSameMomentAs(a.start);

    return startsBeforeOtherEnds && otherStartsBeforeEnds && !boundaryTouching;
  }
}

bool _hasSharedVisibility(Contact contact) {
  if (contact.status != ContactStatus.accepted) {
    return false;
  }
  if (contact.externalUserId == null) {
    return false;
  }
  return contact.permission == PartnerPermission.visible ||
      contact.permission == PartnerPermission.semiVisible;
}
