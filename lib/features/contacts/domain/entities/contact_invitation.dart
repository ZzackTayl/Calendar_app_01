import 'package:equatable/equatable.dart';

/// Domain entity representing a contact invitation in MyOrbit.
///
/// Tracks invitations sent via SMS or Email to new contacts.
/// Serialization is handled by ContactInvitationModel in the data layer.
class ContactInvitation extends Equatable {
  const ContactInvitation({
    required this.id,
    required this.senderId,
    required this.recipientEmail,
    this.recipientPhoneNumber,
    required this.method,
    this.status = InvitationStatus.pending,
    required this.recipientName,
    this.personalMessage,
    this.expiresAt,
    this.respondedAt,
    required this.createdAt,
    this.updatedAt,
  });

  /// Unique identifier for the invitation.
  final String id;

  /// ID of the user who sent the invitation.
  final String senderId;

  /// Email address of the recipient.
  final String recipientEmail;

  /// Optional phone number of the recipient.
  final String? recipientPhoneNumber;

  /// Method used to send the invitation.
  final InvitationMethod method;

  /// Current status of the invitation.
  final InvitationStatus status;

  /// Name of the recipient.
  final String recipientName;

  /// Optional personal message included with the invitation.
  final String? personalMessage;

  /// Optional expiration timestamp.
  final DateTime? expiresAt;

  /// Timestamp when the recipient responded.
  final DateTime? respondedAt;

  /// Timestamp when invitation was created.
  final DateTime createdAt;

  /// Timestamp when invitation was last updated.
  final DateTime? updatedAt;

  ContactInvitation copyWith({
    String? id,
    String? senderId,
    String? recipientEmail,
    String? recipientPhoneNumber,
    InvitationMethod? method,
    InvitationStatus? status,
    String? recipientName,
    String? personalMessage,
    DateTime? expiresAt,
    DateTime? respondedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return ContactInvitation(
      id: id ?? this.id,
      senderId: senderId ?? this.senderId,
      recipientEmail: recipientEmail ?? this.recipientEmail,
      recipientPhoneNumber: recipientPhoneNumber ?? this.recipientPhoneNumber,
      method: method ?? this.method,
      status: status ?? this.status,
      recipientName: recipientName ?? this.recipientName,
      personalMessage: personalMessage ?? this.personalMessage,
      expiresAt: expiresAt ?? this.expiresAt,
      respondedAt: respondedAt ?? this.respondedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        senderId,
        recipientEmail,
        recipientPhoneNumber,
        method,
        status,
        recipientName,
        personalMessage,
        expiresAt,
        respondedAt,
        createdAt,
        updatedAt,
      ];
}

/// Method used to send the invitation.
enum InvitationMethod {
  email,
  sms,
}

/// Status of the invitation.
enum InvitationStatus {
  pending,
  sent,
  failed,
  accepted,
  declined,
  expired,
}
