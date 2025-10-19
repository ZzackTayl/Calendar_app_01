import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/google_calendar_sync_service.dart';
import '../../domain/event.dart';
import '../../core/result.dart';

part 'google_calendar_provider.g.dart';

/// Provider for Google Calendar import status
@riverpod
class GoogleCalendarImport extends _$GoogleCalendarImport {
  @override
  GoogleCalendarImportState build() {
    return const GoogleCalendarImportState();
  }

  /// Start importing events from Google Calendar
  Future<void> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    state = state.copyWith(
      status: GoogleCalendarImportStatus.importing,
      error: null,
    );

    final result = await GoogleCalendarSyncService.importGoogleCalendarEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    await result.when(
      success: (events) async {
        state = state.copyWith(
          status: GoogleCalendarImportStatus.success,
          importedCount: events.length,
        );
      },
      failure: (message, exception) {
        state = state.copyWith(
          status: GoogleCalendarImportStatus.error,
          error: message,
        );
      },
    );
  }

  /// Reset import state
  void reset() {
    state = const GoogleCalendarImportState();
  }
}

/// State for Google Calendar import
class GoogleCalendarImportState {
  final GoogleCalendarImportStatus status;
  final int importedCount;
  final String? error;

  const GoogleCalendarImportState({
    this.status = GoogleCalendarImportStatus.idle,
    this.importedCount = 0,
    this.error,
  });

  GoogleCalendarImportState copyWith({
    GoogleCalendarImportStatus? status,
    int? importedCount,
    String? error,
  }) {
    return GoogleCalendarImportState(
      status: status ?? this.status,
      importedCount: importedCount ?? this.importedCount,
      error: error,
    );
  }
}

enum GoogleCalendarImportStatus {
  idle,
  importing,
  success,
  error,
}

/// Provider to get list of Google calendars
@riverpod
Future<List<GoogleCalendarInfo>> googleCalendarsList(Ref ref) async {
  final result = await GoogleCalendarSyncService.getGoogleCalendars();
  return result.when(
    success: (calendars) => calendars,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Provider to check if user has calendar permission
@riverpod
Future<bool> hasGoogleCalendarPermission(Ref ref) async {
  return await GoogleCalendarSyncService.hasCalendarPermission();
}
