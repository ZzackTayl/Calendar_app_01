import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/event.dart';
import '../services/api_service.dart';

part 'event_providers.g.dart';

/// Provider for the list of calendar events
@riverpod
class EventList extends _$EventList {
  @override
  Future<List<CalendarEvent>> build() async {
    return await CalendarApi.getEvents();
  }

  /// Add a new event
  Future<void> addEvent(CalendarEvent event) async {
    state = const AsyncValue.loading();
    try {
      await CalendarApi.createEvent(event);
      // Refresh the event list
      state = AsyncValue.data(await CalendarApi.getEvents());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Update an existing event
  Future<void> updateEvent(CalendarEvent event) async {
    state = const AsyncValue.loading();
    try {
      await CalendarApi.updateEvent(event);
      // Refresh the event list
      state = AsyncValue.data(await CalendarApi.getEvents());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Delete an event
  Future<void> deleteEvent(String eventId) async {
    state = const AsyncValue.loading();
    try {
      await CalendarApi.deleteEvent(eventId);
      // Refresh the event list
      state = AsyncValue.data(await CalendarApi.getEvents());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Refresh events
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      state = AsyncValue.data(await CalendarApi.getEvents());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
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
