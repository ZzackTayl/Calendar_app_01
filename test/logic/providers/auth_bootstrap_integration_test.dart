import 'package:mockito/mockito.dart';
import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/core/supabase_client.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/logic/services/api_service.dart';
import 'package:myorbit_calendar/logic/services/profile_api.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:test/test.dart';

import '../../services/event_invite_api_test.mocks.dart';

void main() {
  setUpAll(() async {
    await TimezoneService.initialize();
  });

  tearDown(() {
    AuthApi.debugOAuthSignInOverride = null;
    ProfileApi.debugUpsertHandler = null;
    CalendarApi.debugFetchExistingCalendar = null;
    CalendarApi.debugInsertCalendar = null;
    SupabaseService.debugSetClient(null);
    SupabaseService.debugResetAuthOverride();
    resetMockitoState();
  });

  group('AuthApi.signInWithGoogle', () {
    late MockSupabaseClient mockClient;
    late MockGoTrueClient mockAuth;

    setUp(() {
      mockClient = MockSupabaseClient();
      mockAuth = MockGoTrueClient();

      when(mockClient.auth).thenReturn(mockAuth);
      SupabaseService.debugSetClient(mockClient);
    });

    test('uses deep link redirect URI for Supabase OAuth', () async {
      OAuthProvider? capturedProvider;
      String? capturedRedirect;
      AuthApi.debugOAuthSignInOverride = (_, provider, redirectUri) async {
        capturedProvider = provider;
        capturedRedirect = redirectUri;
      };

      final result = await AuthApi.signInWithGoogle();

      expect(result, isA<Success<void>>());
      expect(capturedProvider, OAuthProvider.google);
      expect(capturedRedirect, 'myorbit://callback');
    });
  });

  group('Bootstrap helpers', () {
    late MockSupabaseClient mockClient;
    late MockGoTrueClient mockAuth;
    late User user;

    setUp(() {
      mockClient = MockSupabaseClient();
      mockAuth = MockGoTrueClient();

      when(mockClient.auth).thenReturn(mockAuth);
      SupabaseService.debugSetClient(mockClient);
      SupabaseService.debugOverrideAuthState(isConfigured: true);

      user = User(
        id: 'user-123',
        appMetadata: const {},
        userMetadata: const {
          'full_name': 'Jane Smith',
          'picture': 'https://example.com/avatar.png',
        },
        aud: 'authenticated',
        email: 'JANE.SMITH@example.com',
        createdAt: DateTime.utc(2024, 1, 1).toIso8601String(),
      );
      when(mockAuth.currentUser).thenReturn(user);
    });

    test('ProfileApi.upsertCurrentUserProfile normalizes payload', () async {
      Map<String, dynamic>? captured;
      ProfileApi.debugUpsertHandler =
          (client, payload) async => captured = payload;

      final result = await ProfileApi.upsertCurrentUserProfile();

      expect(result, isA<Success<void>>());
      expect(captured, isNotNull);
      expect(captured!['id'], user.id);
      expect(captured!['email'], 'jane.smith@example.com');
      expect(captured!['display_name'], 'Jane Smith');
      expect(captured!['avatar_url'], 'https://example.com/avatar.png');
      expect(captured!['timezone'], isNotEmpty);
      expect(captured, contains('updated_at'));
    });

    test('CalendarApi.ensurePrimaryCalendarForCurrentUser inserts when missing',
        () async {
      CalendarApi.debugFetchExistingCalendar =
          (_, __) async => null; // no calendars yet
      Map<String, dynamic>? inserted;
      CalendarApi.debugInsertCalendar =
          (_, payload) async => inserted = payload;

      final result = await CalendarApi.ensurePrimaryCalendarForCurrentUser();

      expect(result, isA<Success<void>>());
      expect(inserted, isNotNull);
      expect(inserted!['owner_id'], user.id);
      expect(inserted!['is_primary'], isTrue);
      expect(inserted!['is_visible'], isTrue);
    });

    test('CalendarApi.ensurePrimaryCalendarForCurrentUser skips existing',
        () async {
      CalendarApi.debugFetchExistingCalendar =
          (_, __) async => {'id': 'existing-calendar'};
      var insertCalled = false;
      CalendarApi.debugInsertCalendar = (_, __) async => insertCalled = true;

      final result = await CalendarApi.ensurePrimaryCalendarForCurrentUser();

      expect(result, isA<Success<void>>());
      expect(insertCalled, isFalse);
    });
  });
}
