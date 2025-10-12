/// Contact domain model for MyOrbit
class Contact {
  final String id;
  final String name;
  final String? email;
  final String? phoneNumber;
  final ContactStatus status;
  final PartnerPermission permission;
  final String? externalUserId;
  final List<String> labels;
  final String ownerId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Contact({
    required this.id,
    required this.name,
    this.email,
    this.phoneNumber,
    required this.status,
    this.permission = PartnerPermission.private,
    this.externalUserId,
    this.labels = const [],
    required this.ownerId,
    this.createdAt,
    this.updatedAt,
  });

  /// Create Contact from JSON
  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phoneNumber: json['phone_number'] as String?,
      status: ContactStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ContactStatus.pending,
      ),
      permission: PartnerPermission.values.firstWhere(
        (e) => e.name == json['permission'],
        orElse: () => PartnerPermission.private,
      ),
      externalUserId: json['external_user_id'] as String?,
      labels: (json['labels'] as List<dynamic>?)?.cast<String>() ?? [],
      ownerId: json['owner_id'] as String,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  /// Convert Contact to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'phone_number': phoneNumber,
      'status': status.name,
      'permission': permission.name,
      'external_user_id': externalUserId,
      'labels': labels,
      'owner_id': ownerId,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  /// Create a copy with modified fields
  Contact copyWith({
    String? id,
    String? name,
    String? email,
    String? phoneNumber,
    ContactStatus? status,
    PartnerPermission? permission,
    String? externalUserId,
    List<String>? labels,
    String? ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Contact(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      status: status ?? this.status,
      permission: permission ?? this.permission,
      externalUserId: externalUserId ?? this.externalUserId,
      labels: labels ?? this.labels,
      ownerId: ownerId ?? this.ownerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Contact &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          name == other.name &&
          email == other.email &&
          phoneNumber == other.phoneNumber &&
          status == other.status &&
          permission == other.permission &&
          externalUserId == other.externalUserId &&
          labels == other.labels &&
          ownerId == other.ownerId &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      name.hashCode ^
      email.hashCode ^
      phoneNumber.hashCode ^
      status.hashCode ^
      permission.hashCode ^
      externalUserId.hashCode ^
      labels.hashCode ^
      ownerId.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode;

  @override
  String toString() {
    return 'Contact(id: $id, name: $name, email: $email, status: $status, permission: $permission)';
  }
}

enum ContactStatus {
  pending,
  accepted,
  contactOnly,
}

enum PartnerPermission {
  private,
  semiVisible,
  visible,
}

class ContactLabel {
  final String id;
  final String contactId;
  final String label;
  final DateTime? createdAt;

  const ContactLabel({
    required this.id,
    required this.contactId,
    required this.label,
    this.createdAt,
  });

  factory ContactLabel.fromJson(Map<String, dynamic> json) {
    return ContactLabel(
      id: json['id'] as String,
      contactId: json['contact_id'] as String,
      label: json['label'] as String,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'contact_id': contactId,
      'label': label,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  ContactLabel copyWith({
    String? id,
    String? contactId,
    String? label,
    DateTime? createdAt,
  }) {
    return ContactLabel(
      id: id ?? this.id,
      contactId: contactId ?? this.contactId,
      label: label ?? this.label,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContactLabel &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          contactId == other.contactId &&
          label == other.label &&
          createdAt == other.createdAt;

  @override
  int get hashCode =>
      id.hashCode ^ contactId.hashCode ^ label.hashCode ^ createdAt.hashCode;

  @override
  String toString() {
    return 'ContactLabel(id: $id, contactId: $contactId, label: $label)';
  }
}