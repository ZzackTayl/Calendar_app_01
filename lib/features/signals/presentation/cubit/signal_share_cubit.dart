import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../core/firebase_app_services.dart';
import '../../../../domain/availability_signal.dart';
import '../../../../domain/signal_share.dart';
import '../../domain/repositories/signal_repository.dart';
import '../../domain/repositories/signal_share_repository.dart';

/// State for SignalShareCubit
class SignalShareState {
  final AppStateStatus status;
  final List<SignalShare> shares;
  final List<AvailabilitySignal> sharedWithMeSignals;
  final String message;

  const SignalShareState({
    this.status = AppStateStatus.initial,
    this.shares = const [],
    this.sharedWithMeSignals = const [],
    this.message = '',
  });

  SignalShareState copyWith({
    AppStateStatus? status,
    List<SignalShare>? shares,
    List<AvailabilitySignal>? sharedWithMeSignals,
    String? message,
  }) {
    return SignalShareState(
      status: status ?? this.status,
      shares: shares ?? this.shares,
      sharedWithMeSignals: sharedWithMeSignals ?? this.sharedWithMeSignals,
      message: message ?? this.message,
    );
  }

  /// Get shares for a specific signal
  List<SignalShare> getSharesForSignal(String signalId) {
    return shares.where((share) => share.signalId == signalId).toList();
  }

  /// Get users who have access to a signal
  List<String> getUsersWithAccess(String signalId) {
    return shares
        .where((share) => share.signalId == signalId)
        .map((share) => share.sharedWithUserId)
        .toList();
  }
}

/// Cubit for managing signal sharing
class SignalShareCubit extends Cubit<SignalShareState> {
  final SignalShareRepository shareRepository;
  final SignalRepository signalRepository;

  SignalShareCubit({
    required this.shareRepository,
    required this.signalRepository,
  }) : super(const SignalShareState());

  /// Load all signal shares
  Future<void> loadShares() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await shareRepository.getSignalShares();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (shares) => emit(state.copyWith(
        status: AppStateStatus.success,
        shares: shares,
        message: '',
      )),
    );
  }

  /// Load signals shared with me
  Future<void> loadSignalsSharedWithMe() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    // First get all shares
    final sharesResult = await shareRepository.getSignalShares();

    await sharesResult.fold(
      (failure) async => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (shares) async {
        // Get signal IDs that are shared with me
        final currentUserId = FirebaseAppServices.currentUser?.uid;
        if (currentUserId == null) {
          emit(state.copyWith(
            status: AppStateStatus.failure,
            message: 'User not authenticated',
          ));
          return;
        }

        final myShares = shares
            .where((share) => share.sharedWithUserId == currentUserId)
            .toList();
        final signalIds = myShares.map((share) => share.signalId).toSet().toList();

        if (signalIds.isEmpty) {
          emit(state.copyWith(
            status: AppStateStatus.success,
            shares: myShares,
            sharedWithMeSignals: [],
          ));
          return;
        }

        // Load the actual signals
        final signalsResult = await signalRepository.getSignalsByIds(signalIds);

        signalsResult.fold(
          (failure) => emit(state.copyWith(
            status: AppStateStatus.failure,
            message: failure.message,
          )),
          (signals) => emit(state.copyWith(
            status: AppStateStatus.success,
            shares: shares,
            sharedWithMeSignals: signals,
          )),
        );
      },
    );
  }

  /// Share a signal with a user
  Future<void> shareSignal({
    required String signalId,
    required String sharedWithUserId,
    bool notify = true,
    bool autoAccept = false,
  }) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await shareRepository.shareSignal(
      signalId: signalId,
      sharedWithUserId: sharedWithUserId,
      notify: notify,
      autoAccept: autoAccept,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (share) {
        final updatedShares = [...state.shares, share];
        emit(state.copyWith(
          status: AppStateStatus.success,
          shares: updatedShares,
          message: 'Signal shared successfully',
        ));
      },
    );
  }

  /// Share a signal with multiple users
  Future<void> shareSignalWithMultiple({
    required String signalId,
    required List<String> sharedWithUserIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
  }) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await shareRepository.shareSignalWithMultiple(
      signalId: signalId,
      sharedWithUserIds: sharedWithUserIds,
      notifyMap: notifyMap,
      autoAcceptMap: autoAcceptMap,
    );

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (newShares) {
        final updatedShares = [...state.shares, ...newShares];
        emit(state.copyWith(
          status: AppStateStatus.success,
          shares: updatedShares,
          message: 'Signal shared with ${newShares.length} users',
        ));
      },
    );
  }

  /// Revoke signal sharing
  Future<void> revokeShare(String shareId) async {
    // Optimistic delete
    final optimisticShares = state.shares.where((s) => s.id != shareId).toList();
    emit(state.copyWith(shares: optimisticShares));

    final result = await shareRepository.revokeShare(shareId);

    result.fold(
      (failure) {
        // Revert on failure
        loadShares();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'Share revoked successfully',
      )),
    );
  }

  /// Get shares for a specific signal
  Future<void> loadSharesForSignal(String signalId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await shareRepository.getSharesForSignal(signalId);

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (shares) => emit(state.copyWith(
        status: AppStateStatus.success,
        shares: shares,
        message: '',
      )),
    );
  }
}
