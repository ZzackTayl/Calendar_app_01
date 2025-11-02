part of 'widgets.dart';

class FeatureItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const FeatureItem({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.backgroundWhite.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: AppColors.primary, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CustomText(
                title,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.backgroundWhite,
              ),
              const SizedBox(height: 4),
              CustomText(
                description,
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
