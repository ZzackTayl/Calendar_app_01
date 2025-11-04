import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/contact.dart';
import '../repositories/contact_repository.dart';

/// Use case for updating an existing contact.
class UpdateContact {
  final ContactRepository repository;

  const UpdateContact(this.repository);

  Future<Either<Failure, Contact>> call(Contact contact) {
    return repository.updateContact(contact);
  }
}
