// Activity Screen - Rebuilt to match Figma design
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme_constants.dart';
import '../../logic/services/dev_data_service.dart';
import '../../domain/enums.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final activities = DevDataService.getMockRecentActivity();

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
                const SizedBox(height: 32),
                _buildActivityList(activities),
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

  Widget _buildActivityList(List<Map<String, dynamic>> activities) {
    return Column(
      children: activities.map((activity) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _buildActivityCard(activity),
        );
      }).toList(),
    );
  }

  Widget _buildActivityCard(Map<String, dynamic> activity) {
    final type = activity['type'] as NotificationType;
    final timestamp = activity['timestamp'] as DateTime;
    final relatedUserId = activity['relatedUserId'] as String?;

    // Get activity details based on type
    final activityDetails = _getActivityDetails(type, activity, relatedUserId);

    return Container(
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
      padding: const EdgeInsets.all(18),
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
                // Actor + Action + Detail
                RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.textPrimary,
                      height: 1.4,
                    ),
                    children: [
                      TextSpan(
                        text: activityDetails.actor,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      TextSpan(text: ' ${activityDetails.action}'),
                      if (activityDetails.detail != null)
                        TextSpan(text: ' ${activityDetails.detail}'),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
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
    );
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
