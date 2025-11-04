import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/contact_repository.dart';

/// Use case for sending a contact invitation.
class SendInvitation {
  final ContactRepository repository;

  const SendInvitation(this.repository);

  Future<Either<Failure, void>> call({
    required String contactId,
    required String method,
  }) {
    return repository.sendInvitation(
      contactId: contactId,
      method: method,
    );
  }
}
