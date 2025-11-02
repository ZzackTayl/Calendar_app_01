part of 'theme.dart';

class AppPalette {
  AppPalette(this.brightness);
  final Brightness brightness;

  factory AppPalette.of(BuildContext context) =>
      AppPalette(Theme.of(context).brightness);

  bool get isDark => brightness == Brightness.dark;

  Color get background =>
      isDark ? AppColors.backgroundDark : AppColors.backgroundLight;
  Color get surface => isDark ? AppColors.surfaceDark : Colors.white;
  Color get textPrimary =>
      isDark ? AppColors.textPrimaryDark : AppColors.textPrimary;
  Color get divider => isDark ? AppColors.dividerDark : AppColors.dividerColor;
}
