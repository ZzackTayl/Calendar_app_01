/// Consolidated enums for MyOrbit domain models
///
/// This file contains all enums used across the application's domain layer,
/// providing a single source of truth for type-safe state management.
library;

import 'notification.dart' as app_notification;

typedef NotificationType = app_notification.NotificationType;

/// Calendar view modes for displaying events
/// Determines the time range and layout of the calendar
enum CalendarView {
  /// Monthly calendar view
  month,

  /// Weekly calendar view
  week,

  /// Daily calendar view
  day,
}

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

/// Notification delivery channels for availability signals
enum SignalNotificationChannel {
  /// Use push notifications (FCM/APNs)
  push,

  /// Only show in-app badges and activity updates
  inAppOnly,

  /// Send SMS messages in addition to in-app updates
  sms,
}

/// Notification delivery channels for event reminders
enum EventNotificationChannel {
  /// Show in-app notifications in the Notifications Center
  inAppOnly,

  /// Send push notifications (displayed as OS-level notifications)
  push,

  /// Send SMS text reminders
  sms,
}

/// Visibility level when a contact views someone else's event
enum EventViewPermission {
  /// Can see full event details
  full,

  /// Can see the time is blocked but no details
  busyOnly,

  /// Cannot see the event at all
  none,
}

/// State machine states for assisted event rescheduling
enum EventRescheduleStatus {
  /// No reschedule in progress
  none,

  /// User (or assistant) has reached out to the contact
  pendingContact,

  /// Contact accepted or proposed an option
  contactConfirmed,

  /// Waiting on the event owner to approve the selected slot
  awaitingUserApproval,

  /// Reschedule completed and event updated
  scheduled,
}

extension SignalNotificationChannelX on SignalNotificationChannel {
  String get label {
    switch (this) {
      case SignalNotificationChannel.push:
        return 'Push notifications';
      case SignalNotificationChannel.inAppOnly:
        return 'In-app only';
      case SignalNotificationChannel.sms:
        return 'SMS messages';
    }
  }
}

extension EventNotificationChannelX on EventNotificationChannel {
  String get label {
    switch (this) {
      case EventNotificationChannel.inAppOnly:
        return 'In-app notification';
      case EventNotificationChannel.push:
        return 'Push notification';
      case EventNotificationChannel.sms:
        return 'SMS text message';
    }
  }
}

extension EventViewPermissionX on EventViewPermission {
  String get label {
    switch (this) {
      case EventViewPermission.full:
        return 'Full details';
      case EventViewPermission.busyOnly:
        return 'Busy only';
      case EventViewPermission.none:
        return 'Hidden';
    }
  }
}

extension EventRescheduleStatusX on EventRescheduleStatus {
  /// Human-readable label for UI surfaces.
  String get label {
    switch (this) {
      case EventRescheduleStatus.none:
        return 'Not rescheduling';
      case EventRescheduleStatus.pendingContact:
        return 'Waiting on contact';
      case EventRescheduleStatus.contactConfirmed:
        return 'Contact confirmed';
      case EventRescheduleStatus.awaitingUserApproval:
        return 'Needs your approval';
      case EventRescheduleStatus.scheduled:
        return 'Rescheduled';
    }
  }
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
extension NotificationTypeExtension on app_notification.NotificationType {
  /// Get display label for notification type
  String get label {
    switch (this) {
      case app_notification.NotificationType.eventInvite:
        return 'Event Invitation';
      case app_notification.NotificationType.signalReceived:
        return 'Signal Received';
      case app_notification.NotificationType.partnerRequest:
        return 'Partner Request';
      case app_notification.NotificationType.partnerAccepted:
        return 'Partner Accepted';
      case app_notification.NotificationType.eventReminder:
        return 'Event Reminder';
      case app_notification.NotificationType.eventUpdated:
        return 'Event Updated';
      case app_notification.NotificationType.eventCancelled:
        return 'Event Cancelled';
      case app_notification.NotificationType.signalShared:
        return 'Signal Shared';
      case app_notification.NotificationType.system:
        return 'System';
    }
  }

  /// Get icon name for notification type
  String get iconName {
    switch (this) {
      case app_notification.NotificationType.eventInvite:
        return 'event';
      case app_notification.NotificationType.signalReceived:
        return 'notifications';
      case app_notification.NotificationType.partnerRequest:
        return 'person_add';
      case app_notification.NotificationType.partnerAccepted:
        return 'check_circle';
      case app_notification.NotificationType.eventReminder:
        return 'alarm';
      case app_notification.NotificationType.eventUpdated:
        return 'update';
      case app_notification.NotificationType.eventCancelled:
        return 'cancel';
      case app_notification.NotificationType.signalShared:
        return 'share';
      case app_notification.NotificationType.system:
        return 'info';
    }
  }
}
