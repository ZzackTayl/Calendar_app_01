import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/apple_calendar_sync_service.dart';
// No direct API imports needed; AppleCalendarSyncService persists results

part 'apple_calendar_provider.g.dart';

/// Provider for Apple Calendar import status
@riverpod
class AppleCalendarImport extends _$AppleCalendarImport {
  @override
  AppleCalendarImportState build() {
    return const AppleCalendarImportState();
  }

  /// Start importing events from Apple Calendar
  Future<void> importEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    state = state.copyWith(
      status: AppleCalendarImportStatus.importing,
      error: null,
    );

    final result = await AppleCalendarSyncService.importAppleCalendarEvents(
      includePastEvents: includePastEvents,
      specificCalendarId: specificCalendarId,
    );

    await result.when(
      success: (events) async {
        // Events returned are already persisted by the import service
        state = state.copyWith(
          status: AppleCalendarImportStatus.success,
          importedCount: events.length,
        );
      },
      failure: (message, exception) {
        state = state.copyWith(
          status: AppleCalendarImportStatus.error,
          error: message,
        );
      },
    );
  }

  /// Reset import state
  void reset() {
    state = const AppleCalendarImportState();
  }
}

/// State for Apple Calendar import
class AppleCalendarImportState {
  final AppleCalendarImportStatus status;
  final int importedCount;
  final String? error;

  const AppleCalendarImportState({
    this.status = AppleCalendarImportStatus.idle,
    this.importedCount = 0,
    this.error,
  });

  AppleCalendarImportState copyWith({
    AppleCalendarImportStatus? status,
    int? importedCount,
    String? error,
  }) {
    return AppleCalendarImportState(
      status: status ?? this.status,
      importedCount: importedCount ?? this.importedCount,
      error: error,
    );
  }
}

enum AppleCalendarImportStatus {
  idle,
  importing,
  success,
  error,
}

/// Provider to get list of Apple calendars
@riverpod
Future<List<AppleCalendarInfo>> appleCalendarsList(Ref ref) async {
  final result = await AppleCalendarSyncService.getAppleCalendars();
  return result.when(
    success: (calendars) => calendars,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Provider to check if user has calendar permission
@riverpod
Future<bool> hasAppleCalendarPermission(Ref ref) async {
  return await AppleCalendarSyncService.hasCalendarPermission();
}

/// Provider to check if platform supports Apple Calendar
@riverpod
bool isAppleCalendarSupported(Ref ref) {
  return AppleCalendarSyncService.isPlatformSupported;
}
