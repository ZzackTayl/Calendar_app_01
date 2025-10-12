import 'dart:developer' as developer;

import '../../domain/event.dart';
import '../../domain/contact.dart';

/// Permission service implementing MyOrbit's sophisticated visibility rules
///
/// Implements the permission hierarchy defined in main.md:
/// 1. Explicit event invitation → always grants full details
/// 2. Event privacy level (Super Exclusive / Exclusive) → overrides partner permission
/// 3. Partner permission level (Visible / Semi-Visible / Private) → default visibility
class PermissionService {
  /// Calculate visibility for a specific event and partner/contact
  ///
  /// Returns [EventVisibility] describing what the partner can see
  static EventVisibility calculateEventVisibility(
    CalendarEvent event,
    Contact contact,
  ) {
    // Rule 1: Explicit invitation wins - always shows full details
    if (event.invitedPartnerIds.contains(contact.id)) {
      developer.log(
        'Event "${event.title}" visible to ${contact.name} via explicit invitation',
        name: 'PermissionService',
      );
      return EventVisibility(
        visible: true,
        detailLevel: EventDetailLevel.full,
        reason: VisibilityReason.explicitInvitation,
      );
    }

    // Rule 2: Event privacy level overrides partner permissions
    switch (event.privacyLevel) {
      case EventPrivacyLevel.superExclusive:
        // Super Exclusive: invisible to everyone unless invited
        developer.log(
          'Event "${event.title}" hidden from ${contact.name} (Super Exclusive, not invited)',
          name: 'PermissionService',
        );
        return EventVisibility(
          visible: false,
          detailLevel: EventDetailLevel.none,
          reason: VisibilityReason.superExclusiveEvent,
        );

      case EventPrivacyLevel.exclusive:
        // Exclusive: only explicitly invited partners can see
        developer.log(
          'Event "${event.title}" hidden from ${contact.name} (Exclusive, not invited)',
          name: 'PermissionService',
        );
        return EventVisibility(
          visible: false,
          detailLevel: EventDetailLevel.none,
          reason: VisibilityReason.exclusiveEvent,
        );

      case EventPrivacyLevel.normal:
        // Normal: respects partner permission levels
        break;
    }

    // Rule 3: Partner default permissions (only for Normal events)
    switch (contact.permission) {
      case PartnerPermission.visible:
        // Can see full details of normal events
        developer.log(
          'Event "${event.title}" fully visible to ${contact.name} (Visible partner)',
          name: 'PermissionService',
        );
        return EventVisibility(
          visible: true,
          detailLevel: EventDetailLevel.full,
          reason: VisibilityReason.visiblePartner,
        );

      case PartnerPermission.semiVisible:
        // Can see busy blocks only (no title/description)
        developer.log(
          'Event "${event.title}" shown as busy block to ${contact.name} (Semi-Visible partner)',
          name: 'PermissionService',
        );
        return EventVisibility(
          visible: true,
          detailLevel: EventDetailLevel.busyOnly,
          reason: VisibilityReason.semiVisiblePartner,
        );

      case PartnerPermission.private:
        // Cannot see anything
        developer.log(
          'Event "${event.title}" hidden from ${contact.name} (Private partner)',
          name: 'PermissionService',
        );
        return EventVisibility(
          visible: false,
          detailLevel: EventDetailLevel.none,
          reason: VisibilityReason.privatePartner,
        );
    }
  }

  /// Filter events list based on partner visibility rules
  ///
  /// Returns only events that [contact] is allowed to see
  static List<EventWithVisibility> filterEventsForContact(
    List<CalendarEvent> events,
    Contact contact,
  ) {
    return events
        .map((event) => EventWithVisibility(
              event: event,
              visibility: calculateEventVisibility(event, contact),
            ))
        .where((eventWithVis) => eventWithVis.visibility.visible)
        .toList();
  }

