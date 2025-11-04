import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
// Unused imports removed - will be added back during BLoC migration
// import '../../../domain/notification.dart' as app_notification;
// import '../../../l10n/app_localizations.dart';
// import '../../logic/providers/notification_providers.dart'; // TODO: Migrate to BLoC
// import 'event_invite_response_sheet.dart';
import '../../../core/theme_constants.dart';
import '../../widgets/app_gradient_background.dart';

/// Notifications Screen - Shows recent notifications and activity
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // TODO: Migrate to BLoC - use NotificationCubit instead
    // final notificationsAsync = ref.watch(notificationListProvider);
    // final visibleNotificationsAsync =
    //     notificationsAsync.whenData(_visibleNotifications);
    // final visibleCount = visibleNotificationsAsync.asData?.value.length ?? 0;
    final visibleCount = 0;
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
        // TODO: Migrate to BLoC - use NotificationCubit instead
        child: _buildEmptyState(context),
        // child: visibleNotificationsAsync.when(
        //   data: (visible) {
        //     if (visible.isEmpty) {
        //       return _buildEmptyState(context);
        //     }

        //     final primary = visible.take(6).toList();
        //     final secondary = visible.skip(6).toList();

        //     return Column(
        //       children: [
        //         Divider(height: 1, thickness: 1, color: palette.divider),
        //         Expanded(
        //           child: ListView(
        //             padding: const EdgeInsets.symmetric(vertical: 8),
        //             children: [
        //               for (var i = 0; i < primary.length; i++) ...[
        //                 _buildNotificationItem(context, primary[i], ref),
        //                 if (i != primary.length - 1)
        //                   Divider(
        //                     height: 1,
        //                     thickness: 1,
        //                     color: palette.divider,
        //                     indent: 16,
        //                     endIndent: 16,
        //                   ),
        //               ],
        //               if (secondary.isNotEmpty)
        //                 _OlderNotificationsSection(
        //                   notifications: secondary,
        //                   itemBuilder: (notification) => _buildNotificationItem(
        //                       context, notification, ref),
        //                 ),
        //             ],
        //           ),
        //         ),
        //         _buildFooter(context, ref, visible.isNotEmpty),
        //       ],
        //     );
        //   },
        //   loading: () => Center(
        //       child: CircularProgressIndicator(color: colorScheme.primary)),
        //   error: (error, stack) => Center(
        //     child: Text(
        //       'Error loading notifications: $error',
        //       style:
        //           textTheme.bodyMedium?.copyWith(color: palette.textSecondary),
        //       textAlign: TextAlign.center,
        //     ),
        //   ),
        // ),
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

  // Unused methods removed - will be reimplemented during BLoC migration
  // List<app_notification.Notification> _visibleNotifications(...) { ... }
  // Widget _buildNotificationItem(...) { ... }
  // Widget _buildFooter(...) { ... }
  // void _handleNotificationTap(...) { ... }
  // void _showNotificationDetail(...) { ... }
}

// Unused widget removed - will be reimplemented during BLoC migration
// class _OlderNotificationsSection extends StatefulWidget { ... }
