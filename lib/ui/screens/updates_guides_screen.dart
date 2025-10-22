import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';
import '../widgets/accessibility/semantic_card.dart';
import '../widgets/accessibility/semantic_text.dart';

/// Updates & Guides Screen - Provides help and information about app features
class UpdatesGuidesScreen extends StatelessWidget {
  const UpdatesGuidesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final textTheme = theme.textTheme;

    return Scaffold(
      backgroundColor: palette.background,
      appBar: AppBar(
        backgroundColor: palette.background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Updates & Guides',
          style: textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w900,
            color: palette.textPrimary,
          ),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: palette.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Back',
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Notification Types Section
            _buildInfoCard(
              context,
              title: 'Notification Types Overview',
              accentColor: const Color(0xFF2E7D32),
              items: [
                _InfoItem(
                  text: 'Event Updates: Created, modified, canceled',
                ),
                _InfoItem(
                  text: 'Connection Activity: Invitations, acceptances',
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
              context,
              icon: Icons.bolt,
              title: 'AI Reminders',
              iconColor: const Color(0xFFFFA000),
            ),

            const SizedBox(height: 16),

            // SMS Setup
            _buildInfoCard(
              context,
              title: 'SMS Setup',
              accentColor: const Color(0xFF8B4513),
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
              context,
              title: 'In-App Setup',
              accentColor: const Color(0xFF7C3BFF),
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
              context,
              icon: Icons.rocket_launch,
              title: 'AI Features',
              iconColor: const Color(0xFF2196F3),
            ),

            const SizedBox(height: 16),

            // Connection Settings Section
            _buildSectionHeader(
              context,
              icon: Icons.people_outline,
              title: 'Connection Settings',
              iconColor: const Color(0xFF7C3BFF),
            ),

            const SizedBox(height: 16),

            // Permission Levels
            _buildInfoCard(
              context,
              title: 'Permission Levels',
              accentColor: const Color(0xFF7C3BFF),
              items: [
                _PermissionLevelItem(
                  color: const Color(0xFF4CAF50),
                  title: 'Visible',
                  description:
                      'Connections can see your event details, times, and locations',
                ),
                _PermissionLevelItem(
                  color: const Color(0xFFF59E0B),
                  title: 'Semi-Visible',
                  description:
                      'Connections see you\'re busy but not specific details',
                ),
                _PermissionLevelItem(
                  color: const Color(0xFF6B7280),
                  title: 'Private',
                  description: 'Connections cannot see any event information',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Event Override Section
            _buildInfoCard(
              context,
              title: '⚡ Event Override',
              accentColor: const Color(0xFF8B4513),
              items: [
                _InfoItem(
                  text:
                      'Event settings always override connection permissions.',
                  textColor: palette.textSecondary,
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Notifications Section
            _buildSectionHeader(
              context,
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              iconColor: const Color(0xFF2196F3),
            ),

            const SizedBox(height: 16),

            // Recent Activity
            _buildInfoCard(
              context,
              title: 'Recent Activity',
              accentColor: const Color(0xFF2196F3),
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
              context,
              title: 'Notification Preferences',
              accentColor: const Color(0xFF2E7D32),
              items: [
                _InfoItem(
                  text: 'Event Updates: Created, modified, canceled',
                ),
                _InfoItem(
                  text: 'Connection Activity: Invitations, acceptances',
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

  Widget _buildSectionHeader(
    BuildContext context, {
    required IconData icon,
    required String title,
    required Color iconColor,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: SemanticHeading(
              child: Text(
                title,
                style: textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: palette.textPrimary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(
    BuildContext context, {
    required String title,
    required Color accentColor,
    required List<Widget> items,
    String? hint,
  }) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    final Color backgroundColor = _tintedCardColor(palette, accentColor);

    return SemanticCard(
      label: title,
      hint: hint,
      child: Container(
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
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: accentColor,
              ),
            ),
            const SizedBox(height: 16),
            ...items,
          ],
        ),
      ),
    );
  }

  Color _tintedCardColor(AppPalette palette, Color accent) {
    if (!palette.isDark) {
      return Color.alphaBlend(accent.withValues(alpha: 0.08), palette.surface);
    }
    return Color.alphaBlend(accent.withValues(alpha: 0.22), palette.surface);
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
    final palette = AppPalette.of(context);
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final Color bulletColor =
        useBlueDot ? colorScheme.primary : palette.textPrimary;
    final Color resolvedTextColor = textColor ?? palette.textPrimary;

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
                color: bulletColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: theme.textTheme.bodyMedium?.copyWith(
                height: 1.5,
                color: resolvedTextColor,
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
    final theme = Theme.of(context);
    final palette = AppPalette.of(context);
    final colorScheme = theme.colorScheme;
    final circleColor = colorScheme.secondary;

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
                style: theme.textTheme.bodyMedium?.copyWith(
                  height: 1.5,
                  color: palette.textPrimary,
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
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;

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
                  style: textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: palette.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: textTheme.bodyMedium?.copyWith(
                    height: 1.4,
                    color: palette.textSecondary,
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
