import 'dart:developer' as developer;
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase_client.dart';
import '../../core/result.dart';

/// Service for managing user profile pictures
/// Handles uploading, validating, cropping, and managing profile images
/// Supports PNG, JPEG, and small GIFs
class ProfilePictureService {
  static const String _bucketName = 'profile-pictures';
  static const int _maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
  static const int _maxGifSizeBytes = 2 * 1024 * 1024; // 2MB for GIFs
  static const List<String> _supportedFormats = ['jpg', 'jpeg', 'png', 'gif'];

  static SupabaseClient get _client => SupabaseService.clientOrThrow;
  static ImagePicker get _imagePicker => ImagePicker();
  static ImageCropper get _imageCropper => ImageCropper();

  /// Allowed file extensions
  static List<String> get supportedFormats => _supportedFormats;

  /// Pick and crop an image from device
  /// Returns the cropped image file or null if cancelled
  static Future<File?> pickAndCropImage({bool enableGif = true}) async {
    try {
      final XFile? pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 85,
      );

      if (pickedFile == null) return null;

      final file = File(pickedFile.path);
      final extension = _getFileExtension(pickedFile.path).toLowerCase();

      // Validate file format
      if (!_supportedFormats.contains(extension)) {
        throw 'Unsupported file format. Supported: PNG, JPEG, GIF';
      }

      // Validate file size
      final fileSize = await file.length();
      final maxSize = extension == 'gif' ? _maxGifSizeBytes : _maxFileSizeBytes;
      if (fileSize > maxSize) {
        throw 'File is too large. Max size: ${(maxSize / 1024 / 1024).toStringAsFixed(1)}MB';
      }

      // Skip cropping for GIFs
      if (extension == 'gif') {
        debugPrint('[ProfilePictureService] GIF selected, skipping crop');
        return file;
      }

      // Crop image (skip for GIF)
      final croppedFile = await _imageCropper.cropImage(
        sourcePath: pickedFile.path,
        compressQuality: 85,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop your profile picture',
            toolbarColor: Colors.blue,
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
            aspectRatioPresets: [
              CropAspectRatioPreset.square,
            ],
          ),
          IOSUiSettings(
            title: 'Crop your profile picture',
            aspectRatioPresets: [
              CropAspectRatioPreset.square,
            ],
          ),
        ],
      );

      if (croppedFile != null) {
        return File(croppedFile.path);
      }

      // If user cancelled crop, return original
      return file;
    } catch (e) {
      developer.log(
        '[ProfilePictureService] Error picking/cropping image: $e',
        name: 'ProfilePictureService',
      );
      rethrow;
    }
  }

  /// Upload profile picture to Supabase Storage
  /// Returns the public URL of the uploaded image
  static Future<Result<String>> uploadProfilePicture(File imageFile) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        return const Failure('User not authenticated');
      }

      final extension = _getFileExtension(imageFile.path).toLowerCase();
      final fileName =
          'profile_${user.id}_${DateTime.now().millisecondsSinceEpoch}.$extension';
      final storagePath = '${user.id}/$fileName';

      // Delete old custom profile picture if exists
      await _deleteOldProfilePicture(user.id);

      // Upload new image
      await _client.storage.from(_bucketName).upload(
            storagePath,
            imageFile,
            fileOptions: const FileOptions(upsert: false),
          );

      // Get public URL
      final publicUrl = _client.storage
          .from(_bucketName)
          .getPublicUrl(storagePath);

      developer.log(
        '[ProfilePictureService] Profile picture uploaded: $publicUrl',
        name: 'ProfilePictureService',
      );

      return Success(publicUrl);
    } on StorageException catch (e) {
      developer.log(
        '[ProfilePictureService] Storage error: $e',
        name: 'ProfilePictureService',
      );
      return Failure('Failed to upload image: ${e.message}', e);
    } catch (e) {
      developer.log(
        '[ProfilePictureService] Unexpected error uploading picture: $e',
        name: 'ProfilePictureService',
      );
      return Failure('Failed to upload image', e as Exception?);
    }
  }

  /// Delete profile picture from storage
  static Future<Result<void>> deleteProfilePicture(String storagePath) async {
    try {
      await _client.storage.from(_bucketName).remove([storagePath]);

      developer.log(
        '[ProfilePictureService] Profile picture deleted: $storagePath',
        name: 'ProfilePictureService',
      );

      return const Success(null);
    } on StorageException catch (e) {
      developer.log(
        '[ProfilePictureService] Error deleting picture: $e',
        name: 'ProfilePictureService',
      );
      return Failure('Failed to delete image: ${e.toString()}', e);
    } catch (e) {
      developer.log(
        '[ProfilePictureService] Unexpected error deleting picture: $e',
        name: 'ProfilePictureService',
      );
      return Failure('Failed to delete image', e as Exception?);
    }
  }

  /// Delete old profile picture for a user
  static Future<void> _deleteOldProfilePicture(String userId) async {
    try {
      final List<FileObject> files =
          await _client.storage.from(_bucketName).list(path: userId);

      for (final file in files) {
        // Delete all profile pictures except the current one being uploaded
        final shouldDelete = file.name.startsWith('profile_');
        if (shouldDelete) {
          try {
            await _client.storage
                .from(_bucketName)
                .remove(['$userId/${file.name}']);
          } catch (e) {
            developer.log(
              '[ProfilePictureService] Could not delete old picture: ${file.name}',
              name: 'ProfilePictureService',
            );
          }
        }
      }
    } catch (e) {
      developer.log(
        '[ProfilePictureService] Error listing old pictures: $e',
        name: 'ProfilePictureService',
      );
    }
  }

  /// Validate image file before upload
  static Future<Result<void>> validateImageFile(File file) async {
    try {
      // Check if file exists
      if (!await file.exists()) {
        return const Failure('File does not exist');
      }

      // Check file size
      final fileSize = await file.length();
      final extension = _getFileExtension(file.path).toLowerCase();
      final maxSize = extension == 'gif' ? _maxGifSizeBytes : _maxFileSizeBytes;

      if (fileSize > maxSize) {
        return Failure(
          'File is too large. Max size: ${(maxSize / 1024 / 1024).toStringAsFixed(1)}MB',
        );
      }

      // Check file format
      if (!_supportedFormats.contains(extension)) {
        return Failure(
          'Unsupported format. Supported: ${_supportedFormats.join(', ').toUpperCase()}',
        );
      }

      return const Success(null);
    } catch (e) {
      return Failure('Validation error: $e', e as Exception?);
    }
  }

  /// Get file extension from path
  static String _getFileExtension(String filePath) {
    final lastDot = filePath.lastIndexOf('.');
    if (lastDot == -1) return '';
    return filePath.substring(lastDot + 1);
  }

  /// Check if image is a GIF
  static bool isGifFile(String filePath) {
    return _getFileExtension(filePath).toLowerCase() == 'gif';
  }

  /// Get file size in MB
  static Future<double> getFileSizeInMB(File file) async {
    final sizeInBytes = await file.length();
    return sizeInBytes / (1024 * 1024);
  }

  /// Create a thumbnail URL from full image URL
  /// Can be used for optimization
  static String? createThumbnailUrl(String? imageUrl) {
    if (imageUrl == null) return null;
    // Supabase supports image transformation via URL parameters
    // Example: add ?width=200&height=200 for thumbnails
    if (imageUrl.contains('?')) {
      return '$imageUrl&width=200&height=200';
    }
    return '$imageUrl?width=200&height=200';
  }
}
