import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/contact.dart';
import '../repositories/contact_repository.dart';

/// Use case for retrieving a specific contact by ID.
class GetContact {
  final ContactRepository repository;

  const GetContact(this.repository);

  Future<Either<Failure, Contact>> call(String contactId) {
    return repository.getContact(contactId);
  }
}
