// Contact remote data source for Firestore

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/firebase_app_services.dart';
import '../../../../domain/contact.dart';
import '../../../../domain/contact_invitation.dart';

/// Abstract interface for contact remote data source
abstract class ContactRemoteDataSource {
  Future<List<Contact>> getContacts();
  Future<Contact> getContact(String contactId);
  Future<Contact> createContact(Contact contact);
  Future<Contact> updateContact(Contact contact);
  Future<void> deleteContact(String contactId);
  Future<void> sendInvitation({
    required String contactId,
    required String method,
  });
  Future<void> acceptInvitation(String invitationId);
  Future<void> rejectInvitation(String invitationId);
  Future<List<ContactInvitation>> getPendingInvitations();
}

/// Firestore implementation of contact remote data source
class ContactFirestoreDataSource implements ContactRemoteDataSource {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _userId {
    final user = FirebaseAppServices.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }
    return user.uid;
  }

  CollectionReference get _contactsCollection =>
      _firestore.collection('users').doc(_userId).collection('contacts');

  CollectionReference get _invitationsCollection =>
      _firestore.collection('users').doc(_userId).collection('contact_invitations');

  @override
  Future<List<Contact>> getContacts() async {
    final snapshot = await _contactsCollection
        .orderBy('name', descending: false)
        .get();
    return snapshot.docs
        .map((doc) => Contact.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<Contact> getContact(String contactId) async {
    final doc = await _contactsCollection.doc(contactId).get();
    if (!doc.exists) {
      throw Exception('Contact not found');
    }
    return Contact.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<Contact> createContact(Contact contact) async {
    final data = contact.toJson();
    data['created_at'] = FieldValue.serverTimestamp();
    data['updated_at'] = FieldValue.serverTimestamp();

    final docRef = await _contactsCollection.add(data);
    final doc = await docRef.get();
    return Contact.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<Contact> updateContact(Contact contact) async {
    final data = contact.toJson();
    data['updated_at'] = FieldValue.serverTimestamp();

    await _contactsCollection.doc(contact.id).update(data);
    return getContact(contact.id);
  }

  @override
  Future<void> deleteContact(String contactId) async {
    await _contactsCollection.doc(contactId).delete();
  }

  @override
  Future<void> sendInvitation({
    required String contactId,
    required String method,
  }) async {
    // Create invitation document
    await _invitationsCollection.add({
      'contact_id': contactId,
      'method': method,
      'status': 'pending',
      'sent_at': FieldValue.serverTimestamp(),
      'sender_id': _userId,
    });

    // Note: Email/SMS sending would be handled by a Firebase Cloud Function
    // triggered by the invitation document creation. This keeps the client-side
    // code simple and allows server-side validation and rate limiting.
  }

  @override
  Future<void> acceptInvitation(String invitationId) async {
    await _invitationsCollection.doc(invitationId).update({
      'status': 'accepted',
      'responded_at': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> rejectInvitation(String invitationId) async {
    await _invitationsCollection.doc(invitationId).update({
      'status': 'rejected',
      'responded_at': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<List<ContactInvitation>> getPendingInvitations() async {
    final snapshot = await _invitationsCollection
        .where('status', isEqualTo: 'pending')
        .orderBy('sent_at', descending: true)
        .get();

    return snapshot.docs
        .map((doc) => ContactInvitation.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }
}

