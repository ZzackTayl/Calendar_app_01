import 'package:freezed_annotation/freezed_annotation.dart';

part 'contact.freezed.dart';
part 'contact.g.dart';

@freezed
class Contact with _$Contact {
  const factory Contact({
    required String id,
    required String name,
    String? email,
    String? phoneNumber,
    required ContactStatus status,
    @Default(PartnerPermission.private) PartnerPermission permission,
    String? externalUserId,
    @Default([]) List<String> labels,
    required String ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Contact;

  factory Contact.fromJson(Map<String, dynamic> json) =>
      _$ContactFromJson(json);
}

@JsonEnum(valueField: 'value')
enum ContactStatus {
  pending('pending'),
  accepted('accepted'),
  contactOnly('contact-only');

  const ContactStatus(this.value);
  final String value;
}

@JsonEnum(valueField: 'value')
enum PartnerPermission {
  private('private'),
  semiVisible('semi-visible'),
  visible('visible');

  const PartnerPermission(this.value);
  final String value;
}

@freezed
class ContactLabel with _$ContactLabel {
  const factory ContactLabel({
    required String id,
    required String contactId,
    required String label,
    DateTime? createdAt,
  }) = _ContactLabel;

  factory ContactLabel.fromJson(Map<String, dynamic> json) =>
      _$ContactLabelFromJson(json);
}