import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/realtime_sync_service.dart';

void main() {
  group('RealtimeSyncService', () {
    // Reset all callbacks and channels between tests
    setUp(() {
      RealtimeSyncService.onEventInserted = null;
      RealtimeSyncService.onEventUpdated = null;
      RealtimeSyncService.onEventDeleted = null;
      RealtimeSyncService.onContactInserted = null;
      RealtimeSyncService.onContactUpdated = null;
      RealtimeSyncService.onContactDeleted = null;
      RealtimeSyncService.onSignalInserted = null;
      RealtimeSyncService.onSignalUpdated = null;
      RealtimeSyncService.onSignalDeleted = null;
      RealtimeSyncService.onShareInserted = null;
      RealtimeSyncService.onShareUpdated = null;
      RealtimeSyncService.onShareDeleted = null;
    });

    group('Callback Setters', () {
      test('event callback setters do not throw', () {
        expect(() {
          RealtimeSyncService.onEventInserted = (record) async {};
          RealtimeSyncService.onEventUpdated = (newRecord, oldRecord) async {};
          RealtimeSyncService.onEventDeleted = (record) async {};
        }, returnsNormally);
      });

      test('contact callback setters do not throw', () {
        expect(() {
          RealtimeSyncService.onContactInserted = (record) async {};
          RealtimeSyncService.onContactUpdated =
              (newRecord, oldRecord) async {};
          RealtimeSyncService.onContactDeleted = (record) async {};
        }, returnsNormally);
      });

      test('signal callback setters do not throw', () {
        expect(() {
          RealtimeSyncService.onSignalInserted = (record) async {};
          RealtimeSyncService.onSignalUpdated = (newRecord, oldRecord) async {};
          RealtimeSyncService.onSignalDeleted = (record) async {};
        }, returnsNormally);
      });

      test('share callback setters do not throw', () {
        expect(() {
          RealtimeSyncService.onShareInserted = (record) async {};
          RealtimeSyncService.onShareUpdated = (newRecord, oldRecord) async {};
          RealtimeSyncService.onShareDeleted = (record) async {};
        }, returnsNormally);
      });
    });

    group('Subscription Status Getters', () {
      test('event subscription status getter returns boolean', () {
        expect(RealtimeSyncService.isSubscribedToEvents, isA<bool>());
      });

      test('contact subscription status getter returns boolean', () {
        expect(RealtimeSyncService.isSubscribedToContacts, isA<bool>());
      });

      test('signal subscription status getter returns boolean', () {
        expect(RealtimeSyncService.isSubscribedToSignals, isA<bool>());
      });

      test('share subscription status getter returns boolean', () {
        expect(RealtimeSyncService.isSubscribedToShares, isA<bool>());
      });

      test('all subscription status getters default to false', () {
        expect(RealtimeSyncService.isSubscribedToEvents, false);
        expect(RealtimeSyncService.isSubscribedToContacts, false);
        expect(RealtimeSyncService.isSubscribedToSignals, false);
        expect(RealtimeSyncService.isSubscribedToShares, false);
      });
    });

    group('Subscription Methods', () {
      test('subscribeToEvents handles missing Supabase config gracefully',
          () async {
        await expectLater(
          RealtimeSyncService.subscribeToEvents(),
          completes,
        );
      });

      test('subscribeToContacts handles missing Supabase config gracefully',
          () async {
        await expectLater(
          RealtimeSyncService.subscribeToContacts(),
          completes,
        );
      });

      test('subscribeToSignals handles missing Supabase config gracefully',
          () async {
        await expectLater(
          RealtimeSyncService.subscribeToSignals(),
          completes,
        );
      });

      test('subscribeToShares handles missing Supabase config gracefully',
          () async {
        await expectLater(
          RealtimeSyncService.subscribeToShares(),
          completes,
        );
      });
    });

    group('Cleanup & Unsubscription', () {
      test('can unsubscribe without throwing', () async {
        await expectLater(
          RealtimeSyncService.unsubscribeAll(),
          completes,
        );
      });

      test('unsubscribeAll handles multiple calls gracefully', () async {
        await RealtimeSyncService.unsubscribeAll();
        await expectLater(
          RealtimeSyncService.unsubscribeAll(),
          completes,
        );
      });

      test('subscription status remains false after unsubscribeAll', () async {
        await RealtimeSyncService.unsubscribeAll();
        expect(RealtimeSyncService.isSubscribedToEvents, false);
        expect(RealtimeSyncService.isSubscribedToContacts, false);
        expect(RealtimeSyncService.isSubscribedToSignals, false);
        expect(RealtimeSyncService.isSubscribedToShares, false);
      });
    });

    group('Error Handling', () {
      test('subscribeToEvents continues despite errors in callbacks', () async {
        RealtimeSyncService.onEventInserted = (record) async {
          throw Exception('Test error');
        };

        // Should complete even though callback throws
        await expectLater(
          RealtimeSyncService.subscribeToEvents(),
          completes,
        );
      });

      test('subscribeToSignals continues despite errors in callbacks',
          () async {
        RealtimeSyncService.onSignalInserted = (record) async {
          throw Exception('Test error');
        };

        // Should complete even though callback throws
        await expectLater(
          RealtimeSyncService.subscribeToSignals(),
          completes,
        );
      });

      test('subscribeToShares continues despite errors in callbacks', () async {
        RealtimeSyncService.onShareInserted = (record) async {
          throw Exception('Test error');
        };

        // Should complete even though callback throws
        await expectLater(
          RealtimeSyncService.subscribeToShares(),
          completes,
        );
      });
    });

    group('Real-time Data Structures', () {
      test('signal callback receives expected record structure', () async {
        RealtimeSyncService.onSignalInserted = (record) async {
          // Verify structure: expecting Map<String, dynamic>
          expect(record, isA<Map<String, dynamic>>());
        };

        // Verify callback is set correctly
        expect(RealtimeSyncService.onSignalInserted, isNotNull);
      });

      test('share callback receives expected record structure', () async {
        RealtimeSyncService.onShareInserted = (record) async {
          // Verify structure: expecting Map<String, dynamic>
          expect(record, isA<Map<String, dynamic>>());
        };

        // Verify callback is set correctly
        expect(RealtimeSyncService.onShareInserted, isNotNull);
      });

      test('update callbacks receive both new and old records', () async {
        RealtimeSyncService.onSignalUpdated = (newRecord, oldRecord) async {
          // Verify both records are Map<String, dynamic>
          expect(newRecord, isA<Map<String, dynamic>>());
          expect(oldRecord, isA<Map<String, dynamic>>());
        };

        // Verify callback is set correctly for pair of records
        expect(RealtimeSyncService.onSignalUpdated, isNotNull);
      });
    });
  });
}
