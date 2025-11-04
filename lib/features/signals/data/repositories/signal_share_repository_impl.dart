import 'package:firebase_auth/firebase_auth.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/result.dart';
import '../../domain/entities/signal_share.dart';
import '../../domain/repositories/signal_share_repository.dart';
import '../datasources/signal_share_remote_data_source.dart';

/// Implementation of SignalShareRepository
class SignalShareRepositoryImpl implements SignalShareRepository {
  final SignalShareRemoteDataSource remoteDataSource;
  final Uuid _uuid = const Uuid();

  SignalShareRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<List<SignalShare>>> getSignalShares() async {
    try {
      final shares = await remoteDataSource.getSignalShares();
      return Success(shares);
    } catch (e) {
      return Failure('Failed to get signal shares: $e');
    }
  }

  @override
  Future<Result<SignalShare>> shareSignal({
    required String signalId,
    required String sharedWithUserId,
    bool notify = true,
    bool autoAccept = false,
  }) async {
    try {
      // Get current user ID from Firebase Auth
      final currentUserId =
          FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';

      final share = SignalShare(
        id: _uuid.v4(),
        signalId: signalId,
        sharedWithUserId: sharedWithUserId,
        sharedByUserId: currentUserId,
        createdAt: DateTime.now(),
        notify: notify,
        autoAccept: autoAccept,
      );

      final created = await remoteDataSource.createShare(share);
      return Success(created);
    } catch (e) {
      return Failure('Failed to share signal: $e');
    }
  }

  @override
  Future<Result<List<SignalShare>>> shareSignalWithMultiple({
    required String signalId,
    required List<String> sharedWithUserIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
  }) async {
    try {
      final currentUserId =
          FirebaseAuth.instance.currentUser?.uid ?? 'anonymous';

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

      final created = await remoteDataSource.createMultipleShares(shares);
      return Success(created);
    } catch (e) {
      return Failure('Failed to share signal with multiple users: $e');
    }
  }

  @override
  Future<Result<void>> revokeShare(String shareId) async {
    try {
      await remoteDataSource.deleteShare(shareId);
      return const Success(null);
    } catch (e) {
      return Failure('Failed to revoke share: $e');
    }
  }

  @override
  Future<Result<List<SignalShare>>> getSharesForSignal(
    String signalId,
  ) async {
    try {
      final shares = await remoteDataSource.getSharesForSignal(signalId);
      return Success(shares);
    } catch (e) {
      return Failure('Failed to get shares for signal: $e');
    }
  }

  @override
  Future<Result<List<SignalShare>>> getSharesWithUser(
    String userId,
  ) async {
    try {
      final shares = await remoteDataSource.getSharesWithUser(userId);
      return Success(shares);
    } catch (e) {
      return Failure('Failed to get shares with user: $e');
    }
  }
}
