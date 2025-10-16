// Activity Screen - Rebuilt to match Figma design
import 'package:flutter/material.dart';
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
    BuildContext context,
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

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: notificationsAsync.when(
            data: (notifications) {
              final sorted = [...notifications]..sort(
                  (a, b) => b.timestamp.compareTo(a.timestamp),
                );
              return SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 16),
                    if (sorted.isEmpty)
                      _buildEmptyState()
                    else
                      _buildActivityList(sorted),
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

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SemanticHeading(
          child: Text(
            'Recent Activity',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Track changes and updates from your connections',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildActivityList(List<app_notification.Notification> activities) {
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
          const _SectionHeading(label: 'Today'),
          const SizedBox(height: 12),
          ...todayActivities.map(
            (activity) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildActivityCard(context, activity),
            ),
          ),
          if (olderActivities.isNotEmpty) const SizedBox(height: 24),
        ],
        if (olderActivities.isNotEmpty)
          _OlderActivitySection(
            activities: olderActivities,
            buildCard: (activity) => _buildActivityCard(context, activity),
            isExpanded: _isOlderExpanded,
            onToggle: () {
              setState(() {
                _isOlderExpanded = !_isOlderExpanded;
              });
            },
          ),
      ],
    );
  }

  Widget _buildActivityCard(
    BuildContext context,
    app_notification.Notification notification,
  ) {
    final visuals = _activityVisuals(notification.type);
    final timestamp = notification.timestamp;
    final title = notification.title;
    final message = notification.message;
    final isDismissed = notification.isDismissed;

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
                    color: Colors.black.withValues(alpha: 0.05),
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
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          message,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _formatTimestamp(timestamp),
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[500],
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
                    : () => _removeActivity(context, notification),
                child: IconButton(
                  tooltip: 'Delete from activity history',
                  icon: const Icon(Icons.close),
                  iconSize: 20,
                  color: Colors.grey[600],
                  splashRadius: 20,
                  onPressed: notification.id.isEmpty
                      ? null
                      : () => _removeActivity(context, notification),
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
  ) {
    switch (type) {
      case app_notification.NotificationType.invitation:
        return const _ActivityVisuals(
          icon: Icons.person_add,
          borderColor: AppColors.activityPurple,
          backgroundColor: AppColors.activityPurpleLight,
        );
      case app_notification.NotificationType.eventUpdate:
        return const _ActivityVisuals(
          icon: Icons.edit,
          borderColor: AppColors.activityBlue,
          backgroundColor: AppColors.activityBlueLight,
        );
      case app_notification.NotificationType.reminder:
        return const _ActivityVisuals(
          icon: Icons.notifications,
          borderColor: AppColors.activityGreen,
          backgroundColor: AppColors.activityGreenLight,
        );
      case app_notification.NotificationType.cancellation:
        return const _ActivityVisuals(
          icon: Icons.cancel,
          borderColor: AppColors.activityRed,
          backgroundColor: AppColors.activityRedLight,
        );
      case app_notification.NotificationType.general:
        return const _ActivityVisuals(
          icon: Icons.info_outline,
          borderColor: AppColors.activityBlue,
          backgroundColor: AppColors.activityBlueLight,
        );
    }
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.75),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 32,
            color: Colors.grey[500],
          ),
          const SizedBox(height: 12),
          const Text(
            'All caught up!',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'New activity from the past week will appear here.',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
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
      relativeTime =
          '${difference.inDays} day${difference.inDays > 1 ? 's' : ''} ago';
    } else {
      relativeTime =
          '${(difference.inDays / 7).floor()} week${(difference.inDays / 7).floor() > 1 ? 's' : ''} ago';
    }

    // Full timestamp
    final dateFormat = DateFormat('EEEE, MMMM d');
    final timeFormat = DateFormat('h:mm a');
    final fullTimestamp =
        '${dateFormat.format(timestamp)} at ${timeFormat.format(timestamp)}';

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
  const _SectionHeading({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      header: true,
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
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
  });

  final List<app_notification.Notification> activities;
  final Widget Function(app_notification.Notification) buildCard;
  final bool isExpanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final subtitleStyle = TextStyle(
      fontSize: 13,
      color: Colors.grey[600],
      height: 1.4,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
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
                      const _SectionHeading(label: 'Earlier This Week'),
                      const SizedBox(height: 4),
                      Text(
                        '${activities.length} item${activities.length == 1 ? '' : 's'} from the past week',
                        style: subtitleStyle,
                      ),
                    ],
                  ),
                ),
                Icon(
                  isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: AppColors.textPrimary,
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
          crossFadeState:
              isExpanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }
}
