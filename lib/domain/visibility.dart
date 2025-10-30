/// Shared visibility enums describing how much detail a user may see for an event
/// and why that visibility level is granted.
///
/// These types live in the domain layer so that multiple features
/// (permission service, shared calendar views, analytics) can rely on the same
/// canonical definitions without importing UI or service code.
enum EventDetailLevel {
  /// No information visible.
  none,

  /// Only the occupied time range is visible ("busy" block).
  busyOnly,

  /// Full event details are visible.
  full,
}

/// High level reason explaining why a specific visibility level applies.
enum VisibilityReason {
  /// The viewer received a direct invitation to the event.
  explicitInvitation,

  /// The viewer has "visible" permission with the event owner.
  visiblePartner,

  /// The viewer has "semi-visible" permission with the event owner.
  semiVisiblePartner,

  /// The viewer has "private" permission with the event owner.
  privatePartner,

  /// The event is exclusive to the owner and selected invitees.
  exclusiveEvent,

  /// The event is super exclusive (completely hidden) to non-invitees.
  superExclusiveEvent,

  /// Viewer access derives from organization-wide visibility (future use).
  organizationPolicy,

  /// Viewer is the event owner.
  eventOwner,
}
