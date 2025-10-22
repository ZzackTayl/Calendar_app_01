import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../domain/notification.dart' as app_notification;
import '../../core/theme_constants.dart';
import 'accessibility/semantic_button.dart';

/// Event reminder banner widget displayed at the top of the app
/// Shows event reminders, cancellations, and other event-related notifications
/// User must tap to dismiss and navigate to notification center
class EventReminderBanner extends StatefulWidget {
  final List<app_notification.Notification> notifications;
  final VoidCallback onDismiss;

  const EventReminderBanner({
    super.key,
    required this.notifications,
    required this.onDismiss,
  });

  @override
  State<EventReminderBanner> createState() => _EventReminderBannerState();
}

class _EventReminderBannerState extends State<EventReminderBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(
        CurvedAnimation(parent: _animationController, curve: Curves.easeOut));

    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleDismiss() async {
    await _animationController.reverse();
    widget.onDismiss();
  }

  void _handleTap(BuildContext context) {
    _handleDismiss();
    context.push('/notifications');
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    if (widget.notifications.isEmpty) {
      return const SizedBox.shrink();
    }

    // Get primary notification (highest priority)
    final primaryNotification = widget.notifications.first;
    final hasMore = widget.notifications.length > 1;
    final moreCount = widget.notifications.length - 1;

    // Get notification type color for border
    final borderColor = Color(primaryNotification.type.color);

    // Build notification text
    final bannerText =
        _buildBannerText(primaryNotification, hasMore, moreCount);

    final hint = hasMore
        ? 'Tap to open notifications. $moreCount more updates available.'
        : 'Tap to open notifications.';

    return SlideTransition(
      position: _slideAnimation,
      child: SafeArea(
        bottom: false,
        child: Semantics(
          label: 'Event reminder: $bannerText',
          hint: hint,
          button: true,
          onTap: () => _handleTap(context),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => _handleTap(context),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: palette.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border(
                  left: BorderSide(
                    color: borderColor,
                    width: 4,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: palette.cardShadow,
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: ExcludeSemantics(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              bannerText,
                              style: textTheme.bodyMedium?.copyWith(
                                color: palette.textPrimary,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (hasMore) ...[
                              const SizedBox(height: 4),
                              Text(
                                '+$moreCount more update${moreCount > 1 ? 's' : ''}',
                                style: textTheme.labelSmall?.copyWith(
                                  color: palette.textSecondary,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    SemanticIconButton(
                      label: 'Dismiss reminder banner',
                      hint: 'Hides this reminder',
                      icon: Icons.close,
                      size: 20,
                      color: palette.isDark
                          ? AppColors.cardBorderBabyBlue
                          : palette.textSecondary,
                      onPressed: _handleDismiss,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _buildBannerText(
    app_notification.Notification notification,
    bool hasMore,
    int moreCount,
  ) {
    String baseText = notification.title;

    // Add message detail if available
    if (notification.message.isNotEmpty) {
      baseText = '$baseText: ${notification.message}';
    }

    // Add "more updates" indicator
    if (hasMore) {
      baseText =
          '$baseText • +$moreCount more update${moreCount > 1 ? 's' : ''}';
    }

    return baseText;
  }
}
