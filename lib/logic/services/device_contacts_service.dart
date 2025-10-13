import 'package:contacts_service/contacts_service.dart' as contacts_service;
import 'package:permission_handler/permission_handler.dart';
import '../../core/result.dart';
import '../../domain/contact.dart';

/// Service for accessing device contacts with proper permission handling
class DeviceContactsService {
  /// Request contacts permission from user
  static Future<bool> requestContactsPermission() async {
    final status = await Permission.contacts.request();
    return status.isGranted;
  }

  /// Check if contacts permission is already granted
  static Future<bool> hasContactsPermission() async {
    final status = await Permission.contacts.status;
    return status.isGranted;
  }

  /// Get all contacts from device
  static Future<Result<List<DeviceContact>>> getDeviceContacts() async {
    try {
      // Check permission first
      if (!await hasContactsPermission()) {
        if (!await requestContactsPermission()) {
          return const Failure('Contacts permission denied');
        }
      }

      // Fetch contacts
      final contacts = await contacts_service.ContactsService.getContacts(
        withThumbnails: false, // Skip thumbnails for performance
        photoHighResolution: false,
      );

      // Convert to our domain model
      final deviceContacts = contacts
          .where((contact) => 
              contact.displayName?.isNotEmpty == true &&
              (contact.emails?.isNotEmpty == true || 
               contact.phones?.isNotEmpty == true))
          .map((contact) => DeviceContact.fromContactsService(contact))
          .toList();

      // Sort alphabetically by name
      deviceContacts.sort((a, b) => a.name.compareTo(b.name));

      return Success(deviceContacts);
    } catch (e) {
      return Failure('Failed to load contacts: $e');
    }
  }

  /// Search contacts by name or email
  static Future<Result<List<DeviceContact>>> searchContacts(String query) async {
    if (query.trim().isEmpty) {
      return getDeviceContacts();
    }

    final result = await getDeviceContacts();
    return result.when(
      success: (contacts) {
        final filtered = contacts.where((contact) {
          final nameMatch = contact.name.toLowerCase().contains(query.toLowerCase());
          final emailMatch = contact.email?.toLowerCase().contains(query.toLowerCase()) ?? false;
          return nameMatch || emailMatch;
        }).toList();
        
        return Success(filtered);
      },
      failure: (message, exception) => Failure(message, exception),
    );
  }
}

/// Device contact model - simplified version for selection UI
class DeviceContact {
  final String name;
  final String? email;
  final String? phoneNumber;

  const DeviceContact({
    required this.name,
    this.email,
    this.phoneNumber,
  });

  factory DeviceContact.fromContactsService(contacts_service.Contact contact) {
    return DeviceContact(
      name: contact.displayName ?? 'Unknown',
      email: contact.emails?.isNotEmpty == true ? contact.emails!.first.value : null,
      phoneNumber: contact.phones?.isNotEmpty == true ? contact.phones!.first.value : null,
    );
  }

  /// Convert to MyOrbit Contact model
  Contact toContact({
    required String ownerId,
    ContactStatus status = ContactStatus.contactOnly,
    PartnerPermission permission = PartnerPermission.private,
  }) {
    return Contact(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      email: email,
      phoneNumber: phoneNumber,
      status: status,
      permission: permission,
      ownerId: ownerId,
      createdAt: DateTime.now(),
    );
  }

  /// Generate initials for avatar display
  String get initials {
    final words = name.split(' ');
    if (words.isEmpty) return '?';
    if (words.length == 1) return words.first[0].toUpperCase();
    return '${words.first[0]}${words.last[0]}'.toUpperCase();
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is DeviceContact &&
          runtimeType == other.runtimeType &&
          name == other.name &&
          email == other.email &&
          phoneNumber == other.phoneNumber;

  @override
  int get hashCode => name.hashCode ^ email.hashCode ^ phoneNumber.hashCode;

  @override
  String toString() => 'DeviceContact(name: $name, email: $email, phoneNumber: $phoneNumber)';
}