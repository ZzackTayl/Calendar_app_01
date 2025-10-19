import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/user_profile.dart';
import '../../logic/services/user_profile_service.dart';
import '../providers/auth_providers.dart';

/// Provider for current user profile
/// Automatically updates when user authenticates
final userProfileProvider = FutureProvider<UserProfile?>((ref) async {
  // Watch the current user from auth
  final supabaseUser = ref.watch(currentUserProvider);

  if (supabaseUser == null) {
    // No user logged in, try to load from local storage
    return await UserProfileService.loadLocalProfile();
  }

  try {
    // Create profile from Supabase user (includes Google photo if available)
    final profile = await UserProfileService.createFromSupabaseUser(supabaseUser);
    debugPrint('[userProfileProvider] Profile loaded for ${profile.email}');
    return profile;
  } catch (e) {
    debugPrint('[userProfileProvider] Error creating profile: $e');
    // Fall back to local storage
    return await UserProfileService.loadLocalProfile();
  }
});

/// Provider for user's photo URL
/// Returns Google photo or custom photo if available, null otherwise
final userPhotoUrlProvider = FutureProvider<String?>((ref) async {
  final profile = await ref.watch(userProfileProvider.future);
  return profile?.photoUrl;
});

/// Provider for user's display name
final userDisplayNameProvider = FutureProvider<String?>((ref) async {
  final profile = await ref.watch(userProfileProvider.future);
  return profile?.displayName;
});

/// Provider for user's email
final userEmailProvider = FutureProvider<String?>((ref) async {
  final profile = await ref.watch(userProfileProvider.future);
  return profile?.email;
});

/// Controller for user profile updates
final userProfileControllerProvider =
    NotifierProvider<UserProfileController, AsyncValue<UserProfile?>>(() {
  return UserProfileController();
});

class UserProfileController extends Notifier<AsyncValue<UserProfile?>> {
  @override
  AsyncValue<UserProfile?> build() {
    return const AsyncValue.data(null);
  }

  /// Update user photo URL (when user uploads custom photo)
  Future<void> updatePhotoUrl(String photoUrl) async {
    final profile = await ref.watch(userProfileProvider.future);
    if (profile == null) return;

    try {
      state = AsyncValue.data(profile.copyWith(photoUrl: photoUrl));
      await UserProfileService.updatePhotoUrl(profile.id, photoUrl);
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }

  /// Clear profile on logout
  Future<void> clearProfile() async {
    try {
      state = const AsyncValue.data(null);
      await UserProfileService.clearLocalProfile();
    } catch (e) {
      state = AsyncValue.error(e, StackTrace.current);
    }
  }
}
