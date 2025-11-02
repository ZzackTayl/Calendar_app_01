// Contact repository contract following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../domain/contact.dart';
import '../../../../domain/contact_invitation.dart';

/// Repository contract for contact operations
abstract class ContactRepository {
  /// Get all contacts for the current user
  Future<Either<Failure, List<Contact>>> getContacts();

  /// Get a specific contact by ID
  Future<Either<Failure, Contact>> getContact(String contactId);

  /// Create a new contact
  Future<Either<Failure, Contact>> createContact(Contact contact);

  /// Update an existing contact
  Future<Either<Failure, Contact>> updateContact(Contact contact);

  /// Delete a contact
  Future<Either<Failure, void>> deleteContact(String contactId);

  /// Search contacts by query
  Future<Either<Failure, List<Contact>>> searchContacts(String query);

  /// Send contact invitation
  Future<Either<Failure, void>> sendInvitation({
    required String contactId,
    required String method, // 'email' or 'sms'
  });

  /// Accept contact invitation
  Future<Either<Failure, void>> acceptInvitation(String invitationId);

  /// Reject contact invitation
  Future<Either<Failure, void>> rejectInvitation(String invitationId);

  /// Get pending invitations
  Future<Either<Failure, List<ContactInvitation>>> getPendingInvitations();
}

