import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../core/timezone_service.dart';

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
      String userId, String avatarUrl) async {
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
