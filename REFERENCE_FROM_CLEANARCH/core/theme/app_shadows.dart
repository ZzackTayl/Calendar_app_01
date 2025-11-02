part of 'theme.dart';

/// Shadow definitions for consistent elevation.
class AppShadows {
  static List<BoxShadow> get card => [
    BoxShadow(
      color: Colors.black.withOpacity(0.1),
      blurRadius: 10,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get elevated => [
    BoxShadow(
      color: Colors.black.withOpacity(0.08),
      blurRadius: 20,
      offset: const Offset(0, 4),
    ),
  ];

  static List<BoxShadow> get button => [
    const BoxShadow(
      color: Color(0x337C3BFF),
      blurRadius: 30,
      offset: Offset(0, 16),
    ),
  ];
}
