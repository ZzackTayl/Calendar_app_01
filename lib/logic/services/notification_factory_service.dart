import '../../domain/contact.dart';
import '../../domain/event.dart';
import '../../domain/notification.dart';

/// Factory service for creating notifications based on app events
/// Centralizes notification creation logic to handle settings and preferences
class NotificationFactoryService {
  /// Create a notification for when a partner accepts a connection invitation
  static Notification createConnectionAcceptedNotification(Contact contact) {
    return Notification(
      id: 'connection_accepted_${contact.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.partnerAccepted,
      title: 'Connection Accepted',
      message: '${contact.name} has accepted your connection invitation',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'contact_id': contact.id,
        'contact_name': contact.name,
        'contact_email': contact.email,
        'action_type': 'accepted',
      },
      showInCenter: true,
    );
  }

  /// Create a notification for when a partner declines a connection invitation
  static Notification createConnectionDeclinedNotification(Contact contact) {
    return Notification(
      id: 'connection_declined_${contact.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.system,
      title: 'Connection Declined',
      message: '${contact.name} has declined your connection invitation',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'contact_id': contact.id,
        'contact_name': contact.name,
        'contact_email': contact.email,
        'action_type': 'declined',
      },
      showInCenter: true,
    );
  }

  /// Create a notification for when an event is modified
  static Notification createEventModifiedNotification(
    CalendarEvent event, {
    required String modifierName,
    required List<String> changedFields,
  }) {
    final fieldsSummary = changedFields.length == 1
        ? changedFields.first
        : changedFields.length <= 3
            ? changedFields.join(', ')
            : '${changedFields.take(3).join(', ')}, and more';

    return Notification(
      id: 'event_modified_${event.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.eventUpdated,
      title: 'Event Updated',
      message: '$modifierName updated "${event.title}": $fieldsSummary changed',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_id': event.id,
        'event_title': event.title,
        'modifier_name': modifierName,
        'changed_fields': changedFields,
        'event_start': event.start.toIso8601String(),
      },
      showInCenter: true,
    );
  }

  /// Create a notification for a new shared event
  static Notification createEventSharedNotification(
    CalendarEvent event, {
    required String sharerName,
    required String permission,
  }) {
    return Notification(
      id: 'event_shared_${event.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.eventUpdated,
      title: 'Event Shared With You',
      message: '$sharerName shared "${event.title}" ($permission)',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_id': event.id,
        'event_title': event.title,
        'sharer_name': sharerName,
        'permission': permission,
        'event_start': event.start.toIso8601String(),
      },
      showInCenter: true,
    );
  }

  /// Create a notification for SMS-based reminder
  /// This is called when SMS setting is enabled and reminder time arrives
  static Notification createSmsReminderNotification(CalendarEvent event) {
    return Notification(
      id: 'sms_reminder_${event.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.eventReminder,
      title: 'Event Reminder via SMS',
      message: 'SMS reminder sent for "${event.title}"',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_id': event.id,
        'event_title': event.title,
        'event_start': event.start.toIso8601String(),
        'delivery_method': 'sms',
      },
      showInCenter: true,
    );
  }

  /// Create a notification for SMS event rescheduling
  /// This tracks when someone uses SMS to reschedule
  static Notification createSmsRescheduleNotification(
    CalendarEvent event, {
    required String contactName,
    required DateTime newTime,
  }) {
    return Notification(
      id: 'sms_reschedule_${event.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.eventUpdated,
      title: 'Event Rescheduled via SMS',
      message:
          '$contactName rescheduled "${event.title}" to ${_formatDateTime(newTime)}',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_id': event.id,
        'event_title': event.title,
        'contact_name': contactName,
        'new_time': newTime.toIso8601String(),
        'rescheduled_via': 'sms',
      },
      showInCenter: true,
    );
  }

  /// Create a notification for SMS event cancellation
  static Notification createSmsCancellationNotification(
    CalendarEvent event, {
    required String contactName,
  }) {
    return Notification(
      id: 'sms_cancel_${event.id}_${DateTime.now().millisecondsSinceEpoch}',
      type: NotificationType.eventCancelled,
      title: 'Event Cancelled via SMS',
      message: '$contactName cancelled "${event.title}" via SMS',
      isRead: false,
      timestamp: DateTime.now(),
      metadata: {
        'event_id': event.id,
        'event_title': event.title,
        'contact_name': contactName,
        'cancelled_via': 'sms',
      },
      showInCenter: true,
    );
  }

  /// Helper to format DateTime for display
  static String _formatDateTime(DateTime dateTime) {
    final today = DateTime.now();
    final tomorrow = today.add(const Duration(days: 1));

    if (dateTime.year == today.year &&
        dateTime.month == today.month &&
        dateTime.day == today.day) {
      return 'today at ${_formatTime(dateTime)}';
    } else if (dateTime.year == tomorrow.year &&
        dateTime.month == tomorrow.month &&
        dateTime.day == tomorrow.day) {
      return 'tomorrow at ${_formatTime(dateTime)}';
    } else {
      return '${dateTime.month}/${dateTime.day} at ${_formatTime(dateTime)}';
    }
  }

  static String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour % 12;
    final hourStr = hour == 0 ? '12' : hour.toString().padLeft(2, '0');
    final minStr = dateTime.minute.toString().padLeft(2, '0');
    final period = dateTime.hour >= 12 ? 'PM' : 'AM';
    return '$hourStr:$minStr $period';
  }
}
