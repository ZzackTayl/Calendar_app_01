import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../entities/notification.dart';
import '../repositories/notification_repository.dart';

/// Use case for retrieving notifications with intelligent fallback strategy.
///
/// This use case implements a three-tier loading strategy:
/// 1. **Remote (Supabase)**: If authenticated, fetch from remote server
/// 2. **Local Cache**: Fallback to locally cached notifications if remote fails
/// 3. **Mock Data**: Fallback to mock data if both remote and local fail
///
/// This ensures the app always has notification data to display, even
/// in offline or unauthenticated scenarios.
///
/// Example usage:
/// ```dart
/// final useCase = GetNotificationsUseCase(repository);
/// final result = await useCase.call();
/// result.when(
///   success: (notifications) => displayNotifications(notifications),
///   failure: (message, _) => showError(message),
/// );
/// ```
class GetNotificationsUseCase {
  final NotificationRepository _repository;

  const GetNotificationsUseCase(this._repository);

  /// Executes the notification retrieval with fallback strategy.
  ///
  /// Returns:
  /// - [Success] with list of notifications from the best available source
  /// - [Failure] only if all three sources (remote, local, mock) fail
  Future<Result<List<Notification>>> call() async {
    // Strategy 1: Try remote if Supabase is configured and user is authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.getNotifications();

      if (remoteResult.isSuccess) {
        // Cache the remote notifications locally for offline access
        final notifications = remoteResult.dataOrNull!;
        await _repository.saveLocalNotifications(notifications);
        return remoteResult;
      }

      // Remote failed, but we'll try local fallback below
    }

    // Strategy 2: Try local cache
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isSuccess) {
      return localResult;
    }

    // Strategy 3: Fallback to mock data
    final mockResult = await _repository.getMockNotifications();

    if (mockResult.isSuccess) {
      return mockResult;
    }

    // All three strategies failed - this should be extremely rare
    return const Failure(
      'Failed to load notifications from all sources (remote, local, and mock)',
    );
  }
}
