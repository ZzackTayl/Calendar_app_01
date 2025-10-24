import 'package:flutter/material.dart';

/// Lightweight helpers for handling color conversions and palettes.
class ContactColorUtils {
  ContactColorUtils._();

  /// Default palette for connection/reference colors.
  static const palette = <Color>[
    Color(0xFF7C3AED),
    Color(0xFF2563EB),
    Color(0xFF0EA5E9),
    Color(0xFF22C55E),
    Color(0xFFF59E0B),
    Color(0xFFEC4899),
    Color(0xFF9c5a5a),
    Color(0xFFFF7A3D),
    Color(0xFFEF4444),
  ];

  /// Deterministically pick a palette color hex string for a given name.
  static String hexForName(String name) {
    return toHex(fallbackForName(name));
  }

  /// Convert a [Color] to a hex string (`#RRGGBB`).
  static String toHex(Color color) {
    final value = color.toARGB32() & 0xFFFFFF;
    return '#${value.toRadixString(16).padLeft(6, '0').toUpperCase()}';
  }

  /// Parse a `#RRGGBB` string into a [Color]. Returns null when invalid.
  static Color? fromHex(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    final normalized = hex.replaceFirst('#', '');
    if (normalized.length != 6) return null;
    final value = int.tryParse(normalized, radix: 16);
    if (value == null) return null;
    return Color(0xFF000000 | value);
  }

  /// Deterministically pick a palette color when a custom color is not set.
  static Color fallbackForName(String name) {
    if (name.isEmpty) {
      return palette.first;
    }
    final normalized = name.trim().toLowerCase();
    final hash =
        normalized.codeUnits.fold<int>(0, (value, unit) => value + unit);
    final index = hash % palette.length;
    return palette[index];
  }

  /// Choose a readable content color for the provided [background].
  static Color onColor(Color background) {
    final luminance = background.computeLuminance();
    return luminance > 0.5 ? Colors.black : Colors.white;
  }
}
