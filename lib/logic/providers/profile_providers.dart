import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/user_profile.dart';
import '../services/dev_data_service.dart';

part 'profile_providers.g.dart';

/// Provider for the current logged-in user's profile
///
/// This is the primary user profile provider that should be used
/// throughout the app to access the current user's information.
@riverpod
class CurrentUser extends _$CurrentUser {
  @override
  Future<UserProfile> build() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 300));

    return DevDataService.getMockCurrentUser();
  }

  /// Update user profile
  Future<void> updateProfile({
    String? displayName,
    String? avatarUrl,
    Map<String, dynamic>? preferences,
  }) async {
    state = const AsyncValue.loading();

    try {
      final currentProfile = await future;

      // Create updated profile
      final updated = currentProfile.copyWith(
        displayName: displayName,
        avatarUrl: avatarUrl,
        preferences: preferences,
        updatedAt: DateTime.now(),
      );

      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));

      // Update state
      state = AsyncValue.data(updated);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Update user preferences
  Future<void> updatePreferences(Map<String, dynamic> preferences) async {
    state = const AsyncValue.loading();

    try {
      final currentProfile = await future;

      // Merge with existing preferences
      final updatedPreferences = {
        ...currentProfile.preferences,
        ...preferences,
      };

      final updated = currentProfile.copyWith(
        preferences: updatedPreferences,
        updatedAt: DateTime.now(),
      );

      // In production, save to database here
      await Future.delayed(const Duration(milliseconds: 500));

      // Update state
      state = AsyncValue.data(updated);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// Refresh user profile
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Provider for connected partners/users
///
/// Returns all users that the current user is connected with.
@riverpod
class Partners extends _$Partners {
  @override
  Future<List<UserProfile>> build() async {
    // Simulate API delay
    await Future.delayed(const Duration(milliseconds: 300));

    return DevDataService.getMockPartners();
  }

  /// Refresh partners list
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// Provider for getting a user by ID (family provider)
///
/// This is a parameterized provider that fetches a specific user's profile.
/// Useful for displaying partner information, event attendees, etc.
@riverpod
Future<UserProfile?> userById(Ref ref, String userId) async {
  // Simulate API delay
  await Future.delayed(const Duration(milliseconds: 200));

  return DevDataService.getMockUserById(userId);
}

/// Provider for current user's ID
///
/// Convenience provider for accessing just the user ID without
/// loading the full profile.
@riverpod
String currentUserId(Ref ref) {
  return DevDataService.currentUserId;
}

/// Provider for current user's display name
@riverpod
String currentUserDisplayName(Ref ref) {
  final user = ref.watch(currentUserProvider);

  return user.when(
    data: (profile) => profile.displayName,
    loading: () => 'Loading...',
    error: (_, __) => 'Unknown',
  );
}

/// Provider for current user's email
@riverpod
String currentUserEmail(Ref ref) {
  final user = ref.watch(currentUserProvider);

  return user.when(
    data: (profile) => profile.email,
    loading: () => '',
    error: (_, __) => '',
  );
}

/// Provider for current user's avatar URL
@riverpod
String? currentUserAvatarUrl(Ref ref) {
  final user = ref.watch(currentUserProvider);

  return user.when(
    data: (profile) => profile.avatarUrl,
    loading: () => null,
    error: (_, __) => null,
  );
}

/// Provider for current user's preferences
@riverpod
Map<String, dynamic> currentUserPreferences(Ref ref) {
  final user = ref.watch(currentUserProvider);

  return user.when(
    data: (profile) => profile.preferences,
    loading: () => {},
    error: (_, __) => {},
  );
}

/// Provider for a specific user preference
@riverpod
dynamic userPreference(Ref ref, String key, {dynamic defaultValue}) {
  final preferences = ref.watch(currentUserPreferencesProvider);
  return preferences[key] ?? defaultValue;
}

/// Provider for partners count
@riverpod
int partnersCount(Ref ref) {
  final partners = ref.watch(partnersProvider);

  return partners.when(
    data: (partnerList) => partnerList.length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provider for checking if a user is a partner
@riverpod
bool isPartner(Ref ref, String userId) {
  final partners = ref.watch(partnersProvider);

  return partners.when(
    data: (partnerList) => partnerList.any((p) => p.id == userId),
    loading: () => false,
    error: (_, __) => false,
  );
}

/// Provider for getting partner by ID
@riverpod
UserProfile? partnerById(Ref ref, String partnerId) {
  final partners = ref.watch(partnersProvider);

  return partners.when(
    data: (partnerList) {
      try {
        return partnerList.firstWhere((p) => p.id == partnerId);
      } catch (e) {
        return null;
      }
    },
    loading: () => null,
    error: (_, __) => null,
  );
}

/// Provider for partners sorted by name
@riverpod
List<UserProfile> partnersSortedByName(Ref ref) {
  final partners = ref.watch(partnersProvider);

  return partners.when(
    data: (partnerList) {
      final sorted = List<UserProfile>.from(partnerList);
      sorted.sort((a, b) => a.displayName.compareTo(b.displayName));
      return sorted;
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for recently active partners
///
/// Returns partners sorted by most recent update time.
@riverpod
List<UserProfile> recentlyActivePartners(Ref ref) {
  final partners = ref.watch(partnersProvider);

  return partners.when(
    data: (partnerList) {
      final sorted = List<UserProfile>.from(partnerList);
      sorted.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return sorted.take(5).toList(); // Return top 5 most recent
    },
    loading: () => [],
    error: (_, __) => [],
  );
}
