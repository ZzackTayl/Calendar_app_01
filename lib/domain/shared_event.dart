import 'event.dart';
import 'visibility.dart';

/// Describes an event that is visible in a shared calendar context,
/// bundling the base [CalendarEvent] with metadata about why it is visible
/// and who owns it.
class SharedCalendarEvent {
  const SharedCalendarEvent({
    required this.event,
    required this.ownerUserId,
    this.ownerContactId,
    required this.detailLevel,
    required this.visibilityReason,
    required this.isInvited,
    this.sharedAt,
  });

  /// The underlying calendar event record.
  final CalendarEvent event;

  /// Supabase auth user id of the owner of the event.
  final String ownerUserId;

  /// Optional contact id mapping the owner to the current viewer's contact list.
  final String? ownerContactId;

  /// Level of detail available to the current viewer.
  final EventDetailLevel detailLevel;

  /// Why the viewer can see this event at the given detail level.
  final VisibilityReason visibilityReason;

  /// Whether the viewer was explicitly invited to the event.
  final bool isInvited;

  /// Timestamp describing when the owner shared this event with the viewer.
  final DateTime? sharedAt;

  bool get isOwner => event.ownerId == ownerUserId;

  /// Convenience for checking if the viewer should see only a busy block.
  bool get isBusyOnly => detailLevel == EventDetailLevel.busyOnly;

  /// Merge updated metadata while keeping the same base event.
  SharedCalendarEvent copyWith({
    CalendarEvent? event,
    String? ownerUserId,
    String? ownerContactId,
    EventDetailLevel? detailLevel,
    VisibilityReason? visibilityReason,
    bool? isInvited,
    DateTime? sharedAt,
  }) {
    return SharedCalendarEvent(
      event: event ?? this.event,
      ownerUserId: ownerUserId ?? this.ownerUserId,
      ownerContactId: ownerContactId ?? this.ownerContactId,
      detailLevel: detailLevel ?? this.detailLevel,
      visibilityReason: visibilityReason ?? this.visibilityReason,
      isInvited: isInvited ?? this.isInvited,
      sharedAt: sharedAt ?? this.sharedAt,
    );
  }
}
