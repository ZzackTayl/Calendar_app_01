/// Contact invitation domain model for MyOrbit
/// Tracks invitations sent via SMS or Email to new contacts
class ContactInvitation {
  final String id;
  final String senderId;
  final String recipientEmail;
  final String? recipientPhoneNumber;
  final InvitationMethod method;
  final InvitationStatus status;
  final String recipientName;
  final String? personalMessage;
  final DateTime? expiresAt;
  final DateTime? respondedAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

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

  /// Create ContactInvitation from JSON
  factory ContactInvitation.fromJson(Map<String, dynamic> json) {
    return ContactInvitation(
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
      expiresAt: json['expires_at'] != null ? DateTime.parse(json['expires_at'] as String) : null,
      respondedAt:
          json['responded_at'] != null ? DateTime.parse(json['responded_at'] as String) : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
    );
  }

  /// Convert ContactInvitation to JSON
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

  /// Create a copy with modified fields
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
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContactInvitation &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          senderId == other.senderId &&
          recipientEmail == other.recipientEmail &&
          recipientPhoneNumber == other.recipientPhoneNumber &&
          method == other.method &&
          status == other.status &&
          recipientName == other.recipientName &&
          personalMessage == other.personalMessage &&
          expiresAt == other.expiresAt &&
          respondedAt == other.respondedAt &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      senderId.hashCode ^
      recipientEmail.hashCode ^
      recipientPhoneNumber.hashCode ^
      method.hashCode ^
      status.hashCode ^
      recipientName.hashCode ^
      personalMessage.hashCode ^
      expiresAt.hashCode ^
      respondedAt.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode;

  @override
  String toString() {
    return 'ContactInvitation(id: $id, recipient: $recipientName, method: $method, status: $status)';
  }
}

/// Method used to send the invitation
enum InvitationMethod {
  email,
  sms,
}

/// Status of the invitation
enum InvitationStatus {
  pending,
  sent,
  failed,
  accepted,
  declined,
  expired,
}
