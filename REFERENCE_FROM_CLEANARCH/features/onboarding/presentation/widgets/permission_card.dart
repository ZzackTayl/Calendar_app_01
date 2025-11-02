part of 'widgets.dart';

class PermissionCard extends StatelessWidget {
  final PermissionInfoModel permission;

  const PermissionCard({super.key, required this.permission});

  Color getColorForLevel(PermissionLevel level) {
    switch (level) {
      case PermissionLevel.fullVisibility:
        return const Color(0xFF4CAF50); // Brighter green
      case PermissionLevel.partialVisibility:
        return const Color(0xFFFF9800); // Vibrant orange
      case PermissionLevel.private:
        return const Color(0xFFF44336); // Clear red
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = getColorForLevel(permission.level);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4), width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: CustomText(permission.icon, fontSize: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CustomText(
                  permission.title,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.backgroundWhite,
                ),
                const SizedBox(height: 4),
                CustomText(
                  permission.description,
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