  /// Get all partners who can see a specific event (and at what detail level)
  ///
  /// Useful for showing "Shared with X people" or managing event sharing
  static List<ContactVisibility> getContactsForEvent(
    CalendarEvent event,
    List<Contact> allContacts,
  ) {
    return allContacts
        .map((contact) => ContactVisibility(
              contact: contact,
              visibility: calculateEventVisibility(event, contact),
            ))
        .where((contactVis) => contactVis.visibility.visible)
        .toList();
  }

  /// Check if a contact is allowed to see any details of an event
  static bool canSeeEvent(CalendarEvent event, Contact contact) {
    return calculateEventVisibility(event, contact).visible;
  }

  /// Check if a contact can see full details (not just busy block)
  static bool canSeeFullDetails(CalendarEvent event, Contact contact) {
    final visibility = calculateEventVisibility(event, contact);
    return visibility.visible &&
        visibility.detailLevel == EventDetailLevel.full;
  }

  /// Validate permission change and return warnings if needed
  ///
  /// Used when user changes partner permissions or event privacy
  /// Returns list of warnings about visibility implications
  static List<PermissionWarning> validatePermissionChange({
    Contact? contact,
    PartnerPermission? newPermission,
    CalendarEvent? event,
    EventPrivacyLevel? newPrivacyLevel,
    required List<CalendarEvent> allEvents,
    required List<Contact> allContacts,
  }) {
    final warnings = <PermissionWarning>[];

    // Validate partner permission change
    if (contact != null && newPermission != null) {
      final oldPermission = contact.permission;

      // Count affected events
      final affectedEvents = allEvents.where((evt) {
        final oldVis = calculateEventVisibility(evt, contact);
        final newContact = contact.copyWith(permission: newPermission);
        final newVis = calculateEventVisibility(evt, newContact);
        return oldVis.visible != newVis.visible ||
            oldVis.detailLevel != newVis.detailLevel;
      }).toList();

      if (affectedEvents.isNotEmpty) {
        warnings.add(PermissionWarning(
          type: PermissionWarningType.partnerPermissionChange,
          message:
              'Changing ${contact.name}\'s permission from ${oldPermission.name} to ${newPermission.name} will affect ${affectedEvents.length} event(s)',
          affectedEventCount: affectedEvents.length,
          contact: contact,
        ));
      }
    }

    // Validate event privacy change
    if (event != null && newPrivacyLevel != null) {
      final oldPrivacy = event.privacyLevel;

      // Count affected contacts
      final affectedContacts = allContacts.where((contact) {
        final oldVis = calculateEventVisibility(event, contact);
        final newEvent = event.copyWith(privacyLevel: newPrivacyLevel);
        final newVis = calculateEventVisibility(newEvent, contact);
        return oldVis.visible != newVis.visible ||
            oldVis.detailLevel != newVis.detailLevel;
      }).toList();

      if (affectedContacts.isNotEmpty) {
        warnings.add(PermissionWarning(
          type: PermissionWarningType.eventPrivacyChange,
          message:
              'Changing "${event.title}" from ${oldPrivacy.name} to ${newPrivacyLevel.name} will affect visibility for ${affectedContacts.length} contact(s)',
          affectedContactCount: affectedContacts.length,
          event: event,
        ));
      }
    }

    return warnings;
  }

  /// Get human-readable description of visibility for UI
  static String getVisibilityDescription(EventVisibility visibility) {
    if (!visibility.visible) {
      return 'Hidden';
    }

    switch (visibility.detailLevel) {
      case EventDetailLevel.full:
        return 'Full details visible';
      case EventDetailLevel.busyOnly:
        return 'Busy block only (no details)';
      case EventDetailLevel.none:
        return 'Hidden';
    }
  }

