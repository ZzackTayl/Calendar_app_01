import 'package:flutter/material.dart';

/// Widget for displaying contact avatars with consistent colors
class ContactAvatar extends StatelessWidget {
  final String name;
  final double radius;
  final String? imageUrl;

  const ContactAvatar({
    super.key,
    required this.name,
    this.radius = 24,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: ContactAvatarUtils.getAvatarColor(name),
      backgroundImage: imageUrl != null ? NetworkImage(imageUrl!) : null,
      child: imageUrl == null
          ? Text(
              ContactAvatarUtils.getInitials(name),
              style: TextStyle(
                color: Colors.white,
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
    if (name.isEmpty) return _avatarColors[0];
    
    // Use simple hash to get consistent color for same name
    final hash = name.toLowerCase().codeUnits.fold(0, (prev, code) => prev + code);
    final index = hash % _avatarColors.length;
    return _avatarColors[index];
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

  /// Available avatar colors - following MyOrbit's design system
  static const List<Color> _avatarColors = [
    Color(0xFFA855F7), // Purple - Taylor Swift
    Color(0xFF7C3AED), // Violet - Morgan Lee
    Color(0xFF6366F1), // Indigo - Casey Johnson  
    Color(0xFF3B82F6), // Blue - River Kim
    Color(0xFF0EA5E9), // Sky Blue
    Color(0xFF06B6D4), // Cyan
    Color(0xFF14B8A6), // Teal
    Color(0xFF10B981), // Emerald
    Color(0xFF22C55E), // Green
    Color(0xFF84CC16), // Lime
    Color(0xFFFBBF24), // Amber
    Color(0xFFF59E0B), // Orange
    Color(0xFFEF4444), // Red
    Color(0xFFF97316), // Orange-Red
    Color(0xFFEC4899), // Pink
    Color(0xFFE11D48), // Rose
  ];

  /// Get a readable contrast color for text on the given background
  static Color getTextColor(Color backgroundColor) {
    // Calculate relative luminance
    final luminance = backgroundColor.computeLuminance();
    return luminance > 0.5 ? Colors.black87 : Colors.white;
  }

  /// Create a widget for displaying contact in a list
  static Widget contactListTile({
    required String name,
    String? email,
    String? subtitle,
    VoidCallback? onTap,
    bool isSelected = false,
    Widget? trailing,
  }) {
    return ListTile(
      leading: ContactAvatar(name: name),
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
  }) {
    return Chip(
      avatar: ContactAvatar(name: name, radius: avatarRadius),
      label: Text(name),
      deleteIcon: onDelete != null ? const Icon(Icons.close, size: 18) : null,
      onDeleted: onDelete,
      backgroundColor: Colors.grey[100],
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}