import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../logic/services/profile_api.dart';
import '../../logic/services/profile_picture_service.dart';
import '../../core/result.dart';
import './user_profile_provider.dart';

part 'profile_picture_provider.g.dart';

/// State for profile picture upload operation
class ProfilePictureUploadState {
  final bool isLoading;
  final String? uploadedUrl;
  final String? errorMessage;

  const ProfilePictureUploadState({
    this.isLoading = false,
    this.uploadedUrl,
    this.errorMessage,
  });

  ProfilePictureUploadState copyWith({
    bool? isLoading,
    String? uploadedUrl,
    String? errorMessage,
  }) {
    return ProfilePictureUploadState(
      isLoading: isLoading ?? this.isLoading,
      uploadedUrl: uploadedUrl ?? this.uploadedUrl,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

/// Provider for managing profile picture uploads
@riverpod
class ProfilePictureUpload extends _$ProfilePictureUpload {
  @override
  ProfilePictureUploadState build() {
    return const ProfilePictureUploadState();
  }

  /// Upload and update user profile picture
  /// Handles the complete workflow: pick -> validate -> upload -> update profile
  Future<Result<String>> uploadProfilePicture() async {
    try {
      state = state.copyWith(isLoading: true, errorMessage: null);

      // Pick and crop image from device
      final imageFile = await ProfilePictureService.pickAndCropImage();
      if (imageFile == null) {
        state = state.copyWith(isLoading: false);
        return const Failure('Image selection cancelled');
      }

      // Validate the selected image
      final validationResult =
          await ProfilePictureService.validateImageFile(imageFile);
      if (!validationResult.isSuccess) {
        final errorMsg = validationResult.errorOrNull ?? 'Validation failed';
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
        return Failure(errorMsg);
      }

      // Upload to Supabase Storage
      final uploadResult =
          await ProfilePictureService.uploadProfilePicture(imageFile);
      if (!uploadResult.isSuccess) {
        final errorMsg = uploadResult.errorOrNull ?? 'Upload failed';
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
        return Failure(errorMsg);
      }

      final publicUrl = uploadResult.dataOrNull;
      if (publicUrl == null) {
        const errorMsg = 'No URL returned from upload';
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
        return const Failure(errorMsg);
      }

      // Update profile in Supabase database
      final currentUser = ref.read(userProfileProvider).value;
      if (currentUser == null) {
        const errorMsg = 'User not authenticated';
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
        return const Failure(errorMsg);
      }

      final updateResult =
          await ProfileApi.updateProfileAvatarUrl(currentUser.id, publicUrl);
      if (!updateResult.isSuccess) {
        final errorMsg = updateResult.errorOrNull ?? 'Failed to update profile';
        state = state.copyWith(
          isLoading: false,
          errorMessage: errorMsg,
        );
        return Failure(errorMsg);
      }

      // Update local profile
      await ref
          .read(userProfileControllerProvider.notifier)
          .updatePhotoUrl(publicUrl);

      state = state.copyWith(
        isLoading: false,
        uploadedUrl: publicUrl,
        errorMessage: null,
      );

      debugPrint('[ProfilePictureUpload] Upload successful: $publicUrl');
      return Success(publicUrl);
    } catch (e, stackTrace) {
      debugPrint('[ProfilePictureUpload] Unexpected error: $e\n$stackTrace');
      const errorMsg = 'An unexpected error occurred';
      state = state.copyWith(
        isLoading: false,
        errorMessage: errorMsg,
      );
      return const Failure(errorMsg);
    }
  }

  /// Clear error message
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  /// Reset upload state
  void reset() {
    state = const ProfilePictureUploadState();
  }
}

/// Provider to fetch a connection's profile picture
final connectionProfilePictureProvider = FutureProvider.family<String?, String>(
  (ref, userId) async {
    try {
      final result = await ProfileApi.getProfilePictureUrl(userId);
      return result.dataOrNull;
    } catch (e) {
      debugPrint(
          '[connectionProfilePictureProvider] Error fetching picture: $e');
      return null;
    }
  },
);

/// Provider to get user's profile picture thumbnail URL
final userProfilePictureThumbnailProvider =
    FutureProvider<String?>((ref) async {
  final profile = await ref.watch(userProfileProvider.future);
  if (profile?.photoUrl == null) return null;
  return ProfilePictureService.createThumbnailUrl(profile!.photoUrl);
});

/// Provider to validate a file before upload
final profilePictureValidationProvider =
    FutureProvider.family<Result<void>, File>((ref, file) async {
  return await ProfilePictureService.validateImageFile(file);
});

/// Provider to check if file is a GIF
final isGifFileProvider = Provider.family<bool, String>((ref, filePath) {
  return ProfilePictureService.isGifFile(filePath);
});
