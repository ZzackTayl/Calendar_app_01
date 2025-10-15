import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/notification.dart' as app_notification;
import '../../logic/providers/notification_providers.dart';

/// Notifications Screen - Shows recent notifications and activity
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationListProvider);
    final unreadCount = ref.watch(unreadNotificationCountProvider);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            const Icon(Icons.notifications_outlined,
                color: Colors.black, size: 28),
            const SizedBox(width: 12),
            const Text(
              'Notifications',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Colors.black,
              ),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE3F2FD),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  unreadCount.toString(),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF2196F3),
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          Consumer(
            builder: (context, ref, child) {
              return notificationsAsync.when(
                data: (notifications) => notifications.isNotEmpty
                    ? TextButton(
                        onPressed: () async {
                          await ref
                              .read(notificationListProvider.notifier)
                              .clearAll();
                        },
                        child: const Text(
                          'Clear All',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      )
                    : const SizedBox.shrink(),
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) => notifications.isEmpty
            ? _buildEmptyState()
            : Column(
                children: [
                  const Divider(
                      height: 1, thickness: 1, color: Color(0xFFE5E7EB)),
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: notifications.length,
                      separatorBuilder: (context, index) => const Divider(
                        height: 1,
                        thickness: 1,
                        color: Color(0xFFE5E7EB),
                        indent: 16,
                        endIndent: 16,
                      ),
                      itemBuilder: (context, index) {
                        final notification = notifications[index];
                        return _buildNotificationItem(
                            context, notification, ref);
                      },
                    ),
                  ),
                  _buildFooter(),
                ],
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Text('Error loading notifications: $error'),
        ),
      ),
    );
  }

  Widget _buildNotificationItem(BuildContext context,
      app_notification.Notification notification, WidgetRef ref) {
    IconData icon;
    Color iconColor;

    switch (notification.type) {
      case app_notification.NotificationType.invitation:
        icon = Icons.check_circle_outline;
        iconColor = const Color(0xFF4CAF50);
        break;
      case app_notification.NotificationType.eventUpdate:
        icon = Icons.edit_outlined;
        iconColor = const Color(0xFF2196F3);
        break;
      case app_notification.NotificationType.reminder:
        icon = Icons.access_time;
        iconColor = const Color(0xFFF59E0B);
        break;
      case app_notification.NotificationType.cancellation:
        icon = Icons.cancel_outlined;
        iconColor = const Color(0xFFEF4444);
        break;
      case app_notification.NotificationType.general:
        icon = Icons.notifications_outlined;
        iconColor = const Color(0xFF6B7280);
        break;
    }

    return InkWell(
      onTap: () async {
        // Mark notification as read when tapped
        if (!notification.isRead) {
          await ref
              .read(notificationListProvider.notifier)
              .markAsRead(notification.id);
        }

        // Navigate based on notification type and actionId
        if (context.mounted) {
          _handleNotificationTap(context, notification);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        color: notification.isRead ? Colors.white : const Color(0xFFF9FAFB),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              color: iconColor,
              size: 24,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: notification.isRead
                          ? FontWeight.w500
                          : FontWeight.w600,
                      color: Colors.black87,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: notification.isRead
                          ? FontWeight.w500
                          : FontWeight.w600,
                      color: Colors.black87,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    notification.timeAgo,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none,
            size: 80,
            color: Colors.grey[300],
          ),
          const SizedBox(height: 16),
          const Text(
            'No notifications yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'You\'ll see updates from your partners here',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF9CA3AF),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    return Builder(
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(
              color: const Color(0xFFE5E7EB),
              width: 1,
            ),
          ),
        ),
        child: Column(
          children: [
            InkWell(
              onTap: () {
                // Navigate to activity/history screen when implemented
                _showComingSoonDialog(context, 'Activity History');
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'View All Recent Activity',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF7C3BFF),
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.arrow_forward,
                    color: Color(0xFF7C3BFF),
                    size: 20,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Notifications are cleared automatically after 7 days',
              style: TextStyle(
                fontSize: 13,
                color: Color(0xFF9CA3AF),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Handle notification tap navigation
  void _handleNotificationTap(
      BuildContext context, app_notification.Notification notification) {
    switch (notification.type) {
      case app_notification.NotificationType.invitation:
        // Navigate to contacts/people screen
        context.go('/people');
        break;
      case app_notification.NotificationType.eventUpdate:
      case app_notification.NotificationType.reminder:
      case app_notification.NotificationType.cancellation:
        // Navigate to calendar screen
        context.go('/calendar');
        break;
      case app_notification.NotificationType.general:
        // Stay on notifications or show detail
        _showNotificationDetail(context, notification);
        break;
    }
  }

  /// Show detailed notification information
  void _showNotificationDetail(
      BuildContext context, app_notification.Notification notification) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(notification.title),
        content: Text(notification.message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  /// Show "Coming Soon" dialog for unimplemented features
  void _showComingSoonDialog(BuildContext context, String feature) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Coming Soon'),
        content: Text(
            '$feature functionality will be available in a future update.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}
