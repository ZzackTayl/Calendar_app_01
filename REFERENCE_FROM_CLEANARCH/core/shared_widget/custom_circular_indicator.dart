part of 'widgets.dart';

/// Custom circular progress indicator widget.
///
/// Provides a standardized loading indicator that:
/// - Uses app's primary color
/// - Can be customized in size
/// - Works with both light and dark themes
///
/// Usage:
/// ```dart
/// CustomCircleIndicator()
/// // or
/// CustomCircleIndicator(size: 30, color: Colors.white)
/// ```

class CustomCircleIndicator extends StatelessWidget {
  final double size;
  final Color? color;
  final double strokeWidth;

  const CustomCircleIndicator({
    super.key,
    this.size = 24,
    this.color,
    this.strokeWidth = 2.5,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: size,
      width: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        valueColor: AlwaysStoppedAnimation<Color>(
          color ?? theme.colorScheme.primary,
        ),
      ),
    );
  }
}
