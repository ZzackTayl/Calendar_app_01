import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/availability_signal.dart';
import '../../domain/repositories/signal_repository.dart';

/// State for SignalCubit
class SignalState {
  final AppStateStatus status;
  final List<AvailabilitySignal> signals;
  final String message;
  final String? searchQuery;

  const SignalState({
    this.status = AppStateStatus.initial,
    this.signals = const [],
    this.message = '',
    this.searchQuery,
  });

  SignalState copyWith({
    AppStateStatus? status,
    List<AvailabilitySignal>? signals,
    String? message,
    String? searchQuery,
  }) {
    return SignalState(
      status: status ?? this.status,
      signals: signals ?? this.signals,
      message: message ?? this.message,
      searchQuery: searchQuery ?? this.searchQuery,
    );
  }

  /// Get filtered signals based on search query
  List<AvailabilitySignal> get filteredSignals {
    if (searchQuery == null || searchQuery!.isEmpty) {
      return signals;
    }

    final query = searchQuery!.toLowerCase();
    return signals.where((signal) {
      return signal.signalType.name.toLowerCase().contains(query) ||
          (signal.message?.toLowerCase().contains(query) ?? false);
    }).toList();
  }

  /// Get active signals (currently ongoing)
  List<AvailabilitySignal> get activeSignals {
    return signals.where((signal) => signal.isActive).toList();
  }

  /// Get future signals
  List<AvailabilitySignal> get futureSignals {
    return signals.where((signal) => signal.isFuture).toList();
  }

  /// Get expired signals
  List<AvailabilitySignal> get expiredSignals {
    return signals.where((signal) => signal.isExpired).toList();
  }
}

/// Cubit for managing availability signals
class SignalCubit extends Cubit<SignalState> {
  final SignalRepository repository;

  SignalCubit({required this.repository}) : super(const SignalState());

  /// Load all signals
  Future<void> loadSignals() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getSignals();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (signals) {
        // Sort by start time (most recent first)
        final sorted = List<AvailabilitySignal>.from(signals)
          ..sort((a, b) => b.startTime.compareTo(a.startTime));

        emit(state.copyWith(
          status: AppStateStatus.success,
          signals: sorted,
          message: '',
        ));
      },
    );
  }

  /// Load only active signals
  Future<void> loadActiveSignals() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getActiveSignals();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (signals) => emit(state.copyWith(
        status: AppStateStatus.success,
        signals: signals,
        message: '',
      )),
    );
  }

  /// Create a new signal
  Future<void> createSignal(AvailabilitySignal signal) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.createSignal(signal);

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (createdSignal) {
        final updatedSignals = [createdSignal, ...state.signals];
        emit(state.copyWith(
          status: AppStateStatus.success,
          signals: updatedSignals,
          message: 'Signal created successfully',
        ));
      },
    );
  }

  /// Update an existing signal
  Future<void> updateSignal(AvailabilitySignal signal) async {
    // Optimistic update
    final index = state.signals.indexWhere((s) => s.id == signal.id);
    if (index != -1) {
      final optimisticSignals = List<AvailabilitySignal>.from(state.signals);
      optimisticSignals[index] = signal;
      emit(state.copyWith(signals: optimisticSignals));
    }

    final result = await repository.updateSignal(signal);

    result.fold(
      (failure) {
        // Revert on failure
        loadSignals();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (updatedSignal) {
        final updatedSignals = state.signals.map((s) {
          return s.id == updatedSignal.id ? updatedSignal : s;
        }).toList();

        emit(state.copyWith(
          status: AppStateStatus.success,
          signals: updatedSignals,
          message: 'Signal updated successfully',
        ));
      },
    );
  }

  /// Delete a signal
  Future<void> deleteSignal(String id) async {
    // Optimistic delete
    final optimisticSignals =
        state.signals.where((s) => s.id != id).toList();
    emit(state.copyWith(signals: optimisticSignals));

    final result = await repository.deleteSignal(id);

    result.fold(
      (failure) {
        // Revert on failure
        loadSignals();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'Signal deleted successfully',
      )),
    );
  }

  /// Set search query
  void setSearchQuery(String query) {
    emit(state.copyWith(searchQuery: query));
  }

  /// Clear search
  void clearSearch() {
    emit(state.copyWith(searchQuery: ''));
  }
}
