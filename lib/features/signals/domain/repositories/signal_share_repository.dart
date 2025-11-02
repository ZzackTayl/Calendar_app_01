import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../domain/signal_share.dart';

/// Signal share repository contract
///
/// Defines operations for managing signal sharing.
abstract class SignalShareRepository {
  /// Get all signal shares for the current user
  Future<Either<Failure, List<SignalShare>>> getSignalShares();

  /// Share a signal with a user
  Future<Either<Failure, SignalShare>> shareSignal({
    required String signalId,
    required String sharedWithUserId,
    bool notify = true,
    bool autoAccept = false,
  });

  /// Share a signal with multiple users
  Future<Either<Failure, List<SignalShare>>> shareSignalWithMultiple({
    required String signalId,
    required List<String> sharedWithUserIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
  });

  /// Revoke signal sharing
  Future<Either<Failure, void>> revokeShare(String shareId);

  /// Get shares for a specific signal
  Future<Either<Failure, List<SignalShare>>> getSharesForSignal(
    String signalId,
  );

  /// Get signals shared with a specific user
  Future<Either<Failure, List<SignalShare>>> getSharesWithUser(
    String userId,
  );
}
