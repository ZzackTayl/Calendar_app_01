import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import 'dart:convert';

import '../../domain/user_profile.dart';

/// Service for managing user profile data
/// Handles storing and retrieving user profile information including photos
class UserProfileService {
  static const String _storageKey = 'user_profile';

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
      await prefs.setString(_storageKey, json);
      debugPrint('[UserProfileService] Profile saved locally');
    } catch (e) {
      debugPrint('[UserProfileService] Error saving profile: $e');
    }
  }

  /// Load profile from local storage
  static Future<UserProfile?> loadLocalProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_storageKey);
      if (json == null) return null;

      final profileJson = jsonDecode(json) as Map<String, dynamic>;
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
      final json = prefs.getString(_storageKey);
      if (json == null) return;

      final profileJson = jsonDecode(json) as Map<String, dynamic>;
      final profile = UserProfile.fromJson(profileJson);
      
      // Update photo and save
      final updated = profile.copyWith(photoUrl: photoUrl);
      await _saveLocalProfile(updated);
      
      debugPrint('[UserProfileService] Photo URL updated');
    } catch (e) {
      debugPrint('[UserProfileService] Error updating photo: $e');
    }
  }

  /// Clear profile from local storage
  static Future<void> clearLocalProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKey);
      debugPrint('[UserProfileService] Profile cleared');
    } catch (e) {
      debugPrint('[UserProfileService] Error clearing profile: $e');
    }
  }
}
