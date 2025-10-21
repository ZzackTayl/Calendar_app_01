import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;
import '../../core/services/encryption_service.dart';
import '../../core/services/secure_storage_service.dart';
import '../../core/supabase_client.dart';
import 'api_service.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';

enum SyncOperation {
  create,
  update,
  delete,
}

class QueuedChange {
  final String id;
  final SyncOperation operation;
  final String entityType; // 'event' or 'contact'
  final Map<String, dynamic> data;
  final DateTime timestamp;
  final int retries;
  final String status; // 'pending', 'syncing', 'synced', 'failed'

  const QueuedChange({
    required this.id,
    required this.operation,
    required this.entityType,
    required this.data,
    required this.timestamp,
    this.retries = 0,
    this.status = 'pending',
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'operation': operation.name,
        'entityType': entityType,
        'data': data,
        'timestamp': timestamp.toIso8601String(),
        'retries': retries,
        'status': status,
      };

  factory QueuedChange.fromJson(Map<String, dynamic> json) {
    return QueuedChange(
      id: json['id'] as String,
      operation: SyncOperation.values.firstWhere(
        (e) => e.name == json['operation'],
      ),
      entityType: json['entityType'] as String,
      data: Map<String, dynamic>.from(json['data'] as Map),
      timestamp: DateTime.parse(json['timestamp'] as String),
      retries: json['retries'] as int? ?? 0,
      status: json['status'] as String? ?? 'pending',
    );
  }

  QueuedChange copyWith({
    String? id,
    SyncOperation? operation,
    String? entityType,
    Map<String, dynamic>? data,
    DateTime? timestamp,
    int? retries,
    String? status,
  }) {
    return QueuedChange(
      id: id ?? this.id,
      operation: operation ?? this.operation,
      entityType: entityType ?? this.entityType,
      data: data ?? this.data,
      timestamp: timestamp ?? this.timestamp,
      retries: retries ?? this.retries,
      status: status ?? this.status,
    );
  }
}

class SyncQueueService {
  static const String _queueKey = 'sync_queue';
  static const int maxRetries = 3;

  static List<QueuedChange> _queue = [];
  static bool _isProcessing = false;

  /// Queue a change to be synced when online
  static Future<void> queueChange({
    required SyncOperation operation,
    required String entityType,
    required Map<String, dynamic> data,
  }) async {
    final change = QueuedChange(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      operation: operation,
      entityType: entityType,
      data: data,
      timestamp: DateTime.now(),
    );

    _queue.add(change);
    await _persistQueue();

    developer.log(
      'Queued ${operation.name} for $entityType: ${data['id']}',
      name: 'SyncQueueService',
    );

    // Try to process immediately if online
    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      await processQueue();
    }
  }

  /// Process all pending changes in the queue
  static Future<void> processQueue() async {
    if (_isProcessing || _queue.isEmpty) return;
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      developer.log('Cannot process queue - offline or not authenticated',
          name: 'SyncQueueService');
      return;
    }

    _isProcessing = true;
    developer.log('Processing sync queue (${_queue.length} items)',
        name: 'SyncQueueService');

    final toProcess = List<QueuedChange>.from(_queue);

    for (var i = 0; i < toProcess.length; i++) {
      final change = toProcess[i];

      if (change.status == 'synced') continue;

      try {
        await _syncChange(change);

        // Mark as synced and remove from queue
        _queue.removeWhere((c) => c.id == change.id);
        developer.log(
          'Synced ${change.operation.name} for ${change.entityType}',
          name: 'SyncQueueService',
        );
      } catch (e) {
        developer.log(
          'Failed to sync ${change.operation.name} for ${change.entityType}: $e',
          name: 'SyncQueueService',
        );

        // Update retry count
        final retries = change.retries + 1;
        final newStatus = retries >= maxRetries ? 'failed' : 'pending';

        final index = _queue.indexWhere((c) => c.id == change.id);
        if (index != -1) {
          _queue[index] = change.copyWith(
            retries: retries,
            status: newStatus,
          );
        }
      }
    }

    await _persistQueue();
    _isProcessing = false;

