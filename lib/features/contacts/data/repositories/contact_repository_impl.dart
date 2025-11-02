// Contact repository implementation following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/contact.dart';
import '../../../../domain/contact_invitation.dart';
import '../../domain/repositories/contact_repository.dart';
import '../datasources/contact_remote_data_source.dart';

class ContactRepositoryImpl with EitherMixin implements ContactRepository {
  final ContactRemoteDataSource remoteDataSource;

  ContactRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Either<Failure, List<Contact>>> getContacts() async {
    try {
      final contacts = await remoteDataSource.getContacts();
      return Right(contacts);
    } catch (e) {
      return Left(Failure(message: 'Failed to load contacts: $e'));
    }
  }

  @override
  Future<Either<Failure, Contact>> getContact(String contactId) async {
    try {
      final contact = await remoteDataSource.getContact(contactId);
      return Right(contact);
    } catch (e) {
      return Left(Failure(message: 'Failed to load contact: $e'));
    }
  }

  @override
  Future<Either<Failure, Contact>> createContact(Contact contact) async {
    try {
      final created = await remoteDataSource.createContact(contact);
      return Right(created);
    } catch (e) {
      return Left(Failure(message: 'Failed to create contact: $e'));
    }
  }

  @override
  Future<Either<Failure, Contact>> updateContact(Contact contact) async {
    try {
      final updated = await remoteDataSource.updateContact(contact);
      return Right(updated);
    } catch (e) {
      return Left(Failure(message: 'Failed to update contact: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteContact(String contactId) async {
    try {
      await remoteDataSource.deleteContact(contactId);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to delete contact: $e'));
    }
  }

  @override
  Future<Either<Failure, List<Contact>>> searchContacts(String query) async {
    try {
      final contacts = await remoteDataSource.getContacts();
      final filtered = contacts.where((contact) {
        final nameMatch =
            contact.name.toLowerCase().contains(query.toLowerCase());
        final emailMatch =
            contact.email?.toLowerCase().contains(query.toLowerCase()) ?? false;
        final phoneMatch =
            contact.phoneNumber?.toLowerCase().contains(query.toLowerCase()) ??
                false;
        return nameMatch || emailMatch || phoneMatch;
      }).toList();
      return Right(filtered);
    } catch (e) {
      return Left(Failure(message: 'Failed to search contacts: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> sendInvitation({
    required String contactId,
    required String method,
  }) async {
    try {
      await remoteDataSource.sendInvitation(
        contactId: contactId,
        method: method,
      );
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to send invitation: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> acceptInvitation(String invitationId) async {
    try {
      await remoteDataSource.acceptInvitation(invitationId);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to accept invitation: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> rejectInvitation(String invitationId) async {
    try {
      await remoteDataSource.rejectInvitation(invitationId);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to reject invitation: $e'));
    }
  }

  @override
  Future<Either<Failure, List<ContactInvitation>>>
      getPendingInvitations() async {
    try {
      final invitations = await remoteDataSource.getPendingInvitations();
      return Right(invitations);
    } catch (e) {
      return Left(Failure(message: 'Failed to load invitations: $e'));
    }
  }
}

