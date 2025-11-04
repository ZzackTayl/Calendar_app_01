import '../../../../core/result.dart';
import '../../domain/entities/availability_signal.dart';
import '../../domain/repositories/signal_repository.dart';
import '../datasources/signal_remote_data_source.dart';

/// Implementation of SignalRepository
class SignalRepositoryImpl implements SignalRepository {
  final SignalRemoteDataSource remoteDataSource;

  SignalRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<List<AvailabilitySignal>>> getSignals() async {
    try {
      final signals = await remoteDataSource.getSignals();
      return Success(signals);
    } catch (e) {
      return Failure('Failed to get signals: $e');
    }
  }

  @override
  Future<Result<AvailabilitySignal>> getSignal(String id) async {
    try {
      final signal = await remoteDataSource.getSignal(id);
      return Success(signal);
    } catch (e) {
      return Failure('Failed to get signal: $e');
    }
  }

  @override
  Future<Result<AvailabilitySignal>> createSignal(
    AvailabilitySignal signal,
  ) async {
    try {
      final created = await remoteDataSource.createSignal(signal);
      return Success(created);
    } catch (e) {
      return Failure('Failed to create signal: $e');
    }
  }

  @override
  Future<Result<AvailabilitySignal>> updateSignal(
    AvailabilitySignal signal,
  ) async {
    try {
      final updated = await remoteDataSource.updateSignal(signal);
      return Success(updated);
    } catch (e) {
      return Failure('Failed to update signal: $e');
    }
  }

  @override
  Future<Result<void>> deleteSignal(String id) async {
    try {
      await remoteDataSource.deleteSignal(id);
      return const Success(null);
    } catch (e) {
      return Failure('Failed to delete signal: $e');
    }
  }

  @override
  Future<Result<List<AvailabilitySignal>>> getActiveSignals() async {
    try {
      final signals = await remoteDataSource.getActiveSignals();
      return Success(signals);
    } catch (e) {
      return Failure('Failed to get active signals: $e');
    }
  }

  @override
  Future<Result<List<AvailabilitySignal>>> getSignalsByIds(
    List<String> ids,
  ) async {
    try {
      final signals = await remoteDataSource.getSignalsByIds(ids);
      return Success(signals);
    } catch (e) {
      return Failure('Failed to get signals by IDs: $e');
    }
  }
}
