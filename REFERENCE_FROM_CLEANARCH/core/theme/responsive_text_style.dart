part of 'theme.dart';

/// Responsive typography system that scales text by screen width.
class ResponsiveTextStyles {
  ResponsiveTextStyles(this.screenWidth);
  final double screenWidth;

  double _scaleFactor() {
    if (screenWidth < 600) return 1.0;
    if (screenWidth < 900) return 1.15;
    return 1.3;
  }

  TextStyle _scale(TextStyle base) =>
      base.copyWith(fontSize: (base.fontSize ?? 16) * _scaleFactor());

  TextStyle get heading1 => _scale(AppTextStyles.heading1);
  TextStyle get heading3 => _scale(AppTextStyles.heading3);
  TextStyle get body => _scale(AppTextStyles.bodyMedium);

  TextStyle get button => TextStyle(
    fontSize: 14 * _scaleFactor(),
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );
}
