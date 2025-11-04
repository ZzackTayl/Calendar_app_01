import 'package:equatable/equatable.dart';

/// Domain entity representing a contact in MyOrbit.
///
/// Keeps UI-specific concerns out of the domain layer by storing
/// raw values only. Presentation code is responsible for mapping these to UI
/// abstractions. Serialization is handled by ContactModel in the data layer.
class Contact extends Equatable {
  const Contact({
    required this.id,
    required this.name,
    this.email,
    this.phoneNumber,
    this.avatarUrl,
    this.localPhotoBase64,
    required this.status,
    this.permission = PartnerPermission.private,
    this.externalUserId,
    this.labels = const [],
    this.colorHex,
    required this.ownerId,
    this.createdAt,
    this.updatedAt,
  });

  /// Unique identifier for the contact.
  final String id;

  /// Display name of the contact.
  final String name;

  /// Optional email address.
  final String? email;

  /// Optional phone number.
  final String? phoneNumber;

  /// Optional URL to avatar image.
  final String? avatarUrl;

  /// Optional base64-encoded local photo data.
  final String? localPhotoBase64;

  /// Current status of the contact relationship.
  final ContactStatus status;

  /// Permission level for data sharing with this contact.
  final PartnerPermission permission;

  /// Optional external user ID (if contact is a registered user).
  final String? externalUserId;

  /// List of labels/tags associated with this contact.
  final List<String> labels;

  /// Optional hex color code for UI accents.
  final String? colorHex;

  /// ID of the user who owns this contact.
  final String ownerId;

  /// Timestamp when contact was created.
  final DateTime? createdAt;

  /// Timestamp when contact was last updated.
  final DateTime? updatedAt;

  Contact copyWith({
    String? id,
    String? name,
    String? email,
    String? phoneNumber,
    String? avatarUrl,
    String? localPhotoBase64,
    ContactStatus? status,
    PartnerPermission? permission,
    String? externalUserId,
    List<String>? labels,
    String? colorHex,
    String? ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Contact(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      localPhotoBase64: localPhotoBase64 ?? this.localPhotoBase64,
      status: status ?? this.status,
      permission: permission ?? this.permission,
      externalUserId: externalUserId ?? this.externalUserId,
      labels: labels ?? this.labels,
      colorHex: colorHex ?? this.colorHex,
      ownerId: ownerId ?? this.ownerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        email,
        phoneNumber,
        avatarUrl,
        localPhotoBase64,
        status,
        permission,
        externalUserId,
        labels,
        colorHex,
        ownerId,
        createdAt,
        updatedAt,
      ];
}

/// Status of a contact relationship.
enum ContactStatus {
  /// Invitation sent but not yet accepted.
  pending,

  /// Contact has accepted the connection.
  accepted,

  /// Contact-only entry (not a connection).
  contactOnly,
}

/// Permission level for data sharing with a contact.
enum PartnerPermission {
  /// No data sharing.
  private,

  /// Limited data sharing.
  semiVisible,

  /// Full data sharing.
  visible,
}

/// Domain entity representing a contact label.
class ContactLabel extends Equatable {
  const ContactLabel({
    required this.id,
    required this.contactId,
    required this.label,
    this.createdAt,
  });

  final String id;
  final String contactId;
  final String label;
  final DateTime? createdAt;

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
  List<Object?> get props => [id, contactId, label, createdAt];
}
