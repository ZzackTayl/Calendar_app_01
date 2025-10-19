import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../domain/calendar_migration.dart';
import '../services/api_service.dart';

part 'calendar_migration_provider.g.dart';

class CalendarMigrationUnavailableException implements Exception {
  const CalendarMigrationUnavailableException(this.message);
  final String message;

  @override
  String toString() => message;
}

@riverpod
class CalendarMigrationController extends _$CalendarMigrationController {
  @override
  Future<List<CalendarMigrationRecord>> build() async {
    return _loadHistory();
  }

  Future<List<CalendarMigrationRecord>> _loadHistory() async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      throw const CalendarMigrationUnavailableException(
        'Connect Supabase and sign in to import calendars.',
      );
    }

    final historyResult = await CalendarMigrationApi.getMigrationHistory();
    return historyResult.when(
      success: (rows) => rows.map(CalendarMigrationRecord.fromJson).toList(),
      failure: (message, exception) {
        throw Exception(message);
      },
    );
  }

  Future<Result<void>> startMigration({
    required String source,
    required bool includePastEvents,
    required bool includeSharedCalendars,
    required bool mergeDuplicates,
    required bool notifyPartners,
  }) async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return const Failure<void>(
        'Connect Supabase and sign in before importing calendars.',
      );
    }

    final startResult = await CalendarMigrationApi.startCalendarMigration(
      source: source,
      includePastEvents: includePastEvents,
      includeSharedCalendars: includeSharedCalendars,
      mergeDuplicates: mergeDuplicates,
      notifyPartners: notifyPartners,
    );

    return await startResult.when(
      success: (_) async {
        state = const AsyncValue.loading();
        state = await AsyncValue.guard(_loadHistory);
        return const Success(null);
      },
      failure: (message, exception) async {
        return Failure<void>(message, exception);
      },
    );
  }

  Future<void> refresh() async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      state = AsyncValue.error(
        const CalendarMigrationUnavailableException(
          'Connect Supabase and sign in to import calendars.',
        ),
        StackTrace.current,
      );
      return;
    }

    state = const AsyncValue.loading();
    state = await AsyncValue.guard(_loadHistory);
  }
}