  /// Get icon name for permission level (for UI)
  static String getPermissionIcon(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.visible:
        return 'eye'; // Icons.visibility
      case PartnerPermission.semiVisible:
        return 'clock'; // Icons.schedule
      case PartnerPermission.private:
        return 'eye_off'; // Icons.visibility_off
    }
  }

  /// Get color for permission level (for UI)
  static String getPermissionColor(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.visible:
        return 'green'; // Color(0xFF26C281)
      case PartnerPermission.semiVisible:
        return 'yellow'; // Color(0xFFFFB800)
      case PartnerPermission.private:
        return 'red'; // Color(0xFFFF4757)
    }
  }

  /// Get human-readable name for permission
  static String getPermissionName(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.visible:
        return 'Visible';
      case PartnerPermission.semiVisible:
        return 'Semi-Visible';
      case PartnerPermission.private:
        return 'Private';
    }
  }

  /// Get description for permission (for UI help text)
  static String getPermissionDescription(PartnerPermission permission) {
    switch (permission) {
      case PartnerPermission.visible:
        return 'Can see full details for all non-private events';
      case PartnerPermission.semiVisible:
        return 'Can see busy blocks only (no titles or descriptions)';
      case PartnerPermission.private:
        return 'Cannot see anything unless explicitly invited';
    }
  }

  /// Get human-readable name for event privacy level
  static String getPrivacyLevelName(EventPrivacyLevel level) {
    switch (level) {
      case EventPrivacyLevel.normal:
        return 'Normal';
      case EventPrivacyLevel.exclusive:
        return 'Exclusive';
      case EventPrivacyLevel.superExclusive:
        return 'Super Exclusive';
    }
  }

  /// Get description for event privacy level
  static String getPrivacyLevelDescription(EventPrivacyLevel level) {
    switch (level) {
      case EventPrivacyLevel.normal:
        return 'Respects partner permission levels';
      case EventPrivacyLevel.exclusive:
        return 'Only explicitly invited partners can see';
      case EventPrivacyLevel.superExclusive:
        return 'Invisible to everyone unless invited';
    }
  }
}

/// Result of visibility calculation
class EventVisibility {
  final bool visible;
  final EventDetailLevel detailLevel;
  final VisibilityReason reason;

  const EventVisibility({
    required this.visible,
    required this.detailLevel,
    required this.reason,
  });

  @override
  String toString() =>
      'EventVisibility(visible: $visible, detailLevel: $detailLevel, reason: $reason)';
}

/// Level of detail visible for an event
enum EventDetailLevel {
  /// No information visible
  none,

  /// Only shows time as busy (no title, description, attendees)
  busyOnly,

  /// Full event details visible
  full,
}

/// Reason why an event is visible or hidden
enum VisibilityReason {
  /// Explicitly invited to this event
  explicitInvitation,

  /// Partner has Visible permission
  visiblePartner,

  /// Partner has Semi-Visible permission
  semiVisiblePartner,

  /// Partner has Private permission
  privatePartner,

  /// Event is Exclusive (not invited)
  exclusiveEvent,

  /// Event is Super Exclusive (not invited)
  superExclusiveEvent,
}

/// Event paired with its visibility information
class EventWithVisibility {
  final CalendarEvent event;
  final EventVisibility visibility;

  const EventWithVisibility({
    required this.event,
    required this.visibility,
  });
}

/// Contact paired with their visibility for a specific event
class ContactVisibility {
  final Contact contact;
  final EventVisibility visibility;

  const ContactVisibility({
    required this.contact,
    required this.visibility,
  });
}

/// Warning about permission change implications
class PermissionWarning {
  final PermissionWarningType type;
  final String message;
  final int? affectedEventCount;
  final int? affectedContactCount;
  final Contact? contact;
  final CalendarEvent? event;

  const PermissionWarning({
    required this.type,
    required this.message,
    this.affectedEventCount,
    this.affectedContactCount,
    this.contact,
    this.event,
  });
}

enum PermissionWarningType {
  partnerPermissionChange,
  eventPrivacyChange,
  contactRemoval,
}
