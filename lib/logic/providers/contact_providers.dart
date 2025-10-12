import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/contact.dart';
import '../services/api_service.dart';
import '../services/permission_service.dart';
import 'event_providers.dart';

part 'contact_providers.g.dart';

/// Provider for the list of contacts/partners
@riverpod
class ContactList extends _$ContactList {
  @override
  Future<List<Contact>> build() async {
    return await ContactApi.getContacts();
  }

  /// Add a new contact
  Future<void> addContact(Contact contact) async {
    state = const AsyncValue.loading();
    try {
      await ContactApi.createContact(contact);
      // Refresh the contact list
      state = AsyncValue.data(await ContactApi.getContacts());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Update an existing contact (including permission changes)
  Future<void> updateContact(
    Contact contact, {
    bool showWarning = true,
  }) async {
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
    try {
      await ContactApi.updateContact(contact);
      // Refresh the contact list
      state = AsyncValue.data(await ContactApi.getContacts());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Delete a contact
  Future<void> deleteContact(String contactId) async {
    state = const AsyncValue.loading();
    try {
      await ContactApi.deleteContact(contactId);
      // Refresh the contact list
      state = AsyncValue.data(await ContactApi.getContacts());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
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

  /// Refresh contacts
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    try {
      state = AsyncValue.data(await ContactApi.getContacts());
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
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
        accepted: contactList
            .where((c) => c.status == ContactStatus.accepted)
            .length,
        pending:
            contactList.where((c) => c.status == ContactStatus.pending).length,
        contactOnly:
            contactList.where((c) => c.status == ContactStatus.contactOnly).length,
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
