import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/contact.dart';
import '../repositories/contact_repository.dart';

/// Use case for retrieving all contacts.
class GetContacts {
  final ContactRepository repository;

  const GetContacts(this.repository);

  Future<Either<Failure, List<Contact>>> call() {
    return repository.getContacts();
  }
}
