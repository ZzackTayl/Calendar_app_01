import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../logic/services/api_service.dart';

part 'calendar_sharing_provider.g.dart';

@riverpod
class CalendarSharingController extends _$CalendarSharingController {
  @override
  AsyncValue<void> build() {
    return const AsyncValue.data(null);
  }

  Future<Result<void>> sendShareInvites({
    required List<String> contactIds,
    required String permission,
    required bool canViewDetails,
    required bool canEditEvents,
    required bool shareAvailability,
    String? message,
  }) async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return const Failure<void>(
        'Connect Supabase and sign in before sharing your calendar.',
      );
    }

    if (contactIds.isEmpty) {
      return const Failure<void>('Select at least one contact to share with.');
    }

    state = const AsyncValue.loading();

    final result = await CalendarSharingApi.sendCalendarShareInvites(
      contactIds: contactIds,
      permission: permission,
      canViewDetails: canViewDetails,
      canEditEvents: canEditEvents,
      shareAvailability: shareAvailability,
      message: message,
    );

    return result.when(
      success: (_) {
        state = const AsyncValue.data(null);
        return const Success(null);
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
        return Failure<void>(message, exception);
      },
    );
  }
}
