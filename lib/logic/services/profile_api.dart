import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../core/timezone_service.dart';
import '../../domain/user_profile.dart';
import '../services/user_profile_service.dart';

class ProfileApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  @visibleForTesting
  static Future<void> Function(
      SupabaseClient client, Map<String, dynamic> payload)? debugUpsertHandler;

  static Future<Result<void>> upsertCurrentUserProfile() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        return const Failure('User not authenticated');
      }

      final email = user.email;
      if (email == null || email.isEmpty) {
        return const Failure('Authenticated user is missing an email address.');
      }

      final displayName = _resolveDisplayName(user, email);
      final timezone = TimezoneDetection.getDeviceTimezoneLocation();
      final nowIso = DateTime.now().toUtc().toIso8601String();

      final profileData = <String, dynamic>{
        'id': user.id,
        'email': email.toLowerCase(),
        'display_name': displayName,
        'timezone': timezone,
        'avatar_url': _resolveAvatarUrl(user),
        'updated_at': nowIso,
      }..removeWhere((key, value) => value == null);

      if (debugUpsertHandler != null) {
        await debugUpsertHandler!(_client, profileData);
      } else {
        await _client.from('profiles').upsert(
              profileData,
              onConflict: 'id',
            );
      }

      developer.log('Profile upserted for user ${user.id}', name: 'ProfileApi');
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error upserting profile: $e', name: 'ProfileApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error upserting profile: $e', name: 'ProfileApi');
      return Failure('Failed to save profile.', e);
    } catch (e) {
      developer.log('Unexpected error upserting profile: $e',
          name: 'ProfileApi');
      return Failure('Failed to save profile.', e as Exception?);
    }
  }

  static Future<Result<UserProfile>> fetchCurrentUserProfile() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();

      final effectiveResponse = response ??
          await _initializeProfileForUser(
            userId,
          );

      if (effectiveResponse == null) {
        return const Failure('Profile not found');
      }

      final profile = UserProfile.fromJson(effectiveResponse);
      await UserProfileService.saveLocalProfile(profile);
      return Success(profile);
    } on SocketException catch (e) {
      developer.log('Network error loading profile: $e', name: 'ProfileApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error loading profile: $e', name: 'ProfileApi');
      return Failure('Failed to load profile.', e);
    } catch (e) {
      developer.log('Unexpected error loading profile: $e', name: 'ProfileApi');
      return Failure('Failed to load profile.', e as Exception?);
    }
  }

  static Future<Result<UserProfile>> updateProfileDetails({
    String? displayName,
    String? email,
  }) async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) {
        return const Failure('User not authenticated');
      }

      final trimmedName = displayName?.trim();
      final trimmedEmail = email?.trim();

      if ((trimmedName == null || trimmedName.isEmpty) &&
          (trimmedEmail == null || trimmedEmail.isEmpty)) {
        return const Failure('No changes provided');
      }

      if (trimmedEmail != null && trimmedEmail.isNotEmpty) {
        await _client.auth.updateUser(
          UserAttributes(email: trimmedEmail),
        );
      }

      final updates = <String, dynamic>{
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      };

      if (trimmedName != null && trimmedName.isNotEmpty) {
        updates['display_name'] = trimmedName;
      }
      if (trimmedEmail != null && trimmedEmail.isNotEmpty) {
        updates['email'] = trimmedEmail.toLowerCase();
      }

      if (updates.length > 1) {
        await _client.from('profiles').update(updates).eq('id', user.id);
      }

      final refreshed =
          await _client.from('profiles').select().eq('id', user.id).single();

      final profile = UserProfile.fromJson(refreshed);
      await UserProfileService.saveLocalProfile(profile);
      return Success(profile);
    } on AuthException catch (e) {
      developer.log('Auth error updating profile: $e', name: 'ProfileApi');
      return Failure(e.message, e);
    } on SocketException catch (e) {
      developer.log('Network error updating profile: $e', name: 'ProfileApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error updating profile: $e', name: 'ProfileApi');
      return Failure('Failed to update profile.', e);
    } catch (e) {
      developer.log(
        'Unexpected error updating profile details: $e',
        name: 'ProfileApi',
      );
      return Failure('Failed to update profile.', e as Exception?);
    }
  }

  static Future<Map<String, dynamic>?> _initializeProfileForUser(
    String userId,
  ) async {
    final bootstrap = await upsertCurrentUserProfile();
    if (bootstrap is Failure<void>) {
      return null;
    }

    return _client.from('profiles').select().eq('id', userId).maybeSingle();
  }

  static String _resolveDisplayName(User user, String email) {
    final metadata = user.userMetadata ?? <String, dynamic>{};
    final candidates = [
      metadata['full_name'],
      metadata['name'],
      metadata['given_name'],
      metadata['preferred_username'],
    ];

    for (final candidate in candidates) {
      if (candidate is String && candidate.trim().isNotEmpty) {
        return candidate.trim();
      }
    }

    final emailPrefix = email.split('@').first;
    if (emailPrefix.isNotEmpty) {
      return emailPrefix;
    }

    return 'Orbit User';
  }

  static String? _resolveAvatarUrl(User user) {
    final metadata = user.userMetadata ?? <String, dynamic>{};
    final candidates = [
      metadata['avatar_url'],
      metadata['picture'],
      metadata['avatar'],
    ];

    for (final candidate in candidates) {
      if (candidate is String && candidate.trim().isNotEmpty) {
        return candidate.trim();
      }
    }

    return null;
  }

  /// Update user profile in Supabase with new avatar URL
  /// Used after uploading custom profile picture
  static Future<Result<void>> updateProfileAvatarUrl(
      String userId, String? avatarUrl) async {
    try {
      await _client.from('profiles').update({
        'avatar_url': avatarUrl,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      }).eq('id', userId);

      developer.log('Avatar URL updated in Supabase: $avatarUrl',
          name: 'ProfileApi');
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error updating avatar: $e', name: 'ProfileApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error updating avatar: $e', name: 'ProfileApi');
      return Failure('Failed to update profile picture.', e);
    } catch (e) {
      developer.log('Unexpected error updating avatar: $e', name: 'ProfileApi');
      return Failure('Failed to update profile picture.', e as Exception?);
    }
  }

  /// Get profile picture URL for a user (for connections to view)
  static Future<Result<String?>> getProfilePictureUrl(String userId) async {
    try {
      final response = await _client
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .single();

      final avatarUrl = response['avatar_url'] as String?;
      return Success(avatarUrl);
    } on SocketException catch (e) {
      developer.log('Network error fetching avatar: $e', name: 'ProfileApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching avatar: $e', name: 'ProfileApi');
      return Failure('Failed to fetch profile picture.', e);
    } catch (e) {
      developer.log('Unexpected error fetching avatar: $e', name: 'ProfileApi');
      return Failure('Failed to fetch profile picture.', e as Exception?);
    }
  }
}
