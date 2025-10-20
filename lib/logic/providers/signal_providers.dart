import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'dart:developer' as developer;

import '../../domain/availability_signal.dart';
import '../../domain/signal_share.dart';
import '../../domain/enums.dart';
import '../../core/supabase_client.dart';
import '../services/api_service.dart';
import '../services/dev_data_service.dart';
import '../services/signals_service.dart';

part 'signal_providers.g.dart';

/// Provider for the user's active availability signals
///
/// Returns all signals created by the current user.
/// In production, this would fetch from Supabase.
@riverpod
class ActiveSignals extends _$ActiveSignals {
  List<AvailabilitySignal> _signals = const [];

  @override
  Future<List<AvailabilitySignal>> build() async {
    await Future<void>.microtask(() {});

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await SignalApi.getSignalsForCurrentUser();
      _signals = await result.when(
        success: (signals) => signals,
        failure: (message, exception) {
          // Fallback to local dev data if the remote request fails.
          developer.log(
            'Falling back to local signal data: $message',
            name: 'ActiveSignals',
            error: exception,
          );
          return _loadMockSignals();
        },
      );
    } else {
      _signals = _loadMockSignals();
    }

    return _activeSignals();
  }

  List<AvailabilitySignal> _activeSignals() {
    return _signals
        .where((signal) => SignalsService.isSignalActive(signal))
        .toList();
  }

  List<AvailabilitySignal> _loadMockSignals() {
    return DevDataService.getMockSignals()
        .where((signal) => signal.userId == DevDataService.currentUserId)
        .toList();
  }

  /// Create a new availability signal
  Future<AvailabilitySignal> createSignal({
    required SignalType type,
    required SignalDuration duration,
    String? message,
    DateTime? startTime,
    DateTime? customEndTime,
    bool keepAlive = false,
  }) async {
    try {
      final ownerId =
          SupabaseService.currentUser?.id ?? DevDataService.currentUserId;
      final generatedSignal = SignalsService.createSignal(
        ownerId,
        type,
        duration,
        message,
        customEndTime: customEndTime,
        startTime: startTime,
        keepAlive: keepAlive,
      );
      AvailabilitySignal effectiveSignal = generatedSignal;

      if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
        final result = await SignalApi.createSignal(generatedSignal);
        effectiveSignal = await result.when(
          success: (remote) => remote,
          failure: (message, exception) {
            developer.log(
              'Failed to create signal remotely: $message',
              name: 'ActiveSignals',
              error: exception,
            );
            return generatedSignal;
          },
        );
      }

      _signals = [..._signals, effectiveSignal];
      state = AsyncValue.data(_activeSignals());
      return effectiveSignal;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  /// Update an existing signal
  Future<void> updateSignal(
    AvailabilitySignal signal, {
    SignalType? type,
    String? message,
  }) async {
    try {
      final index = _signals.indexWhere((s) => s.id == signal.id);
      if (index == -1) {
        return;
      }
      final localUpdated = SignalsService.updateSignal(
        _signals[index],
        type: type,
        message: message,
      );

      AvailabilitySignal effectiveSignal = localUpdated;

      if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
        final result = await SignalApi.updateSignal(localUpdated);
        effectiveSignal = await result.when(
          success: (remote) => remote,
          failure: (message, exception) {
            developer.log(
              'Failed to update signal remotely: $message',
              name: 'ActiveSignals',
              error: exception,
            );
            return localUpdated;
          },
        );
      }

      _signals[index] = effectiveSignal;
      state = AsyncValue.data(_activeSignals());
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Cancel/delete a signal
  Future<void> cancelSignal(AvailabilitySignal signal) async {
    try {
      final index = _signals.indexWhere((s) => s.id == signal.id);
      if (index == -1) {
        return;
      }
      final cancelled = SignalsService.cancelSignal(_signals[index]);

      if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
        final result = await SignalApi.cancelSignal(signal.id);
        await result.when(
          success: (_) {},
          failure: (message, exception) {
            developer.log(
              'Failed to cancel signal remotely: $message',
              name: 'ActiveSignals',
              error: exception,
            );
            return null;
          },
        );
      }

      _signals[index] = cancelled;
      state = AsyncValue.data(_activeSignals());
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> trimSignalForEvent(
    AvailabilitySignal signal,
    DateTime eventStart,
    DateTime eventEnd,
    Duration buffer,
  ) async {
    final index = _signals.indexWhere((s) => s.id == signal.id);
    if (index == -1) {
      return;
    }

    final bufferedStart = eventStart.subtract(buffer);
    final bufferedEnd = eventEnd.add(buffer);
    var current = _signals[index];

    bool startsBeforeOverlap = current.startTime.isBefore(bufferedStart);
    bool endsAfterOverlap = current.endTime.isAfter(bufferedEnd);

    AvailabilitySignal? updated;

    if (!startsBeforeOverlap && !endsAfterOverlap) {
      // Signal entirely within the buffered window -> remove
      _signals.removeAt(index);
    } else if (startsBeforeOverlap && !endsAfterOverlap) {
      final newEnd = bufferedStart.isAfter(current.startTime)
          ? bufferedStart
          : current.startTime;
      if (newEnd.isAfter(current.startTime)) {
        updated = current.copyWith(endTime: newEnd);
      } else {
        _signals.removeAt(index);
      }
    } else if (!startsBeforeOverlap && endsAfterOverlap) {
      final newStart =
          bufferedEnd.isBefore(current.endTime) ? bufferedEnd : current.endTime;
      if (current.endTime.isAfter(newStart)) {
        updated = current.copyWith(startTime: newStart);
      } else {
        _signals.removeAt(index);
      }
    } else {
      // Signal spans across the buffered range. Trim the beginning to after the event.
      final newStart = bufferedEnd;
      if (current.endTime.isAfter(newStart)) {
        updated = current.copyWith(startTime: newStart);
      } else {
        _signals.removeAt(index);
      }
    }

    if (updated != null) {
      _signals[index] = updated;
    }

    state = AsyncValue.data(_activeSignals());
  }

  /// Refresh signals
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await Future<void>.microtask(() {});

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await SignalApi.getSignalsForCurrentUser();
      _signals = await result.when(
        success: (signals) => signals,
        failure: (message, exception) {
          developer.log(
            'Falling back to local signal data during refresh: $message',
            name: 'ActiveSignals',
            error: exception,
          );
          return _loadMockSignals();
        },
      );
    } else {
      _signals = _loadMockSignals();
    }

    state = AsyncValue.data(_activeSignals());
  }
}

