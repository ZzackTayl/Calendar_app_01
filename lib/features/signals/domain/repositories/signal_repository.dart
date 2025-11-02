import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../domain/availability_signal.dart';

/// Signal repository contract
///
/// Defines operations for managing availability signals.
abstract class SignalRepository {
  /// Get all signals for the current user
  Future<Either<Failure, List<AvailabilitySignal>>> getSignals();

  /// Get a specific signal by ID
  Future<Either<Failure, AvailabilitySignal>> getSignal(String id);

  /// Create a new signal
  Future<Either<Failure, AvailabilitySignal>> createSignal(
    AvailabilitySignal signal,
  );

  /// Update an existing signal
  Future<Either<Failure, AvailabilitySignal>> updateSignal(
    AvailabilitySignal signal,
  );

  /// Delete/cancel a signal
  Future<Either<Failure, void>> deleteSignal(String id);

  /// Get active signals (currently ongoing)
  Future<Either<Failure, List<AvailabilitySignal>>> getActiveSignals();

  /// Get signals by IDs
  Future<Either<Failure, List<AvailabilitySignal>>> getSignalsByIds(
    List<String> ids,
  );
}
