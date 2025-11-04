import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/contact.dart';
import '../repositories/contact_repository.dart';

/// Use case for creating a new contact.
class CreateContact {
  final ContactRepository repository;

  const CreateContact(this.repository);

  Future<Either<Failure, Contact>> call(Contact contact) {
    return repository.createContact(contact);
  }
}
