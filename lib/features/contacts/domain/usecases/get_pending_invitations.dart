import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../entities/contact_invitation.dart';
import '../repositories/contact_repository.dart';

/// Use case for retrieving pending contact invitations.
class GetPendingInvitations {
  final ContactRepository repository;

  const GetPendingInvitations(this.repository);

  Future<Either<Failure, List<ContactInvitation>>> call() {
    return repository.getPendingInvitations();
  }
}
