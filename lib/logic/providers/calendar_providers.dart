import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/supabase_client.dart';
import '../../domain/user_calendar.dart';
import '../services/api_service.dart';
import '../services/offline_cache_service.dart';

part 'calendar_providers.g.dart';

@riverpod
class CalendarList extends _$CalendarList {
  List<UserCalendar> _offlineCalendars = const [];

  bool get _useSupabase => SupabaseService.isConfigured;

  @override
  Future<List<UserCalendar>> build() async {
    if (!_useSupabase) {
      _offlineCalendars = await OfflineCacheService.loadCalendars();
      return List.unmodifiable(_offlineCalendars);
    }

    final result = await CalendarApi.getCalendars();
    return await result.when(
      success: (calendars) async {
        await OfflineCacheService.saveCalendars(calendars);
        return calendars;
      },
      failure: (message, exception) async {
        throw Exception(message);
      },
    );
  }

  Future<void> refresh() async {
    if (!_useSupabase) {
      _offlineCalendars = await OfflineCacheService.loadCalendars();
      state = AsyncValue.data(List.unmodifiable(_offlineCalendars));
      return;
    }

    state = const AsyncValue.loading();
    final result = await CalendarApi.getCalendars();
    await result.when(
      success: (calendars) async {
        await OfflineCacheService.saveCalendars(calendars);
        state = AsyncValue.data(calendars);
      },
      failure: (message, exception) async {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }
}

@riverpod
class VisibleCalendars extends _$VisibleCalendars {
  @override
  Future<Set<String>> build() async {
    final saved = await OfflineCacheService.loadVisibleCalendars();
    final calendars = await ref.watch(calendarListProvider.future);

    if (calendars.isEmpty) {
      return saved;
    }

    final primaryId = calendars
        .firstWhere(
          (calendar) => calendar.isPrimary,
          orElse: () => calendars.first,
        )
        .id;

    final knownIds = calendars.map((calendar) => calendar.id).toSet();
    final sanitized = saved.where(knownIds.contains).toSet()..add(primaryId);

    if (sanitized.length != saved.length) {
      // Persist sanitized defaults to keep storage consistent.
      await OfflineCacheService.saveVisibleCalendars(sanitized);
    }

    return sanitized;
  }

  Future<void> toggleCalendar(String calendarId) async {
    final calendars = await ref.read(calendarListProvider.future);
    final current = state.value ?? await future;

    if (calendars.isEmpty) return;

    final primaryId = calendars
        .firstWhere(
          (calendar) => calendar.isPrimary,
          orElse: () => calendars.first,
        )
        .id;

    if (calendarId == primaryId) {
      // Primary calendar must remain visible.
      return;
    }

    final mutable = current.toSet();
    if (mutable.contains(calendarId)) {
      mutable.remove(calendarId);
    } else {
      mutable.add(calendarId);
    }
    mutable.add(primaryId);

    state = AsyncValue.data(mutable);
    await OfflineCacheService.saveVisibleCalendars(mutable);
  }

  Future<void> setAllSecondaryVisible(bool visible) async {
    final calendars = await ref.read(calendarListProvider.future);
    if (calendars.isEmpty) return;

    final current = state.value ?? await future;
    final next = current.toSet();

    for (final calendar in calendars) {
      if (calendar.isPrimary) {
        next.add(calendar.id);
        continue;
      }

      if (visible) {
        next.add(calendar.id);
      } else {
        next.remove(calendar.id);
      }
    }

    state = AsyncValue.data(next);
    await OfflineCacheService.saveVisibleCalendars(next);
  }
}

@riverpod
List<UserCalendar> activeCalendars(Ref ref) {
  final calendarsAsync = ref.watch(calendarListProvider);
  final visibleAsync = ref.watch(visibleCalendarsProvider);

  final calendars = calendarsAsync.maybeWhen(
    data: (value) => value,
    orElse: () => const <UserCalendar>[],
  );

  final visibleIds = visibleAsync.maybeWhen(
    data: (value) => value,
    orElse: () => const <String>{},
  );

  if (calendars.isEmpty || visibleIds.isEmpty) {
    return const [];
  }

  return calendars
      .where((calendar) => visibleIds.contains(calendar.id))
      .toList(growable: false);
}

@riverpod
List<UserCalendar> secondaryCalendars(Ref ref) {
  final calendars = ref.watch(calendarListProvider).maybeWhen(
        data: (value) => value,
        orElse: () => const <UserCalendar>[],
      );

  return calendars.where((calendar) => !calendar.isPrimary).toList();
}
