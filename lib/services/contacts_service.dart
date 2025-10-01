import '../models/contact.dart';

abstract class ContactsService {
  Future<PermissionStatus> requestPermission();
  Future<PermissionStatus> checkPermission();
  Future<List<Contact>> getContacts();
  Future<void> openAppSettings();
}

class MockContactsService implements ContactsService {
  PermissionStatus _currentStatus = PermissionStatus.notRequested;

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
  Future<List<Contact>> getContacts() async {
    await Future.delayed(const Duration(milliseconds: 800));

    return [
      Contact(
        id: '1',
        name: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        phone: '+1 (555) 123-4567',
      ),
      Contact(
        id: '2',
        name: 'Jordan Lee',
        email: 'jordan.lee@email.com',
        phone: '+1 (555) 234-5678',
      ),
      Contact(
        id: '3',
        name: 'Sam Taylor',
        email: 'sam.taylor@email.com',
        phone: '+1 (555) 345-6789',
      ),
      Contact(
        id: '4',
        name: 'Casey Morgan',
        email: 'casey.morgan@email.com',
        phone: '+1 (555) 456-7890',
      ),
      Contact(
        id: '5',
        name: 'Riley Chen',
        email: 'riley.chen@email.com',
        phone: '+1 (555) 567-8901',
      ),
    ];
  }

  @override
  Future<void> openAppSettings() async {
    // Mock - would open actual settings in real implementation
    await Future.delayed(const Duration(milliseconds: 300));
  }
}
