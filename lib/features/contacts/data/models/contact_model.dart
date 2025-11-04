import '../../domain/entities/contact.dart';

/// Data model extending Contact entity with JSON serialization.
///
/// This model stays in the data layer and handles all JSON operations,
/// keeping the domain entity pure.
class ContactModel extends Contact {
  const ContactModel({
    required super.id,
    required super.name,
    super.email,
    super.phoneNumber,
    super.avatarUrl,
    super.localPhotoBase64,
    required super.status,
    super.permission = PartnerPermission.private,
    super.externalUserId,
    super.labels = const [],
    super.colorHex,
    required super.ownerId,
    super.createdAt,
    super.updatedAt,
  });

  /// Create ContactModel from Contact entity
  factory ContactModel.fromEntity(Contact contact) {
    return ContactModel(
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phoneNumber: contact.phoneNumber,
      avatarUrl: contact.avatarUrl,
      localPhotoBase64: contact.localPhotoBase64,
      status: contact.status,
      permission: contact.permission,
      externalUserId: contact.externalUserId,
      labels: contact.labels,
      colorHex: contact.colorHex,
      ownerId: contact.ownerId,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    );
  }

  /// Create ContactModel from JSON
  factory ContactModel.fromJson(Map<String, dynamic> json) {
    return ContactModel(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String?,
      phoneNumber: json['phone_number'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      localPhotoBase64: json['local_photo_base64'] as String?,
      status: ContactStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => ContactStatus.pending,
      ),
      colorHex: json['color_hex'] as String?,
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

  /// Convert ContactModel to JSON
  Map<String, dynamic> toJson({bool includeLocalFields = false}) {
    final map = {
      'id': id,
      'name': name,
      'email': email,
      'phone_number': phoneNumber,
      'avatar_url': avatarUrl,
      'status': status.name,
      'permission': permission.name,
      'external_user_id': externalUserId,
      'labels': labels,
      'color_hex': colorHex,
      'owner_id': ownerId,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };

    if (avatarUrl == null) {
      map.remove('avatar_url');
    }

    if (includeLocalFields && localPhotoBase64 != null) {
      map['local_photo_base64'] = localPhotoBase64;
    }

    return map;
  }
}

/// Data model extending ContactLabel entity with JSON serialization.
class ContactLabelModel extends ContactLabel {
  const ContactLabelModel({
    required super.id,
    required super.contactId,
    required super.label,
    super.createdAt,
  });

  /// Create ContactLabelModel from ContactLabel entity
  factory ContactLabelModel.fromEntity(ContactLabel label) {
    return ContactLabelModel(
      id: label.id,
      contactId: label.contactId,
      label: label.label,
      createdAt: label.createdAt,
    );
  }

  /// Create ContactLabelModel from JSON
  factory ContactLabelModel.fromJson(Map<String, dynamic> json) {
    return ContactLabelModel(
      id: json['id'] as String,
      contactId: json['contact_id'] as String,
      label: json['label'] as String,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  /// Convert ContactLabelModel to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'contact_id': contactId,
      'label': label,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
