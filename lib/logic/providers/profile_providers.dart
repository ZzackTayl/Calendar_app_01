import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../domain/user_profile.dart';
import '../services/dev_data_service.dart';

/// Provides the current logged-in user's profile using mock data.
final currentUserProvider =
    FutureProvider.autoDispose<UserProfile>((ref) async {
  await Future<void>.microtask(() {});
  return DevDataService.getMockCurrentUser();
});

/// Looks up a user profile by their user ID using mock data.
final userProfileByIdProvider =
    FutureProvider.autoDispose.family<UserProfile?, String>(
  (ref, userId) async {
    await Future<void>.microtask(() {});
    return DevDataService.getMockUserById(userId);
  },
);
