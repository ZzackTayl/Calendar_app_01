import 'package:equatable/equatable.dart';

/// Domain entity representing a notification in MyOrbit.
///
/// Keeps UI-specific concerns out of the domain layer.
/// Serialization is handled by NotificationModel in the data layer.
class Notification extends Equatable {
  const Notification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.timestamp,
    this.actionId,
    this.metadata,
    this.isDismissed = false,
    this.showInCenter = true,
  });

  /// Unique identifier for the notification.
  final String id;

  /// Type of notification.
  final NotificationType type;

  /// Notification title.
  final String title;

  /// Notification message.
  final String message;

  /// Whether the notification has been read.
  final bool isRead;

  /// When the notification was created.
  final DateTime timestamp;

  /// Optional ID of related event/contact/etc.
  final String? actionId;

  /// Additional contextual data.
  final Map<String, dynamic>? metadata;

  /// Whether the notification has been dismissed.
  final bool isDismissed;

  /// Whether to surface in Notification Center.
  final bool showInCenter;

  Notification copyWith({
    String? id,
    NotificationType? type,
    String? title,
    String? message,
    bool? isRead,
    DateTime? timestamp,
    String? actionId,
    Map<String, dynamic>? metadata,
    bool? isDismissed,
    bool? showInCenter,
  }) {
    return Notification(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      message: message ?? this.message,
      isRead: isRead ?? this.isRead,
      timestamp: timestamp ?? this.timestamp,
      actionId: actionId ?? this.actionId,
      metadata: metadata ?? this.metadata,
      isDismissed: isDismissed ?? this.isDismissed,
      showInCenter: showInCenter ?? this.showInCenter,
    );
  }

  /// Mark as read
  Notification markAsRead() => copyWith(isRead: true);

  /// Mark as unread
  Notification markAsUnread() => copyWith(isRead: false);

  /// Dismiss from notification center (but keep in history)
  Notification dismiss() => copyWith(isDismissed: true);

  /// Restore to notification center
  Notification restore() => copyWith(isDismissed: false);

  /// Skip surfacing this notification in the Notification Center while
  /// keeping it in the activity overview timeline.
  Notification overviewOnly() => copyWith(showInCenter: false);

  /// Get relative time string (e.g., "2h ago", "1 day ago")
  String get timeAgo {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return '${weeks}w ago';
    } else {
      final months = (difference.inDays / 30).floor();
      return '${months}mo ago';
    }
  }

  /// Check if this is an event invite notification
  bool get isEventInvite =>
      type == NotificationType.eventInvite &&
      metadata != null &&
      metadata!.containsKey('invite_id');

  /// Get invite ID if this is an event invite
  String? get inviteId => metadata?['invite_id'] as String?;

  @override
  List<Object?> get props => [
        id,
        type,
        title,
        message,
        isRead,
        timestamp,
        actionId,
        metadata,
        isDismissed,
        showInCenter,
      ];
}

/// Types of notifications in MyOrbit.
enum NotificationType {
  eventInvite,
  partnerRequest,
  partnerAccepted,
  eventReminder,
  eventUpdated,
  eventCancelled,
  signalShared,
  signalReceived,
  system,
}

/// Extension for NotificationType to get UI properties
extension NotificationTypeExtension on NotificationType {
  /// Get the icon for this notification type
  String get icon {
    switch (this) {
      case NotificationType.eventInvite:
        return 'event_available';
      case NotificationType.partnerRequest:
        return 'person_add';
      case NotificationType.partnerAccepted:
        return 'handshake';
      case NotificationType.eventReminder:
        return 'notifications_active';
      case NotificationType.eventUpdated:
        return 'edit_calendar';
      case NotificationType.eventCancelled:
        return 'event_busy';
      case NotificationType.signalShared:
        return 'share';
      case NotificationType.signalReceived:
        return 'schedule';
      case NotificationType.system:
        return 'info';
    }
  }

  /// Get the color for this notification type
  int get color {
    switch (this) {
      case NotificationType.eventInvite:
      case NotificationType.partnerRequest:
        return 0xFF7C4DFF; // Indigo accent for invitations & requests
      case NotificationType.partnerAccepted:
        return 0xFF4CAF50; // Green
      case NotificationType.eventReminder:
        return 0xFFFFC107; // Amber
      case NotificationType.eventUpdated:
        return 0xFF2196F3; // Blue
      case NotificationType.eventCancelled:
        return 0xFFEF4444; // Red
      case NotificationType.signalShared:
      case NotificationType.signalReceived:
        return 0xFF00BCD4; // Teal accent for signals
      case NotificationType.system:
        return 0xFF6B7280; // Gray fallback
    }
  }

  /// Get the priority for this notification type (higher = more important)
  int get priority {
    switch (this) {
      case NotificationType.eventCancelled:
        return 5; // Highest priority
      case NotificationType.eventInvite:
      case NotificationType.partnerRequest:
        return 4;
      case NotificationType.eventReminder:
        return 3;
      case NotificationType.eventUpdated:
      case NotificationType.partnerAccepted:
        return 2;
      case NotificationType.signalShared:
      case NotificationType.signalReceived:
      case NotificationType.system:
        return 1; // Lowest priority tier
    }
  }
}
