import '../../../../core/result.dart';
import '../entities/availability_signal.dart';

/// Signal repository contract
///
/// Defines operations for managing availability signals.
abstract class SignalRepository {
  /// Get all signals for the current user
  Future<Result<List<AvailabilitySignal>>> getSignals();

  /// Get a specific signal by ID
  Future<Result<AvailabilitySignal>> getSignal(String id);

  /// Create a new signal
  Future<Result<AvailabilitySignal>> createSignal(
    AvailabilitySignal signal,
  );

  /// Update an existing signal
  Future<Result<AvailabilitySignal>> updateSignal(
    AvailabilitySignal signal,
  );

  /// Delete/cancel a signal
  Future<Result<void>> deleteSignal(String id);

  /// Get active signals (currently ongoing)
  Future<Result<List<AvailabilitySignal>>> getActiveSignals();

  /// Get signals by IDs
  Future<Result<List<AvailabilitySignal>>> getSignalsByIds(
    List<String> ids,
  );
}
