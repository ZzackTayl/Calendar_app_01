// Activity Screen - Rebuilt to match Figma design
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../logic/services/dev_data_service.dart';
import '../../domain/enums.dart';
import '../../domain/availability_signal.dart';
import '../../logic/providers/signal_providers.dart';

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  late List<Map<String, dynamic>> _activities;
  bool _isOlderExpanded = false;

  @override
  void initState() {
    super.initState();
    _initializeActivities();
  }

  void _initializeActivities() {
    _activities = DevDataService.getMockRecentActivity()
        .map((activity) => Map<String, dynamic>.from(activity))
        .toList()
      ..sort(
        (a, b) =>
            (b['timestamp'] as DateTime).compareTo(a['timestamp'] as DateTime),
      );
  }

  void _removeActivity(String id) {
    final index = _activities.indexWhere((activity) => activity['id'] == id);
    if (index == -1) {
      return;
    }

    final removedActivity = Map<String, dynamic>.from(_activities[index]);

    setState(() {
      _activities.removeAt(index);
    });

    if (!mounted) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: const Text('Activity removed'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () {
            if (!mounted) return;
            setState(() {
              _activities.insert(index, removedActivity);
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mySignalsAsync = ref.watch(activeSignalsProvider);
    final sharedSignalsAsync = ref.watch(signalsSharedWithMeProvider);
    final mySignals = mySignalsAsync.asData?.value ?? const [];
    final sharedSignals = sharedSignalsAsync.asData?.value ?? const [];

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Container(
        decoration: const BoxDecoration(gradient: AppGradients.background),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 24),
                _buildSignalSummary(mySignals, sharedSignals),
                const SizedBox(height: 16),
                if (_activities.isEmpty)
                  _buildEmptyState()
                else
                  _buildActivityList(_activities),
              ],
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
        const Text(
          'Recent Activity',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Track changes and updates from your connected partners',
          style: TextStyle(
            fontSize: 16,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildSignalSummary(
    List<AvailabilitySignal> mySignals,
    List<AvailabilitySignal> sharedSignals,
  ) {
    final totalSignals = mySignals.length + sharedSignals.length;

    if (totalSignals == 0) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Text(
          'No availability signals active right now. Share one to let partners know when you are free.',
          style: TextStyle(
            fontSize: 15,
            color: AppColors.textPrimary,
          ),
        ),
      );
    }

    Widget buildStat({required String label, required int value}) {
      return Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Availability Overview',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              buildStat(label: 'Shared by you', value: mySignals.length),
              const SizedBox(width: 16),
              buildStat(label: 'From partners', value: sharedSignals.length),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActivityList(List<Map<String, dynamic>> activities) {
    final now = DateTime.now();
    final todayActivities = activities
        .where(
          (activity) => _isSameDay(now, activity['timestamp'] as DateTime),
        )
        .toList();
    final olderActivities = activities
        .where(
          (activity) => !_isSameDay(now, activity['timestamp'] as DateTime),
        )
        .toList()
      ..sort(
        (a, b) =>
            (b['timestamp'] as DateTime).compareTo(a['timestamp'] as DateTime),
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
              child: _buildActivityCard(activity),
            ),
          ),
          if (olderActivities.isNotEmpty) const SizedBox(height: 24),
        ],
        if (olderActivities.isNotEmpty)
          _OlderActivitySection(
            activities: olderActivities,
            buildCard: _buildActivityCard,
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

  Widget _buildActivityCard(Map<String, dynamic> activity) {
    final type = activity['type'] as NotificationType;
    final timestamp = activity['timestamp'] as DateTime;
    final relatedUserId = activity['relatedUserId'] as String?;
    final activityId = activity['id'] as String? ?? '';

    // Get activity details based on type
    final activityDetails = _getActivityDetails(type, activity, relatedUserId);
    final title = activity['title'] as String? ?? 'Activity update';
    final subtitle = activityDetails.detail ?? activityDetails.action;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          decoration: BoxDecoration(
            color: activityDetails.backgroundColor,
            borderRadius: BorderRadius.circular(16),
            border: Border(
              left: BorderSide(
                color: activityDetails.borderColor,
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
              // Icon
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: activityDetails.borderColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  activityDetails.icon,
                  color: activityDetails.borderColor,
                  size: 22,
                ),
              ),
              const SizedBox(width: 16),
              // Content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                    ...[
                      const SizedBox(height: 6),
                      Text(
                        '${activityDetails.actor} $subtitle',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],
                    // Timestamp
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
          child: Semantics(
            button: true,
            label: 'Remove activity',
            child: IconButton(
              tooltip: 'Remove from activity history',
              icon: const Icon(Icons.close),
              iconSize: 20,
              color: Colors.grey[600],
              splashRadius: 20,
              onPressed:
                  activityId.isEmpty ? null : () => _removeActivity(activityId),
            ),
          ),
        ),
      ],
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  _ActivityDetails _getActivityDetails(
    NotificationType type,
    Map<String, dynamic> activity,
    String? relatedUserId,
  ) {
    final userName = relatedUserId != null
        ? DevDataService.getMockUserById(relatedUserId)?.displayName ??
            'Someone'
        : 'Someone';

    switch (type) {
      case NotificationType.eventInvite:
        return _ActivityDetails(
          actor: userName,
          action: 'invited you to',
          detail: _extractEventName(activity['message'] as String),
          icon: Icons.person_add,
          borderColor: AppColors.activityPurple,
          backgroundColor: AppColors.activityPurpleLight,
        );

      case NotificationType.partnerAccepted:
        return _ActivityDetails(
          actor: userName,
          action: 'accepted your calendar invitation',
          detail: null,
          icon: Icons.person_add,
          borderColor: AppColors.activityPurple,
          backgroundColor: AppColors.activityPurpleLight,
        );

      case NotificationType.eventUpdated:
        return _ActivityDetails(
          actor: userName,
          action: 'updated',
          detail: _extractEventName(activity['message'] as String),
          icon: Icons.edit,
          borderColor: AppColors.activityBlue,
          backgroundColor: AppColors.activityBlueLight,
        );

      case NotificationType.signalReceived:
        return _ActivityDetails(
          actor: userName,
          action: 'shared an availability signal',
          detail: null,
          icon: Icons.notifications,
          borderColor: AppColors.activityGreen,
          backgroundColor: AppColors.activityGreenLight,
        );

      case NotificationType.signalShared:
        return _ActivityDetails(
          actor: 'You',
          action: 'shared an availability signal',
          detail: null,
          icon: Icons.notifications,
          borderColor: AppColors.activityGreen,
          backgroundColor: AppColors.activityGreenLight,
        );

      case NotificationType.partnerRequest:
        return _ActivityDetails(
          actor: userName,
          action: 'wants to connect',
          detail: null,
          icon: Icons.person_add,
          borderColor: AppColors.activityPurple,
          backgroundColor: AppColors.activityPurpleLight,
        );

      case NotificationType.eventReminder:
        return _ActivityDetails(
          actor: 'Reminder',
          action: _extractEventName(activity['message'] as String),
          detail: null,
          icon: Icons.notifications,
          borderColor: AppColors.activityBlue,
          backgroundColor: AppColors.activityBlueLight,
        );

      case NotificationType.eventCancelled:
        return _ActivityDetails(
          actor: userName,
          action: 'cancelled',
          detail: _extractEventName(activity['message'] as String),
          icon: Icons.cancel,
          borderColor: AppColors.activityRed,
          backgroundColor: AppColors.activityRedLight,
        );

      case NotificationType.system:
        return _ActivityDetails(
          actor: 'System',
          action: activity['message'] as String,
          detail: null,
          icon: Icons.info,
          borderColor: AppColors.activityBlue,
          backgroundColor: AppColors.activityBlueLight,
        );
    }
  }

  String _extractEventName(String message) {
    // Extract event name from messages like "Sam invited you to Team Lunch"
    // or "Project Planning time has changed"
    if (message.contains('invited you to')) {
      return message.split('invited you to ').last;
    } else if (message.contains('time has changed')) {
      return message.split(' time has changed').first;
    } else if (message.contains('starts in')) {
      return message.split(' starts in').first;
    }
    return message;
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

class _ActivityDetails {
  final String actor;
  final String action;
  final String? detail;
  final IconData icon;
  final Color borderColor;
  final Color backgroundColor;

  _ActivityDetails({
    required this.actor,
    required this.action,
    this.detail,
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

  final List<Map<String, dynamic>> activities;
  final Widget Function(Map<String, dynamic>) buildCard;
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
