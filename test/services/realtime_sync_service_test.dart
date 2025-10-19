import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/realtime_sync_service.dart';

void main() {
  group('RealtimeSyncService', () {
    test('callback setters do not throw', () {
      expect(() {
        RealtimeSyncService.onEventInserted = (record) async {};
        RealtimeSyncService.onEventUpdated = (newRecord, oldRecord) async {};
        RealtimeSyncService.onEventDeleted = (record) async {};
        RealtimeSyncService.onContactInserted = (record) async {};
        RealtimeSyncService.onContactUpdated = (newRecord, oldRecord) async {};
        RealtimeSyncService.onContactDeleted = (record) async {};
      }, returnsNormally);
    });

    test('subscription status getters return boolean', () {
      expect(RealtimeSyncService.isSubscribedToEvents, isA<bool>());
      expect(RealtimeSyncService.isSubscribedToContacts, isA<bool>());
    });

    test('can unsubscribe without throwing', () async {
      await expectLater(
        RealtimeSyncService.unsubscribeAll(),
        completes,
      );
    });
  });
}
