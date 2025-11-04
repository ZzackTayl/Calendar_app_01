import '../../../../domain/event.dart';
import '../../../../features/contacts/domain/entities/contact.dart';
import '../../domain/entities/notification.dart';
import '../../../../logic/services/notification_factory_service.dart';
import 'notification_automation_models.dart';

Future<void> synchronizeCalendarShareNotifications({
  required NotificationAutomationSettings settings,
  required List<CalendarEvent> events,
  required List<Contact> contacts,
  required List<Notification> existingNotifications,
  required Future<void> Function(Notification notification) addNotification,
}) async {
  if (!settings.calendarChangesEnabled || events.isEmpty) {
    return;
  }

  final now = DateTime.now();

  for (final event in events) {
    if (event.invitedPartnerIds.isEmpty) {
      continue;
    }

    final alreadyNotified = existingNotifications.any(
      (notification) =>
          notification.metadata?['event_id'] == event.id &&
          (notification.metadata?['action_type'] == 'shared' ||
              notification.type.name == 'eventUpdate') &&
          !notification.isDismissed,
    );

    if (alreadyNotified) {
      continue;
    }

    final createdAt = event.createdAt;
    if (createdAt != null) {
      final createdRecently = now.difference(createdAt).inMinutes < 5;
      if (!createdRecently) {
        continue;
      }
    }

    final sharerName = _resolveSharerName(event, contacts);

    final notification =
        NotificationFactoryService.createEventSharedNotification(
      event,
      sharerName: sharerName,
      permission: event.privacyLevel.name,
    );

    await addNotification(notification);
  }
}

String _resolveSharerName(CalendarEvent event, List<Contact> contacts) {
  for (final contact in contacts) {
    if (contact.externalUserId != null &&
        contact.externalUserId == event.ownerId) {
      return contact.name;
    }
  }

  for (final contact in contacts) {
    if (contact.id == event.ownerId) {
      return contact.name;
    }
  }

  return 'Someone you know';
}
