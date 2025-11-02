part of 'pages.dart';

class PermissionsIntroPage extends StatelessWidget {
  final VoidCallback onNext;

  const PermissionsIntroPage({super.key, required this.onNext});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const Spacer(),

          // Icon
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.backgroundWhite.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.shield_rounded,
              size: 64,
              color: AppColors.primary,
            ),
          ),

          const SizedBox(height: 32),

          // Title
          const CustomText(
            'Control Your Privacy',
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: AppColors.backgroundWhite,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),

          // Description
          const CustomText(
            'Choose how much your connections can see on your calendar. You can set different permissions for each connection.',
            fontSize: 16,
            color: AppColors.textSecondary,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 48),

          // Permission Levels
          ...PermissionInfoModel.defaultPermissions.map(
            (permission) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: PermissionCard(permission: permission),
            ),
          ),

          const SizedBox(height: 24),

          // Event Privacy Info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surfaceDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.backgroundWhite),
            ),
            child: Row(
              children: const [
                Icon(
                  Icons.info_outline_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
                SizedBox(width: 12),
                Expanded(
                  child: CustomText(
                    'You can also set special permissions for individual events',
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),

          const Spacer(),

          // Continue Button
          CustomButton(
            label: 'Got it',
            onPressed: onNext,

            textColor: Colors.white,
            borderRadius: 12,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