/// Provider for signals shared with the current user
///
/// Returns all signals that other users have shared with the current user.
@riverpod
class SignalsSharedWithMe extends _$SignalsSharedWithMe {
  @override
  Future<List<AvailabilitySignal>> build() async {
    final shares = await ref.watch(signalSharesProvider.future);
    final currentUserId =
        SupabaseService.currentUser?.id ?? DevDataService.currentUserId;

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final relevantShares = shares
          .where((share) => share.sharedWithUserId == currentUserId)
          .toList(growable: false);

      if (relevantShares.isEmpty) {
        return const [];
      }

      final signalIds =
          relevantShares.map((share) => share.signalId).toSet().toList();
      final signalsResult = await SignalApi.getSignalsByIds(signalIds);
      final signals = signalsResult.when(
        success: (value) => value,
        failure: (message, exception) {
          developer.log(
            'Falling back to local signals for shared-with-me: $message',
            name: 'SignalsSharedWithMe',
            error: exception,
          );
          return DevDataService.getMockSignals();
        },
      );

      return SignalsService.getSignalsSharedWithUser(
        currentUserId,
        signals,
        shares,
      );
    }

    final allSignals = DevDataService.getMockSignals();
    return SignalsService.getSignalsSharedWithUser(
      currentUserId,
      allSignals,
      shares,
    );
  }

  /// Refresh shared signals
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Provider for signal sharing relationships
///
/// Returns all signal shares (who can see which signals).
@riverpod
class SignalShares extends _$SignalShares {
  List<SignalShare> _shares = const [];

  @override
  Future<List<SignalShare>> build() async {
    await Future<void>.microtask(() {});

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await SignalApi.getSignalSharesForUser();
      _shares = await result.when(
        success: (shares) => shares,
        failure: (message, exception) {
          developer.log(
            'Falling back to local signal shares: $message',
            name: 'SignalShares',
            error: exception,
          );
          return DevDataService.getMockSignalShares();
        },
      );
    } else {
      _shares = DevDataService.getMockSignalShares();
    }

