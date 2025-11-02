part of 'theme.dart';

/// Gradient definitions used throughout the app.
class AppGradients {
  static const background = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFB7F0FF), Color(0xFFF7C8FF)],
  );

  static const darkBackground = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A2233), Color(0xFF2A153D)],
  );

  static const accent = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF7C3BFF), Color(0xFFF13F9C)],
  );

  static LinearGradient backgroundFor(Brightness brightness) =>
      brightness == Brightness.dark ? darkBackground : background;
}
