import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/supabase_client.dart';
import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';
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
    final localSaved = await OfflineCacheService.loadVisibleCalendars();
    final calendars = await ref.watch(calendarListProvider.future);

    if (calendars.isEmpty) {
      return localSaved;
    }

    final sanitizedLocal = _sanitizeVisibleSet(localSaved, calendars);

    if (!_shouldSync) {
      await OfflineCacheService.saveVisibleCalendars(sanitizedLocal);
      return sanitizedLocal;
    }

    final remoteResult = await CalendarApi.getVisibleCalendars();
    return await remoteResult.when(
      success: (remote) async {
        final merged = {...sanitizedLocal, ...remote};
        final finalSet = _sanitizeVisibleSet(merged, calendars);
        await OfflineCacheService.saveVisibleCalendars(finalSet);
        if (!setEquals(remote, finalSet)) {
          final syncResult = await CalendarApi.setVisibleCalendars(finalSet);
          syncResult.when(
            success: (_) {},
            failure: (message, exception) {
              developer.log(
                'Failed to synchronize calendar visibility: $message',
                name: 'VisibleCalendars',
                error: exception,
              );
            },
          );
        }
        return finalSet;
      },
      failure: (message, exception) async {
        developer.log(
          'Falling back to local calendar visibility: $message',
          name: 'VisibleCalendars',
          error: exception,
        );
        await OfflineCacheService.saveVisibleCalendars(sanitizedLocal);
        return sanitizedLocal;
      },
    );
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

    final sanitized = _sanitizeVisibleSet(mutable, calendars);
    state = AsyncValue.data(sanitized);
    await OfflineCacheService.saveVisibleCalendars(sanitized);
    await _syncRemoteIfNeeded(sanitized);
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

    final sanitized = _sanitizeVisibleSet(next, calendars);
    state = AsyncValue.data(sanitized);
    await OfflineCacheService.saveVisibleCalendars(sanitized);
    await _syncRemoteIfNeeded(sanitized);
  }

  bool get _shouldSync =>
      SupabaseService.isConfigured && SupabaseService.isAuthenticated;

  Future<void> _syncRemoteIfNeeded(Set<String> ids) async {
    if (!_shouldSync) return;
    final result = await CalendarApi.setVisibleCalendars(ids);
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log(
          'Failed to persist calendar visibility: $message',
          name: 'VisibleCalendars',
          error: exception,
        );
      },
    );
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

Set<String> _sanitizeVisibleSet(
  Iterable<String> candidate,
  List<UserCalendar> calendars,
) {
  final knownIds = calendars.map((calendar) => calendar.id).toSet();
  final primaryId = calendars
      .firstWhere(
        (calendar) => calendar.isPrimary,
        orElse: () => calendars.first,
      )
      .id;

  final sanitized = candidate.where(knownIds.contains).toSet();
  sanitized.add(primaryId);
  return sanitized;
}
