import 'package:flutter/material.dart';

import '../../core/theme_constants.dart';

/// Avatar widget that displays user profile photo or placeholder
/// Shows Google profile photo if available, otherwise shows initials or icon
class UserProfileAvatar extends StatelessWidget {
  final String? photoUrl; // Google photo URL or custom photo URL
  final String? displayName; // User's display name
  final double size; // Avatar size (width and height)
  final double? fontSize; // Font size for initials (if no photo)

  const UserProfileAvatar({
    super.key,
    this.photoUrl,
    this.displayName,
    this.size = 56,
    this.fontSize,
  });

  /// Extract initials from display name
  String _getInitials() {
    if (displayName == null || displayName!.isEmpty) return '?';
    
    final parts = displayName!.trim().split(' ');
    if (parts.isEmpty) return '?';
    
    // Get first letter of first and last name
    if (parts.length >= 2) {
      return '${parts.first.characters.first}${parts.last.characters.first}'
          .toUpperCase();
    }
    
    // Get first two letters if only one name
    return parts.first.substring(0, (parts.first.length < 2 ? 1 : 2)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final palette = AppPalette.of(context);
    final accent = Theme.of(context).colorScheme.secondary;
    final effectiveFontSize = fontSize ?? (size * 0.35);

    // If we have a photo URL, display the image
    if (photoUrl != null && photoUrl!.isNotEmpty) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(size / 4),
          boxShadow: [
            BoxShadow(
              color: palette.cardShadow,
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(size / 4),
          child: Image.network(
            photoUrl!,
            fit: BoxFit.cover,
            // Fallback if image fails to load
            errorBuilder: (context, error, stackTrace) {
              return _buildPlaceholder(palette, accent, effectiveFontSize);
            },
            // Show placeholder while loading
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Container(
                width: size,
                height: size,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: palette.isDark ? 0.24 : 0.15),
                  borderRadius: BorderRadius.circular(size / 4),
                ),
                child: Center(
                  child: CircularProgressIndicator(
                    value: loadingProgress.expectedTotalBytes != null
                        ? loadingProgress.cumulativeBytesLoaded /
                            loadingProgress.expectedTotalBytes!
                        : null,
                  ),
                ),
              );
            },
          ),
        ),
      );
    }

    // No photo, show placeholder
    return _buildPlaceholder(palette, accent, effectiveFontSize);
  }

  /// Build placeholder with initials or icon
  Widget _buildPlaceholder(AppPalette palette, Color accent, double fontSize) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: accent.withValues(alpha: palette.isDark ? 0.24 : 0.15),
        borderRadius: BorderRadius.circular(size / 4),
        boxShadow: [
          BoxShadow(
            color: palette.cardShadow,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: displayName != null && displayName!.isNotEmpty
            ? Text(
                _getInitials(),
                style: TextStyle(
                  fontSize: fontSize,
                  fontWeight: FontWeight.w600,
                  color: accent,
                ),
              )
            : Icon(
                Icons.person,
                color: accent,
                size: size * 0.5,
              ),
      ),
    );
  }
}
