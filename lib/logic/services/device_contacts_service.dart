import 'package:flutter_contacts/flutter_contacts.dart' as flutter_contacts;
import 'package:uuid/uuid.dart';

import '../../core/result.dart';
import '../../domain/contact.dart';

final Uuid _uuid = Uuid();

/// Service for accessing device contacts with proper permission handling
class DeviceContactsService {
  /// Request contacts permission from user
  static Future<bool> requestContactsPermission() async {
    return await flutter_contacts.FlutterContacts.requestPermission();
  }

  /// Check if contacts permission is already granted
  static Future<bool> hasContactsPermission() async {
    return await flutter_contacts.FlutterContacts.requestPermission(
        readonly: true);
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

      // Fetch contacts using flutter_contacts
      final contacts = await flutter_contacts.FlutterContacts.getContacts(
        withProperties: true,
        withPhoto: false, // Skip photos for performance
      );

      // Convert to our domain model
      final deviceContacts = contacts
          .where((contact) =>
              contact.displayName.isNotEmpty &&
              (contact.emails.isNotEmpty || contact.phones.isNotEmpty))
          .map((contact) => DeviceContact.fromFlutterContacts(contact))
          .toList();

      // Sort alphabetically by name
      deviceContacts.sort((a, b) => a.name.compareTo(b.name));

      return Success(deviceContacts);
    } catch (e) {
      return Failure('Failed to load contacts: $e');
    }
  }

  /// Search contacts by name or email
  static Future<Result<List<DeviceContact>>> searchContacts(
      String query) async {
    if (query.trim().isEmpty) {
      return getDeviceContacts();
    }

    final result = await getDeviceContacts();
    return result.when(
      success: (contacts) {
        final filtered = contacts.where((contact) {
          final nameMatch =
              contact.name.toLowerCase().contains(query.toLowerCase());
          final emailMatch =
              contact.email?.toLowerCase().contains(query.toLowerCase()) ??
                  false;
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

  factory DeviceContact.fromFlutterContacts(flutter_contacts.Contact contact) {
    return DeviceContact(
      name: contact.displayName.isNotEmpty ? contact.displayName : 'Unknown',
      email: contact.emails.isNotEmpty ? contact.emails.first.address : null,
      phoneNumber:
          contact.phones.isNotEmpty ? contact.phones.first.number : null,
    );
  }

  /// Convert to MyOrbit Contact model
  Contact toContact({
    required String ownerId,
    ContactStatus status = ContactStatus.contactOnly,
    PartnerPermission permission = PartnerPermission.private,
  }) {
    return Contact(
      id: _uuid.v4(),
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
  String toString() =>
      'DeviceContact(name: $name, email: $email, phoneNumber: $phoneNumber)';
}
