// Activity Screen - Rebuilt to match Figma design
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../domain/notification.dart' as app_notification;
import '../../logic/providers/notification_providers.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_button.dart';
import '../widgets/accessibility/semantic_text.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  bool _isOlderExpanded = false;

  Future<void> _removeActivity(
    app_notification.Notification notification,
  ) async {
    final notifier = ref.read(notificationListProvider.notifier);
    await notifier.deleteNotification(notification.id);

    if (!mounted) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    messenger
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: const Text('Activity removed'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () {
              HapticFeedback.lightImpact();
              ref.read(notificationListProvider.notifier).addNotification(
                    notification,
                  );
            },
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(notificationListProvider);
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        decoration: BoxDecoration(
            gradient: palette.isDark
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF1A1C24), Color(0xFF252837)],
                  )
                : AppGradients.backgroundFor(palette.brightness)),
        child: SafeArea(
          minimum: const EdgeInsets.only(top: 24),
          child: notificationsAsync.when(
            data: (notifications) {
              final sorted = [...notifications]..sort(
                  (a, b) => b.timestamp.compareTo(a.timestamp),
                );
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(palette, textTheme),
                    const SizedBox(height: 16),
                    if (sorted.isEmpty)
                      _buildEmptyState(palette, textTheme)
                    else
                      _buildActivityList(sorted, palette, textTheme),
                  ],
                ),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stackTrace) => Center(
              child: Text('Error loading activity: $error'),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AppPalette palette, TextTheme textTheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SemanticHeading(
          child: Text(
            'Activity Overview',
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: palette.textPrimary,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your complete history of notifications and shared updates',
          style: textTheme.bodyMedium?.copyWith(
            color: palette.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildActivityList(
      List<app_notification.Notification> activities, AppPalette palette, TextTheme textTheme) {
    final now = DateTime.now();
    final todayActivities = activities
        .where(
          (activity) => _isSameDay(now, activity.timestamp),
        )
        .toList();
    final olderActivities = activities
        .where(
          (activity) => !_isSameDay(now, activity.timestamp),
        )
        .toList()
      ..sort(
        (a, b) => b.timestamp.compareTo(a.timestamp),
      );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (todayActivities.isNotEmpty) ...[
          _SectionHeading(label: 'Today', palette: palette, textTheme: textTheme),
          const SizedBox(height: 12),
          ...todayActivities.map(
            (activity) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildActivityCard(context, activity, palette, textTheme),
            ),
          ),
          if (olderActivities.isNotEmpty) const SizedBox(height: 24),
        ],
        if (olderActivities.isNotEmpty)
          _OlderActivitySection(
            activities: olderActivities,
            buildCard: (activity) => _buildActivityCard(context, activity, palette, textTheme),
            isExpanded: _isOlderExpanded,
            onToggle: () {
              setState(() {
                _isOlderExpanded = !_isOlderExpanded;
              });
            },
            palette: palette,
            textTheme: textTheme,
          ),
      ],
    );
  }

  Widget _buildActivityCard(
    BuildContext context,
    app_notification.Notification notification,
    AppPalette palette,
    TextTheme textTheme,
  ) {
    final visuals = _activityVisuals(notification.type, palette);
    final timestamp = notification.timestamp;
    final title = notification.title;
    final message = notification.message;
    final isDismissed = notification.isDismissed;
    final overviewOnly = !notification.showInCenter;

    return Opacity(
      opacity: isDismissed ? 0.65 : 1,
      child: SemanticCard(
        label: title,
        hint: '$message, ${_formatTimestamp(timestamp)}',
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              decoration: BoxDecoration(
                color: visuals.backgroundColor,
                borderRadius: BorderRadius.circular(16),
                border: Border(
                  left: BorderSide(
                    color: visuals.borderColor,
                    width: 5,
                  ),
                ),
                boxShadow: [
                  BoxShadow(
                    color: palette.cardShadow,
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              padding: const EdgeInsets.fromLTRB(18, 18, 48, 18),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: visuals.borderColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      visuals.icon,
                      color: visuals.borderColor,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: palette.textPrimary,
                          ),
                        ),
                        if (overviewOnly) ...[
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: palette.isDark
                                  ? palette.surface.withValues(alpha: 0.6)
                                  : AppColors.activityPurpleLight,
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.archive_outlined,
                                  size: 14,
                                  color: palette.isDark
                                      ? AppColors.activityPurpleLight
                                      : AppColors.activityPurple,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Overview only',
                                  style: textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: palette.isDark
                                        ? AppColors.activityPurpleLight
                                        : AppColors.activityPurple,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          message,
                          style: textTheme.bodyMedium?.copyWith(
                            fontSize: 14,
                            color: palette.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _formatTimestamp(timestamp),
                          style: textTheme.bodySmall?.copyWith(
                            fontSize: 13,
                            color: palette.textTertiary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              top: 6,
              right: 6,
              child: SemanticButton(
                label: 'Delete activity: $title',
                onPressed: notification.id.isEmpty
                    ? null
                    : () {
                        HapticFeedback.lightImpact();
                        _removeActivity(notification);
                      },
                child: IconButton(
                  tooltip: 'Delete from activity history',
                  icon: const Icon(Icons.close),
                  iconSize: 20,
                  color: palette.textTertiary,
                  splashRadius: 20,
                  onPressed: notification.id.isEmpty
                      ? null
                      : () {
                          HapticFeedback.lightImpact();
                          _removeActivity(notification);
                        },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _ActivityVisuals _activityVisuals(
    app_notification.NotificationType type,
    AppPalette palette,
  ) {
    switch (type) {
      case app_notification.NotificationType.invitation:
        return _ActivityVisuals(
          icon: Icons.person_add,
          borderColor: palette.isDark ? AppColors.activityPurple : AppColors.activityPurple,
          backgroundColor: palette.isDark ? palette.surfaceVariant : AppColors.activityPurpleLight,
        );
      case app_notification.NotificationType.eventUpdate:
        return _ActivityVisuals(
          icon: Icons.edit,
          borderColor: palette.isDark ? AppColors.activityBlue : AppColors.activityBlue,
          backgroundColor: palette.isDark ? palette.surfaceVariant : AppColors.activityBlueLight,
        );
      case app_notification.NotificationType.reminder:
        return _ActivityVisuals(
          icon: Icons.notifications,
          borderColor: palette.isDark ? AppColors.activityGreen : AppColors.activityGreen,
          backgroundColor: palette.isDark ? palette.surfaceVariant : AppColors.activityGreenLight,
        );
      case app_notification.NotificationType.cancellation:
        return _ActivityVisuals(
          icon: Icons.cancel,
          borderColor: palette.isDark ? AppColors.activityRed : AppColors.activityRed,
          backgroundColor: palette.isDark ? palette.surfaceVariant : AppColors.activityRedLight,
        );
      case app_notification.NotificationType.general:
        return _ActivityVisuals(
          icon: Icons.info_outline,
          borderColor: palette.isDark ? AppColors.activityBlue : AppColors.activityBlue,
          backgroundColor: palette.isDark ? palette.surfaceVariant : AppColors.activityBlueLight,
        );
    }
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Widget _buildEmptyState(AppPalette palette, TextTheme textTheme) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        color: palette.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppShadows.subtle,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 32,
            color: palette.textTertiary,
          ),
          const SizedBox(height: 12),
          Text(
            'All caught up!',
            style: textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w600,
              color: palette.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'New activity from the past week will appear here.',
            style: textTheme.bodyMedium?.copyWith(
              fontSize: 14,
              color: palette.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    // Relative time
    String relativeTime;
    if (difference.inMinutes < 60) {
      relativeTime = '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      relativeTime = '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      relativeTime = '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else {
      relativeTime =
          '${(difference.inDays / 7).floor()} week${(difference.inDays / 7).floor() > 1 ? 's' : ''} ago';
    }

    // Full timestamp
    final dateFormat = DateFormat('EEEE, MMMM d');
    final timeFormat = DateFormat('h:mm a');
    final fullTimestamp = '${dateFormat.format(timestamp)} at ${timeFormat.format(timestamp)}';

    return '$relativeTime • $fullTimestamp';
  }
}

class _ActivityVisuals {
  final IconData icon;
  final Color borderColor;
  final Color backgroundColor;

  const _ActivityVisuals({
    required this.icon,
    required this.borderColor,
    required this.backgroundColor,
  });
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.label, required this.palette, required this.textTheme});

  final String label;
  final AppPalette palette;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Text(
        label,
        style: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w700,
          color: palette.textPrimary,
        ),
      ),
    );
  }
}

class _OlderActivitySection extends StatelessWidget {
  const _OlderActivitySection({
    required this.activities,
    required this.buildCard,
    required this.isExpanded,
    required this.onToggle,
    required this.palette,
    required this.textTheme,
  });

  final List<app_notification.Notification> activities;
  final Widget Function(app_notification.Notification) buildCard;
  final bool isExpanded;
  final VoidCallback onToggle;
  final AppPalette palette;
  final TextTheme textTheme;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            onToggle();
          },
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SectionHeading(
                        label: 'Earlier This Week',
                        palette: palette,
                        textTheme: textTheme,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${activities.length} item${activities.length == 1 ? '' : 's'} from the past week',
                        style: textTheme.bodySmall?.copyWith(
                          fontSize: 13,
                          color: palette.textTertiary,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: palette.textPrimary,
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
              const SizedBox(height: 12),
              ...activities.map(
                (activity) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: buildCard(activity),
                ),
              ),
            ],
          ),
          crossFadeState: isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }
}
