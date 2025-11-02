part of 'widgets.dart';

class LoadingOverlay extends StatelessWidget {
  final String? message;

  const LoadingOverlay({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      color: theme.colorScheme.surface.withValues(alpha: 0.9),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CustomCircleIndicator(size: 48),
            if (message != null) ...[
              const SizedBox(height: AppSpacing.lg),
              Text(
                message!,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: theme.colorScheme.onSurface,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
