import 'package:permission_handler/permission_handler.dart' as perm;
import 'package:flutter_contacts/flutter_contacts.dart' as flutter_contacts;
import '../../domain/contact.dart';
import '../../core/result.dart';
import 'api_service.dart';

/// Service for managing device contacts and permissions
abstract class ContactsService {
  Future<perm.PermissionStatus> requestPermission();
  Future<perm.PermissionStatus> checkPermission();
  Future<Result<List<Contact>>> getDeviceContacts();
  Future<Result<List<Contact>>> getMyOrbitContacts();
  Future<void> openAppSettings();
}

/// Implementation of ContactsService using real device contacts and MyOrbit API
class ContactsServiceImpl implements ContactsService {
  @override
  Future<perm.PermissionStatus> requestPermission() async {
    // Use flutter_contacts permission request
    final granted = await flutter_contacts.FlutterContacts.requestPermission();
    return granted ? perm.PermissionStatus.granted : perm.PermissionStatus.denied;
  }

  @override
  Future<perm.PermissionStatus> checkPermission() async {
    // Check flutter_contacts permission
    final granted = await flutter_contacts.FlutterContacts.requestPermission(readonly: true);
    return granted ? perm.PermissionStatus.granted : perm.PermissionStatus.denied;
  }

  @override
  Future<Result<List<Contact>>> getDeviceContacts() async {
    final status = await checkPermission();
    if (status != perm.PermissionStatus.granted) {
      return const Failure('Contacts permission not granted');
    }

    try {
      // Fetch device contacts using flutter_contacts
      final deviceContacts = await flutter_contacts.FlutterContacts.getContacts(
        withProperties: true,
        withPhoto: false, // We don't need photos for now
      );

      // Convert flutter_contacts Contact to our domain Contact
      final contacts = <Contact>[];

      for (final deviceContact in deviceContacts) {
        // Skip contacts without name
        if (deviceContact.displayName.trim().isEmpty) continue;

        // Get primary email and phone
        final email = deviceContact.emails.isNotEmpty ? deviceContact.emails.first.address : null;
        final phoneNumber =
            deviceContact.phones.isNotEmpty ? deviceContact.phones.first.number : null;

        // Only include contacts that have at least email or phone
        if (email == null && phoneNumber == null) continue;

        final contact = Contact(
          id: 'device_${deviceContact.id}',
          name: deviceContact.displayName.trim(),
          email: email,
          phoneNumber: phoneNumber,
          status: ContactStatus.contactOnly,
          permission: PartnerPermission.private, // Default to private
          ownerId: 'current-user', // Will be updated when auth is implemented
          createdAt: DateTime.now(),
        );

        contacts.add(contact);
      }

      // Sort contacts alphabetically
      contacts.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      return Success(contacts);
    } catch (e) {
      return Failure('Failed to fetch device contacts: ${e.toString()}');
    }
  }

  @override
  Future<Result<List<Contact>>> getMyOrbitContacts() async {
    return await ContactApi.getContacts();
  }

  @override
  Future<void> openAppSettings() async {
    // Use the global openAppSettings function from permission_handler
    await perm.openAppSettings();
  }
}

/// Mock implementation for development
class MockContactsService implements ContactsService {
  perm.PermissionStatus _currentStatus = perm.PermissionStatus.denied;
  final String _currentUserId;

  MockContactsService({String? currentUserId}) : _currentUserId = currentUserId ?? 'mock-user';

  @override
  Future<perm.PermissionStatus> requestPermission() async {
    await Future.delayed(const Duration(milliseconds: 500));
    _currentStatus = perm.PermissionStatus.granted;
    return _currentStatus;
  }

  @override
  Future<perm.PermissionStatus> checkPermission() async {
    return _currentStatus;
  }

  @override
  Future<Result<List<Contact>>> getDeviceContacts() async {
    await Future.delayed(const Duration(milliseconds: 800));

    return Success([
      Contact(
        id: '1',
        name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phoneNumber: '+1 (555) 123-4567',
        status: ContactStatus.contactOnly,
        ownerId: _currentUserId,
      ),
      Contact(
        id: '2',
        name: 'Jordan Lee',
        email: 'jordan.lee@email.com',
        phoneNumber: '+1 (555) 234-5678',
        status: ContactStatus.contactOnly,
        ownerId: _currentUserId,
      ),
      Contact(
        id: '3',
        name: 'Sam Taylor',
        email: 'sam.taylor@email.com',
        phoneNumber: '+1 (555) 345-6789',
        status: ContactStatus.contactOnly,
        ownerId: _currentUserId,
      ),
      Contact(
        id: '4',
        name: 'Casey Morgan',
        email: 'casey.morgan@email.com',
        phoneNumber: '+1 (555) 456-7890',
        status: ContactStatus.contactOnly,
        ownerId: _currentUserId,
      ),
      Contact(
        id: '5',
        name: 'Riley Chen',
        email: 'riley.chen@email.com',
        phoneNumber: '+1 (555) 567-8901',
        status: ContactStatus.contactOnly,
        ownerId: _currentUserId,
      ),
    ]);
  }

  @override
  Future<Result<List<Contact>>> getMyOrbitContacts() async {
    // Return some mock MyOrbit contacts
    return Success([
      Contact(
        id: 'mo1',
        name: 'Taylor Swift',
        email: 'taylor@example.com',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: _currentUserId,
      ),
      Contact(
        id: 'mo2',
        name: 'Blake Lively',
        email: 'blake@example.com',
        status: ContactStatus.pending,
        permission: PartnerPermission.semiVisible,
        ownerId: _currentUserId,
      ),
    ]);
  }

  @override
  Future<void> openAppSettings() async {
    // Mock - would open actual settings in real implementation
    await Future.delayed(const Duration(milliseconds: 300));
  }
}
