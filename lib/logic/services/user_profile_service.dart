import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'dart:convert';

import '../../core/services/encryption_service.dart';
import '../../core/services/secure_storage_service.dart';
import '../../domain/user_profile.dart';

/// Service for managing user profile data
/// Handles storing and retrieving user profile information including photos
class UserProfileService {
  static const String _storageKey = 'user_profile';
  static const String _storageKeyOwnerId = 'user_profile_owner_id';

  /// Extract profile information from Supabase user
  /// Includes Google profile photo if available
  static Future<UserProfile> createFromSupabaseUser(supabase.User user) async {
    final photoUrl = _extractGooglePhotoUrl(user);

    final profile = UserProfile(
      id: user.id,
      email: user.email ?? '',
      displayName: _extractDisplayName(user),
      photoUrl: photoUrl,
      createdAt: DateTime.now(),
    );

    // Save to local storage
    await _saveLocalProfile(profile);

    return profile;
  }

  /// Extract Google profile photo URL from user metadata
  /// Google OAuth includes picture URL in user metadata
  static String? _extractGooglePhotoUrl(supabase.User user) {
    try {
      final userMetadata = user.userMetadata;
      if (userMetadata == null) return null;

      // Google OAuth stores picture URL in metadata
      final photoUrl = userMetadata['picture'] as String?;
      if (photoUrl != null && photoUrl.isNotEmpty) {
        debugPrint('[UserProfileService] Extracted Google photo: $photoUrl');
        return photoUrl;
      }
    } catch (e) {
      debugPrint('[UserProfileService] Error extracting photo: $e');
    }
    return null;
  }

  /// Extract display name from user metadata
  static String? _extractDisplayName(supabase.User user) {
    try {
      final userMetadata = user.userMetadata;
      if (userMetadata == null) return null;

      // Try multiple possible names from OAuth metadata
      return userMetadata['full_name'] as String? ??
          userMetadata['name'] as String? ??
          userMetadata['given_name'] as String?;
    } catch (e) {
      debugPrint('[UserProfileService] Error extracting name: $e');
    }
    return null;
  }

  /// Save profile to local storage (for offline access)
  static Future<void> _saveLocalProfile(UserProfile profile) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(profile.toJson());
      final encryptionKey = await _getOrCreateEncryptionKey(profile.id);
      final encryptedJson = EncryptionService.encrypt(json, encryptionKey);
      await prefs.setString(_storageKey, encryptedJson);
      await prefs.setString(_storageKeyOwnerId, profile.id);
      debugPrint('[UserProfileService] Profile saved locally');
    } catch (e) {
      debugPrint('[UserProfileService] Error saving profile: $e');
    }
  }

  /// Persist the provided profile locally for offline usage.
  static Future<void> saveLocalProfile(UserProfile profile) =>
      _saveLocalProfile(profile);

  /// Load profile from local storage
  static Future<UserProfile?> loadLocalProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encryptedJson = prefs.getString(_storageKey);
      if (encryptedJson == null) return null;

      final storedUserId = prefs.getString(_storageKeyOwnerId);
      String? decryptedJson;

      if (storedUserId != null) {
        final encryptionKey = await _readEncryptionKey(storedUserId);
        if (encryptionKey != null && encryptionKey.isNotEmpty) {
          decryptedJson =
              EncryptionService.decrypt(encryptedJson, encryptionKey);
        }
      }

      // Try to decrypt using the stored format; if it fails, try the old unencrypted format
      decryptedJson ??=
          EncryptionService.decrypt(encryptedJson, _legacyEncryptionKey());

      decryptedJson ??= encryptedJson;

      final profileJson = jsonDecode(decryptedJson) as Map<String, dynamic>;
      return UserProfile.fromJson(profileJson);
    } catch (e) {
      debugPrint('[UserProfileService] Error loading profile: $e');
      return null;
    }
  }

  /// Update user profile photo URL
  /// Used when user uploads custom photo (future feature)
  static Future<void> updatePhotoUrl(String userId, String photoUrl) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encryptedJson = prefs.getString(_storageKey);
      if (encryptedJson == null) return;

      final encryptionKey = await _readEncryptionKey(userId);
      // Try to decrypt the stored data
      String? decryptedJson = encryptionKey != null
          ? EncryptionService.decrypt(encryptedJson, encryptionKey)
          : null;

      decryptedJson ??= encryptedJson;

      final profileJson = jsonDecode(decryptedJson) as Map<String, dynamic>;
      final profile = UserProfile.fromJson(profileJson);

      // Update photo and save
      final updated = profile.copyWith(photoUrl: photoUrl);
      await _saveLocalProfile(updated);

      debugPrint('[UserProfileService] Photo URL updated');
    } catch (e) {
      debugPrint('[UserProfileService] Error updating photo: $e');
    }
  }

  /// Update profile information such as display name or email locally
  /// Returns the updated profile if successful
  static Future<UserProfile?> updateProfileInfo(
    String userId, {
    String? displayName,
    String? email,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encryptedJson = prefs.getString(_storageKey);
      if (encryptedJson == null) return null;

      final encryptionKey = await _readEncryptionKey(userId);
      String? decryptedJson = encryptionKey != null
          ? EncryptionService.decrypt(encryptedJson, encryptionKey)
          : null;
      decryptedJson ??= encryptedJson;

      final profileJson = jsonDecode(decryptedJson) as Map<String, dynamic>;
      final profile = UserProfile.fromJson(profileJson);

      String? resolvedDisplayName = displayName?.trim();
      if (resolvedDisplayName != null && resolvedDisplayName.isEmpty) {
        resolvedDisplayName = null;
      }
      String? resolvedEmail = email?.trim();
      if (resolvedEmail != null && resolvedEmail.isEmpty) {
        resolvedEmail = null;
      }

      final updated = profile.copyWith(
        displayName: resolvedDisplayName ?? profile.displayName,
        email: resolvedEmail ?? profile.email,
        updatedAt: DateTime.now(),
      );

      await _saveLocalProfile(updated);
      return updated;
    } catch (e) {
      debugPrint('[UserProfileService] Error updating profile info: $e');
      return null;
    }
  }

  /// Clear profile from local storage
  static Future<void> clearLocalProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedUserId = prefs.getString(_storageKeyOwnerId);
      await prefs.remove(_storageKey);
      await prefs.remove(_storageKeyOwnerId);
      if (storedUserId != null) {
        await SecureStorageService.delete(_profileKeyName(storedUserId));
      }
      debugPrint('[UserProfileService] Profile cleared');
    } catch (e) {
      debugPrint('[UserProfileService] Error clearing profile: $e');
    }
  }

  static Future<String> _getOrCreateEncryptionKey(String userId) async {
    final storageKey = _profileKeyName(userId);
    final existing = await SecureStorageService.read(storageKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final generated = EncryptionService.generateSecureMasterKey();
    await SecureStorageService.write(storageKey, generated);
    return generated;
  }

  static Future<String?> _readEncryptionKey(String userId) async {
    final storageKey = _profileKeyName(userId);
    return SecureStorageService.read(storageKey);
  }

  static String _profileKeyName(String userId) =>
      'user_profile_secure_key_$userId';

  // Legacy placeholder key kept for backward compatibility with pre-secure-storage builds.
  static String _legacyEncryptionKey() => 'myorbit_profile_key_';
}
