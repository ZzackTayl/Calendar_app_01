import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/contact_repository.dart';

/// Use case for deleting a contact.
class DeleteContact {
  final ContactRepository repository;

  const DeleteContact(this.repository);

  Future<Either<Failure, void>> call(String contactId) {
    return repository.deleteContact(contactId);
  }
}
