import '../../domain/entities/contact_invitation.dart';

/// Data model extending ContactInvitation entity with JSON serialization.
///
/// This model stays in the data layer and handles all JSON operations,
/// keeping the domain entity pure.
class ContactInvitationModel extends ContactInvitation {
  const ContactInvitationModel({
    required super.id,
    required super.senderId,
    required super.recipientEmail,
    super.recipientPhoneNumber,
    required super.method,
    super.status = InvitationStatus.pending,
    required super.recipientName,
    super.personalMessage,
    super.expiresAt,
    super.respondedAt,
    required super.createdAt,
    super.updatedAt,
  });

  /// Create ContactInvitationModel from ContactInvitation entity
  factory ContactInvitationModel.fromEntity(ContactInvitation invitation) {
    return ContactInvitationModel(
      id: invitation.id,
      senderId: invitation.senderId,
      recipientEmail: invitation.recipientEmail,
      recipientPhoneNumber: invitation.recipientPhoneNumber,
      method: invitation.method,
      status: invitation.status,
      recipientName: invitation.recipientName,
      personalMessage: invitation.personalMessage,
      expiresAt: invitation.expiresAt,
      respondedAt: invitation.respondedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    );
  }

  /// Create ContactInvitationModel from JSON
  factory ContactInvitationModel.fromJson(Map<String, dynamic> json) {
    return ContactInvitationModel(
      id: json['id'] as String,
      senderId: json['sender_id'] as String,
      recipientEmail: json['recipient_email'] as String,
      recipientPhoneNumber: json['recipient_phone_number'] as String?,
      method: InvitationMethod.values.firstWhere(
        (e) => e.name == json['method'],
        orElse: () => InvitationMethod.email,
      ),
      status: InvitationStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => InvitationStatus.pending,
      ),
      recipientName: json['recipient_name'] as String,
      personalMessage: json['personal_message'] as String?,
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      respondedAt: json['responded_at'] != null
          ? DateTime.parse(json['responded_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  /// Convert ContactInvitationModel to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sender_id': senderId,
      'recipient_email': recipientEmail,
      'recipient_phone_number': recipientPhoneNumber,
      'method': method.name,
      'status': status.name,
      'recipient_name': recipientName,
      'personal_message': personalMessage,
      'expires_at': expiresAt?.toIso8601String(),
      'responded_at': respondedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
