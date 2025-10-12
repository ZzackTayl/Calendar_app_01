import 'package:permission_handler/permission_handler.dart';
import '../../domain/contact.dart';
import 'api_service.dart';

/// Service for managing device contacts and permissions
abstract class ContactsService {
  Future<PermissionStatus> requestPermission();
  Future<PermissionStatus> checkPermission();
  Future<List<Contact>> getDeviceContacts();
  Future<List<Contact>> getMyOrbitContacts();
  Future<void> openAppSettings();
}

/// Implementation of ContactsService using real device contacts and MyOrbit API
class ContactsServiceImpl implements ContactsService {
  @override
  Future<PermissionStatus> requestPermission() async {
    final status = await Permission.contacts.request();
    return status;
  }

  @override
  Future<PermissionStatus> checkPermission() async {
    return await Permission.contacts.status;
  }

  @override
  Future<List<Contact>> getDeviceContacts() async {
    final status = await checkPermission();
    if (status != PermissionStatus.granted) {
      throw Exception('Contacts permission not granted');
    }

    // TODO: Implement real device contacts integration
    // For now, return empty list until contacts plugin is added
    return [];
  }

  @override
  Future<List<Contact>> getMyOrbitContacts() async {
    return await ContactApi.getContacts();
  }

  @override
  Future<void> openAppSettings() async {
    await openAppSettings();
  }
}

/// Mock implementation for development
class MockContactsService implements ContactsService {
  PermissionStatus _currentStatus = PermissionStatus.denied;

  @override
  Future<PermissionStatus> requestPermission() async {
    await Future.delayed(const Duration(milliseconds: 500));
    _currentStatus = PermissionStatus.granted;
    return _currentStatus;
  }

  @override
  Future<PermissionStatus> checkPermission() async {
    return _currentStatus;
  }

  @override
  Future<List<Contact>> getDeviceContacts() async {
    await Future.delayed(const Duration(milliseconds: 800));

    return [
      const Contact(
        id: '1',
        name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phoneNumber: '+1 (555) 123-4567',
        status: ContactStatus.contactOnly,
        ownerId: 'mock-user',
      ),
      const Contact(
        id: '2',
        name: 'Jordan Lee',
        email: 'jordan.lee@email.com',
        phoneNumber: '+1 (555) 234-5678',
        status: ContactStatus.contactOnly,
        ownerId: 'mock-user',
      ),
      const Contact(
        id: '3',
        name: 'Sam Taylor',
        email: 'sam.taylor@email.com',
        phoneNumber: '+1 (555) 345-6789',
        status: ContactStatus.contactOnly,
        ownerId: 'mock-user',
      ),
      const Contact(
        id: '4',
        name: 'Casey Morgan',
        email: 'casey.morgan@email.com',
        phoneNumber: '+1 (555) 456-7890',
        status: ContactStatus.contactOnly,
        ownerId: 'mock-user',
      ),
      const Contact(
        id: '5',
        name: 'Riley Chen',
        email: 'riley.chen@email.com',
        phoneNumber: '+1 (555) 567-8901',
        status: ContactStatus.contactOnly,
        ownerId: 'mock-user',
      ),
    ];
  }

  @override
  Future<List<Contact>> getMyOrbitContacts() async {
    // Return some mock MyOrbit contacts
    return [
      const Contact(
        id: 'mo1',
        name: 'Taylor Swift',
        email: 'taylor@example.com',
        status: ContactStatus.accepted,
        permission: PartnerPermission.visible,
        ownerId: 'mock-user',
      ),
      const Contact(
        id: 'mo2',
        name: 'Blake Lively',
        email: 'blake@example.com',
        status: ContactStatus.pending,
        permission: PartnerPermission.semiVisible,
        ownerId: 'mock-user',
      ),
    ];
  }

  @override
  Future<void> openAppSettings() async {
    // Mock - would open actual settings in real implementation
    await Future.delayed(const Duration(milliseconds: 300));
  }
}
