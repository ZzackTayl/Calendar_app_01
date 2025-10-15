import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../core/supabase_client.dart';
import '../../domain/event.dart';
import '../services/api_service.dart';
import '../services/offline_cache_service.dart';

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

/// Provider for events on a specific date
@riverpod
List<CalendarEvent> eventsForDate(Ref ref, DateTime date) {
  final events = ref.watch(eventListProvider);

  return events.when(
    data: (eventList) {
      return eventList.where((event) {
        return event.start.year == date.year &&
            event.start.month == date.month &&
            event.start.day == date.day;
      }).toList();
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

  return events.when(
    data: (eventList) {
      final weekEnd = weekStart.add(const Duration(days: 7));
      return eventList.where((event) {
        final startsBeforeWeekEnd = event.start.isBefore(weekEnd);
        final endsAfterWeekStart = !event.end.isBefore(weekStart);
        return startsBeforeWeekEnd && endsAfterWeekStart;
      }).toList();
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
  final now = DateTime.now();

  return events.when(
    data: (eventList) {
      final upcoming =
          eventList.where((event) => event.start.isAfter(now)).toList();

      // Sort by start time
      upcoming.sort((a, b) => a.start.compareTo(b.start));

      // Return only the next 5
      return upcoming.take(5).toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for events count
@riverpod
int eventsCount(Ref ref) {
  final events = ref.watch(eventListProvider);

  return events.when(
    data: (eventList) => eventList.length,
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

  return events.when(
    data: (eventList) {
      return eventList.where((event) => event.privacyLevel == level).toList();
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
