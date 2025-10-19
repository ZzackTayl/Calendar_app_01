import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/services/sync_queue_service.dart';

void main() {
  group('SyncQueueService', () {
    test('queue status returns map with expected keys', () {
      final status = SyncQueueService.queueStatus;

      expect(status, isA<Map<String, int>>());
      expect(status.containsKey('total'), isTrue);
      expect(status.containsKey('pending'), isTrue);
      expect(status.containsKey('syncing'), isTrue);
      expect(status.containsKey('failed'), isTrue);
    });

    test('loadQueue completes without error', () async {
      await expectLater(
        SyncQueueService.loadQueue(),
        completes,
      );
    });

    test('processQueue completes without error', () async {
      await expectLater(
        SyncQueueService.processQueue(),
        completes,
      );
    });

    test('clearSyncedItems completes without error', () async {
      await expectLater(
        SyncQueueService.clearSyncedItems(),
        completes,
      );
    });

    test('retryFailed completes without error', () async {
      await expectLater(
        SyncQueueService.retryFailed(),
        completes,
      );
    });

    test('QueuedChange can be created and serialized', () {
      final change = QueuedChange(
        id: 'test-1',
        operation: SyncOperation.create,
        entityType: 'event',
        data: {'id': 'event-1', 'title': 'Test Event'},
        timestamp: DateTime.now(),
      );

      final json = change.toJson();

      expect(json['id'], 'test-1');
      expect(json['operation'], 'create');
      expect(json['entityType'], 'event');
      expect(json['data'], isA<Map<String, dynamic>>());
    });

    test('QueuedChange can be deserialized from JSON', () {
      final now = DateTime.now();
      final json = {
        'id': 'test-1',
        'operation': 'update',
        'entityType': 'contact',
        'data': {'id': 'contact-1', 'name': 'Test Contact'},
        'timestamp': now.toIso8601String(),
        'retries': 2,
        'status': 'pending',
      };

      final change = QueuedChange.fromJson(json);

      expect(change.id, 'test-1');
      expect(change.operation, SyncOperation.update);
      expect(change.entityType, 'contact');
      expect(change.retries, 2);
      expect(change.status, 'pending');
    });

    test('QueuedChange copyWith preserves unchanged fields', () {
      final original = QueuedChange(
        id: 'test-1',
        operation: SyncOperation.create,
        entityType: 'event',
        data: {'id': 'event-1'},
        timestamp: DateTime.now(),
        retries: 0,
        status: 'pending',
      );

      final updated = original.copyWith(retries: 1, status: 'failed');

      expect(updated.id, original.id);
      expect(updated.operation, original.operation);
      expect(updated.entityType, original.entityType);
      expect(updated.retries, 1);
      expect(updated.status, 'failed');
    });
  });
}
