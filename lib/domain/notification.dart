/// Notification domain model for MyOrbit
class Notification {
  final String id;
  final NotificationType type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime timestamp;
  final String? actionId; // Optional ID of related event/contact/etc
  final Map<String, dynamic>? metadata; // Additional contextual data
  final bool isDismissed;
  final bool showInCenter; // Whether to surface in Notification Center

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

  /// Create Notification from JSON
  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] as String,
      type: _parseNotificationType(json['type'] as String?),
      title: json['title'] as String,
      message: json['message'] as String,
      isRead: json['is_read'] as bool? ?? false,
      timestamp: DateTime.parse(json['timestamp'] as String),
      actionId: json['action_id'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      isDismissed: json['is_dismissed'] as bool? ?? false,
      showInCenter: (json['show_in_center'] as bool?) ?? (json['showInCenter'] as bool?) ?? true,
    );
  }

  /// Convert Notification to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'title': title,
      'message': message,
      'is_read': isRead,
      'timestamp': timestamp.toIso8601String(),
      'action_id': actionId,
      'metadata': metadata,
      'is_dismissed': isDismissed,
      'show_in_center': showInCenter,
    };
  }

  /// Create a copy with modified fields
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

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Notification &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          type == other.type &&
          title == other.title &&
          message == other.message &&
          isRead == other.isRead &&
          timestamp == other.timestamp &&
          actionId == other.actionId &&
          metadata == other.metadata &&
          isDismissed == other.isDismissed &&
          showInCenter == other.showInCenter;

  @override
  int get hashCode =>
      id.hashCode ^
      type.hashCode ^
      title.hashCode ^
      message.hashCode ^
      isRead.hashCode ^
      timestamp.hashCode ^
      actionId.hashCode ^
      metadata.hashCode ^
      isDismissed.hashCode ^
      showInCenter.hashCode;

  /// Check if this is an event invite notification
  bool get isEventInvite =>
      type == NotificationType.eventInvite && metadata != null && metadata!.containsKey('invite_id');

  /// Get invite ID if this is an event invite
  String? get inviteId => metadata?['invite_id'] as String?;

  @override
  String toString() {
    return 'Notification(id: $id, type: $type, title: $title, isRead: $isRead, isDismissed: $isDismissed)';
  }
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

NotificationType _parseNotificationType(String? rawType) {
  if (rawType == null || rawType.isEmpty) {
    return NotificationType.system;
  }

  final normalized = rawType
      .toLowerCase()
      .replaceAll('-', '_')
      .replaceAll(' ', '_');

  switch (normalized) {
    case 'event_invite':
    case 'invite':
    case 'invitation':
      return NotificationType.eventInvite;
    case 'partner_request':
    case 'contact_request':
    case 'connection_request':
      return NotificationType.partnerRequest;
    case 'partner_accepted':
    case 'contact_accepted':
    case 'connection_accepted':
      return NotificationType.partnerAccepted;
    case 'event_reminder':
    case 'reminder':
      return NotificationType.eventReminder;
    case 'event_updated':
    case 'event_update':
    case 'updated':
      return NotificationType.eventUpdated;
    case 'event_cancelled':
    case 'event_canceled':
    case 'cancellation':
    case 'cancelled':
      return NotificationType.eventCancelled;
    case 'signal_shared':
    case 'availability_shared':
      return NotificationType.signalShared;
    case 'signal_received':
    case 'availability_received':
      return NotificationType.signalReceived;
    case 'signal_expired':
      // Surface signal expiry as signal activity in the overview timeline
      return NotificationType.signalReceived;
    case 'system':
    case 'general':
    case 'info':
      return NotificationType.system;
    default:
      return NotificationType.system;
  }
}
