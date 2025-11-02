part of 'pages.dart';

class ContactsImportPage extends StatelessWidget {
  final VoidCallback onComplete;
  final VoidCallback onSkip;

  const ContactsImportPage({
    super.key,
    required this.onComplete,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OnboardingCubit, OnboardingState>(
      builder: (context, state) {
        final isImported =
            state is OnboardingInProgress && state.contactsImported == true;

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
                  Icons.people_rounded,
                  size: 64,
                  color: AppColors.primary,
                ),
              ),

              const SizedBox(height: 32),

              // Title
              const CustomText(
                'Import Your Contacts',
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.backgroundWhite,
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Description
              const CustomText(
                'Connect with friends and family by importing contacts. You\'ll be able to invite them and share your calendar.',
                fontSize: 16,
                color: AppColors.textSecondary,
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 48),

              if (!isImported) ...[
                // Privacy Info
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceDark,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.backgroundLight),
                  ),
                  child: Column(
                    children: const [
                      Row(
                        children: [
                          Icon(
                            Icons.security_rounded,
                            color: AppColors.primary,
                            size: 20,
                          ),
                          SizedBox(width: 12),
                          Expanded(
                            child: CustomText(
                              'Your Privacy Matters',
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.backgroundWhite,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 12),
                      CustomText(
                        'We only collect data about how you use the app. Your contacts, event details, and personal information remain private and encrypted.',
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Import Button
                CustomButton(
                  label: 'Import Contacts',
                  onPressed: () async {
                    await context.read<OnboardingCubit>().importContacts();
                  },

                  textColor: Colors.white,
                  borderRadius: 12,
                ),
              ] else ...[
                // Success State
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.green.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Column(
                    children: const [
                      Icon(
                        Icons.check_circle_rounded,
                        color: Colors.green,
                        size: 48,
                      ),
                      SizedBox(height: 16),
                      CustomText(
                        'Contacts Imported!',
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: AppColors.backgroundWhite,
                      ),
                      SizedBox(height: 8),
                      CustomText(
                        'You can now start inviting people to events',
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 32),

                // Complete Button
                CustomButton(
                  label: 'Get Started',
                  onPressed: onComplete, // works with async callbacks too

                  textColor: Colors.white,
                  borderRadius: 12,
                ),
              ],

              const Spacer(),

              // Skip Button
              if (!isImported)
                TextButton(
                  onPressed: onSkip,
                  child: const CustomText(
                    'Skip for now',
                    fontSize: 16,
                    color: AppColors.primary,
                  ),
                ),

              const SizedBox(height: 32),
            ],
          ),
        );
      },
    );
  }
}
