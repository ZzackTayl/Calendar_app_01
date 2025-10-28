import '../../domain/event.dart';
import '../../domain/enums.dart';
import '../../domain/contact.dart';

/// Service for managing event visibility based on MyOrbit's 4-level hierarchy
///
/// This service implements the core visibility logic that determines what
/// information different users can see about calendar events. It's critical
/// for maintaining privacy while enabling selective sharing.
///
/// The 4 Visibility Levels:
/// 1. Public - Everyone can see full details
/// 2. Partners Only - Only connected partners see full details, others see "Busy"
/// 3. Specific People - Only selected people see full details, others see "Busy"
/// 4. Private - Only event owner sees details, everyone else sees "Busy"
class VisibilityService {
  /// Determines if a viewer can see the full details of an event
  ///
  /// This is the core visibility check that implements the 4-level hierarchy.
  ///
  /// Parameters:
  /// - [event]: The calendar event to check visibility for
  /// - [viewerId]: The ID of the user trying to view the event
  /// - [partnerIds]: List of IDs of users who are connected partners
  /// - [eventVisibility]: The visibility level set for this event (defaults to public)
  /// - [sharedWith]: Optional list of specific user IDs who have been granted access
  ///
  /// Returns:
  /// - `true` if the viewer can see full event details
  /// - `false` if the viewer should only see "Busy" or nothing
  ///
  /// Logic Flow:
  /// 1. Owner always sees everything
  /// 2. Public events - everyone sees details
  /// 3. Partners Only - check if viewer is in partnerIds
  /// 4. Specific People - check if viewer is in sharedWith list
  /// 5. Private - only owner sees details
  static bool canViewEventDetails({
    required CalendarEvent event,
    required String viewerId,
    required List<String> partnerIds,
    EventVisibility eventVisibility = EventVisibility.public,
    List<String>? sharedWith,
  }) {
    // Handle null/empty cases
    if (viewerId.isEmpty) return false;

    // Owner always has full access to their own events
    if (event.ownerId == viewerId) {
      return true;
    }

    // Apply visibility hierarchy
    switch (eventVisibility) {
      case EventVisibility.public:
        // Public events are visible to everyone
        return true;

      case EventVisibility.partnersOnly:
        // Only connected partners can see details
        return partnerIds.contains(viewerId);

      case EventVisibility.specificPeople:
        // Only people in the sharedWith list can see details
        if (sharedWith == null || sharedWith.isEmpty) {
          return false;
        }
        return sharedWith.contains(viewerId);

      case EventVisibility.private:
        // Only the owner can see private events
        // (already handled above, but explicit for clarity)
        return false;
    }
  }

  /// Returns the appropriate version of an event for a specific viewer
  ///
  /// This method either returns the full event details or a redacted "Busy"
  /// version depending on the viewer's permissions.
  ///
  /// Parameters:
  /// - [event]: The original calendar event
  /// - [viewerId]: The ID of the user viewing the event
  /// - [partnerIds]: List of connected partner IDs
  /// - [eventVisibility]: The visibility level (defaults to public)
  /// - [sharedWith]: Optional list of specific user IDs with access
  ///
  /// Returns:
  /// - Full event if viewer has permission
  /// - Redacted "Busy" event if viewer doesn't have permission
  ///
  /// The "Busy" version:
  /// - Shows only the time slot (start/end)
  /// - Title is replaced with "Busy"
  /// - Description is removed
  /// - All other details are hidden
  static CalendarEvent getVisibleEventForUser({
    required CalendarEvent event,
    required String viewerId,
    required List<String> partnerIds,
    EventVisibility eventVisibility = EventVisibility.public,
    List<String>? sharedWith,
  }) {
    // Check if user can see full details
    final canViewDetails = canViewEventDetails(
      event: event,
      viewerId: viewerId,
      partnerIds: partnerIds,
      eventVisibility: eventVisibility,
      sharedWith: sharedWith,
    );

    if (canViewDetails) {
      // Return full event details
      return event;
    }

    // Return redacted "Busy" version
    return event.copyWith(
      title: 'Busy',
      description: null,
      // Keep timing information so viewer knows the slot is occupied
      // Remove sensitive details like invited partners
      invitedPartnerIds: [],
    );
  }

