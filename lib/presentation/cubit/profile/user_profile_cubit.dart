import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/firebase_app_services.dart';
import '../../../domain/user_profile.dart';
import '../../../logic/services/profile_api.dart';
import '../../../logic/services/user_profile_service.dart';

class UserProfileCubitState {
  const UserProfileCubitState({
    required this.isLoading,
    this.profile,
    this.error,
  });

  final bool isLoading;
  final UserProfile? profile;
  final String? error;

  UserProfileCubitState copyWith({
    bool? isLoading,
    UserProfile? profile,
    String? error,
  }) {
    return UserProfileCubitState(
      isLoading: isLoading ?? this.isLoading,
      profile: profile ?? this.profile,
      error: error,
    );
  }
}

class UserProfileCubit extends Cubit<UserProfileCubitState> {
  UserProfileCubit() : super(const UserProfileCubitState(isLoading: true)) {
    refresh();
  }

  Future<void> refresh() async {
    emit(state.copyWith(isLoading: true, error: null));

    // If not authenticated, return local profile (or null)
    if (!FirebaseAppServices.isConfigured || !FirebaseAppServices.isAuthenticated) {
      final local = await UserProfileService.loadLocalProfile();
      emit(UserProfileCubitState(isLoading: false, profile: local));
      return;
    }

    final remoteResult = await ProfileApi.fetchCurrentUserProfile();
    await remoteResult.when(
      success: (profile) async {
        emit(UserProfileCubitState(isLoading: false, profile: profile));
      },
      failure: (message, exception) async {
        debugPrint('[UserProfileCubit] Failed remote load: $message');
        // Fallback to local or create from Firebase metadata
        final user = FirebaseAppServices.currentUser;
        if (user != null) {
          try {
            final fallback = await UserProfileService.createFromFirebaseUser(user);
            emit(UserProfileCubitState(isLoading: false, profile: fallback));
            return;
          } catch (_) {}
        }
        final local = await UserProfileService.loadLocalProfile();
        emit(UserProfileCubitState(isLoading: false, profile: local, error: message));
      },
    );
  }

  Future<void> updatePhotoUrl(String photoUrl) async {
    final profile = state.profile;
    if (profile == null) return;
    emit(state.copyWith(profile: profile.copyWith(avatarUrl: photoUrl)));
    await UserProfileService.updatePhotoUrl(profile.id, photoUrl);
    // Best-effort remote sync
    ProfileApi.updateProfileAvatarUrl(profile.id, photoUrl);
  }

  Future<void> clearProfile() async {
    emit(const UserProfileCubitState(isLoading: false, profile: null));
    await UserProfileService.clearLocalProfile();
  }
}


