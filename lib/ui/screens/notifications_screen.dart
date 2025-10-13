import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Notifications Screen - Shows recent notifications and activity
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Replace with actual notification provider
    final notifications = _getMockNotifications();
    final unreadCount = notifications.where((n) => !n.isRead).length;

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
          if (notifications.isNotEmpty)
            TextButton(
              onPressed: () {
                // TODO: Clear all notifications
              },
              child: const Text(
                'Clear All',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF6B7280),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.black),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
      body: notifications.isEmpty
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
                      return _buildNotificationItem(notification);
                    },
                  ),
                ),
                _buildFooter(),
              ],
            ),
    );
  }

  Widget _buildNotificationItem(_NotificationItem notification) {
    IconData icon;
    Color iconColor;

    switch (notification.type) {
      case _NotificationType.invitation:
        icon = Icons.check_circle_outline;
        iconColor = const Color(0xFF4CAF50);
        break;
      case _NotificationType.eventUpdate:
        icon = Icons.edit_outlined;
        iconColor = const Color(0xFF2196F3);
        break;
      case _NotificationType.reminder:
        icon = Icons.access_time;
        iconColor = const Color(0xFFF59E0B);
        break;
      case _NotificationType.cancellation:
        icon = Icons.cancel_outlined;
        iconColor = const Color(0xFFEF4444);
        break;
    }

    return InkWell(
      onTap: () {
        // TODO: Navigate to relevant screen
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
    return Container(
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
              // TODO: Navigate to full activity screen
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
    );
  }

  // Mock data - replace with actual provider
  List<_NotificationItem> _getMockNotifications() {
    return [
      _NotificationItem(
        id: '1',
        type: _NotificationType.invitation,
        message:
            'Jordan accepted your invitation! Their permissions are now active.',
        timeAgo: '2h ago',
        isRead: false,
        timestamp: DateTime.now().subtract(const Duration(hours: 2)),
      ),
    ];
  }
}

// Mock notification model - replace with actual domain model
class _NotificationItem {
  final String id;
  final _NotificationType type;
  final String message;
  final String timeAgo;
  final bool isRead;
  final DateTime timestamp;

  _NotificationItem({
    required this.id,
    required this.type,
    required this.message,
    required this.timeAgo,
    required this.isRead,
    required this.timestamp,
  });
}

enum _NotificationType {
  invitation,
  eventUpdate,
  reminder,
  cancellation,
}
