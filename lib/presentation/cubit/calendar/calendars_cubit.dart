import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/firebase_app_services.dart';
import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';
import '../../../logic/services/api_service.dart';
import '../../../logic/services/offline_cache_service.dart';

class CalendarsState {
  const CalendarsState({
    required this.isLoading,
    required this.calendars,
    required this.visibleCalendarIds,
    this.isSyncingVisibility = false,
    this.errorMessage,
  });

  const CalendarsState.initial()
      : isLoading = true,
        calendars = const <UserCalendar>[],
        visibleCalendarIds = const <String>{},
        isSyncingVisibility = false,
        errorMessage = null;

  final bool isLoading;
  final List<UserCalendar> calendars;
  final Set<String> visibleCalendarIds;
  final bool isSyncingVisibility;
  final String? errorMessage;

  CalendarsState copyWith({
    bool? isLoading,
    List<UserCalendar>? calendars,
    Set<String>? visibleCalendarIds,
    bool? isSyncingVisibility,
    String? errorMessage,
  }) {
    return CalendarsState(
      isLoading: isLoading ?? this.isLoading,
      calendars:
          calendars != null ? List<UserCalendar>.unmodifiable(calendars) : this.calendars,
      visibleCalendarIds: visibleCalendarIds != null
          ? Set<String>.unmodifiable(visibleCalendarIds)
          : this.visibleCalendarIds,
      isSyncingVisibility: isSyncingVisibility ?? this.isSyncingVisibility,
      errorMessage: errorMessage,
    );
  }
}

class CalendarsCubit extends Cubit<CalendarsState> {
  CalendarsCubit() : super(const CalendarsState.initial()) {
    unawaited(_loadCalendars());
  }

  bool get _useRemoteBackend => FirebaseAppServices.isConfigured;

  bool get _shouldSync =>
      FirebaseAppServices.isConfigured && FirebaseAppServices.isAuthenticated;

  Future<void> _loadCalendars({bool forceRemote = false}) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    try {
      final calendars = await _fetchCalendars(forceRemote: forceRemote);
      final visibleIds = await _loadVisibleCalendars(calendars);
      emit(
        state.copyWith(
          isLoading: false,
          calendars: calendars,
          visibleCalendarIds: visibleIds,
          errorMessage: null,
        ),
      );
    } catch (error, stackTrace) {
      developer.log(
        'Failed to load calendars: $error',
        name: 'CalendarsCubit',
        error: error,
        stackTrace: stackTrace,
      );
      final fallbackCalendars = await OfflineCacheService.loadCalendars();
      final visibleIds = await _loadVisibleCalendars(fallbackCalendars);
      emit(
        state.copyWith(
          isLoading: false,
          calendars: fallbackCalendars,
          visibleCalendarIds: visibleIds,
          errorMessage: error.toString(),
        ),
      );
    }
  }

  Future<List<UserCalendar>> _fetchCalendars({bool forceRemote = false}) async {
    if (!_useRemoteBackend) {
      final offline = await OfflineCacheService.loadCalendars();
      return List<UserCalendar>.unmodifiable(offline);
    }

    final result = await CalendarApi.getCalendars();
    return await result.when(
      success: (calendars) async {
        await OfflineCacheService.saveCalendars(calendars);
        return calendars;
      },
      failure: (message, exception) async {
        developer.log(
          'Falling back to cached calendars: $message',
          name: 'CalendarsCubit',
          error: exception,
        );
        if (forceRemote) {
          throw Exception(message);
        }
        final offline = await OfflineCacheService.loadCalendars();
        if (offline.isNotEmpty) {
          return offline;
        }
        throw Exception(message);
      },
    );
  }

  Future<Set<String>> _loadVisibleCalendars(List<UserCalendar> calendars) async {
    final localSaved = await OfflineCacheService.loadVisibleCalendars();
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
                name: 'CalendarsCubit',
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
          name: 'CalendarsCubit',
          error: exception,
        );
        await OfflineCacheService.saveVisibleCalendars(sanitizedLocal);
        return sanitizedLocal;
      },
    );
  }

  Future<void> refreshCalendars() async {
    await _loadCalendars(forceRemote: true);
  }

  Future<void> toggleCalendar(String calendarId) async {
    final calendars = state.calendars;
    if (calendars.isEmpty) return;

    final primaryId = _primaryCalendarId(calendars);
    if (calendarId == primaryId) {
      // Primary calendar must always remain visible.
      return;
    }

    final nextVisible = state.visibleCalendarIds.toSet();
    if (nextVisible.contains(calendarId)) {
      nextVisible.remove(calendarId);
    } else {
      nextVisible.add(calendarId);
    }
    nextVisible.add(primaryId);

    final sanitized = _sanitizeVisibleSet(nextVisible, calendars);
    emit(
      state.copyWith(
        visibleCalendarIds: sanitized,
        isSyncingVisibility: true,
      ),
    );

    await OfflineCacheService.saveVisibleCalendars(sanitized);
    await _syncRemoteIfNeeded(sanitized);

    emit(state.copyWith(isSyncingVisibility: false));
  }

  Future<void> setAllSecondaryVisible(bool visible) async {
    final calendars = state.calendars;
    if (calendars.isEmpty) return;

    final next = state.visibleCalendarIds.toSet();
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
    emit(
      state.copyWith(
        visibleCalendarIds: sanitized,
        isSyncingVisibility: true,
      ),
    );

    await OfflineCacheService.saveVisibleCalendars(sanitized);
    await _syncRemoteIfNeeded(sanitized);

    emit(state.copyWith(isSyncingVisibility: false));
  }

  Future<void> _syncRemoteIfNeeded(Set<String> ids) async {
    if (!_shouldSync) return;
    final result = await CalendarApi.setVisibleCalendars(ids);
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log(
          'Failed to persist calendar visibility: $message',
          name: 'CalendarsCubit',
          error: exception,
        );
      },
    );
  }

  String _primaryCalendarId(List<UserCalendar> calendars) {
    return calendars
        .firstWhere(
          (calendar) => calendar.isPrimary,
          orElse: () => calendars.first,
        )
        .id;
  }

  Set<String> _sanitizeVisibleSet(
    Iterable<String> candidate,
    List<UserCalendar> calendars,
  ) {
    if (calendars.isEmpty) {
      return candidate.toSet();
    }

    final knownIds = calendars.map((calendar) => calendar.id).toSet();
    final primaryId = _primaryCalendarId(calendars);

    final sanitized = candidate.where(knownIds.contains).toSet();
    sanitized.add(primaryId);
    return sanitized;
  }
}
