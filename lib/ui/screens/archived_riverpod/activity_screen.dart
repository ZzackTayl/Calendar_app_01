// Activity Screen - Rebuilt to match Figma design
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/theme_constants.dart';
import '../../../core/responsive_utils.dart';
import '../../../domain/notification.dart' as app_notification;
import '../../../domain/contact.dart';
import '../../../logic/providers/notification_providers.dart';
import '../../../logic/providers/contact_providers.dart';
import '../../widgets/accessibility/semantic_card.dart';
import '../../widgets/accessibility/semantic_button.dart';
import '../../widgets/accessibility/semantic_text.dart';

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
    final contactsAsync = ref.watch(contactListProvider);
    final contacts = contactsAsync.maybeWhen(
      data: (value) => value,
      orElse: () => const <Contact>[],
    );
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: palette.background,
      body: Container(
        constraints: const BoxConstraints.expand(),
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
              final twoWeeksAgo =
                  DateTime.now().subtract(const Duration(days: 14));
              final recentNotifications = notifications
                  .where(
                    (notification) =>
                        !notification.timestamp.isBefore(twoWeeksAgo),
                  )
                  .toList();
              final sorted = [...recentNotifications]..sort(
                  (a, b) => b.timestamp.compareTo(a.timestamp),
                );
              return SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(context, palette, textTheme),
                    const SizedBox(height: 16),
                    if (sorted.isEmpty)
                      _buildEmptyState(palette, textTheme)
                    else
                      _buildActivityList(sorted, palette, textTheme, contacts),
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

  Widget _buildHeader(
      BuildContext context, AppPalette palette, TextTheme textTheme) {
    final textStyles = context.responsiveText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SemanticHeading(
          label: 'Activity Overview',
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              SemanticImage(
                label: 'Activity icon',
                child: Image.asset(
                  'icons/activities_icon.webp',
                  width: 80,
                  height: 80,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  'Activity Overview',
                  style:
                      textStyles.heading2.copyWith(color: palette.textPrimary),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your complete history of notifications and shared updates',
          style: textTheme.bodyMedium?.copyWith(
            color: palette.isDark ? palette.textSecondary : Colors.black,
          ),
        ),
      ],
    );
  }

  Widget _buildActivityList(List<app_notification.Notification> activities,
      AppPalette palette, TextTheme textTheme, List<Contact> contacts) {
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
          _SectionHeading(
              label: 'Today', palette: palette, textTheme: textTheme),
          const SizedBox(height: 12),
          ...todayActivities.map(
            (activity) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildActivityCard(
                  context, activity, palette, textTheme, contacts),
            ),
          ),
          if (olderActivities.isNotEmpty) const SizedBox(height: 24),
        ],
        if (olderActivities.isNotEmpty)
          _OlderActivitySection(
            activities: olderActivities,
            buildCard: (activity) => _buildActivityCard(
                context, activity, palette, textTheme, contacts),
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
    List<Contact> contacts,
  ) {
    final colorScheme = Theme.of(context).colorScheme;
    final visuals = _activityVisuals(notification, palette, contacts);
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
                    child: visuals.assetIcon != null
                        ? Image.asset(
                            visuals.assetIcon!,
                            width: 22,
                            height: 22,
                            fit: BoxFit.contain,
                          )
                        : Icon(
                            visuals.icon!,
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
                        _TimestampText(
                          timestamp: timestamp,
                          colorScheme: colorScheme,
                          textTheme: textTheme,
                          palette: palette,
                          formatTimestamp: _formatTimestamp,
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
                  color: palette.chevronColor,
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
    app_notification.Notification notification,
    AppPalette palette,
    List<Contact> contacts,
  ) {
    final type = notification.type;
    switch (type) {
      case app_notification.NotificationType.eventInvite:
        return _ActivityVisuals(
          icon: Icons.event_available,
          borderColor: AppColors.activityPurple,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityPurpleLight,
        );
      case app_notification.NotificationType.partnerRequest:
        return _ActivityVisuals(
          icon: Icons.person_add,
          borderColor: AppColors.activityPurple,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityPurpleLight,
        );
      case app_notification.NotificationType.partnerAccepted:
        // Try to get contact color from metadata
        Color borderColor = AppColors.activityGreen; // default
        if (notification.metadata != null &&
            notification.metadata!.containsKey('contact_id')) {
          final contactId = notification.metadata!['contact_id'] as String;
          final contact = contacts.firstWhere(
            (c) => c.id == contactId,
            orElse: () => contacts.firstWhere(
              (c) => c.email == notification.metadata!['contact_email'],
              orElse: () => Contact(
                id: '',
                name: '',
                status: ContactStatus.pending,
                ownerId: '',
              ),
            ),
          );
          if (contact.colorHex != null && contact.colorHex!.isNotEmpty) {
            try {
              final hexColor = contact.colorHex!.replaceAll('#', '');
              borderColor = Color(int.parse('FF$hexColor', radix: 16));
            } catch (e) {
              // If parsing fails, use default green
              borderColor = AppColors.activityGreen;
            }
          }
        }
        return _ActivityVisuals(
          icon: Icons.handshake,
          borderColor: borderColor,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityGreenLight,
        );
      case app_notification.NotificationType.eventReminder:
        return _ActivityVisuals(
          icon: Icons.notifications_active,
          borderColor: AppColors.activityGreen,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityGreenLight,
        );
      case app_notification.NotificationType.eventUpdated:
        return _ActivityVisuals(
          assetIcon: 'icons/pencil_icon.webp',
          borderColor: AppColors.activityBlue,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityBlueLight,
        );
      case app_notification.NotificationType.eventCancelled:
        return _ActivityVisuals(
          icon: Icons.cancel,
          borderColor: AppColors.activityRed,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityRedLight,
        );
      case app_notification.NotificationType.signalShared:
        return _ActivityVisuals(
          icon: Icons.share,
          borderColor: AppColors.activityBlue,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityBlueLight,
        );
      case app_notification.NotificationType.signalReceived:
        return _ActivityVisuals(
          icon: Icons.schedule,
          borderColor: AppColors.activityBlue,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityBlueLight,
        );
      case app_notification.NotificationType.system:
        return _ActivityVisuals(
          icon: Icons.info_outline,
          borderColor: AppColors.activityBlue,
          backgroundColor: palette.isDark
              ? palette.surfaceVariant
              : AppColors.activityBlueLight,
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
            'Activity from the past 2 weeks will appear here.',
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

class _TimestampText extends StatelessWidget {
  const _TimestampText({
    required this.timestamp,
    required this.colorScheme,
    required this.textTheme,
    required this.palette,
    required this.formatTimestamp,
  });

  final DateTime timestamp;
  final ColorScheme colorScheme;
  final TextTheme textTheme;
  final AppPalette palette;
  final String Function(DateTime) formatTimestamp;

  @override
  Widget build(BuildContext context) {
    final formatted = formatTimestamp(timestamp);
    final baseStyle = textTheme.bodySmall?.copyWith(
      fontSize: 13,
      color: palette.textTertiary,
    );

    final delimiterIndex = formatted.indexOf('•');
    if (delimiterIndex == -1) {
      return Text(
        formatted,
        style: baseStyle?.copyWith(color: colorScheme.secondary),
      );
    }

    final relative = formatted.substring(0, delimiterIndex).trim();
    final detail = formatted.substring(delimiterIndex + 1).trim();

    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: relative,
            style: baseStyle?.copyWith(color: colorScheme.secondary),
          ),
          TextSpan(
            text: ' • ',
            style: baseStyle,
          ),
          TextSpan(
            text: detail,
            style: baseStyle,
          ),
        ],
      ),
    );
  }
}

class _ActivityVisuals {
  final IconData? icon;
  final String? assetIcon;
  final Color borderColor;
  final Color backgroundColor;

  const _ActivityVisuals({
    this.icon,
    this.assetIcon,
    required this.borderColor,
    required this.backgroundColor,
  }) : assert(
          icon != null || assetIcon != null,
          'Provide either icon or assetIcon.',
        );
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading(
      {required this.label, required this.palette, required this.textTheme});

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
                        label: 'Past 2 Weeks',
                        palette: palette,
                        textTheme: textTheme,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${activities.length} item${activities.length == 1 ? '' : 's'} from the past 2 weeks',
                        style: textTheme.bodySmall?.copyWith(
                          fontSize: 13,
                          color: palette.isDark
                              ? palette.textTertiary
                              : Colors.black,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isExpanded ? Icons.expand_less : Icons.expand_more,
                  color: palette.chevronColor,
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
