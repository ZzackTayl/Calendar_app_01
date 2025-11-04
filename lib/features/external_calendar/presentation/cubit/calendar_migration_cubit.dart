import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/domain/calendar_migration.dart';
import 'package:myorbit_calendar/features/external_calendar/domain/usecases/import_external_events.dart';

part 'calendar_migration_state.dart';

/// Result of an import operation
class ImportResult {
  final int importedCount;
  final int totalCount;

  const ImportResult({
    required this.importedCount,
    required this.totalCount,
  });
}

/// Cubit for managing calendar migration/import following MyOrbit_CleanArch pattern
class CalendarMigrationCubit extends Cubit<CalendarMigrationState> {
  CalendarMigrationCubit({
    required ImportExternalCalendarEvents importGoogleEvents,
    required ImportExternalCalendarEvents importAppleEvents,
  })  : _importGoogleEvents = importGoogleEvents,
        _importAppleEvents = importAppleEvents,
        super(const CalendarMigrationState());

  final ImportExternalCalendarEvents _importGoogleEvents;
  final ImportExternalCalendarEvents _importAppleEvents;

  /// Import events from Google Calendar
  Future<void> importFromGoogle({
    bool includePastEvents = false,
  }) async {
    emit(state.copyWith(
      status: AppStateStatus.loading,
      migrationStatus: MigrationStatus.authenticating,
      message: 'Connecting to Google Calendar...',
    ));

    final result = await _importGoogleEvents(
      includePastEvents: includePastEvents,
    );

    result.when(
      success: (events) {
        developer.log(
          'Successfully imported ${events.length} events from Google Calendar',
          name: 'CalendarMigrationCubit',
        );

        // Create migration history entry
        final migration = CalendarMigrationRecord(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          source: 'Google Calendar',
          includePastEvents: includePastEvents,
          includeSharedCalendars: false,
          mergeDuplicates: false,
          notifyPartners: false,
          status: CalendarMigrationStatus.completed,
          createdAt: DateTime.now(),
          completedAt: DateTime.now(),
        );

        final updatedHistory = [migration, ...state.migrationHistory];

        emit(state.copyWith(
          status: AppStateStatus.success,
          migrationStatus: MigrationStatus.success,
          message: 'Successfully imported ${events.length} events',
          importedCount: events.length,
          totalCount: events.length,
          migrationHistory: updatedHistory,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to import from Google Calendar: $message',
          name: 'CalendarMigrationCubit',
        );

        emit(state.copyWith(
          status: AppStateStatus.failure,
          migrationStatus: MigrationStatus.error,
          message: message,
        ));
      },
    );
  }

  /// Import events from Apple Calendar
  Future<void> importFromApple({
    bool includePastEvents = false,
  }) async {
    emit(state.copyWith(
      status: AppStateStatus.loading,
      migrationStatus: MigrationStatus.authenticating,
      message: 'Connecting to Apple Calendar...',
    ));

    final result = await _importAppleEvents(
      includePastEvents: includePastEvents,
    );

    result.when(
      success: (events) {
        developer.log(
          'Successfully imported ${events.length} events from Apple Calendar',
          name: 'CalendarMigrationCubit',
        );

        // Create migration history entry
        final migration = CalendarMigrationRecord(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          source: 'Apple Calendar',
          includePastEvents: includePastEvents,
          includeSharedCalendars: false,
          mergeDuplicates: false,
          notifyPartners: false,
          status: CalendarMigrationStatus.completed,
          createdAt: DateTime.now(),
          completedAt: DateTime.now(),
        );

        final updatedHistory = [migration, ...state.migrationHistory];

        emit(state.copyWith(
          status: AppStateStatus.success,
          migrationStatus: MigrationStatus.success,
          message: 'Successfully imported ${events.length} events',
          importedCount: events.length,
          totalCount: events.length,
          migrationHistory: updatedHistory,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to import from Apple Calendar: $message',
          name: 'CalendarMigrationCubit',
        );

        emit(state.copyWith(
          status: AppStateStatus.failure,
          migrationStatus: MigrationStatus.error,
          message: message,
        ));
      },
    );
  }

  /// Load migration history
  Future<void> loadMigrationHistory() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    // TODO: Implement when migration history repository method is added
    // For now, just use the current state's history
    emit(state.copyWith(
      status: AppStateStatus.success,
      message: '',
    ));
  }

  /// Reset migration state
  void reset() {
    emit(const CalendarMigrationState());
  }
}