    return List.unmodifiable(_shares);
  }

  /// Share a signal with a partner
  Future<void> shareSignal({
    required String signalId,
    required String partnerId,
  }) async {
    state = const AsyncValue.loading();

    try {
      if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
        final result = await SignalApi.shareSignalWithPartners(
          signalId: signalId,
          partnerIds: [partnerId],
        );
        await result.when(
          success: (_) async {},
          failure: (message, exception) async {
            developer.log(
              'Failed to share signal remotely: $message',
              name: 'SignalShares',
              error: exception,
            );
          },
        );
      }

      final currentUserId =
          SupabaseService.currentUser?.id ?? DevDataService.currentUserId;
      final share = SignalsService.shareSignalWithUser(
        signalId,
        partnerId,
        currentUserId,
      );
      _shares = [..._shares, share];
      state = AsyncValue.data(List.unmodifiable(_shares));
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Share a signal with multiple partners
  Future<void> shareSignalWithPartners({
    required String signalId,
    required List<String> partnerIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
  }) async {
    try {
      if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
        final result = await SignalApi.shareSignalWithPartners(
          signalId: signalId,
          partnerIds: partnerIds,
          notifyMap: notifyMap,
          autoAcceptMap: autoAcceptMap,
        );
        await result.when(
          success: (_) {},
          failure: (message, exception) {
            developer.log(
              'Failed to share signal remotely: $message',
              name: 'SignalShares',
              error: exception,
            );
            return null;
          },
        );
      }

      final currentUserId =
          SupabaseService.currentUser?.id ?? DevDataService.currentUserId;

      final newShares = SignalsService.shareSignalWithPartners(
        signalId,
        partnerIds,
        currentUserId,
        notifyMap: notifyMap,
        autoAcceptMap: autoAcceptMap,
      );
      _shares = [..._shares, ...newShares];
      state = AsyncValue.data(List.unmodifiable(_shares));
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Revoke signal sharing
  Future<void> revokeShare(String shareId) async {
    _shares = _shares.where((share) => share.id != shareId).toList();
    state = AsyncValue.data(List.unmodifiable(_shares));
  }

  /// Refresh signal shares
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await Future<void>.microtask(() {});

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await SignalApi.getSignalSharesForUser();
      _shares = await result.when(
        success: (shares) => shares,
        failure: (message, exception) {
          developer.log(
            'Falling back to local signal shares during refresh: $message',
            name: 'SignalShares',
            error: exception,
          );
          return DevDataService.getMockSignalShares();
        },
      );
    } else {
      _shares = DevDataService.getMockSignalShares();
    }

    state = AsyncValue.data(List.unmodifiable(_shares));
  }
}

/// Provider for all signals visible to the current user (own + shared)
@riverpod
Future<List<AvailabilitySignal>> allVisibleSignals(Ref ref) async {
  await Future<void>.microtask(() {});
  final currentUserId =
      SupabaseService.currentUser?.id ?? DevDataService.currentUserId;

  if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
    final activeSignals = await ref.watch(activeSignalsProvider.future);
    final sharedSignals = await ref.watch(signalsSharedWithMeProvider.future);
    final combined = <AvailabilitySignal>{
      ...activeSignals,
      ...sharedSignals,
    };
    return combined.toList(growable: false);
  }

  final allSignals = DevDataService.getMockSignals();
  final allShares = DevDataService.getMockSignalShares();

  return SignalsService.getActiveSignalsForUser(
    currentUserId,
    allSignals,
    allShares,
  );
}

/// Provider for signals shared with a specific partner
@riverpod
List<AvailabilitySignal> signalsSharedWithPartner(
  Ref ref,
  String partnerId,
) {
  final shares = ref.watch(signalSharesProvider);
  final signals = ref.watch(activeSignalsProvider);

  return shares.when(
    data: (shareList) {
      return signals.when(
        data: (signalList) {
          // Get signal IDs shared with this partner
          final sharedSignalIds = shareList
              .where((share) => share.sharedWithUserId == partnerId)
              .map((share) => share.signalId)
              .toSet();

          // Return signals that are shared with this partner
          return signalList
              .where((signal) => sharedSignalIds.contains(signal.id))
              .toList();
        },
        loading: () => [],
        error: (_, __) => [],
      );
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for partners who can see a specific signal
@riverpod
List<String> partnersWithAccessToSignal(
  Ref ref,
  String signalId,
) {
  final shares = ref.watch(signalSharesProvider);

  return shares.when(
    data: (shareList) {
      return shareList
          .where((share) => share.signalId == signalId)
          .map((share) => share.sharedWithUserId)
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for active signals count
@riverpod
int activeSignalsCount(Ref ref) {
  final signals = ref.watch(activeSignalsProvider);

  return signals.when(
    data: (signalList) => signalList.length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provider for signals shared with me count
@riverpod
int sharedSignalsCount(Ref ref) {
  final signals = ref.watch(signalsSharedWithMeProvider);

  return signals.when(
    data: (signalList) => signalList.length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provider for a specific signal by ID
@riverpod
AvailabilitySignal? signalById(Ref ref, String signalId) {
  final signals = ref.watch(activeSignalsProvider);

  return signals.when(
    data: (signalList) {
      try {
        return signalList.firstWhere((s) => s.id == signalId);
      } catch (e) {
        return null;
      }
    },
    loading: () => null,
    error: (_, __) => null,
  );
}

/// Provider for checking if a signal is currently active
@riverpod
bool isSignalActive(Ref ref, String signalId) {
  final signal = ref.watch(signalByIdProvider(signalId));
  if (signal == null) return false;

  return SignalsService.isSignalActive(signal);
}

/// Provider for signal time remaining
@riverpod
Duration? signalTimeRemaining(Ref ref, String signalId) {
  final signal = ref.watch(signalByIdProvider(signalId));
  if (signal == null) return null;

  return SignalsService.getSignalTimeRemaining(signal);
}
