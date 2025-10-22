import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/notification.dart' as app_notification;
import '../../logic/providers/notification_providers.dart';
import 'event_invite_response_sheet.dart';
import '../../core/theme_constants.dart';

/// Notifications Screen - Shows recent notifications and activity
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationListProvider);
    final unreadCount = ref.watch(unreadNotificationCountProvider);
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;
    final notificationIconColor =
        palette.isDark ? const Color(0xFF9CCAFF) : const Color(0xFF1D4ED8);

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        backgroundColor: palette.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Icon(Icons.notifications_outlined,
                color: notificationIconColor, size: 28),
            const SizedBox(width: 12),
            Text(
              'Notifications',
              style: textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: palette.textPrimary,
              ),
            ),
            if (unreadCount > 0) ...[
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: colorScheme.primary
                      .withValues(alpha: palette.isDark ? 0.25 : 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  unreadCount.toString(),
                  style: textTheme.labelLarge?.copyWith(
                    color: colorScheme.onPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          Consumer(
            builder: (context, ref, child) {
              final notificationsAsync = ref.watch(notificationListProvider);
              return notificationsAsync.when(
                data: (notifications) {
                  final windowStart =
                      DateTime.now().subtract(const Duration(days: 3));
                  final visible = notifications
                      .where(
                        (notification) =>
                            notification.showInCenter &&
                            !notification.isDismissed &&
                            notification.timestamp.isAfter(windowStart),
                      )
                      .take(12)
                      .toList();
                  if (visible.isEmpty) {
                    return const SizedBox.shrink();
                  }
                  return TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: palette.textSecondary,
                    ),
                    onPressed: () async {
                      await ref
                          .read(notificationListProvider.notifier)
                          .clearAll();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(
                            SnackBar(
                              content: const Text('Notifications cleared'),
                              duration: const Duration(seconds: 2),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: palette.surface,
                            ),
                          );
                      }
                    },
                    child: Text(
                      'Clear All',
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: palette.textSecondary,
                      ),
                    ),
                  );
                },
                loading: () => const SizedBox.shrink(),
                error: (_, __) => const SizedBox.shrink(),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.close),
            color: palette.textSecondary,
            onPressed: () => context.pop(),
            tooltip: 'Close notifications',
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          final windowStart = DateTime.now().subtract(const Duration(days: 3));
          final visible = notifications
              .where(
                (notification) =>
                    notification.showInCenter &&
                    !notification.isDismissed &&
                    notification.timestamp.isAfter(windowStart),
              )
              .toList()
            ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
          final limited = visible.take(12).toList();
          final primary = limited.take(6).toList();
          final secondary = limited.skip(6).take(6).toList();

          if (limited.isEmpty) {
            return _buildEmptyState(context);
          }

          return Column(
            children: [
              Divider(height: 1, thickness: 1, color: palette.divider),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    for (var i = 0; i < primary.length; i++) ...[
                      _buildNotificationItem(context, primary[i], ref),
                      if (i != primary.length - 1)
                        Divider(
                          height: 1,
                          thickness: 1,
                          color: palette.divider,
                          indent: 16,
                          endIndent: 16,
                        ),
                    ],
                    if (secondary.isNotEmpty)
                      _OlderNotificationsSection(
                        notifications: secondary,
                        itemBuilder: (notification) =>
                            _buildNotificationItem(context, notification, ref),
                      ),
                  ],
                ),
              ),
              _buildFooter(context),
            ],
          );
        },
        loading: () => Center(
            child: CircularProgressIndicator(color: colorScheme.primary)),
        error: (error, stack) => Center(
          child: Text(
            'Error loading notifications: $error',
            style: textTheme.bodyMedium?.copyWith(color: palette.textSecondary),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationItem(BuildContext context,
      app_notification.Notification notification, WidgetRef ref) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    IconData icon;
    Color iconColor;

    switch (notification.type) {
      case app_notification.NotificationType.eventInvite:
        icon = Icons.event_available;
        iconColor = colorScheme.primary;
        break;
      case app_notification.NotificationType.partnerRequest:
        icon = Icons.person_add_alt;
        iconColor = colorScheme.primary;
        break;
      case app_notification.NotificationType.partnerAccepted:
        icon = Icons.handshake;
        iconColor = colorScheme.secondary;
        break;
      case app_notification.NotificationType.eventReminder:
        icon = Icons.access_time;
        iconColor = colorScheme.tertiary;
        break;
      case app_notification.NotificationType.eventUpdated:
        icon = Icons.edit_outlined;
        iconColor = colorScheme.secondary;
        break;
      case app_notification.NotificationType.eventCancelled:
        icon = Icons.cancel_outlined;
        iconColor = colorScheme.error;
        break;
      case app_notification.NotificationType.signalShared:
        icon = Icons.share;
        iconColor = colorScheme.primary;
        break;
      case app_notification.NotificationType.signalReceived:
        icon = Icons.schedule;
        iconColor = colorScheme.secondary;
        break;
      case app_notification.NotificationType.system:
        icon = Icons.notifications_outlined;
        iconColor = palette.textSecondary;
        break;
    }

    final backgroundColor = notification.isRead
        ? palette.surface
        : palette.highlightFor(palette.surface);

    return Semantics(
      label: notification.title,
      button: true,
      child: InkWell(
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
          decoration: BoxDecoration(
            color: backgroundColor,
          ),
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
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: notification.isRead
                            ? FontWeight.w500
                            : FontWeight.w600,
                        color: palette.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: textTheme.bodyMedium?.copyWith(
                        fontWeight: notification.isRead
                            ? FontWeight.w400
                            : FontWeight.w500,
                        color: palette.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      notification.timeAgo,
                      style: textTheme.bodySmall
                          ?.copyWith(color: palette.textSecondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Dismiss notification',
                icon: const Icon(Icons.close),
                color: palette.textTertiary,
                onPressed: () async {
                  await ref
                      .read(notificationListProvider.notifier)
                      .dismissNotification(notification.id);
                  if (!context.mounted) {
                    return;
                  }
                  final messenger = ScaffoldMessenger.of(context);
                  messenger
                    ..hideCurrentSnackBar()
                    ..showSnackBar(
                      SnackBar(
                        content: Text('${notification.title} dismissed'),
                        duration: const Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: palette.surface,
                        action: SnackBarAction(
                          label: 'Undo',
                          textColor: colorScheme.primary,
                          onPressed: () {
                            ref
                                .read(notificationListProvider.notifier)
                                .restoreNotification(notification.id);
                          },
                        ),
                      ),
                    );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.notifications_none,
            size: 80,
            color: palette.textTertiary,
          ),
          const SizedBox(height: 16),
          Text(
            'No notifications yet',
            style: textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'You\'ll see updates from your connections here',
            style: textTheme.bodyMedium?.copyWith(color: palette.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: palette.surface,
        border: Border(
          top: BorderSide(
            color: palette.divider,
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              final navigator = Navigator.of(context);
              if (navigator.canPop()) {
                navigator.pop();
              }
              context.go('/activity');
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'View All Recent Activity',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: colorScheme.secondary,
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_forward,
                  color: colorScheme.secondary,
                  size: 20,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Notifications are cleared automatically after 3 days',
            style: textTheme.bodySmall?.copyWith(color: palette.textSecondary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Handle notification tap navigation
  void _handleNotificationTap(
      BuildContext context, app_notification.Notification notification) async {
    switch (notification.type) {
      case app_notification.NotificationType.eventInvite:
        if (notification.metadata != null &&
            notification.metadata!.containsKey('invite_id')) {
          final inviteId = notification.metadata!['invite_id'] as String;
          await EventInviteResponseSheet.show(context, inviteId);
        } else {
          context.go('/calendar');
        }
        break;
      case app_notification.NotificationType.partnerRequest:
        context.go('/people');
        break;
      case app_notification.NotificationType.partnerAccepted:
        context.go('/people');
        break;
      case app_notification.NotificationType.eventReminder:
      case app_notification.NotificationType.eventUpdated:
      case app_notification.NotificationType.eventCancelled:
        context.go('/calendar');
        break;
      case app_notification.NotificationType.signalShared:
      case app_notification.NotificationType.signalReceived:
        context.go('/signals');
        break;
      case app_notification.NotificationType.system:
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
}

class _OlderNotificationsSection extends StatefulWidget {
  const _OlderNotificationsSection({
    required this.notifications,
    required this.itemBuilder,
  });

  final List<app_notification.Notification> notifications;
  final Widget Function(app_notification.Notification) itemBuilder;

  @override
  State<_OlderNotificationsSection> createState() =>
      _OlderNotificationsSectionState();
}

class _OlderNotificationsSectionState
    extends State<_OlderNotificationsSection> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () => setState(() {
            _isExpanded = !_isExpanded;
          }),
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Earlier Notifications',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: palette.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${widget.notifications.length} item${widget.notifications.length == 1 ? '' : 's'} from the past 3 days',
                        style: textTheme.bodySmall?.copyWith(
                            color: palette.textSecondary, height: 1.4),
                      ),
                    ],
                  ),
                ),
                Icon(
                  _isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: palette.textSecondary,
                ),
              ],
            ),
          ),
        ),
        AnimatedCrossFade(
          firstChild: const SizedBox.shrink(),
          secondChild: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Divider(
                height: 1,
                thickness: 1,
                color: palette.divider,
                indent: 16,
                endIndent: 16,
              ),
              const SizedBox(height: 12),
              ...List.generate(widget.notifications.length, (index) {
                final notification = widget.notifications[index];
                return Column(
                  children: [
                    widget.itemBuilder(notification),
                    if (index != widget.notifications.length - 1)
                      Divider(
                        height: 1,
                        thickness: 1,
                        color: palette.divider,
                        indent: 16,
                        endIndent: 16,
                      ),
                  ],
                );
              }),
            ],
          ),
          crossFadeState: _isExpanded
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }
}
