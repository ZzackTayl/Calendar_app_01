part of 'widgets.dart';

/// Custom button widget with consistent styling across the app.
///
/// Provides a standardized button component that:
/// - Follows the app's design system
/// - Supports loading states
/// - Maintains consistent sizing and styling
/// - Works with both light and dark themes
/// - Matches client's button design with proper shapes
///
/// Usage:
/// ```dart
/// CustomButton(
///   label: 'Sign In',
///   onPressed: () => _handleSignIn(),
///   isLoading: state.isLoading,
/// )
/// ```

class CustomButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? textColor;
  final double? borderRadius;
  final double height;
  final bool isLoading;
  final bool isOutlined;
  final IconData? icon;
  final EdgeInsetsGeometry? padding;

  const CustomButton({
    super.key,
    required this.label,
    this.onPressed,
    this.backgroundColor,
    this.textColor,
    this.borderRadius,
    this.height = 56,
    this.isLoading = false,
    this.isOutlined = false,
    this.icon,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isOutlined) {
      return SizedBox(
        height: height,
        width: double.infinity,
        child: OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            padding:
                padding ??
                const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(
                borderRadius ?? AppBorderRadius.medium,
              ),
            ),
          ),
          child: isLoading
              ? SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      theme.colorScheme.primary,
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      Icon(icon, size: 20),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      label,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
        ),
      );
    }

    // Filled Button - Default background color is now AppColors.secondary
    return SizedBox(
      height: height,
      width: double.infinity,
      child: FilledButton(
        onPressed: isLoading ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor:
              backgroundColor ?? AppColors.secondary, // ← Changed here
          padding:
              padding ??
              const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              borderRadius ?? AppBorderRadius.medium,
            ),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 20, color: textColor ?? Colors.white),
                    const SizedBox(width: 8),
                  ],
                  Text(
                    label,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textColor ?? Colors.white,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
