import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/availability_signal.dart';
import '../../domain/signal_share.dart';
import '../../domain/enums.dart';
import '../services/dev_data_service.dart';
import '../services/signals_service.dart';

part 'signal_providers.g.dart';

/// Provider for the user's active availability signals
/// 
/// Returns all signals created by the current user.
/// In production, this would fetch from Supabase.
@riverpod
class ActiveSignals extends _$ActiveSignals {
  @override
  Future<List<AvailabilitySignal>> build() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 300));
    
    // Get all signals and filter for current user's active signals
    final allSignals = DevDataService.getMockSignals();
    return SignalsService.getActiveSignals(
      DevDataService.currentUserId,
      allSignals,
    );
  }

  /// Create a new availability signal
  Future<void> createSignal({
    required SignalType type,
    required SignalDuration duration,
    String? message,
    DateTime? customEndTime,
  }) async {
    state = const AsyncValue.loading();
    
    try {
      // Create the signal
      SignalsService.createSignal(
        DevDataService.currentUserId,
        type,
        duration,
        message,
        customEndTime: customEndTime,
      );
      
      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Update an existing signal
  Future<void> updateSignal(
    AvailabilitySignal signal, {
    SignalType? type,
    String? message,
  }) async {
    state = const AsyncValue.loading();
    
    try {
      // Update the signal
      SignalsService.updateSignal(
        signal,
        type: type,
        message: message,
      );
      
      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Cancel/delete a signal
  Future<void> cancelSignal(AvailabilitySignal signal) async {
    state = const AsyncValue.loading();
    
    try {
      // Cancel the signal (sets end time to now)
      SignalsService.cancelSignal(signal);
      
      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Refresh signals
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Provider for signals shared with the current user
/// 
/// Returns all signals that other users have shared with the current user.
@riverpod
class SignalsSharedWithMe extends _$SignalsSharedWithMe {
  @override
  Future<List<AvailabilitySignal>> build() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 300));
    
    final allSignals = DevDataService.getMockSignals();
    final allShares = DevDataService.getMockSignalShares();
    
    return SignalsService.getSignalsSharedWithUser(
      DevDataService.currentUserId,
      allSignals,
      allShares,
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
  @override
  Future<List<SignalShare>> build() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 300));
    
    return DevDataService.getMockSignalShares();
  }

  /// Share a signal with a partner
  Future<void> shareSignal({
    required String signalId,
    required String partnerId,
  }) async {
    state = const AsyncValue.loading();
    
    try {
      // Create the share
      SignalsService.shareSignalWithUser(
        signalId,
        partnerId,
        DevDataService.currentUserId,
      );
      
      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Share a signal with multiple partners
  Future<void> shareSignalWithPartners({
    required String signalId,
    required List<String> partnerIds,
  }) async {
    state = const AsyncValue.loading();
    
    try {
      // Create the shares
      SignalsService.shareSignalWithPartners(
        signalId,
        partnerIds,
        DevDataService.currentUserId,
      );
      
      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Revoke signal sharing
  Future<void> revokeShare(String shareId) async {
    state = const AsyncValue.loading();
    
    try {
      // In production, delete from database here
      await Future.delayed(const Duration(milliseconds: 500));
      
      // Refresh the list
      ref.invalidateSelf();
      await future;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Refresh signal shares
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Provider for all signals visible to the current user (own + shared)
@riverpod
Future<List<AvailabilitySignal>> allVisibleSignals(Ref ref) async {
  await Future.delayed(const Duration(milliseconds: 300));
  
  final allSignals = DevDataService.getMockSignals();
  final allShares = DevDataService.getMockSignalShares();
  
  return SignalsService.getActiveSignalsForUser(
    DevDataService.currentUserId,
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