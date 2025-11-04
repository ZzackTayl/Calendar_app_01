import 'dart:async';
import 'dart:developer' as developer;

import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/color_utils.dart';
import '../../core/supabase_client.dart';
import '../../features/contacts/domain/entities/contact.dart';
import '../../features/contacts/data/models/contact_model.dart';
import '../services/api_service.dart';
import '../services/conflict_resolution_service.dart';
import '../services/offline_cache_service.dart';
import '../services/permission_service.dart';
import '../services/realtime_sync_service.dart';
import '../services/sync_queue_service.dart';
import 'event_providers.dart';

part 'contact_providers.g.dart';

/// Provider for the list of contacts/partners
@riverpod
class ContactList extends _$ContactList {
  List<Contact> _offlineContacts = const [];

  bool get _useSupabase => SupabaseService.isConfigured;

  @override
  Future<List<Contact>> build() async {
    if (!_useSupabase) {
      final loaded = await OfflineCacheService.loadContacts();
      final normalized = _normalizeContacts(loaded);
      _offlineContacts = normalized;
      await OfflineCacheService.saveContacts(_offlineContacts);
      return List.unmodifiable(normalized);
    }

    final result = await ContactApi.getContacts();
    final contacts = result.when(
      success: (contacts) => _normalizeContacts(contacts),
      failure: (message, exception) => throw Exception(message),
    );

    // Set up real-time listeners
    _setupRealtimeListeners();

    // Cleanup on dispose
    ref.onDispose(() {
      RealtimeSyncService.onContactInserted = null;
      RealtimeSyncService.onContactUpdated = null;
      RealtimeSyncService.onContactDeleted = null;
    });

    return contacts;
  }

  void _setupRealtimeListeners() {
    // Handle remote inserts
    RealtimeSyncService.onContactInserted = (record) async {
      developer.log('Remote contact inserted: ${record['id']}',
          name: 'ContactList');
      try {
        final contact = ContactModel.fromJson(record);
        await _handleRemoteInsert(contact);
      } catch (e) {
        developer.log('Error handling remote contact insert: $e',
            name: 'ContactList');
      }
    };

    // Handle remote updates
    RealtimeSyncService.onContactUpdated = (newRecord, oldRecord) async {
      developer.log('Remote contact updated: ${newRecord['id']}',
          name: 'ContactList');
      try {
        final contact = ContactModel.fromJson(newRecord);
        await _handleRemoteUpdate(contact);
      } catch (e) {
        developer.log('Error handling remote contact update: $e',
            name: 'ContactList');
      }
    };

    // Handle remote deletes
    RealtimeSyncService.onContactDeleted = (record) async {
      developer.log('Remote contact deleted: ${record['id']}',
          name: 'ContactList');
      try {
        final contactId = record['id'] as String;
        await _handleRemoteDelete(contactId);
      } catch (e) {
        developer.log('Error handling remote contact delete: $e',
            name: 'ContactList');
      }
    };

    // Start listening
    RealtimeSyncService.subscribeToContacts();
  }

  Future<void> _handleRemoteInsert(Contact contact) async {
    final normalizedContact = _withColor(contact);
    state.whenData((currentContacts) {
      final exists = currentContacts.any((c) => c.id == normalizedContact.id);
      if (!exists) {
        final updated = [
          ...currentContacts,
          normalizedContact
        ]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
        state = AsyncValue.data(updated);
      }
    });
  }

