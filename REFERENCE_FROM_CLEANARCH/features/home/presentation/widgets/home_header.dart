part of 'widgets.dart';

/// Header section with greeting and add button
class HomeHeader extends StatelessWidget {
  const HomeHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CustomText(
              'Good morning!',
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: AppColors.backgroundWhite,
            ),
            SizedBox(height: 8),
            CustomText(
              "Here's what's happening",
              fontSize: 16,
              color: AppColors.textTertiary,
            ),
          ],
        ),
        FloatingActionButton(
          mini: true,
          onPressed: () {
            // Add new event/signal
          },
          backgroundColor: AppColors.primary.withValues(alpha: 0.3),
          child: const Icon(Icons.add, color: AppColors.primary),
        ),
      ],
    );
  }
}
