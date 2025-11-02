import 'package:dartz/dartz.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/signal_share.dart';
import '../../domain/repositories/signal_share_repository.dart';
import '../datasources/signal_share_remote_data_source.dart';

/// Implementation of SignalShareRepository
class SignalShareRepositoryImpl
    with EitherMixin
    implements SignalShareRepository {
  final SignalShareRemoteDataSource remoteDataSource;
  final Uuid _uuid = const Uuid();

  SignalShareRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<SignalShare>>> getSignalShares() async {
    return handleFuture(() => remoteDataSource.getSignalShares());
  }

  @override
  Future<Either<Failure, SignalShare>> shareSignal({
    required String signalId,
    required String sharedWithUserId,
    bool notify = true,
    bool autoAccept = false,
  }) async {
    return handleFuture(() async {
      // Get current user ID from Firebase Auth
      final currentUserId = FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';

      final share = SignalShare(
        id: _uuid.v4(),
        signalId: signalId,
        sharedWithUserId: sharedWithUserId,
        sharedByUserId: currentUserId,
        createdAt: DateTime.now(),
        notify: notify,
        autoAccept: autoAccept,
      );

      return await remoteDataSource.createShare(share);
    });
  }

  @override
  Future<Either<Failure, List<SignalShare>>> shareSignalWithMultiple({
    required String signalId,
    required List<String> sharedWithUserIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
  }) async {
    return handleFuture(() async {
      final currentUserId = FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';

      final shares = sharedWithUserIds.map((userId) {
        return SignalShare(
          id: _uuid.v4(),
          signalId: signalId,
          sharedWithUserId: userId,
          sharedByUserId: currentUserId,
          createdAt: DateTime.now(),
          notify: notifyMap?[userId] ?? true,
          autoAccept: autoAcceptMap?[userId] ?? false,
        );
      }).toList();

      return await remoteDataSource.createMultipleShares(shares);
    });
  }

  @override
  Future<Either<Failure, void>> revokeShare(String shareId) async {
    return handleFuture(() => remoteDataSource.deleteShare(shareId));
  }

  @override
  Future<Either<Failure, List<SignalShare>>> getSharesForSignal(
    String signalId,
  ) async {
    return handleFuture(() => remoteDataSource.getSharesForSignal(signalId));
  }

  @override
  Future<Either<Failure, List<SignalShare>>> getSharesWithUser(
    String userId,
  ) async {
    return handleFuture(() => remoteDataSource.getSharesWithUser(userId));
  }
}
