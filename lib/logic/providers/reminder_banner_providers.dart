import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/notifications/domain/entities/notification.dart' as app_notification;
import 'notification_providers.dart';

/// Provides the currently visible reminder banners sorted by priority
/// Filters for event-related notifications that should show as banners
final visibleReminderBannersProvider =
    Provider<List<app_notification.Notification>>((ref) {
  final notificationsAsync = ref.watch(notificationListProvider);

  return notificationsAsync.when(
    data: (notifications) {
      // Filter for event-related notifications that should show as banners
      final bannerNotifications = notifications.where((notification) {
        // Only show these notification types as banners
        final isBannerType = notification.type ==
                app_notification.NotificationType.eventReminder ||
            notification.type ==
                app_notification.NotificationType.eventCancelled ||
            notification.type == app_notification.NotificationType.eventUpdated;

        // Don't show if marked as dismissed in notification center
        final notClearedFromCenter = !notification.isDismissed;
        final metadata = notification.metadata;
        final bannerHidden = metadata != null &&
            ((metadata['banner_hidden'] as bool?) == true ||
                (metadata['bannerHidden'] as bool?) == true);

        return isBannerType && notClearedFromCenter && !bannerHidden;
      }).toList();

      if (bannerNotifications.isEmpty) {
        return [];
      }

      // Sort by priority (type priority) and then by timestamp (newest first)
      final sorted = [...bannerNotifications]..sort((a, b) {
          // Higher priority types first
          final priorityCompare = b.type.priority.compareTo(a.type.priority);
          if (priorityCompare != 0) {
            return priorityCompare;
          }
          // Then by timestamp (newest first)
          return b.timestamp.compareTo(a.timestamp);
        });

      // Return top 3 (to avoid too many banners stacking)
      return sorted.take(3).toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
});

/// Watch for the first/primary banner to display
final primaryReminderBannerProvider =
    Provider<app_notification.Notification?>((ref) {
  final banners = ref.watch(visibleReminderBannersProvider);
  return banners.isNotEmpty ? banners.first : null;
});

/// Get grouped notifications for the primary banner
/// Returns primary banner + additional notifications for display
final groupedReminderBannerNotificationsProvider =
    Provider<List<app_notification.Notification>>((ref) {
  final banners = ref.watch(visibleReminderBannersProvider);
  // Return all banners (already limited to 3)
  return banners;
});
