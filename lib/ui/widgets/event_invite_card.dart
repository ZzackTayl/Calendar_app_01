import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/theme_constants.dart';
import '../../logic/providers/event_invite_providers.dart';

/// Reusable event card for invite display
class EventInviteCard extends StatelessWidget {
  final EventInviteDetails details;

  const EventInviteCard({
    super.key,
    required this.details,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final textTheme = Theme.of(context).textTheme;
    final dateFormat = DateFormat('EEEE, MMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppGradients.eventCard,
        borderRadius: BorderRadius.circular(AppBorderRadius.large),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Event Title
          Text(
            details.event.title,
            style: textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: palette.textPrimary,
            ),
          ),

          const SizedBox(height: 16),

          // Date & Time
          _InfoRow(
            icon: Icons.calendar_today,
            label: dateFormat.format(details.event.start),
            color: AppColors.primary,
          ),
          const SizedBox(height: 12),
          _InfoRow(
            icon: Icons.access_time,
            label:
                '${timeFormat.format(details.event.start)} - ${timeFormat.format(details.event.end)} (${details.formattedDuration})',
            color: AppColors.eventOrange,
          ),

          // Description
          if (details.event.description != null && details.event.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Divider(color: palette.divider, height: 1),
            const SizedBox(height: 16),
            Text(
              details.event.description!,
              style: textTheme.bodyMedium?.copyWith(
                color: palette.textPrimary,
              ),
            ),
          ],

          // Recurring indicator
          if (details.isRecurring) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.eventPurple.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppBorderRadius.small),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.repeat,
                    size: 16,
                    color: AppColors.eventPurple,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Recurring Event',
                    style: textTheme.bodySmall?.copyWith(
                      color: AppColors.eventPurple,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(AppBorderRadius.small),
          ),
          child: Icon(icon, size: 20, color: color),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: palette.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
