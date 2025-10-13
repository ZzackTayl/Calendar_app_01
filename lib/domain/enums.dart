/// Consolidated enums for MyOrbit domain models
/// 
/// This file contains all enums used across the application's domain layer,
/// providing a single source of truth for type-safe state management.

/// Event visibility levels for calendar events
/// Determines who can see event details based on privacy settings
enum EventVisibility {
  /// Event is visible to the public
  public,
  
  /// Event is only visible to connected partners
  partnersOnly,
  
  /// Event is only visible to specific invited people
  specificPeople,
  
  /// Event is completely private (only owner can see)
  private,
}

/// Signal types for availability signals
/// Represents different states of user availability
enum SignalType {
  /// User is available and free
  available,
  
  /// User is busy and unavailable
  busy,
  
  /// User has flexible availability
  flexible,
  
  /// User is explicitly unavailable
  unavailable,
}

/// Duration options for availability signals
/// Predefined time durations for quick signal creation
enum SignalDuration {
  /// 1 hour duration
  hour,
  
  /// 2 hours duration
  hours2,
  
  /// 4 hours duration
  hours4,
  
  /// Full day duration
  day,
  
  /// Custom duration (user-defined)
  custom,
}

/// Notification types for in-app notifications
/// Categorizes different types of notifications users can receive
enum NotificationType {
  /// Notification for event invitation
  eventInvite,
  
  /// Notification when a signal is received
  signalReceived,
  
  /// Notification for partner/contact request
  partnerRequest,
  
  /// Notification when partner accepts request
  partnerAccepted,
  
  /// Notification for event reminder
  eventReminder,
  
  /// Notification when event is updated
  eventUpdated,
  
  /// Notification when event is cancelled
  eventCancelled,
  
  /// Notification when signal is shared with user
  signalShared,
  
  /// System notification
  system,
}

/// Extension methods for SignalDuration enum
extension SignalDurationExtension on SignalDuration {
  /// Convert duration enum to actual Duration object
  Duration toDuration() {
    switch (this) {
      case SignalDuration.hour:
        return const Duration(hours: 1);
      case SignalDuration.hours2:
        return const Duration(hours: 2);
      case SignalDuration.hours4:
        return const Duration(hours: 4);
      case SignalDuration.day:
        return const Duration(hours: 24);
      case SignalDuration.custom:
        return Duration.zero; // Custom duration handled separately
    }
  }
  
  /// Get display label for duration
  String get label {
    switch (this) {
      case SignalDuration.hour:
        return '1 hour';
      case SignalDuration.hours2:
        return '2 hours';
      case SignalDuration.hours4:
        return '4 hours';
      case SignalDuration.day:
        return '1 day';
      case SignalDuration.custom:
        return 'Custom';
    }
  }
}

/// Extension methods for SignalType enum
extension SignalTypeExtension on SignalType {
  /// Get display label for signal type
  String get label {
    switch (this) {
      case SignalType.available:
        return 'Available';
      case SignalType.busy:
        return 'Busy';
      case SignalType.flexible:
        return 'Flexible';
      case SignalType.unavailable:
        return 'Unavailable';
    }
  }
  
  /// Get color representation for signal type (as hex string)
  String get colorHex {
    switch (this) {
      case SignalType.available:
        return '#4CAF50'; // Green
      case SignalType.busy:
        return '#F44336'; // Red
      case SignalType.flexible:
        return '#FF9800'; // Orange
      case SignalType.unavailable:
        return '#9E9E9E'; // Grey
    }
  }
}

/// Extension methods for NotificationType enum
extension NotificationTypeExtension on NotificationType {
  /// Get display label for notification type
  String get label {
    switch (this) {
      case NotificationType.eventInvite:
        return 'Event Invitation';
      case NotificationType.signalReceived:
        return 'Signal Received';
      case NotificationType.partnerRequest:
        return 'Partner Request';
      case NotificationType.partnerAccepted:
        return 'Partner Accepted';
      case NotificationType.eventReminder:
        return 'Event Reminder';
      case NotificationType.eventUpdated:
        return 'Event Updated';
      case NotificationType.eventCancelled:
        return 'Event Cancelled';
      case NotificationType.signalShared:
        return 'Signal Shared';
      case NotificationType.system:
        return 'System';
    }
  }
  
  /// Get icon name for notification type
  String get iconName {
    switch (this) {
      case NotificationType.eventInvite:
        return 'event';
      case NotificationType.signalReceived:
        return 'notifications';
      case NotificationType.partnerRequest:
        return 'person_add';
      case NotificationType.partnerAccepted:
        return 'check_circle';
      case NotificationType.eventReminder:
        return 'alarm';
      case NotificationType.eventUpdated:
        return 'update';
      case NotificationType.eventCancelled:
        return 'cancel';
      case NotificationType.signalShared:
        return 'share';
      case NotificationType.system:
        return 'info';
    }
  }
}