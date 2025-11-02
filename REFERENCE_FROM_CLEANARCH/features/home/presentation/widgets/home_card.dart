part of 'widgets.dart';

/// Reusable card container with consistent styling
class HomeCard extends StatelessWidget {
  final Widget child;

  const HomeCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surfaceVariantDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.cardBorderBabyBlue.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: child,
    );
  }
}
