import 'package:flutter/material.dart';

import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/core/color_utils.dart';

/// Unified availability signal card used across the app so styling stays in sync.
class AvailabilitySignalCard extends StatelessWidget {
  const AvailabilitySignalCard({
    super.key,
    required this.accentColor,
    required this.ownerName,
    required this.timeRangeLabel,
    required this.statusLabel,
    this.message,
    this.leadingIcon,
    this.trailing,
    this.margin = const EdgeInsets.only(bottom: 12),
    this.isOnDarkBackground = false,
    this.titleColor,
    this.secondaryColor,
    this.statusColor,
    this.messageColor,
  });

  final Color accentColor;
  final String ownerName;
  final String timeRangeLabel;
  final String statusLabel;
  final String? message;
  final IconData? leadingIcon;
  final Widget? trailing;
  final EdgeInsetsGeometry margin;
  final bool isOnDarkBackground;
  final Color? titleColor;
  final Color? secondaryColor;
  final Color? statusColor;
  final Color? messageColor;

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final effectiveDarkSurface = isOnDarkBackground || palette.isDark;

    final backgroundColor = effectiveDarkSurface
        ? accentColor.withValues(alpha: 0.18)
        : accentColor.withValues(alpha: 0.12);
    final iconBackground = effectiveDarkSurface
        ? accentColor.withValues(alpha: 0.35)
        : accentColor.withValues(alpha: 0.2);
    final iconColor = ContactColorUtils.onColor(iconBackground);

    final resolvedTitleColor =
        titleColor ?? (effectiveDarkSurface ? Colors.white : palette.textPrimary);
    final resolvedSecondaryColor = secondaryColor ??
        (effectiveDarkSurface
            ? Colors.white.withValues(alpha: 0.85)
            : palette.textSecondary.withValues(alpha: 0.75));
    final resolvedStatusColor = statusColor ??
        (effectiveDarkSurface
            ? Colors.white.withValues(alpha: 0.9)
            : palette.textSecondary.withValues(alpha: 0.8));
    final resolvedMessageColor = messageColor ??
        (effectiveDarkSurface
            ? Colors.white.withValues(alpha: 0.85)
            : palette.textSecondary.withValues(alpha: 0.7));

    return Container(
      margin: margin,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBackground,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              leadingIcon ?? Icons.wifi_tethering_rounded,
              color: iconColor,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        ownerName,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: resolvedTitleColor,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (trailing != null) ...[
                      const SizedBox(width: 8),
                      trailing!,
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  timeRangeLabel,
                  style: TextStyle(
                    color: resolvedSecondaryColor,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 12,
                    color: resolvedStatusColor,
                  ),
                ),
                if (message != null && message!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    '“${message!}”',
                    style: TextStyle(
                      color: resolvedMessageColor,
                      fontStyle: FontStyle.italic,
                      fontSize: 12,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
