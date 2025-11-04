import '../../domain/entities/notification.dart';

/// Data model for Notification with JSON serialization.
///
/// Extends the pure domain entity and adds serialization logic.
class NotificationModel extends Notification {
  const NotificationModel({
    required super.id,
    required super.type,
    required super.title,
    required super.message,
    required super.isRead,
    required super.timestamp,
    super.actionId,
    super.metadata,
    super.isDismissed,
    super.showInCenter,
  });

  /// Create a NotificationModel from a domain entity
  factory NotificationModel.fromEntity(Notification notification) {
    return NotificationModel(
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      timestamp: notification.timestamp,
      actionId: notification.actionId,
      metadata: notification.metadata,
      isDismissed: notification.isDismissed,
      showInCenter: notification.showInCenter,
    );
  }

  /// Create a NotificationModel from JSON
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String,
      type: _parseNotificationType(json['type'] as String),
      title: json['title'] as String,
      message: json['message'] as String,
      isRead: json['isRead'] as bool? ?? json['is_read'] as bool? ?? false,
      timestamp: DateTime.parse(json['timestamp'] as String),
      actionId: json['actionId'] as String? ?? json['action_id'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      isDismissed:
          json['isDismissed'] as bool? ?? json['is_dismissed'] as bool? ?? false,
      showInCenter: json['showInCenter'] as bool? ??
          json['show_in_center'] as bool? ??
          true,
    );
  }

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'title': title,
      'message': message,
      'is_read': isRead,
      'timestamp': timestamp.toIso8601String(),
      if (actionId != null) 'action_id': actionId,
      if (metadata != null) 'metadata': metadata,
      'is_dismissed': isDismissed,
      'show_in_center': showInCenter,
    };
  }

  /// Parse notification type from string
  static NotificationType _parseNotificationType(String typeStr) {
    return NotificationType.values.firstWhere(
      (e) => e.name == typeStr,
      orElse: () => NotificationType.system,
    );
  }

  /// Create a copy with updated fields
  @override
  NotificationModel copyWith({
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
    return NotificationModel(
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
}
