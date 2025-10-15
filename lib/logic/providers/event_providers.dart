import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../core/supabase_client.dart';
import '../../domain/event.dart';
import '../services/api_service.dart';
import '../services/offline_cache_service.dart';
import 'calendar_providers.dart';

part 'event_providers.g.dart';

/// Provider for the list of calendar events
@riverpod
class EventList extends _$EventList {
  List<CalendarEvent> _offlineEvents = const [];

  bool get _useSupabase => SupabaseService.isConfigured;

  @override
  Future<List<CalendarEvent>> build() async {
    if (!_useSupabase) {
      _offlineEvents = await OfflineCacheService.loadEvents();
      return List.unmodifiable(_offlineEvents);
    }

    final result = await CalendarApi.getEvents();
    return result.when(
      success: (events) => events,
      failure: (message, exception) => throw Exception(message),
    );
  }

  /// Add a new event
  Future<void> addEvent(CalendarEvent event) async {
    if (!_useSupabase) {
      _offlineEvents = [
        ..._offlineEvents.where((existing) => existing.id != event.id),
        event,
      ]..sort((a, b) => a.start.compareTo(b.start));
      state = AsyncValue.data(List.unmodifiable(_offlineEvents));
      await OfflineCacheService.saveEvents(_offlineEvents);
      return;
    }

    state = const AsyncValue.loading();

    final result = await CalendarApi.createEvent(event);
    await result.when(
      success: (_) async {
        // Refresh the event list
        final refreshResult = await CalendarApi.getEvents();
        refreshResult.when(
          success: (events) => state = AsyncValue.data(events),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Update an existing event
  Future<void> updateEvent(CalendarEvent event) async {
    if (!_useSupabase) {
      final index = _offlineEvents.indexWhere((e) => e.id == event.id);
      if (index != -1) {
        final mutable = [..._offlineEvents];
        mutable[index] = event;
        mutable.sort((a, b) => a.start.compareTo(b.start));
        _offlineEvents = mutable;
        state = AsyncValue.data(List.unmodifiable(_offlineEvents));
        await OfflineCacheService.saveEvents(_offlineEvents);
      }
      return;
    }

    state = const AsyncValue.loading();

    final result = await CalendarApi.updateEvent(event);
    await result.when(
      success: (_) async {
        // Refresh the event list
        final refreshResult = await CalendarApi.getEvents();
        refreshResult.when(
          success: (events) => state = AsyncValue.data(events),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Delete an event
  Future<void> deleteEvent(String eventId) async {
    if (!_useSupabase) {
      _offlineEvents = _offlineEvents
          .where((event) => event.id != eventId)
          .toList()
        ..sort((a, b) => a.start.compareTo(b.start));
      state = AsyncValue.data(List.unmodifiable(_offlineEvents));
      await OfflineCacheService.saveEvents(_offlineEvents);
      return;
    }

    state = const AsyncValue.loading();

    final result = await CalendarApi.deleteEvent(eventId);
    await result.when(
      success: (_) async {
        // Refresh the event list
        final refreshResult = await CalendarApi.getEvents();
        refreshResult.when(
          success: (events) => state = AsyncValue.data(events),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Refresh events
  Future<void> refresh() async {
    if (!_useSupabase) {
      _offlineEvents = await OfflineCacheService.loadEvents();
      state = AsyncValue.data(List.unmodifiable(_offlineEvents));
      return;
    }

    state = const AsyncValue.loading();

    final result = await CalendarApi.getEvents();
    result.when(
      success: (events) => state = AsyncValue.data(events),
      failure: (message, exception) =>
          state = AsyncValue.error(Exception(message), StackTrace.current),
    );
  }
}

/// Provider for selected date
@riverpod
class SelectedDate extends _$SelectedDate {
  @override
  DateTime build() {
    return DateTime.now();
  }

  void setSelectedDate(DateTime date) {
    state = date;
  }

  void setDate(DateTime date) => setSelectedDate(date);
}

List<CalendarEvent> _eventsInRange(
  Iterable<CalendarEvent> source,
  DateTime rangeStart,
  DateTime rangeEnd,
) {
  final results = <CalendarEvent>[];
  for (final event in source) {
    if (event.isRecurring) {
      final instances = event.generateRecurringInstances(
        rangeStart: rangeStart,
        rangeEnd: rangeEnd,
      );
      for (final instance in instances) {
        if (_overlapsRange(instance, rangeStart, rangeEnd)) {
          results.add(instance);
        }
      }
    } else if (_overlapsRange(event, rangeStart, rangeEnd)) {
      results.add(event);
    }
  }
  return results;
}

bool _overlapsRange(
  CalendarEvent event,
  DateTime rangeStart,
  DateTime rangeEnd,
) {
  final startsBeforeEnd = event.start.isBefore(rangeEnd);
  final endsAfterStart = event.end.isAfter(rangeStart) ||
      event.end.isAtSameMomentAs(rangeStart);
  return startsBeforeEnd && endsAfterStart;
}

/// Provider for events on a specific date
@riverpod
List<CalendarEvent> eventsForDate(Ref ref, DateTime date) {
  final events = ref.watch(eventListProvider);
  final visibleCalendars = ref.watch(visibleCalendarsProvider);
  final visibleIds = visibleCalendars.maybeWhen(
    data: (ids) => ids,
    orElse: () => const {'primary'},
  );

  return events.when(
    data: (eventList) {
      final dayStart = DateTime(date.year, date.month, date.day);
      final dayEnd = dayStart.add(const Duration(days: 1));
      final visibleEvents = eventList.where(
        (event) => visibleIds.contains(event.calendarId),
      );
      return _eventsInRange(visibleEvents, dayStart, dayEnd)
        ..sort((a, b) => a.start.compareTo(b.start));
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for events in a specific week
///
/// Returns all events that occur within the 7-day period starting from weekStart.
@riverpod
List<CalendarEvent> eventsForWeek(Ref ref, DateTime weekStart) {
  final events = ref.watch(eventListProvider);
  final visibleCalendars = ref.watch(visibleCalendarsProvider);
  final visibleIds = visibleCalendars.maybeWhen(
    data: (ids) => ids,
    orElse: () => const {'primary'},
  );

  return events.when(
    data: (eventList) {
      final weekEnd = weekStart.add(const Duration(days: 7));
      final visibleEvents = eventList.where(
        (event) => visibleIds.contains(event.calendarId),
      );
      return _eventsInRange(visibleEvents, weekStart, weekEnd)
        ..sort((a, b) => a.start.compareTo(b.start));
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for upcoming events
///
/// Returns the next 5 upcoming events starting from now.
@riverpod
List<CalendarEvent> upcomingEvents(Ref ref) {
  final events = ref.watch(eventListProvider);
  final visibleCalendars = ref.watch(visibleCalendarsProvider);
  final visibleIds = visibleCalendars.maybeWhen(
    data: (ids) => ids,
    orElse: () => const {'primary'},
  );
  final now = DateTime.now();

  return events.when(
    data: (eventList) {
      final visibleEvents = eventList.where(
        (event) => visibleIds.contains(event.calendarId),
      );
      final horizonEnd = now.add(const Duration(days: 90));
      final expanded = _eventsInRange(visibleEvents, now, horizonEnd)
        ..sort((a, b) => a.start.compareTo(b.start));
      return expanded
          .where((event) => event.start.isAfter(now))
          .take(5)
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for events count
@riverpod
int eventsCount(Ref ref) {
  final events = ref.watch(eventListProvider);
  final visibleCalendars = ref.watch(visibleCalendarsProvider);
  final visibleIds = visibleCalendars.maybeWhen(
    data: (ids) => ids,
    orElse: () => const {'primary'},
  );

  return events.when(
    data: (eventList) => eventList
        .where((event) => visibleIds.contains(event.calendarId))
        .length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provider for today's events
@riverpod
List<CalendarEvent> todaysEvents(Ref ref) {
  final now = DateTime.now();
  return ref.watch(eventsForDateProvider(now));
}

/// Provider for events by privacy level
@riverpod
List<CalendarEvent> eventsByPrivacyLevel(Ref ref, EventPrivacyLevel level) {
  final events = ref.watch(eventListProvider);
  final visibleCalendars = ref.watch(visibleCalendarsProvider);
  final visibleIds = visibleCalendars.maybeWhen(
    data: (ids) => ids,
    orElse: () => const {'primary'},
  );

  return events.when(
    data: (eventList) {
      return eventList
          .where(
            (event) =>
                visibleIds.contains(event.calendarId) &&
                event.privacyLevel == level,
          )
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for checking if a specific date has events
@riverpod
bool dateHasEvents(Ref ref, DateTime date) {
  final events = ref.watch(eventsForDateProvider(date));
  return events.isNotEmpty;
}
