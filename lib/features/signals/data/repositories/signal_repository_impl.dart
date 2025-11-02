import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/availability_signal.dart';
import '../../domain/repositories/signal_repository.dart';
import '../datasources/signal_remote_data_source.dart';

/// Implementation of SignalRepository
class SignalRepositoryImpl with EitherMixin implements SignalRepository {
  final SignalRemoteDataSource remoteDataSource;

  SignalRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<AvailabilitySignal>>> getSignals() async {
    return handleFuture(() => remoteDataSource.getSignals());
  }

  @override
  Future<Either<Failure, AvailabilitySignal>> getSignal(String id) async {
    return handleFuture(() => remoteDataSource.getSignal(id));
  }

  @override
  Future<Either<Failure, AvailabilitySignal>> createSignal(
    AvailabilitySignal signal,
  ) async {
    return handleFuture(() => remoteDataSource.createSignal(signal));
  }

  @override
  Future<Either<Failure, AvailabilitySignal>> updateSignal(
    AvailabilitySignal signal,
  ) async {
    return handleFuture(() => remoteDataSource.updateSignal(signal));
  }

  @override
  Future<Either<Failure, void>> deleteSignal(String id) async {
    return handleFuture(() => remoteDataSource.deleteSignal(id));
  }

  @override
  Future<Either<Failure, List<AvailabilitySignal>>> getActiveSignals() async {
    return handleFuture(() => remoteDataSource.getActiveSignals());
  }

  @override
  Future<Either<Failure, List<AvailabilitySignal>>> getSignalsByIds(
    List<String> ids,
  ) async {
    return handleFuture(() => remoteDataSource.getSignalsByIds(ids));
  }
}
