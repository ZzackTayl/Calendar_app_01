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

  const Notification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.timestamp,
    this.actionId,
    this.metadata,
  });

  /// Create Notification from JSON
  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['id'] as String,
      type: NotificationType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => NotificationType.general,
      ),
      title: json['title'] as String,
      message: json['message'] as String,
      isRead: json['is_read'] as bool? ?? false,
      timestamp: DateTime.parse(json['timestamp'] as String),
      actionId: json['action_id'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
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
    );
  }

  /// Mark as read
  Notification markAsRead() => copyWith(isRead: true);

  /// Mark as unread
  Notification markAsUnread() => copyWith(isRead: false);

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
          metadata == other.metadata;

  @override
  int get hashCode =>
      id.hashCode ^
      type.hashCode ^
      title.hashCode ^
      message.hashCode ^
      isRead.hashCode ^
      timestamp.hashCode ^
      actionId.hashCode ^
      metadata.hashCode;

  @override
  String toString() {
    return 'Notification(id: $id, type: $type, title: $title, isRead: $isRead)';
  }
}

/// Types of notifications in MyOrbit
enum NotificationType {
  invitation,    // Partner invitations
  eventUpdate,   // Event changes/updates
  reminder,      // Upcoming event reminders
  cancellation,  // Event cancellations
  general,       // General app notifications
}

/// Extension for NotificationType to get UI properties
extension NotificationTypeExtension on NotificationType {
  /// Get the icon for this notification type
  String get icon {
    switch (this) {
      case NotificationType.invitation:
        return 'check_circle_outline';
      case NotificationType.eventUpdate:
        return 'edit_outlined';
      case NotificationType.reminder:
        return 'access_time';
      case NotificationType.cancellation:
        return 'cancel_outlined';
      case NotificationType.general:
        return 'notifications_outlined';
    }
  }

  /// Get the color for this notification type
  int get color {
    switch (this) {
      case NotificationType.invitation:
        return 0xFF4CAF50; // Green
      case NotificationType.eventUpdate:
        return 0xFF2196F3; // Blue
      case NotificationType.reminder:
        return 0xFFF59E0B; // Orange
      case NotificationType.cancellation:
        return 0xFFEF4444; // Red
      case NotificationType.general:
        return 0xFF6B7280; // Gray
    }
  }

  /// Get the priority for this notification type (higher = more important)
  int get priority {
    switch (this) {
      case NotificationType.cancellation:
        return 5; // Highest priority
      case NotificationType.invitation:
        return 4;
      case NotificationType.reminder:
        return 3;
      case NotificationType.eventUpdate:
        return 2;
      case NotificationType.general:
        return 1; // Lowest priority
    }
  }
}