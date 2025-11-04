import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../repositories/contact_repository.dart';

/// Use case for rejecting a contact invitation.
class RejectInvitation {
  final ContactRepository repository;

  const RejectInvitation(this.repository);

  Future<Either<Failure, void>> call(String invitationId) {
    return repository.rejectInvitation(invitationId);
  }
}