  Future<void> _handleRemoteUpdate(Contact remoteContact) async {
    final normalizedRemote = _withColor(remoteContact);
    state.whenData((currentContacts) {
      final index = currentContacts.indexWhere((c) => c.id == normalizedRemote.id);
      if (index != -1) {
        final localContact = currentContacts[index];

        // Use conflict resolution
        final resolvedContact =
            ConflictResolutionService.resolveContactConflict(
          localVersion: localContact,
          remoteVersion: normalizedRemote,
        );

        final updated = [...currentContacts];
        updated[index] = resolvedContact;
        updated.sort(
            (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
        state = AsyncValue.data(updated);
      } else {
        // Contact doesn't exist locally, add it
        final updated = [
          ...currentContacts,
          remoteContact
        ]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
        state = AsyncValue.data(updated);
      }
    });
  }

  Future<void> _handleRemoteDelete(String contactId) async {
    state.whenData((currentContacts) {
      final updated = currentContacts.where((c) => c.id != contactId).toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      state = AsyncValue.data(updated);
    });
  }

  List<Contact> _normalizeContacts(List<Contact> contacts) {
    if (contacts.isEmpty) return contacts;

    return contacts.map(_withColor).toList(growable: false)
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  }

  Contact _withColor(Contact contact) {
    final hex = contact.colorHex;
    if (hex != null && hex.isNotEmpty) {
      return contact;
    }

    final fallbackHex = ContactColorUtils.hexForName(contact.name);
    final updated = contact.copyWith(colorHex: fallbackHex);
    _scheduleColorPersistence(updated);
    return updated;
  }

  void _scheduleColorPersistence(Contact contact) {
    scheduleMicrotask(() async {
      await _persistColor(contact);
    });
  }

  Future<void> _persistColor(Contact contact) async {
    if (_useSupabase) {
      final result = await ContactApi.updateContact(contact);
      result.when(
        success: (_) {},
        failure: (message, exception) {
          developer.log(
            'Failed to backfill contact color: $message',
            name: 'ContactList',
            error: exception,
          );
        },
      );
      return;
    }

    final index = _offlineContacts.indexWhere((c) => c.id == contact.id);
    if (index == -1) return;

    final mutable = [..._offlineContacts];
    mutable[index] = contact;
    mutable.sort(
      (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()),
    );
    _offlineContacts = mutable;
    await OfflineCacheService.saveContacts(_offlineContacts);
    state = AsyncValue.data(List.unmodifiable(_offlineContacts));
  }

  /// Add a new contact
  Future<void> addContact(Contact contact) async {
    final ensuredColorContact = contact.colorHex == null
        ? contact.copyWith(
            colorHex: ContactColorUtils.hexForName(contact.name),
          )
        : contact;

    if (!_useSupabase) {
      _offlineContacts = [
        ..._offlineContacts.where((existing) => existing.id != contact.id),
        ensuredColorContact,
      ]..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      state = AsyncValue.data(List.unmodifiable(_offlineContacts));
      await OfflineCacheService.saveContacts(_offlineContacts);
      await SyncQueueService.queueChange(
        operation: SyncOperation.create,
        entityType: 'contact',
        data: ContactModel.fromEntity(ensuredColorContact).toJson(),
      );
      return;
    }

    state = const AsyncValue.loading();

    final result = await ContactApi.createContact(ensuredColorContact);
    await result.when(
      success: (_) async {
        // Refresh the contact list
        final refreshResult = await ContactApi.getContacts();
        refreshResult.when(
          success: (contacts) => state = AsyncValue.data(contacts),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Update an existing contact (including permission changes)
  Future<void> updateContact(
    Contact contact, {
    bool showWarning = true,
  }) async {
    if (!_useSupabase) {
      final index = _offlineContacts.indexWhere((c) => c.id == contact.id);
      if (index != -1) {
        final mutable = [..._offlineContacts];
        mutable[index] = contact;
        mutable.sort(
            (a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
        _offlineContacts = mutable;
        state = AsyncValue.data(List.unmodifiable(_offlineContacts));
        await OfflineCacheService.saveContacts(_offlineContacts);
        await SyncQueueService.queueChange(
          operation: SyncOperation.update,
          entityType: 'contact',
          data: ContactModel.fromEntity(contact).toJson(),
        );
      }
      return;
    }

    // If permission changed, validate and potentially warn
    if (showWarning) {
      final currentState = state;
      if (currentState is AsyncData<List<Contact>>) {
        final oldContact = currentState.value.firstWhere(
          (c) => c.id == contact.id,
          orElse: () => contact,
        );

        if (oldContact.permission != contact.permission) {
          // Permission changed - get warnings
          final events = await ref.read(eventListProvider.future);
          final warnings = PermissionService.validatePermissionChange(
            contact: oldContact,
            newPermission: contact.permission,
            allEvents: events,
            allContacts: currentState.value,
          );

          // In a real app, you'd show these warnings to the user
          // For now, we just log them
          if (warnings.isNotEmpty) {
            // You could expose this through a callback or state
            // For now, the update will proceed
          }
        }
      }
    }

    state = const AsyncValue.loading();

    final result = await ContactApi.updateContact(contact);
    await result.when(
      success: (_) async {
        // Refresh the contact list
        final refreshResult = await ContactApi.getContacts();
        refreshResult.when(
          success: (contacts) => state = AsyncValue.data(contacts),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Delete a contact
  Future<void> deleteContact(String contactId) async {
    if (!_useSupabase) {
      // Capture full contact for queueing delete (if present)
      Contact? toDelete;
      for (final c in _offlineContacts) {
        if (c.id == contactId) {
          toDelete = c;
          break;
        }
      }

      _offlineContacts = _offlineContacts
          .where((contact) => contact.id != contactId)
          .toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      state = AsyncValue.data(List.unmodifiable(_offlineContacts));
      await OfflineCacheService.saveContacts(_offlineContacts);
      if (toDelete != null) {
        await SyncQueueService.queueChange(
          operation: SyncOperation.delete,
          entityType: 'contact',
          data: ContactModel.fromEntity(toDelete).toJson(),
        );
      }
      return;
    }

    state = const AsyncValue.loading();

    final result = await ContactApi.deleteContact(contactId);
    await result.when(
      success: (_) async {
        // Refresh the contact list
        final refreshResult = await ContactApi.getContacts();
        refreshResult.when(
          success: (contacts) => state = AsyncValue.data(contacts),
          failure: (message, exception) =>
              state = AsyncValue.error(Exception(message), StackTrace.current),
        );
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Update contact permission level
  Future<void> updateContactPermission(
    String contactId,
    PartnerPermission newPermission,
  ) async {
    final currentState = state;
    if (currentState is AsyncData<List<Contact>>) {
      final contact = currentState.value.firstWhere(
        (c) => c.id == contactId,
        orElse: () => throw Exception('Contact not found'),
      );

      await updateContact(
        contact.copyWith(permission: newPermission),
      );
    }
  }

  /// Update contact color assignment.
  Future<void> updateContactColor(
    String contactId,
    String colorHex,
  ) async {
    final currentState = state;
    if (currentState is! AsyncData<List<Contact>>) return;

    final contact = currentState.value.firstWhere(
      (c) => c.id == contactId,
      orElse: () => throw Exception('Contact not found'),
    );

    await updateContact(
      contact.copyWith(colorHex: colorHex),
      showWarning: false,
    );
  }

  /// Refresh contacts
  Future<void> refresh() async {
    if (!_useSupabase) {
      _offlineContacts = await OfflineCacheService.loadContacts();
      state = AsyncValue.data(List.unmodifiable(_offlineContacts));
      return;
    }

    state = const AsyncValue.loading();

    final result = await ContactApi.getContacts();
    result.when(
      success: (contacts) => state = AsyncValue.data(contacts),
      failure: (message, exception) =>
          state = AsyncValue.error(Exception(message), StackTrace.current),
    );
  }
}

/// Provider for accepted/connected contacts only
@riverpod
List<Contact> acceptedContacts(Ref ref) {
  final contacts = ref.watch(contactListProvider);

  return contacts.when(
    data: (contactList) {
      return contactList
          .where((contact) => contact.status == ContactStatus.accepted)
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Alias for accepted contacts - "connected partners"
///
/// This is a convenience alias that makes the code more readable
/// when referring to accepted contacts as "partners".
@riverpod
List<Contact> connectedPartners(Ref ref) {
  return ref.watch(acceptedContactsProvider);
}

/// Provider for pending invites
@riverpod
List<Contact> pendingContacts(Ref ref) {
  final contacts = ref.watch(contactListProvider);

  return contacts.when(
    data: (contactList) {
      return contactList
          .where((contact) => contact.status == ContactStatus.pending)
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Alias for pending contacts - "pending invites"
///
/// This is a convenience alias that makes the code more readable
/// when referring to pending contacts as "invites".
@riverpod
List<Contact> pendingInvites(Ref ref) {
  return ref.watch(pendingContactsProvider);
}

/// Provider for contact-only entries (reference contacts)
@riverpod
List<Contact> contactOnlyContacts(Ref ref) {
  final contacts = ref.watch(contactListProvider);

  return contacts.when(
    data: (contactList) {
      return contactList
          .where((contact) => contact.status == ContactStatus.contactOnly)
          .toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provider for contact counts (for dashboard, UI badges, etc.)
@riverpod
ContactCounts contactCounts(Ref ref) {
  final contacts = ref.watch(contactListProvider);

  return contacts.when(
    data: (contactList) {
      return ContactCounts(
        accepted:
            contactList.where((c) => c.status == ContactStatus.accepted).length,
        pending:
            contactList.where((c) => c.status == ContactStatus.pending).length,
        contactOnly: contactList
            .where((c) => c.status == ContactStatus.contactOnly)
            .length,
        total: contactList.length,
      );
    },
    loading: () => ContactCounts.zero(),
    error: (_, __) => ContactCounts.zero(),
  );
}

/// Provider for free tier limit checks
@riverpod
bool isAtConnectionLimit(Ref ref) {
  const freeConnectionLimit = 3;
  final counts = ref.watch(contactCountsProvider);
  return counts.accepted >= freeConnectionLimit;
}

/// Provider to check if user can add more accepted connections
@riverpod
bool canAddConnection(Ref ref, {bool isPro = false}) {
  if (isPro) return true; // Pro users have unlimited
  return !ref.watch(isAtConnectionLimitProvider);
}

/// Provider for contacts grouped by permission level
@riverpod
Map<PartnerPermission, List<Contact>> contactsByPermission(Ref ref) {
  final contacts = ref.watch(acceptedContactsProvider);

  final grouped = <PartnerPermission, List<Contact>>{
    PartnerPermission.visible: [],
    PartnerPermission.semiVisible: [],
    PartnerPermission.private: [],
  };

  for (final contact in contacts) {
    grouped[contact.permission]!.add(contact);
  }

  return grouped;
}

/// Provider for specific contact by ID
@riverpod
Contact? contactById(Ref ref, String contactId) {
  final contacts = ref.watch(contactListProvider);

  return contacts.when(
    data: (contactList) {
      try {
        return contactList.firstWhere((c) => c.id == contactId);
      } catch (e) {
        return null;
      }
    },
    loading: () => null,
    error: (_, __) => null,
  );
}

/// Contact counts data class
class ContactCounts {
  final int accepted;
  final int pending;
  final int contactOnly;
  final int total;

  const ContactCounts({
    required this.accepted,
    required this.pending,
    required this.contactOnly,
    required this.total,
  });

  factory ContactCounts.zero() {
    return const ContactCounts(
      accepted: 0,
      pending: 0,
      contactOnly: 0,
      total: 0,
    );
  }

  @override
  String toString() =>
      'ContactCounts(accepted: $accepted, pending: $pending, contactOnly: $contactOnly, total: $total)';
}
