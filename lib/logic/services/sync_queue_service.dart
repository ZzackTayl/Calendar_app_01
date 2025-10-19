import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:developer' as developer;
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
      await prefs.setString(_queueKey, jsonEncode(json));
    } catch (e) {
      developer.log('Failed to persist queue: $e', name: 'SyncQueueService');
    }
  }

  /// Load queue from local storage
  static Future<void> loadQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString(_queueKey);
      
      if (stored != null) {
        final json = jsonDecode(stored) as List;
        _queue = json
            .cast<Map<String, dynamic>>()
            .map((item) => QueuedChange.fromJson(item))
            .where((c) => c.status != 'synced')
            .toList();
        
        developer.log('Loaded ${_queue.length} items from sync queue',
            name: 'SyncQueueService');
      }
    } catch (e) {
      developer.log('Failed to load queue: $e', name: 'SyncQueueService');
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
}
