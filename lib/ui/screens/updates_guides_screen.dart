import 'package:flutter/material.dart';

/// Updates & Guides Screen - Provides help and information about app features
class UpdatesGuidesScreen extends StatelessWidget {
  const UpdatesGuidesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFE6F3FF),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Updates & Guides',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w900,
            color: Color(0xFF1F2C3E),
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1F2C3E)),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Notification Types Section
            _buildInfoCard(
              title: 'Notification Types',
              titleColor: const Color(0xFF2E7D32),
              backgroundColor: const Color(0xFFF1F8E9),
              items: [
                _InfoItem(
                  text: 'Event Updates: Created, modified, canceled',
                ),
                _InfoItem(
                  text: 'Partner Activity: Invitations, acceptances',
                ),
                _InfoItem(
                  text: 'Calendar Sync: Connection status updates',
                ),
                _InfoItem(
                  text: 'Reminders: Upcoming events, rescheduling',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // AI Reminders Section
            _buildSectionHeader(
              icon: Icons.bolt,
              title: 'AI Reminders',
              iconColor: const Color(0xFFFFA000),
            ),

            const SizedBox(height: 16),

            // SMS Setup
            _buildInfoCard(
              title: 'SMS Setup',
              titleColor: const Color(0xFF8B4513),
              backgroundColor: const Color(0xFFFFF8E1),
              items: [
                _NumberedInfoItem(
                  number: 1,
                  text: 'Go to Settings → Rescheduling Events & Reminders',
                ),
                _NumberedInfoItem(
                  number: 2,
                  text: 'Toggle "SMS Reschedule Reminders" to ON',
                ),
                _NumberedInfoItem(
                  number: 3,
                  text:
                      'Enable "Auto SMS Cancellation Alerts" for automatic notifications',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // In-App Setup
            _buildInfoCard(
              title: 'In-App Setup',
              titleColor: const Color(0xFF7C3BFF),
              backgroundColor: const Color(0xFFF3F0FF),
              items: [
                _NumberedInfoItem(
                  number: 1,
                  text:
                      'Navigate to Settings → Rescheduling Events & Reminders',
                ),
                _NumberedInfoItem(
                  number: 2,
                  text: 'Turn ON "In-App Notifications"',
                ),
                _NumberedInfoItem(
                  number: 3,
                  text:
                      'You\'ll receive smart suggestions for rescheduling conflicts',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // AI Features Section
            _buildSectionHeader(
              icon: Icons.rocket_launch,
              title: 'AI Features',
              iconColor: const Color(0xFF2196F3),
            ),

            const SizedBox(height: 16),

            // Connection Settings Section
            _buildSectionHeader(
              icon: Icons.people_outline,
              title: 'Connection Settings',
              iconColor: const Color(0xFF7C3BFF),
            ),

            const SizedBox(height: 16),

            // Permission Levels
            _buildInfoCard(
              title: 'Permission Levels',
              titleColor: const Color(0xFF7C3BFF),
              backgroundColor: Colors.white,
              items: [
                _PermissionLevelItem(
                  color: const Color(0xFF4CAF50),
                  title: 'Visible',
                  description:
                      'Partners can see your event details, times, and locations',
                ),
                _PermissionLevelItem(
                  color: const Color(0xFFF59E0B),
                  title: 'Semi-Visible',
                  description:
                      'Partners see you\'re busy but not specific details',
                ),
                _PermissionLevelItem(
                  color: const Color(0xFF6B7280),
                  title: 'Private',
                  description: 'Partners cannot see any event information',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Event Override Section
            _buildInfoCard(
              title: '⚡ Event Override',
              titleColor: const Color(0xFF8B4513),
              backgroundColor: const Color(0xFFFFF8E1),
              items: [
                _InfoItem(
                  text: 'Event settings always override partner permissions.',
                  textColor: const Color(0xFF6B7280),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Notifications Section
            _buildSectionHeader(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              iconColor: const Color(0xFF2196F3),
            ),

            const SizedBox(height: 16),

            // Recent Activity
            _buildInfoCard(
              title: 'Recent Activity',
              titleColor: const Color(0xFF2196F3),
              backgroundColor: const Color(0xFFE3F2FD),
              items: [
                _InfoItem(
                  text:
                      'Tap the notification bell icon in the top-right corner',
                  useBlueDot: true,
                ),
                _InfoItem(
                  text:
                      'Select "View All Activity" to see complete notification history',
                  useBlueDot: true,
                ),
                _InfoItem(
                  text: 'Red badge appears when you have unread notifications',
                  useBlueDot: true,
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Notification Preferences summary
            _buildInfoCard(
              title: 'Notification Preferences',
              titleColor: const Color(0xFF2E7D32),
              backgroundColor: Colors.white,
              items: [
                _InfoItem(
                  text: 'Event Updates: Created, modified, canceled',
                ),
                _InfoItem(
                  text: 'Partner Activity: Invitations, acceptances',
                ),
                _InfoItem(
                  text: 'Calendar Sync: Connection status updates',
                ),
                _InfoItem(
                  text: 'Reminders: Upcoming events, rescheduling',
                ),
              ],
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required IconData icon,
    required String title,
    required Color iconColor,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 28),
        const SizedBox(width: 12),
        Text(
          title,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1F2C3E),
          ),
        ),
      ],
    );
  }

  Widget _buildInfoCard({
    required String title,
    required Color titleColor,
    required Color backgroundColor,
    required List<Widget> items,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: titleColor,
            ),
          ),
          const SizedBox(height: 16),
          ...items,
        ],
      ),
    );
  }
}

class _InfoItem extends StatelessWidget {
  final String text;
  final Color? textColor;
  final bool useBlueDot;

  const _InfoItem({
    required this.text,
    this.textColor,
    this.useBlueDot = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: useBlueDot
                    ? const Color(0xFF2196F3)
                    : const Color(0xFF1F2C3E),
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 15,
                height: 1.5,
                color: textColor ?? const Color(0xFF1F2C3E),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NumberedInfoItem extends StatelessWidget {
  final int number;
  final String text;

  const _NumberedInfoItem({
    required this.number,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    Color circleColor;
    switch (number) {
      case 1:
        circleColor = const Color(0xFFE89C4B); // Orange
        break;
      case 2:
        circleColor = const Color(0xFFE89C4B); // Orange
        break;
      case 3:
        circleColor = const Color(0xFFE89C4B); // Orange
        break;
      default:
        circleColor = const Color(0xFFE89C4B);
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: circleColor,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number.toString(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.5,
                  color: Color(0xFF1F2C3E),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PermissionLevelItem extends StatelessWidget {
  final Color color;
  final String title;
  final String description;

  const _PermissionLevelItem({
    required this.color,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2C3E),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.4,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
