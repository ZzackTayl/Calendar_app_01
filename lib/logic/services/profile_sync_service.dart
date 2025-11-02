import '../../core/result.dart';
import '../../core/firebase_app_services.dart';
import 'profile_api.dart';

/// Thin coordination layer that routes profile mutations to the active backend.
///
/// Today this still delegates to Supabase for legacy compatibility while the
/// Firestore-backed implementation is rolled out. Once the Firebase migration
/// lands, this class becomes the single integration point to swap in the new
/// remote data source without touching UI or riverpod layers.
class ProfileSyncService {
  const ProfileSyncService._();

  static Future<Result<void>> updateAvatarUrl(
    String userId,
    String? avatarUrl,
  ) async {
    if (FirebaseAppServices.isConfigured) {
      return ProfileApi.updateProfileAvatarUrl(userId, avatarUrl);
    }

    // Firebase not configured - return success for offline/dev mode
    return const Success(null);
  }
}
