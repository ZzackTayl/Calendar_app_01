import 'package:freezed_annotation/freezed_annotation.dart';

part 'event.freezed.dart';
part 'event.g.dart';

@freezed
class CalendarEvent with _$CalendarEvent {
  const factory CalendarEvent({
    required String id,
    required String title,
    String? description,
    required DateTime start,
    required DateTime end,
    @Default(EventPrivacyLevel.normal) EventPrivacyLevel privacyLevel,
    @Default([]) List<String> invitedPartnerIds,
    String? externalProvider,
    String? externalEventId,
    required String ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _CalendarEvent;

  factory CalendarEvent.fromJson(Map<String, dynamic> json) =>
      _$CalendarEventFromJson(json);
}

@JsonEnum(valueField: 'value')
enum EventPrivacyLevel {
  normal('normal'),
  exclusive('exclusive'),
  superExclusive('super-exclusive');

  const EventPrivacyLevel(this.value);
  final String value;
}

@freezed
class EventInvite with _$EventInvite {
  const factory EventInvite({
    required String id,
    required String eventId,
    required String contactId,
    @Default(InviteStatus.pending) InviteStatus status,
    DateTime? createdAt,
    DateTime? respondedAt,
  }) = _EventInvite;

  factory EventInvite.fromJson(Map<String, dynamic> json) =>
      _$EventInviteFromJson(json);
}

@JsonEnum(valueField: 'value')
enum InviteStatus {
  pending('pending'),
  accepted('accepted'),
  declined('declined');

  const InviteStatus(this.value);
  final String value;
}