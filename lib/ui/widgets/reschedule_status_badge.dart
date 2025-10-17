import 'package:flutter/material.dart';

import '../../domain/enums.dart';

/// Displays the current reschedule state for an event as a small badge.
class RescheduleStatusBadge extends StatelessWidget {
  const RescheduleStatusBadge({
    super.key,
    required this.status,
    this.dense = false,
  });

  final EventRescheduleStatus status;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    if (status == EventRescheduleStatus.none) {
      return const SizedBox.shrink();
    }

    final theme = _themes[status] ?? _themes[EventRescheduleStatus.pendingContact]!;
    final horizontalPadding = dense ? 8.0 : 10.0;
    final verticalPadding = dense ? 4.0 : 6.0;

    return Semantics(
      label: 'Reschedule status',
      value: theme.label,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: horizontalPadding,
          vertical: verticalPadding,
        ),
        decoration: BoxDecoration(
          color: theme.background,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: theme.foreground.withValues(alpha: 0.15)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(theme.icon, size: dense ? 12 : 14, color: theme.foreground),
            SizedBox(width: dense ? 4 : 6),
            Text(
              theme.label,
              style: TextStyle(
                fontSize: dense ? 11 : 12.5,
                fontWeight: FontWeight.w600,
                color: theme.foreground,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BadgeTheme {
  const _BadgeTheme({
    required this.icon,
    required this.label,
    required this.background,
    required this.foreground,
  });

  final IconData icon;
  final String label;
  final Color background;
  final Color foreground;
}

final Map<EventRescheduleStatus, _BadgeTheme> _themes = {
  EventRescheduleStatus.pendingContact: _BadgeTheme(
    icon: Icons.sms_outlined,
    label: 'Waiting on contact',
    background: const Color(0xFFFFF4E5),
    foreground: const Color(0xFFB76E00),
  ),
  EventRescheduleStatus.contactConfirmed: _BadgeTheme(
    icon: Icons.mark_chat_read_outlined,
    label: 'Contact confirmed',
    background: const Color(0xFFEAF2FF),
    foreground: const Color(0xFF335ACB),
  ),
  EventRescheduleStatus.awaitingUserApproval: _BadgeTheme(
    icon: Icons.pending_actions_outlined,
    label: 'Needs your approval',
    background: const Color(0xFFF3E8FF),
    foreground: const Color(0xFF6B21A8),
  ),
  EventRescheduleStatus.scheduled: _BadgeTheme(
    icon: Icons.event_available_outlined,
    label: 'Rescheduled',
    background: const Color(0xFFE9F9EE),
    foreground: const Color(0xFF1B7A32),
  ),
};
