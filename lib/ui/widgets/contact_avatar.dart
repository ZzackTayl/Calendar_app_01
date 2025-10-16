import 'package:flutter/material.dart';

import '../../core/color_utils.dart';

/// Widget for displaying contact avatars with consistent colors
class ContactAvatar extends StatelessWidget {
  final String name;
  final double radius;
  final String? imageUrl;
  final String? colorHexOverride;

  const ContactAvatar({
    super.key,
    required this.name,
    this.radius = 24,
    this.imageUrl,
    this.colorHexOverride,
  });

  @override
  Widget build(BuildContext context) {
    final backgroundColor = ContactColorUtils.fromHex(colorHexOverride) ??
        ContactAvatarUtils.getAvatarColor(name);
    final textColor = ContactAvatarUtils.getTextColor(backgroundColor);

    return CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor,
      backgroundImage: imageUrl != null ? NetworkImage(imageUrl!) : null,
      child: imageUrl == null
          ? Text(
              ContactAvatarUtils.getInitials(name),
              style: TextStyle(
                color: textColor,
                fontSize: radius * 0.6,
                fontWeight: FontWeight.w700,
              ),
            )
          : null,
    );
  }
}

/// Utility class for contact avatar operations
class ContactAvatarUtils {
  /// Generate consistent color for a name using hash-based selection
  static Color getAvatarColor(String name) {
    return ContactColorUtils.fallbackForName(name);
  }

  /// Generate initials from a name
  static String getInitials(String name) {
    if (name.trim().isEmpty) return '?';

    final words = name.trim().split(RegExp(r'\s+'));
    if (words.length == 1) {
      return words.first[0].toUpperCase();
    }

    // Take first letter of first and last word
    return '${words.first[0]}${words.last[0]}'.toUpperCase();
  }

  /// Get a readable contrast color for text on the given background
  static Color getTextColor(Color backgroundColor) {
    return ContactColorUtils.onColor(backgroundColor);
  }

  /// Create a widget for displaying contact in a list
  static Widget contactListTile({
    required String name,
    String? email,
    String? subtitle,
    VoidCallback? onTap,
    bool isSelected = false,
    Widget? trailing,
    String? colorHexOverride,
  }) {
    return ListTile(
      leading: ContactAvatar(
        name: name,
        colorHexOverride: colorHexOverride,
      ),
      title: Text(
        name,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
      subtitle: subtitle != null || email != null
          ? Text(
              subtitle ?? email ?? '',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            )
          : null,
      trailing: trailing,
      selected: isSelected,
      selectedTileColor: const Color(0xFF00D4FF).withValues(alpha: 0.1),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }

  /// Create a compact contact display widget
  static Widget contactChip({
    required String name,
    String? email,
    VoidCallback? onDelete,
    double avatarRadius = 16,
    String? colorHexOverride,
  }) {
    return Chip(
      avatar: ContactAvatar(
        name: name,
        radius: avatarRadius,
        colorHexOverride: colorHexOverride,
      ),
      label: Text(name),
      deleteIcon: onDelete != null ? const Icon(Icons.close, size: 18) : null,
      onDeleted: onDelete,
      backgroundColor: Colors.grey[100],
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
