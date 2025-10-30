import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../domain/notification.dart' as app_notification;
import '../../l10n/app_localizations.dart';
import '../../logic/providers/notification_providers.dart';
import 'event_invite_response_sheet.dart';
import '../../core/theme_constants.dart';
import '../widgets/app_gradient_background.dart';

/// Notifications Screen - Shows recent notifications and activity
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(notificationListProvider);
    final visibleNotificationsAsync =
        notificationsAsync.whenData(_visibleNotifications);
    final visibleCount = visibleNotificationsAsync.asData?.value.length ?? 0;
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
        titleSpacing: 16,
        title: LayoutBuilder(
          builder: (context, constraints) {
            return Row(
              children: [
                Icon(Icons.notifications_outlined,
                    color: notificationIconColor, size: 26),
                const SizedBox(width: 12),
                Flexible(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          'Notifications',
                          overflow: TextOverflow.ellipsis,
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: palette.textPrimary,
                          ),
                        ),
                      ),
                      if (visibleCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            visibleCount.toString(),
                            style: textTheme.labelMedium?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: IconButton(
              icon: const Icon(Icons.close),
              color: palette.chevronColor,
              onPressed: () => context.pop(),
              tooltip: 'Close notifications',
              constraints: const BoxConstraints.tightFor(
                width: 44,
                height: 44,
              ),
            ),
          ),
        ],
      ),
      body: AppGradientBackground(
        child: visibleNotificationsAsync.when(
          data: (visible) {
            if (visible.isEmpty) {
              return _buildEmptyState(context);
            }

            final primary = visible.take(6).toList();
            final secondary = visible.skip(6).toList();

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
                          itemBuilder: (notification) => _buildNotificationItem(
                              context, notification, ref),
                        ),
                    ],
                  ),
                ),
                _buildFooter(context, ref, visible.isNotEmpty),
              ],
            );
          },
          loading: () => Center(
              child: CircularProgressIndicator(color: colorScheme.primary)),
          error: (error, stack) => Center(
            child: Text(
              'Error loading notifications: $error',
              style:
                  textTheme.bodyMedium?.copyWith(color: palette.textSecondary),
              textAlign: TextAlign.center,
            ),
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

    Widget icon;

    switch (notification.type) {
      case app_notification.NotificationType.eventInvite:
        icon = Icon(
          Icons.event_available,
          color: colorScheme.primary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.partnerRequest:
        icon = Icon(
          Icons.person_add_alt,
          color: colorScheme.primary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.partnerAccepted:
        icon = Icon(
          Icons.handshake,
          color: colorScheme.secondary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.eventReminder:
        icon = Icon(
          Icons.access_time,
          color: colorScheme.tertiary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.eventUpdated:
        icon = Image.asset(
          'icons/pencil_icon.webp',
          width: 24,
          height: 24,
          fit: BoxFit.contain,
        );
        break;
      case app_notification.NotificationType.eventCancelled:
        icon = Icon(
          Icons.cancel_outlined,
          color: colorScheme.error,
          size: 24,
        );
        break;
      case app_notification.NotificationType.signalShared:
        icon = Icon(
          Icons.share,
          color: colorScheme.primary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.signalReceived:
        icon = Icon(
          Icons.schedule,
          color: colorScheme.secondary,
          size: 24,
        );
        break;
      case app_notification.NotificationType.system:
        icon = Icon(
          Icons.notifications_outlined,
          color: palette.textSecondary,
          size: 24,
        );
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
              icon,
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.title,
                      style: textTheme.titleSmall?.copyWith(
                        fontWeight: notification.isRead
                            ? FontWeight.w500
                            : FontWeight.w600,
                        color: palette.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: textTheme.bodySmall?.copyWith(
                        fontWeight: notification.isRead
                            ? FontWeight.w400
                            : FontWeight.w500,
                        color: palette.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      notification.timeAgo,
                      style: textTheme.labelSmall
                          ?.copyWith(color: colorScheme.secondary),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Dismiss notification',
                icon: const Icon(Icons.close),
                color: palette.chevronColor,
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
                        content: Text(
                          AppLocalizations.of(context)
                              .notificationDismissed(notification.title),
                        ),
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
            style: textTheme.bodyMedium?.copyWith(color: palette.textPrimary),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildFooter(
    BuildContext context,
    WidgetRef ref,
    bool hasNotifications,
  ) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;
    final ctaColor =
        palette.isDark ? const Color(0xFF9CCAFF) : const Color(0xFF1D4ED8);
    final l10n = AppLocalizations.of(context);

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
          if (hasNotifications) ...[
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.secondary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  textStyle: textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                onPressed: () async {
                  await ref.read(notificationListProvider.notifier).clearAll();
                  if (!context.mounted) {
                    return;
                  }
                  ScaffoldMessenger.of(context)
                    ..hideCurrentSnackBar()
                    ..showSnackBar(
                      SnackBar(
                        content: Text(l10n.notificationsCleared),
                        duration: const Duration(seconds: 2),
                        behavior: SnackBarBehavior.floating,
                        backgroundColor: palette.surface,
                      ),
                    );
                },
                child: const Text('Clear All'),
              ),
            ),
            const SizedBox(height: 20),
          ],
          InkWell(
            onTap: () {
              context.push('/activity');
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'View All Recent Activity',
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: ctaColor,
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_forward,
                  color: ctaColor,
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

  List<app_notification.Notification> _visibleNotifications(
    List<app_notification.Notification> notifications,
  ) {
    return computeNotificationCenterVisible(notifications);
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
          context.push('/calendar');
        }
        break;
      case app_notification.NotificationType.partnerRequest:
        context.push('/people');
        break;
      case app_notification.NotificationType.partnerAccepted:
        context.push('/people');
        break;
      case app_notification.NotificationType.eventReminder:
      case app_notification.NotificationType.eventUpdated:
      case app_notification.NotificationType.eventCancelled:
        context.push('/calendar');
        break;
      case app_notification.NotificationType.signalShared:
      case app_notification.NotificationType.signalReceived:
        context.push('/calendar');
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
            child: Text(AppLocalizations.of(context).notificationsOkButton),
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