  /// Filters a list of events to show only what the viewer can see
  ///
  /// This is useful for calendar views where you need to display multiple
  /// events and want to apply visibility rules to all of them at once.
  ///
  /// Parameters:
  /// - [events]: List of calendar events to filter
  /// - [viewerId]: The ID of the user viewing the events
  /// - [partnerIds]: List of connected partner IDs
  /// - [getEventVisibility]: Function to get visibility level for each event
  /// - [getSharedWith]: Function to get sharedWith list for each event
  ///
  /// Returns:
  /// - List of events with appropriate visibility applied
  /// - Events the user can't see at all are excluded
  /// - Events with limited visibility are shown as "Busy"
  ///
  /// Note: This assumes all events should be visible in some form (even if
  /// just as "Busy"). If you want to completely hide private events, you
  /// would need additional filtering logic.
  static List<CalendarEvent> filterEventsForUser({
    required List<CalendarEvent> events,
    required String viewerId,
    required List<String> partnerIds,
    EventVisibility Function(CalendarEvent)? getEventVisibility,
    List<String>? Function(CalendarEvent)? getSharedWith,
  }) {
    if (events.isEmpty || viewerId.isEmpty) {
      return [];
    }

    return events.map((event) {
      // Get visibility settings for this event
      final visibility =
          getEventVisibility != null ? getEventVisibility(event) : null;
      final sharedWith = getSharedWith != null ? getSharedWith(event) : null;

      return getVisibleEventForUser(
        event: event,
        viewerId: viewerId,
        partnerIds: partnerIds,
        eventVisibility: visibility ?? EventVisibility.public,
        sharedWith: sharedWith,
      );
    }).toList();
  }

  /// Returns a human-readable label for a visibility level
  static String getVisibilityLabel(EventVisibility visibility) {
    switch (visibility) {
      case EventVisibility.public:
        return 'Public';
      case EventVisibility.partnersOnly:
        return 'Partners Only';
      case EventVisibility.specificPeople:
        return 'Specific People';
      case EventVisibility.private:
        return 'Private';
    }
  }

  /// Returns a description string explaining the visibility level
  ///
  /// Useful for tooltips or help text when users are selecting a visibility
  /// level.
  static String getVisibilityDescription(EventVisibility visibility) {
    switch (visibility) {
      case EventVisibility.public:
        return 'Everyone can see full event details including title, description, and location.';

      case EventVisibility.partnersOnly:
        return 'Only your connected partners can see event details. Others will only see that you\'re busy during this time.';

      case EventVisibility.specificPeople:
        return 'Only people you specifically select can see event details. Everyone else will only see that you\'re busy.';

      case EventVisibility.private:
        return 'Only you can see this event. Everyone else will only see that you\'re busy during this time.';
    }
  }

  /// Returns an icon name suggestion for each visibility level
  ///
  /// This helps maintain consistent iconography across the UI.
  static String getVisibilityIcon(EventVisibility visibility) {
    switch (visibility) {
      case EventVisibility.public:
        return 'public';
      case EventVisibility.partnersOnly:
        return 'people';
      case EventVisibility.specificPeople:
        return 'person_add';
      case EventVisibility.private:
        return 'lock';
    }
  }

  /// Helper method to determine if an event should be completely hidden
  ///
  /// In some UI contexts, you might want to completely hide private events
  /// rather than showing them as "Busy". This method helps with that decision.
  static bool shouldHideCompletely({
    required CalendarEvent event,
    required String viewerId,
    required EventVisibility eventVisibility,
  }) {
    // Owner always sees their events
    if (event.ownerId == viewerId) {
      return false;
    }

    // For now, we show all events as at least "Busy"
    // This could be configurable in the future
    return false;
  }

  /// Validates that a visibility configuration is valid
  static bool isValidVisibilityConfiguration({
    required EventVisibility visibility,
    List<String>? sharedWith,
  }) {
    // Specific People visibility requires a non-empty sharedWith list
    if (visibility == EventVisibility.specificPeople) {
      return sharedWith != null && sharedWith.isNotEmpty;
    }

    // All other configurations are valid
    return true;
  }

  /// Returns a list of all available visibility options
  static List<EventVisibility> getAllVisibilityLevels() {
    return EventVisibility.values;
  }

  /// Returns visibility options with their labels and descriptions
  static Map<EventVisibility, Map<String, String>> getVisibilityOptions() {
    return {
      for (var visibility in EventVisibility.values)
        visibility: {
          'label': getVisibilityLabel(visibility),
          'description': getVisibilityDescription(visibility),
          'icon': getVisibilityIcon(visibility),
        }
    };
  }

  /// Helper for contexts where we already have a [Contact] entity and need to
  /// determine visibility. Falls back to the standard [canViewEventDetails]
  /// logic using the contact's external user id when available.
  static EventViewPermission calculateEventPermission({
    required CalendarEvent event,
    required Contact? viewer,
  }) {
    if (viewer == null) {
      return EventViewPermission.none;
    }

    final viewerId = viewer.externalUserId ?? viewer.id;

    if (event.ownerId == viewerId) {
      return EventViewPermission.full;
    }

    if (event.invitedPartnerIds.contains(viewerId)) {
      return EventViewPermission.full;
    }

    if (event.privacyLevel == EventPrivacyLevel.superExclusive) {
      return EventViewPermission.none;
    }

    if (event.privacyLevel == EventPrivacyLevel.exclusive) {
      return viewer.permission == PartnerPermission.visible
          ? EventViewPermission.busyOnly
          : EventViewPermission.none;
    }

    switch (viewer.permission) {
      case PartnerPermission.visible:
        return EventViewPermission.full;
      case PartnerPermission.semiVisible:
        return EventViewPermission.busyOnly;
      case PartnerPermission.private:
        return EventViewPermission.none;
    }
  }
}