    if (_queue.where((c) => c.status == 'failed').isNotEmpty) {
      developer.log(
        'Some changes failed to sync after $maxRetries attempts',
        name: 'SyncQueueService',
      );
    }
  }

  /// Sync a single change to Supabase
  static Future<void> _syncChange(QueuedChange change) async {
    switch (change.entityType) {
      case 'event':
        await _syncEventChange(change);
        break;
      case 'contact':
        await _syncContactChange(change);
        break;
      default:
        developer.log('Unknown entity type: ${change.entityType}',
            name: 'SyncQueueService');
    }
  }

  /// Sync an event change
  static Future<void> _syncEventChange(QueuedChange change) async {
    final event = CalendarEvent.fromJson(change.data);

    switch (change.operation) {
      case SyncOperation.create:
        final result = await CalendarApi.createEvent(event);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;

      case SyncOperation.update:
        final result = await CalendarApi.updateEvent(event);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;

      case SyncOperation.delete:
        final result = await CalendarApi.deleteEvent(event.id);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;
    }
  }

  /// Sync a contact change
  static Future<void> _syncContactChange(QueuedChange change) async {
    final contact = Contact.fromJson(change.data);

    switch (change.operation) {
      case SyncOperation.create:
        final result = await ContactApi.createContact(contact);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;

      case SyncOperation.update:
        final result = await ContactApi.updateContact(contact);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;

      case SyncOperation.delete:
        final result = await ContactApi.deleteContact(contact.id);
        result.when(
          success: (_) {},
          failure: (message, exception) => throw Exception(message),
        );
        break;
    }
  }

  /// Persist queue to local storage
  static Future<void> _persistQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = _queue.map((c) => c.toJson()).toList();
      final encryptionKey = await _getEncryptionKey();
      final encoded = jsonEncode(json);
      final encrypted = EncryptionService.encrypt(encoded, encryptionKey);
      await prefs.setString(_queueKey, encrypted);
    } catch (e) {
      developer.log('Failed to persist queue: $e', name: 'SyncQueueService');
    }
  }

  /// Load queue from local storage with timeout protection
  /// 
  /// Handles macOS secure storage issues gracefully by:
  /// 1. Adding timeout protection (5 seconds) around secure storage operations
  /// 2. Falling back to in-memory storage on timeout
  /// 3. Gracefully initializing empty queue on any error
  /// 
  /// This allows the app to remain responsive on all platforms while preserving
  /// offline sync queue functionality where possible.
  static Future<void> loadQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance().timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          developer.log('SharedPreferences timeout on load', name: 'SyncQueueService');
          throw TimeoutException('SharedPreferences read timeout');
        },
      );

      final stored = prefs.getString(_queueKey);

      if (stored != null && stored.isNotEmpty) {
        try {
          // Attempt to decrypt the stored queue with timeout protection
          final encryptionKeyFuture = _getEncryptionKeyWithTimeout();
          final encryptionKey = await encryptionKeyFuture;
          
          String? decrypted = EncryptionService.decrypt(stored, encryptionKey);
          decrypted ??= stored;

          final json = jsonDecode(decrypted) as List;
          _queue = json
              .cast<Map<String, dynamic>>()
              .map((item) => QueuedChange.fromJson(item))
              .where((c) => c.status != 'synced')
              .toList();

          developer.log('✅ Loaded ${_queue.length} items from sync queue',
              name: 'SyncQueueService');
        } catch (decryptError) {
          developer.log(
            '⚠️  Failed to decrypt queue (might be corrupted): $decryptError. Starting fresh.',
            name: 'SyncQueueService',
          );
          _queue = [];
        }
      } else {
        _queue = [];
      }
    } on TimeoutException catch (e) {
      developer.log(
        '⚠️  Timeout loading sync queue from storage: $e. Starting with empty queue.',
        name: 'SyncQueueService',
      );
      _queue = [];
    } catch (e, stackTrace) {
      developer.log(
        '⚠️  Failed to load queue: $e',
        name: 'SyncQueueService',
        error: e,
        stackTrace: stackTrace,
      );
      _queue = [];
    }
  }

  /// Get current queue status
  static Map<String, int> get queueStatus {
    return {
      'total': _queue.length,
      'pending': _queue.where((c) => c.status == 'pending').length,
      'syncing': _queue.where((c) => c.status == 'syncing').length,
      'failed': _queue.where((c) => c.status == 'failed').length,
    };
  }

  /// Clear all synced items from queue
  static Future<void> clearSyncedItems() async {
    _queue.removeWhere((c) => c.status == 'synced');
    await _persistQueue();
  }

  /// Retry all failed items
  static Future<void> retryFailed() async {
    for (var i = 0; i < _queue.length; i++) {
      if (_queue[i].status == 'failed') {
        _queue[i] = _queue[i].copyWith(
          status: 'pending',
          retries: 0,
        );
      }
    }
    await _persistQueue();
    await processQueue();
  }

  static Future<String> _getEncryptionKey() async {
    const storageKey = 'sync_queue_secure_key';
    final existing = await SecureStorageService.read(storageKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final generated = EncryptionService.generateSecureMasterKey();
    await SecureStorageService.write(storageKey, generated);
    return generated;
  }

  /// Get encryption key with timeout protection (3 seconds)
  /// Falls back to generating a new key if timeout occurs
  static Future<String> _getEncryptionKeyWithTimeout() async {
    try {
      return await _getEncryptionKey().timeout(
        const Duration(seconds: 3),
        onTimeout: () {
          developer.log(
            '⚠️  Timeout getting encryption key, generating new one',
            name: 'SyncQueueService',
          );
          return EncryptionService.generateSecureMasterKey();
        },
      );
    } catch (e) {
      developer.log(
        '⚠️  Error getting encryption key: $e, generating new one',
        name: 'SyncQueueService',
      );
      return EncryptionService.generateSecureMasterKey();
    }
  }

}
