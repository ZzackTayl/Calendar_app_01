import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/contact_repository.dart';

/// Use case for accepting a contact invitation.
class AcceptInvitation {
  final ContactRepository repository;

  const AcceptInvitation(this.repository);

  Future<Either<Failure, void>> call(String invitationId) {
    return repository.acceptInvitation(invitationId);
  }
}
